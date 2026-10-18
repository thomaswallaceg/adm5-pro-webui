import { type FFMachineInfo, MachineState } from '@ghosttypes/ff-api';
import type { FiltrationMode, PrinterSnapshot, PrinterState, PrintJob } from '../shared/types.ts';

const STATE_NAMES: Record<MachineState, PrinterState> = {
  [MachineState.Ready]: 'ready',
  [MachineState.Busy]: 'busy',
  [MachineState.Calibrating]: 'calibrating',
  [MachineState.Error]: 'error',
  [MachineState.Heating]: 'heating',
  [MachineState.Printing]: 'printing',
  [MachineState.Pausing]: 'pausing',
  [MachineState.Paused]: 'paused',
  [MachineState.Cancelled]: 'cancelled',
  [MachineState.Completed]: 'completed',
  [MachineState.Unknown]: 'unknown',
};

function toFiltrationMode(info: FFMachineInfo): FiltrationMode {
  if (info.ExternalFanOn) {
    return 'external';
  }
  if (info.InternalFanOn) {
    return 'internal';
  }
  return 'off';
}

function toJob(info: FFMachineInfo, state: PrinterState): PrintJob | null {
  if (!info.PrintFileName || state === 'ready') {
    return null;
  }
  return {
    fileName: info.PrintFileName,
    progress: Math.min(Math.max(info.PrintProgress * 100, 0), 100),
    layer: info.CurrentPrintLayer,
    totalLayers: info.TotalPrintLayers,
    elapsedSeconds: info.PrintDuration,
    remainingSeconds: info.EstimatedTime,
    filamentMeters: info.EstLength,
    filamentGrams: info.EstWeight,
  };
}

export function toSnapshot(info: FFMachineInfo): PrinterSnapshot {
  const state = STATE_NAMES[info.MachineState] ?? 'unknown';
  return {
    name: info.Name,
    firmware: info.FirmwareVersion,
    state,
    errorCode: info.ErrorCode,
    bed: { current: info.PrintBed.current, target: info.PrintBed.set },
    extruder: { current: info.Extruder.current, target: info.Extruder.set },
    lightsOn: info.LightsOn,
    filtration: toFiltrationMode(info),
    tvoc: info.Tvoc,
    job: toJob(info, state),
    lifetimePrintMinutes: info.CumulativePrintTime,
    lifetimeFilamentMeters: info.CumulativeFilament,
  };
}
