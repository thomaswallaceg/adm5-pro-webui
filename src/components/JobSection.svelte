<script lang="ts">
  import type { PrinterSnapshot, PrinterState } from '../../shared/types.ts';
  import { thumbnailUrl } from '../lib/api.ts';
  import { displayFileName, formatDuration, formatEta, STATE_LABELS } from '../lib/format.ts';
  import { command } from '../lib/printer.svelte.ts';
  import FilePicker from './FilePicker.svelte';
  import Section from './Section.svelte';

  let { snapshot, connected }: { snapshot: PrinterSnapshot | null; connected: boolean } = $props();

  const CANCELLABLE: PrinterState[] = ['printing', 'pausing', 'paused', 'heating'];
  const FINISHED: PrinterState[] = ['completed', 'cancelled'];

  let pickerOpen = $state(false);
  let busy = $state(false);

  const job = $derived(snapshot?.job ?? null);
  const printerState = $derived(snapshot?.state ?? 'unknown');
  const disabled = $derived(!connected || busy);

  async function run(path: string, confirmMessage?: string): Promise<void> {
    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }
    busy = true;
    await command(path);
    busy = false;
  }
</script>

<Section title="Print job">
  {#if job}
    <div class="flex gap-4">
      <img
        src={thumbnailUrl(job.fileName)}
        alt=""
        class="size-20 shrink-0 rounded-lg bg-zinc-100 object-contain dark:bg-zinc-800"
        onerror={(event) => ((event.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
      />
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium" title={job.fileName}>{displayFileName(job.fileName)}</p>
        <p class="text-sm text-zinc-500">{STATE_LABELS[printerState]}</p>
        <div class="mt-2 flex items-center gap-3">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div class="h-full rounded-full bg-sky-500 transition-[width]" style:width={`${job.progress}%`}></div>
          </div>
          <span class="w-12 text-right text-sm font-medium tabular-nums">{Math.round(job.progress)}%</span>
        </div>
      </div>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
      <div><dt class="text-zinc-500">Layer</dt><dd class="tabular-nums">{job.layer} / {job.totalLayers}</dd></div>
      <div><dt class="text-zinc-500">Elapsed</dt><dd class="tabular-nums">{formatDuration(job.elapsedSeconds)}</dd></div>
      <div><dt class="text-zinc-500">Remaining</dt><dd class="tabular-nums">{formatDuration(job.remainingSeconds)}</dd></div>
      <div><dt class="text-zinc-500">ETA</dt><dd class="tabular-nums">{formatEta(printerState, job.remainingSeconds)}</dd></div>
      <div><dt class="text-zinc-500">Filament</dt><dd class="tabular-nums">{job.filamentMeters.toFixed(1)} m</dd></div>
      <div><dt class="text-zinc-500">Weight</dt><dd class="tabular-nums">{Math.round(job.filamentGrams)} g</dd></div>
    </dl>

    <div class="mt-4 flex flex-wrap gap-2">
      {#if printerState === 'printing'}
        <button class="btn" {disabled} onclick={() => run('/api/job/pause')}>Pause</button>
      {:else if printerState === 'paused'}
        <button class="btn btn-primary" {disabled} onclick={() => run('/api/job/resume')}>Resume</button>
      {/if}
      {#if CANCELLABLE.includes(printerState)}
        <button class="btn btn-danger" {disabled} onclick={() => run('/api/job/cancel', 'Cancel this print?')}>
          Cancel
        </button>
      {/if}
      {#if FINISHED.includes(printerState)}
        <button class="btn btn-primary" {disabled} onclick={() => run('/api/job/clear')}>Clear plate</button>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <p class="text-sm text-zinc-500">No print in progress.</p>
      <button class="btn btn-primary" disabled={!connected || printerState !== 'ready'} onclick={() => (pickerOpen = true)}>
        Print a file from the printer
      </button>
    </div>
  {/if}
</Section>

<FilePicker bind:open={pickerOpen} />
