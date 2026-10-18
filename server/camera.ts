import http from 'node:http';

const DEFAULT_BOUNDARY = 'boundarydonotcross';
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

interface Viewer {
  synced: boolean;
}

export class CameraRelay {
  private upstream: http.ClientRequest | null = null;
  private contentType: string | null = null;
  private boundary: Buffer | null = null;
  private readonly viewers = new Map<http.ServerResponse, Viewer>();
  private readonly getStreamUrl: () => string | null;

  constructor(getStreamUrl: () => string | null) {
    this.getStreamUrl = getStreamUrl;
  }

  addViewer(res: http.ServerResponse): void {
    const url = this.getStreamUrl();
    if (!url) {
      res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Printer is not configured');
      return;
    }

    this.viewers.set(res, { synced: false });
    res.on('close', () => this.removeViewer(res));

    if (this.contentType) {
      this.writeHead(res);
    }
    if (!this.upstream) {
      this.open(url);
    }
  }

  reset(): void {
    for (const res of this.viewers.keys()) {
      res.destroy();
    }
    this.viewers.clear();
    this.closeUpstream();
  }

  private open(url: string): void {
    const request = http.get(url, (upstreamRes) => {
      if (upstreamRes.statusCode !== 200) {
        upstreamRes.resume();
        this.reset();
        return;
      }

      this.contentType = upstreamRes.headers['content-type'] ?? `multipart/x-mixed-replace;boundary=${DEFAULT_BOUNDARY}`;
      const match = /boundary=("?)([^";]+)\1/i.exec(this.contentType);
      this.boundary = Buffer.from(`--${match?.[2] ?? DEFAULT_BOUNDARY}`);

      for (const res of this.viewers.keys()) {
        this.writeHead(res);
      }
      upstreamRes.on('data', (chunk: Buffer) => this.broadcast(chunk));
      upstreamRes.on('end', () => this.reset());
      upstreamRes.on('error', () => this.reset());
    });

    request.setTimeout(UPSTREAM_TIMEOUT_MS, () => request.destroy());
    request.on('error', () => this.reset());
    this.upstream = request;
  }

  private broadcast(chunk: Buffer): void {
    const boundary = this.boundary;
    if (!boundary) {
      return;
    }

    for (const [res, viewer] of this.viewers) {
      if (res.writableLength > MAX_BUFFERED_BYTES) {
        viewer.synced = false;
        continue;
      }
      if (viewer.synced) {
        res.write(chunk);
        continue;
      }
      const start = chunk.indexOf(boundary);
      if (start !== -1) {
        viewer.synced = true;
        res.write(chunk.subarray(start));
      }
    }
  }

  private writeHead(res: http.ServerResponse): void {
    if (res.headersSent || !this.contentType) {
      return;
    }
    res.writeHead(200, {
      'Content-Type': this.contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'close',
    });
  }

  private removeViewer(res: http.ServerResponse): void {
    this.viewers.delete(res);
    if (this.viewers.size === 0) {
      this.closeUpstream();
    }
  }

  private closeUpstream(): void {
    this.upstream?.destroy();
    this.upstream = null;
    this.contentType = null;
    this.boundary = null;
  }
}
