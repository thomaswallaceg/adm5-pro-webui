import { FiveMClient } from '@ghosttypes/ff-api';
import type {
  CommandResponse,
  ConnectionState,
  PrinterConfig,
  PrinterSnapshot,
  StatusResponse,
} from '../shared/types.ts';
import { toSnapshot } from './snapshot.ts';

const POLL_INTERVAL_MS = 3000;
const RECONNECT_DELAY_MS = 10_000;
const MAX_FAILED_POLLS = 3;
const THUMBNAIL_CACHE_SIZE = 100;

type PrinterAction = (client: FiveMClient) => Promise<boolean>;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class PrinterService {
  private config: PrinterConfig | null = null;
  private client: FiveMClient | null = null;
  private connection: ConnectionState = 'unconfigured';
  private message: string | null = null;
  private snapshot: PrinterSnapshot | null = null;
  private failedPolls = 0;
  private timer: NodeJS.Timeout | null = null;
  private generation = 0;
  private thumbnailQueue: Promise<unknown> = Promise.resolve();
  private readonly thumbnails = new Map<string, Buffer | null>();

  getConfig(): PrinterConfig | null {
    return this.config;
  }

  getCameraUrl(): string | null {
    return this.config ? `http://${this.config.ipAddress}:8080/?action=stream` : null;
  }

  getStatus(): StatusResponse {
    return { connection: this.connection, message: this.message, printer: this.snapshot };
  }

  async configure(config: PrinterConfig | null): Promise<void> {
    this.generation++;
    this.clearTimer();
    await this.disposeClient();
    this.config = config;
    this.snapshot = null;
    this.message = null;
    this.thumbnails.clear();

    if (!config) {
      this.connection = 'unconfigured';
      return;
    }
    void this.connect(this.generation);
  }

  async dispose(): Promise<void> {
    this.generation++;
    this.clearTimer();
    await this.disposeClient();
  }

  run(action: PrinterAction, failure: string): Promise<CommandResponse> {
    const client = this.client;
    if (!client || this.connection !== 'connected') {
      return Promise.resolve({ ok: false, error: 'Printer is not connected' });
    }
    return action(client).then(
      (ok) => {
        void this.refresh(client);
        return ok ? { ok: true } : { ok: false, error: failure };
      },
      (error: unknown) => ({ ok: false, error: describeError(error) })
    );
  }

  async listFiles(): Promise<string[]> {
    const client = this.requireClient();
    return client.files.getLocalFileList();
  }

  thumbnail(fileName: string): Promise<Buffer | null> {
    if (this.thumbnails.has(fileName)) {
      return Promise.resolve(this.thumbnails.get(fileName) ?? null);
    }
    const client = this.requireClient();
    const task = this.thumbnailQueue.then(async () => {
      const image = await client.files.getGCodeThumbnail(fileName);
      this.rememberThumbnail(fileName, image);
      return image;
    });
    this.thumbnailQueue = task.catch(() => undefined);
    return task;
  }

  private requireClient(): FiveMClient {
    if (!this.client || this.connection !== 'connected') {
      throw new Error('Printer is not connected');
    }
    return this.client;
  }

  private rememberThumbnail(fileName: string, image: Buffer | null): void {
    if (this.thumbnails.size >= THUMBNAIL_CACHE_SIZE) {
      const oldest = this.thumbnails.keys().next().value;
      if (oldest !== undefined) {
        this.thumbnails.delete(oldest);
      }
    }
    this.thumbnails.set(fileName, image);
  }

  private async connect(generation: number): Promise<void> {
    const config = this.config;
    if (!config || generation !== this.generation) {
      return;
    }

    this.connection = 'connecting';
    const client = new FiveMClient(config.ipAddress, config.serialNumber, config.checkCode);
    try {
      const ready = (await client.initialize()) && (await client.initControl());
      if (generation !== this.generation) {
        await client.dispose();
        return;
      }
      if (!ready) {
        throw new Error('The printer refused the connection. Check the serial number and check code.');
      }
      this.client = client;
      this.connection = 'connected';
      this.message = null;
      this.failedPolls = 0;
      await this.poll(generation);
    } catch (error) {
      await client.dispose().catch(() => undefined);
      if (generation !== this.generation) {
        return;
      }
      this.connection = 'disconnected';
      this.message = describeError(error);
      this.schedule(() => this.connect(generation), RECONNECT_DELAY_MS, generation);
    }
  }

  private async poll(generation: number): Promise<void> {
    const client = this.client;
    if (!client || generation !== this.generation) {
      return;
    }

    if (await this.refresh(client)) {
      this.failedPolls = 0;
    } else if (++this.failedPolls >= MAX_FAILED_POLLS) {
      this.connection = 'disconnected';
      this.message = 'The printer stopped responding.';
      await this.disposeClient();
      this.schedule(() => this.connect(generation), RECONNECT_DELAY_MS, generation);
      return;
    }
    this.schedule(() => this.poll(generation), POLL_INTERVAL_MS, generation);
  }

  private async refresh(client: FiveMClient): Promise<boolean> {
    try {
      const info = await client.info.get();
      if (!info || client !== this.client) {
        return false;
      }
      this.snapshot = toSnapshot(info);
      return true;
    } catch {
      return false;
    }
  }

  private schedule(task: () => Promise<void>, delayMs: number, generation: number): void {
    this.clearTimer();
    if (generation !== this.generation) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void task();
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async disposeClient(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client) {
      await client.dispose().catch(() => undefined);
    }
  }
}
