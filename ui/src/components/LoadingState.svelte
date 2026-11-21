<script lang="ts">
  import { app } from '../state/weather.svelte';
</script>

{#if app.loading}
  <div class="shimmer" role="progressbar" aria-label="Loading weather"></div>
{/if}

<style>
  .shimmer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 60;
    background: linear-gradient(90deg, transparent, var(--accent), transparent) 0 0 / 40% 100% no-repeat;
    animation: slide 1.1s linear infinite;
  }
  @keyframes slide {
    from { background-position: -40% 0; }
    to { background-position: 140% 0; }
  }
</style>
