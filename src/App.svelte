<script lang="ts">
  import CameraSection from './components/CameraSection.svelte';
  import ConnectionForm from './components/ConnectionForm.svelte';
  import JobSection from './components/JobSection.svelte';
  import LifetimeStats from './components/LifetimeStats.svelte';
  import Modal from './components/Modal.svelte';
  import PrinterSections from './components/PrinterSections.svelte';
  import Section from './components/Section.svelte';
  import StatusBadge from './components/StatusBadge.svelte';
  import Toasts from './components/Toasts.svelte';
  import { printer, startPolling } from './lib/printer.svelte.ts';

  $effect(() => startPolling());

  let settingsOpen = $state(false);

  const status = $derived(printer.status);
  const snapshot = $derived(status?.printer ?? null);
  const connected = $derived(status?.connection === 'connected');
</script>

<div class="min-h-dvh bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
  <header class="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div class="mx-auto flex max-w-400 items-center gap-3 px-4 py-3">
      <h1 class="truncate text-base font-semibold sm:text-lg">Adventurer 5M Pro</h1>
      <StatusBadge connection={status?.connection ?? null} printerState={snapshot?.state ?? null} />
      {#if status && status.connection !== 'unconfigured'}
        <button class="btn ml-auto shrink-0" onclick={() => (settingsOpen = true)}>Connection</button>
      {/if}
    </div>
  </header>

  {#if !printer.reachable}
    <div class="bg-red-600 px-4 py-2 text-center text-sm text-white">
      Lost connection to the server. Retrying…
    </div>
  {:else if status?.message}
    <div class="bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-300">
      {status.message}
    </div>
  {/if}

  <!--
    On lg the left column holds PrinterSections' four sections, the job and the lifetime stats.
    The stats row is 1fr so it absorbs the extra height from the camera, which spans every row on the right.
  -->
  <main
    class={[
      'mx-auto grid max-w-400 grid-cols-1 gap-x-4 gap-y-5 p-4 lg:grid-cols-[min-content_auto]',
      status?.connection !== 'unconfigured' && 'lg:grid-rows-[repeat(5,auto)_1fr]',
    ]}
  >
    {#if status?.connection === 'unconfigured'}
      <Section title="Connect your printer" class="mx-auto w-full max-w-lg lg:col-span-2">
        <ConnectionForm />
      </Section>
    {:else}
      <PrinterSections {snapshot} {connected} />
      <CameraSection {connected} class="lg:col-start-2 lg:row-span-full" />
      <JobSection {snapshot} {connected} />
      <LifetimeStats {snapshot} />
    {/if}
  </main>
</div>

<Modal bind:open={settingsOpen} title="Printer connection">
  <ConnectionForm onsaved={() => (settingsOpen = false)} />
</Modal>

<Toasts />
