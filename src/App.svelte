<script lang="ts">
  import CameraView from './components/CameraView.svelte';
  import ConnectionForm from './components/ConnectionForm.svelte';
  import JobPanel from './components/JobPanel.svelte';
  import Modal from './components/Modal.svelte';
  import Panel from './components/Panel.svelte';
  import PrinterPanel from './components/PrinterPanel.svelte';
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
    <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
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

  <main class="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
    {#if status?.connection === 'unconfigured'}
      <Panel title="Connect your printer" class="mx-auto w-full max-w-lg lg:col-span-2">
        <ConnectionForm />
      </Panel>
    {:else}
      <div class="flex min-w-0 flex-col gap-4">
        <Panel title="Camera">
          <CameraView {connected} />
        </Panel>
        <JobPanel {snapshot} {connected} />
      </div>
      <PrinterPanel {snapshot} {connected} />
    {/if}
  </main>
</div>

<Modal bind:open={settingsOpen} title="Printer connection">
  <ConnectionForm onsaved={() => (settingsOpen = false)} />
</Modal>

<Toasts />
