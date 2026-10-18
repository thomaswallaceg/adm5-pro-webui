<script lang="ts">
  import { getConfig, saveConfig } from '../lib/api.ts';
  import { refreshStatus } from '../lib/printer.svelte.ts';

  let { onsaved }: { onsaved?: () => void } = $props();

  let ipAddress = $state('');
  let serialNumber = $state('');
  let checkCode = $state('');
  let hasCheckCode = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    void getConfig().then((config) => {
      if (config) {
        ipAddress = config.ipAddress;
        serialNumber = config.serialNumber;
        hasCheckCode = config.hasCheckCode;
      }
    });
  });

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    saving = true;
    error = null;
    const result = await saveConfig({ ipAddress, serialNumber, checkCode: checkCode || undefined });
    saving = false;
    if (!result.ok) {
      error = result.error ?? 'Could not save the settings';
      return;
    }
    checkCode = '';
    await refreshStatus();
    onsaved?.();
  }
</script>

<form class="flex flex-col gap-4" onsubmit={save}>
  <p class="text-sm text-zinc-500">
    The IP address and serial number are in the printer's settings. The check code appears on the printer's
    screen when you turn on LAN-only mode.
  </p>
  <label class="flex flex-col gap-1 text-sm font-medium">
    IP address
    <input class="input" required bind:value={ipAddress} placeholder="192.168.1.100" autocomplete="off" />
  </label>
  <label class="flex flex-col gap-1 text-sm font-medium">
    Serial number
    <input class="input" required bind:value={serialNumber} placeholder="SNMOMF…" autocomplete="off" />
  </label>
  <label class="flex flex-col gap-1 text-sm font-medium">
    Check code
    <input
      class="input"
      type="password"
      required={!hasCheckCode}
      bind:value={checkCode}
      placeholder={hasCheckCode ? 'Unchanged' : '8 characters'}
      autocomplete="off"
    />
  </label>
  {#if error}
    <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
  {/if}
  <button type="submit" class="btn btn-primary self-end" disabled={saving}>
    {saving ? 'Connecting…' : 'Save and connect'}
  </button>
</form>
