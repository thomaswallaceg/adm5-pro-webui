<script lang="ts">
  import type { PrinterSnapshot } from '../../shared/types.ts';
  import { formatLifetime } from '../lib/format.ts';

  let { snapshot }: { snapshot: PrinterSnapshot | null } = $props();
</script>

<!-- Always rendered so the grid keeps the same number of rows while the snapshot loads -->
<div class="self-end">
  {#if snapshot}
    <dl class="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-800">
      <dt>Lifetime printing</dt>
      <dd class="text-right text-zinc-700 dark:text-zinc-200">{formatLifetime(snapshot.lifetimePrintMinutes)}</dd>
      <dt>Lifetime filament</dt>
      <dd class="text-right text-zinc-700 dark:text-zinc-200">{snapshot.lifetimeFilamentMeters.toFixed(1)} m</dd>
      <dt>Firmware</dt>
      <dd class="text-right text-zinc-700 dark:text-zinc-200">{snapshot.firmware}</dd>
    </dl>
  {/if}
</div>
