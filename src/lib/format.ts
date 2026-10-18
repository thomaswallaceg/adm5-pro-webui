import type { ConnectionState, PrinterState } from '../../shared/types.ts';

export const STATE_LABELS: Record<PrinterState, string> = {
  ready: 'Ready',
  busy: 'Busy',
  calibrating: 'Calibrating',
  error: 'Error',
  heating: 'Heating',
  printing: 'Printing',
  pausing: 'Pausing',
  paused: 'Paused',
  cancelled: 'Cancelled',
  completed: 'Completed',
  unknown: 'Unknown',
};

export const CONNECTION_LABELS: Record<ConnectionState, string> = {
  unconfigured: 'Not set up',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatEta(state: PrinterState, remainingSeconds: number): string {
  if (state !== 'printing' || remainingSeconds <= 0) {
    return '--';
  }
  const eta = new Date(Date.now() + remainingSeconds * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatLifetime(minutes: number): string {
  return formatDuration(minutes * 60);
}

export function displayFileName(fileName: string): string {
  return fileName.replace(/(\.gcode)?(\.3mf)?$/i, '');
}
