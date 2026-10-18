<script lang="ts">
  let { connected }: { connected: boolean } = $props();

  const RETRY_DELAY_MS = 3000;
  let attempt = $state(0);
  let failed = $state(false);

  function retryLater(): void {
    failed = true;
    setTimeout(() => {
      failed = false;
      attempt++;
    }, RETRY_DELAY_MS);
  }
</script>

<div class="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">
  {#if connected && !failed}
    {#key attempt}
      <img
        src={`/api/camera?attempt=${attempt}`}
        alt="Printer camera"
        class="size-full object-contain"
        onerror={retryLater}
      />
    {/key}
  {:else}
    <div class="flex size-full items-center justify-center text-sm text-zinc-500">
      {connected ? 'Reconnecting to the camera…' : 'Camera unavailable'}
    </div>
  {/if}
</div>
