<script lang="ts">
  import { toasts } from '../lib/toasts.svelte.ts';
</script>

<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div
      class="pointer-events-auto rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {toast.message}
    </div>
  {/each}
</div>
