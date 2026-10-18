import type {
  CommandResponse,
  FilesResponse,
  PrinterConfigUpdate,
  PublicPrinterConfig,
  StatusResponse,
} from '../../shared/types.ts';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function getStatus(): Promise<StatusResponse> {
  return getJson('/api/status');
}

export function getConfig(): Promise<PublicPrinterConfig | null> {
  return getJson('/api/config');
}

export function getFiles(): Promise<FilesResponse> {
  return getJson('/api/files');
}

export async function send(path: string, body: object = {}, method = 'POST'): Promise<CommandResponse> {
  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await response.json()) as CommandResponse;
  } catch {
    return { ok: false, error: 'Could not reach the server' };
  }
}

export function saveConfig(update: PrinterConfigUpdate): Promise<CommandResponse> {
  return send('/api/config', update, 'PUT');
}

export function thumbnailUrl(fileName: string): string {
  return `/api/thumbnail?file=${encodeURIComponent(fileName)}`;
}
