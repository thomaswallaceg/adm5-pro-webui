<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, children, class: className = '' }: { title: string; children: Snippet; class?: string } = $props();
</script>

<section class={className}>
  <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">{title}</h3>
  {@render children()}
</section>
