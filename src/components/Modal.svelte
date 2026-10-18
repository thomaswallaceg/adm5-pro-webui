<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open = $bindable(false), title, children }: { open: boolean; title: string; children: Snippet } =
    $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });
</script>

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  onclick={(event) => event.target === dialog && (open = false)}
  class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
>
  <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
    <h2 class="font-semibold">{title}</h2>
    <button class="btn px-2" aria-label="Close" onclick={() => (open = false)}>✕</button>
  </div>
  <div class="p-4">
    {#if open}
      {@render children()}
    {/if}
  </div>
</dialog>
