<script lang="ts">
  import { app } from '../state/weather.svelte';
</script>

<!-- Palette closed (e.g. a refresh): a 2px accent line across the top of the window and nothing else.
     While the palette is open it shows the loading state itself. The panels desaturate in App.svelte. -->
{#if app.loading && !app.paletteOpen}
  <div class="line on-dark" aria-hidden="true"></div>
{/if}
<div class="sr-only" aria-live="polite">{app.loading ? `Loading ${app.loadingLabel}…` : ''}</div>

<style>
  .line {
    position: fixed;
    inset: 0 0 auto 0;
    height: 2px;
    z-index: 60;
    overflow: hidden;
    pointer-events: none;
  }
  .line::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: var(--accent);
    animation: sweep 1.1s var(--ease-inout) infinite;
  }
  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(290%);
    }
  }
  /* Reduced: no sweep, a steady full-width line. Static: nothing moves, but the line still shows. */
  :global([data-motion='reduced']) .line::after,
  :global([data-motion='static']) .line::after {
    width: 100%;
    animation: none !important;
  }
</style>
