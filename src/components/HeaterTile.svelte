<script lang="ts">
  import { HEATER_LIMITS, type Heater, type HeaterName } from '../../shared/types.ts';
  import { formatTemperature } from '../lib/format.ts';
  import { command } from '../lib/printer.svelte.ts';

  const DEFAULT_TARGETS: Record<HeaterName, number> = { bed: 60, extruder: 210 };

  let { name, label, heater, disabled }: { name: HeaterName; label: string; heater: Heater; disabled: boolean } =
    $props();

  let editing = $state(false);
  let draft = $state(0);
  let busy = $state(false);

  const limit = $derived(HEATER_LIMITS[name]);
  const isOn = $derived(heater.target > 0);

  function startEditing(): void {
    draft = isOn ? Math.round(heater.target) : DEFAULT_TARGETS[name];
    editing = true;
  }

  async function apply(target: number): Promise<void> {
    busy = true;
    const ok = await command('/api/temperature', { heater: name, target });
    busy = false;
    if (ok) {
      editing = false;
    }
  }
</script>

<div class="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
  <div class="flex items-baseline justify-between gap-2">
    <span class="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
    <span class={['text-xs', isOn ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-zinc-500']}>
      {isOn ? `→ ${formatTemperature(heater.target)}` : 'Off'}
    </span>
  </div>
  <div class="mt-1 text-3xl font-semibold tabular-nums">{formatTemperature(heater.current)}</div>

  {#if editing}
    <form
      class="mt-3 flex flex-col gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        void apply(Number(draft));
      }}
    >
      <label class="flex items-center gap-2">
        <input type="number" min="0" max={limit} step="1" bind:value={draft} class="input" aria-label={`${label} target`} />
        <span class="text-sm text-zinc-500">°C</span>
      </label>
      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary flex-1" disabled={busy || disabled}>Set</button>
        <button type="button" class="btn flex-1" onclick={() => (editing = false)}>Cancel</button>
      </div>
    </form>
  {:else}
    <div class="mt-3 flex gap-2">
      <button class="btn flex-1" {disabled} onclick={startEditing}>Set</button>
      <button class="btn flex-1" disabled={disabled || busy || !isOn} onclick={() => apply(0)}>Off</button>
    </div>
  {/if}
</div>
