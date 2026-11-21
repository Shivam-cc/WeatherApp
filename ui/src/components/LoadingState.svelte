<script lang="ts">
  import { fade } from 'svelte/transition';
  import { app } from '../state/weather.svelte';
  import { DUR } from '../motion/tokens';
</script>

<!-- The search bar becomes a shimmering pill while data loads; the panels desaturate (see App.svelte). -->
{#if app.loading}
  <div class="glass pill on-dark" role="progressbar" aria-label="Loading weather" transition:fade={{ duration: DUR.base }}></div>
{/if}

<style>
  .pill {
    position: fixed;
    top: 1rem;
    left: 50%;
    width: 14rem;
    height: 2.25rem;
    margin-left: -7rem;
    z-index: 60;
    overflow: hidden;
  }
  .pill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent) 0 0 / 40% 100% no-repeat;
    animation: shimmer 1.1s linear infinite;
  }
  @keyframes shimmer {
    from {
      background-position: -40% 0;
    }
    to {
      background-position: 140% 0;
    }
  }
</style>
