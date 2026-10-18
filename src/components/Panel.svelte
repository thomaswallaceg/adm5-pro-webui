<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    actions,
    children,
    class: className = '',
  }: { title: string; actions?: Snippet; children: Snippet; class?: string } = $props();
</script>

<section
  class={[
    'rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
    className,
  ]}
>
  <header class="mb-3 flex min-h-8 items-center justify-between gap-2">
    <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">{title}</h2>
    {@render actions?.()}
  </header>
  {@render children()}
</section>
