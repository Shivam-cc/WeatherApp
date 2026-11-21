<script lang="ts">
  import Icon from './Icon.svelte';
  import { app } from '../state/weather.svelte';
</script>

<div class="empty">
  <h1>Search a city</h1>
  <p class="muted">See the sky wherever you are curious about.</p>
  <button class="glass" onclick={() => (app.paletteOpen = true)}>
    <Icon name="search" /> Search <kbd>Ctrl K</kbd>
  </button>
</div>

<style>
  .empty {
    grid-row: 1 / -1;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.75rem;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 300;
  }
  p {
    margin: 0 0 1rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1.25rem;
    font-weight: 500;
  }
  kbd {
    font: inherit;
    font-size: 0.75rem;
    opacity: 0.7;
  }
</style>
