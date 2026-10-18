<script lang="ts">
  import { getFiles, thumbnailUrl } from '../lib/api.ts';
  import { displayFileName } from '../lib/format.ts';
  import { command } from '../lib/printer.svelte.ts';
  import Modal from './Modal.svelte';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let files = $state<string[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selected = $state<string | null>(null);
  let levelFirst = $state(false);
  let starting = $state(false);

  $effect(() => {
    if (open) {
      void load();
    }
  });

  async function load(): Promise<void> {
    loading = true;
    error = null;
    selected = null;
    try {
      const response = await getFiles();
      files = response.files;
      error = response.ok ? null : (response.error ?? 'Could not load the file list');
    } catch {
      error = 'Could not reach the server';
    }
    loading = false;
  }

  async function start(): Promise<void> {
    if (!selected) {
      return;
    }
    starting = true;
    const ok = await command('/api/job/start', { fileName: selected, levelFirst });
    starting = false;
    if (ok) {
      open = false;
    }
  }
</script>

<Modal bind:open title="Print a file">
  {#if loading}
    <p class="py-8 text-center text-sm text-zinc-500">Loading files…</p>
  {:else if error}
    <p class="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
  {:else if files.length === 0}
    <p class="py-8 text-center text-sm text-zinc-500">No files on the printer.</p>
  {:else}
    <ul class="-mx-1 max-h-[55vh] overflow-y-auto">
      {#each files as file (file)}
        <li>
          <button
            class={[
              'flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left text-sm transition-colors',
              selected === file
                ? 'bg-sky-600/15 ring-1 ring-sky-500 ring-inset'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            ]}
            onclick={() => (selected = file)}
            ondblclick={start}
          >
            <img
              src={thumbnailUrl(file)}
              alt=""
              loading="lazy"
              class="size-12 shrink-0 rounded-md bg-zinc-100 object-contain dark:bg-zinc-800"
            />
            <span class="min-w-0 truncate" title={file}>{displayFileName(file)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={levelFirst} class="size-4 accent-sky-600" />
      Level the bed first
    </label>
    <button class="btn btn-primary" disabled={!selected || starting} onclick={start}>
      {starting ? 'Starting…' : 'Print'}
    </button>
  </div>
</Modal>
