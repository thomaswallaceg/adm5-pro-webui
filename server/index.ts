import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type { FiveMClient } from '@ghosttypes/ff-api';
import {
  type CommandResponse,
  type FilesResponse,
  type FiltrationMode,
  HEATER_LIMITS,
  type HeaterName,
  type PrinterConfigUpdate,
  type PublicPrinterConfig,
} from '../shared/types.ts';
import { CameraRelay } from './camera.ts';
import { loadPrinterConfig, savePrinterConfig } from './config.ts';
import { PrinterService } from './printer.ts';

const PORT = Number(process.env.PORT ?? 8000);
const HOST = process.env.HOST ?? '0.0.0.0';
const DIST_DIR = path.resolve('dist');
const MAX_BODY_BYTES = 64 * 1024;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const printer = new PrinterService();
const camera = new CameraRelay(() => printer.getCameraUrl());

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(chunk);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `"${key}" is required`);
  }
  return value.trim();
}

function toPublicConfig(): PublicPrinterConfig | null {
  const config = printer.getConfig();
  return config
    ? { ipAddress: config.ipAddress, serialNumber: config.serialNumber, hasCheckCode: config.checkCode !== '' }
    : null;
}

async function updateConfig(body: Record<string, unknown>): Promise<CommandResponse> {
  const update: PrinterConfigUpdate = {
    ipAddress: requireString(body, 'ipAddress'),
    serialNumber: requireString(body, 'serialNumber'),
    checkCode: typeof body.checkCode === 'string' ? body.checkCode.trim() : undefined,
  };
  const checkCode = update.checkCode || printer.getConfig()?.checkCode;
  if (!checkCode) {
    throw new HttpError(400, '"checkCode" is required');
  }

  const config = { ipAddress: update.ipAddress, serialNumber: update.serialNumber, checkCode };
  await savePrinterConfig(config);
  camera.reset();
  await printer.configure(config);
  return { ok: true };
}

function setTemperature(body: Record<string, unknown>): Promise<CommandResponse> {
  const heater = body.heater;
  const target = body.target;
  if (heater !== 'bed' && heater !== 'extruder') {
    throw new HttpError(400, '"heater" must be "bed" or "extruder"');
  }
  const limit = HEATER_LIMITS[heater as HeaterName];
  if (typeof target !== 'number' || !Number.isFinite(target) || target < 0 || target > limit) {
    throw new HttpError(400, `"target" must be between 0 and ${limit}`);
  }

  const temperature = Math.round(target);
  const action = (client: FiveMClient): Promise<boolean> => {
    if (heater === 'bed') {
      return temperature === 0 ? client.tempControl.cancelBedTemp() : client.tempControl.setBedTemp(temperature);
    }
    return temperature === 0
      ? client.tempControl.cancelExtruderTemp()
      : client.tempControl.setExtruderTemp(temperature);
  };
  return printer.run(action, `Failed to set the ${heater} temperature`);
}

function setFiltration(body: Record<string, unknown>): Promise<CommandResponse> {
  const mode = body.mode as FiltrationMode;
  const actions: Record<FiltrationMode, (client: FiveMClient) => Promise<boolean>> = {
    external: (client) => client.control.setExternalFiltrationOn(),
    internal: (client) => client.control.setInternalFiltrationOn(),
    off: (client) => client.control.setFiltrationOff(),
  };
  if (!(mode in actions)) {
    throw new HttpError(400, '"mode" must be "external", "internal" or "off"');
  }
  return printer.run(actions[mode], 'Failed to change filtration');
}

async function listFiles(): Promise<FilesResponse> {
  try {
    return { ok: true, files: await printer.listFiles() };
  } catch (error) {
    return { ok: false, files: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendThumbnail(res: http.ServerResponse, fileName: string | null): Promise<void> {
  if (!fileName) {
    throw new HttpError(400, '"file" is required');
  }
  const image = await printer.thumbnail(fileName).catch(() => null);
  if (!image) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' });
  res.end(image);
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  const route = `${req.method} ${url.pathname}`;
  switch (route) {
    case 'GET /api/status':
      return sendJson(res, 200, printer.getStatus());
    case 'GET /api/config':
      return sendJson(res, 200, toPublicConfig());
    case 'PUT /api/config':
      return sendJson(res, 200, await updateConfig(await readJson(req)));
    case 'POST /api/temperature':
      return sendJson(res, 200, await setTemperature(await readJson(req)));
    case 'POST /api/light': {
      const on = (await readJson(req)).on === true;
      const result = await printer.run(
        (client) => (on ? client.control.setLedOn() : client.control.setLedOff()),
        'Failed to switch the light'
      );
      return sendJson(res, 200, result);
    }
    case 'POST /api/home':
      return sendJson(res, 200, await printer.run((client) => client.control.homeAxes(), 'Failed to home the axes'));
    case 'POST /api/filtration':
      return sendJson(res, 200, await setFiltration(await readJson(req)));
    case 'POST /api/job/pause':
      return sendJson(res, 200, await printer.run((client) => client.jobControl.pausePrintJob(), 'Failed to pause'));
    case 'POST /api/job/resume':
      return sendJson(res, 200, await printer.run((client) => client.jobControl.resumePrintJob(), 'Failed to resume'));
    case 'POST /api/job/cancel':
      return sendJson(res, 200, await printer.run((client) => client.jobControl.cancelPrintJob(), 'Failed to cancel'));
    case 'POST /api/job/clear':
      return sendJson(res, 200, await printer.run((client) => client.jobControl.clearPlatform(), 'Failed to clear the plate'));
    case 'POST /api/job/start': {
      const body = await readJson(req);
      const fileName = requireString(body, 'fileName');
      const levelFirst = body.levelFirst === true;
      const result = await printer.run(
        (client) => client.jobControl.printLocalFile(fileName, levelFirst),
        `Failed to start ${fileName}`
      );
      return sendJson(res, 200, result);
    }
    case 'GET /api/files':
      return sendJson(res, 200, await listFiles());
    case 'GET /api/thumbnail':
      return sendThumbnail(res, url.searchParams.get('file'));
    case 'GET /api/camera':
      return camera.addViewer(res);
    default:
      throw new HttpError(404, 'Not found');
  }
}

async function serveStatic(res: http.ServerResponse, pathname: string): Promise<void> {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  let filePath = path.resolve(DIST_DIR, relative);
  if (!filePath.startsWith(DIST_DIR + path.sep)) {
    throw new HttpError(404, 'Not found');
  }

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    filePath = path.join(DIST_DIR, 'index.html');
    if (!(await stat(filePath).catch(() => null))?.isFile()) {
      throw new HttpError(503, 'The web page has not been built yet. Run "pnpm build".');
    }
  }

  const isHashedAsset = filePath.startsWith(path.join(DIST_DIR, 'assets') + path.sep);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const handler = url.pathname.startsWith('/api/')
    ? handleApi(req, res, url)
    : req.method === 'GET'
      ? serveStatic(res, url.pathname)
      : Promise.reject(new HttpError(405, 'Method not allowed'));

  handler.catch((error: unknown) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (status === 500) {
      console.error(`[server] ${req.method} ${url.pathname} failed:`, error);
    }
    if (res.headersSent) {
      res.destroy();
    } else {
      sendJson(res, status, { ok: false, error: message });
    }
  });
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    process.exit(1);
  }
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  camera.reset();
  server.closeAllConnections();
  server.close();
  await printer.dispose();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(signal, () => void shutdown(signal));
}

await printer.configure(await loadPrinterConfig());
server.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});
