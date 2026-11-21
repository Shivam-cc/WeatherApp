<script lang="ts">
  import { getWeather } from './lib/api';
  import type { Weather } from './bindings/Weather';

  let city = $state('');
  let weather = $state<Weather | null>(null);
  let error = $state('');
  let busy = $state(false);

  async function go(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      weather = await getWeather(city.trim());
    } catch (err) {
      error = String(err);
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={go}>
  <input bind:value={city} placeholder="Search city" aria-label="City" />
  <button disabled={busy}>Search</button>
</form>
{#if error}<p role="alert">{error}</p>{/if}
{#if weather}<pre>{JSON.stringify(weather, null, 2)}</pre>{/if}

<style>
  :global(body) { font-family: system-ui, sans-serif; background: #10131c; color: #fff; padding: 24px; }
</style>
