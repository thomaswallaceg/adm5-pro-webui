<script lang="ts">
  import type { FiltrationMode, PrinterSnapshot } from '../../shared/types.ts';
  import { command } from '../lib/printer.svelte.ts';
  import HeaterTile from './HeaterTile.svelte';
  import Section from './Section.svelte';

  let { snapshot, connected }: { snapshot: PrinterSnapshot | null; connected: boolean } = $props();

  const FILTRATION_MODES: { mode: FiltrationMode; label: string }[] = [
    { mode: 'external', label: 'External' },
    { mode: 'internal', label: 'Internal' },
    { mode: 'off', label: 'Off' },
  ];

  const disabled = $derived(!connected || !snapshot);
  const isPrinting = $derived(snapshot?.state === 'printing' || snapshot?.state === 'paused');
</script>

<Section title="Temperature">
    <div class="grid grid-cols-[auto_auto] gap-3">
        <HeaterTile name="extruder" label="Nozzle" heater={snapshot?.extruder ?? { current: 0, target: 0 }} {disabled} />
        <HeaterTile name="bed" label="Bed" heater={snapshot?.bed ?? { current: 0, target: 0 }} {disabled} />
    </div>
</Section>

<Section title="Controls">
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
</Section>

<Section title="Filtration">
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
</Section>

<Section title="TVOC level">
    <p class="text-sm font-medium text-zinc-700 dark:text-zinc-200">{snapshot?.tvoc ?? '--'}</p>
</Section>
