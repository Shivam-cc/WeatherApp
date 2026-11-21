<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import { flyParams } from '../motion/tokens';
  import { app, dismissToast } from '../state/weather.svelte';
</script>

<div class="toasts" role="alert" aria-live="assertive">
  {#each app.toasts as t (t.id)}
    <div class="glass toast on-dark" in:fly={flyParams(0, 24)} out:fade={{ duration: 160 }}>
      <span>{t.text}</span>
      <button aria-label="Dismiss" onclick={() => dismissToast(t.id)}><Icon name="close" size={1} /></button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: 1.5rem;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 50;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    background: var(--band-bg);
  }
</style>
