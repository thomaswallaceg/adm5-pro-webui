export interface PrinterConfig {
  ipAddress: string;
  serialNumber: string;
  checkCode: string;
}

export interface PublicPrinterConfig {
  ipAddress: string;
  serialNumber: string;
  hasCheckCode: boolean;
}

export interface PrinterConfigUpdate {
  ipAddress: string;
  serialNumber: string;
  checkCode?: string;
}

export type ConnectionState = 'unconfigured' | 'connecting' | 'connected' | 'disconnected';

export type PrinterState =
  | 'ready'
  | 'busy'
  | 'calibrating'
  | 'error'
  | 'heating'
  | 'printing'
  | 'pausing'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'unknown';

export type FiltrationMode = 'external' | 'internal' | 'off';

export type HeaterName = 'bed' | 'extruder';

export interface Heater {
  current: number;
  target: number;
}

export interface PrintJob {
  fileName: string;
  progress: number;
  layer: number;
  totalLayers: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  filamentMeters: number;
  filamentGrams: number;
}

export interface PrinterSnapshot {
  name: string;
  firmware: string;
  state: PrinterState;
  errorCode: string;
  bed: Heater;
  extruder: Heater;
  lightsOn: boolean;
  filtration: FiltrationMode;
  tvoc: number;
  job: PrintJob | null;
  lifetimePrintMinutes: number;
  lifetimeFilamentMeters: number;
}

export interface StatusResponse {
  connection: ConnectionState;
  message: string | null;
  printer: PrinterSnapshot | null;
}

export interface CommandResponse {
  ok: boolean;
  error?: string;
}

export interface FilesResponse {
  ok: boolean;
  files: string[];
  error?: string;
}

export const HEATER_LIMITS: Record<HeaterName, number> = {
  bed: 110,
  extruder: 280,
};
