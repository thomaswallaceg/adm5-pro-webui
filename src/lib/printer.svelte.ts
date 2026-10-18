import type { StatusResponse } from '../../shared/types.ts';
import { getStatus, send } from './api.ts';
import { notify } from './toasts.svelte.ts';

const POLL_INTERVAL_MS = 2000;

export const printer = $state<{ status: StatusResponse | null; reachable: boolean }>({
  status: null,
  reachable: true,
});

export async function refreshStatus(): Promise<void> {
  try {
    printer.status = await getStatus();
    printer.reachable = true;
  } catch {
    printer.reachable = false;
  }
}

export function startPolling(): () => void {
  void refreshStatus();
  const id = setInterval(refreshStatus, POLL_INTERVAL_MS);
  return () => clearInterval(id);
}

export async function command(path: string, body?: object): Promise<boolean> {
  const result = await send(path, body);
  if (!result.ok) {
    notify(result.error ?? 'Command failed');
  }
  void refreshStatus();
  return result.ok;
}
