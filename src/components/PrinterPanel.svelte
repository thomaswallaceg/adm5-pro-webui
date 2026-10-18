<script lang="ts">
  import type { FiltrationMode, PrinterSnapshot } from '../../shared/types.ts';
  import { formatLifetime } from '../lib/format.ts';
  import { command } from '../lib/printer.svelte.ts';
  import HeaterTile from './HeaterTile.svelte';
  import Panel from './Panel.svelte';

  let { snapshot, connected }: { snapshot: PrinterSnapshot | null; connected: boolean } = $props();

  const FILTRATION_MODES: { mode: FiltrationMode; label: string }[] = [
    { mode: 'external', label: 'External' },
    { mode: 'internal', label: 'Internal' },
    { mode: 'off', label: 'Off' },
  ];

  const disabled = $derived(!connected || !snapshot);
  const isPrinting = $derived(snapshot?.state === 'printing' || snapshot?.state === 'paused');
</script>

<Panel title="Printer">
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-3">
      <HeaterTile name="extruder" label="Nozzle" heater={snapshot?.extruder ?? { current: 0, target: 0 }} {disabled} />
      <HeaterTile name="bed" label="Bed" heater={snapshot?.bed ?? { current: 0, target: 0 }} {disabled} />
    </div>

    <div>
      <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">Controls</h3>
      <div class="flex flex-wrap gap-2">
        <button
          class={['btn', snapshot?.lightsOn && 'btn-active']}
          aria-pressed={snapshot?.lightsOn ?? false}
          {disabled}
          onclick={() => command('/api/light', { on: !snapshot?.lightsOn })}
        >
          Light
        </button>
        <button class="btn" disabled={disabled || isPrinting} onclick={() => command('/api/home')}>Home axes</button>
      </div>
    </div>

    <div>
      <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">Filtration</h3>
      <div class="flex flex-wrap gap-2">
        {#each FILTRATION_MODES as { mode, label } (mode)}
          <button
            class={['btn', snapshot?.filtration === mode && 'btn-active']}
            aria-pressed={snapshot?.filtration === mode}
            {disabled}
            onclick={() => command('/api/filtration', { mode })}
          >
            {label}
          </button>
        {/each}
      </div>
      <p class="mt-2 text-sm text-zinc-500">TVOC level: <span class="font-medium text-zinc-700 dark:text-zinc-200">{snapshot?.tvoc ?? '--'}</span></p>
    </div>

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
</Panel>
