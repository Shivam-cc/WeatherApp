<script lang="ts">
  import { onMount } from 'svelte';

  // Odometer: each digit is a 0-9 strip that slides to its value. With `countUp` it rolls up from 0 on mount.
  let { value, dur = 600, countUp = false }: { value: string; dur?: number; countUp?: boolean } = $props();

  let ready = $state(false);
  onMount(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => (ready = true)));
  });
  const shown = $derived(countUp && !ready ? value.replace(/\d/g, '0') : value);
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
</script>

<span class="roll" role="img" aria-label={value} style="--dur: {dur}ms">
  {#each [...shown] as c, i (i)}
    {#if c >= '0' && c <= '9'}
      <span class="d" aria-hidden="true">
        <span class="strip" style="transform: translateY({-Number(c)}em)">
          {#each digits as n}<span>{n}</span>{/each}
        </span>
      </span>
    {:else}
      <span aria-hidden="true">{c}</span>
    {/if}
  {/each}
</span>

<style>
  .roll {
    display: inline-flex;
    line-height: 1;
  }
  .d {
    display: inline-block;
    height: 1em;
    overflow: hidden;
  }
  .strip {
    display: flex;
    flex-direction: column;
    transition: transform var(--dur) var(--ease-out);
  }
  .strip span {
    height: 1em;
    line-height: 1;
  }
</style>
