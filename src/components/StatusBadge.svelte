<script lang="ts">
  import type { ConnectionState, PrinterState } from '../../shared/types.ts';
  import { CONNECTION_LABELS, STATE_LABELS } from '../lib/format.ts';

  let { connection, printerState }: { connection: ConnectionState | null; printerState: PrinterState | null } = $props();

  const label = $derived(
    connection === 'connected' && printerState ? STATE_LABELS[printerState] : CONNECTION_LABELS[connection ?? 'connecting']
  );
  const dot = $derived(
    connection === 'connected'
      ? printerState === 'error'
        ? 'bg-red-500'
        : 'bg-emerald-500'
      : connection === 'disconnected'
        ? 'bg-red-500'
        : connection === 'unconfigured'
          ? 'bg-zinc-400'
          : 'bg-amber-500'
  );
</script>

<span
  class="inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
>
  <span class={['size-2 rounded-full', dot]}></span>
  {label}
</span>
