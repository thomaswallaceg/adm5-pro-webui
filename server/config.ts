import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PrinterConfig } from '../shared/types.ts';

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'printer.json');

export function isPrinterConfig(value: unknown): value is PrinterConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ipAddress === 'string' &&
    typeof candidate.serialNumber === 'string' &&
    typeof candidate.checkCode === 'string'
  );
}

export async function loadPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
    return isPrinterConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function savePrinterConfig(config: PrinterConfig): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}
