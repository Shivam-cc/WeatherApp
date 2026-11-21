<script lang="ts">
  import Icon from './Icon.svelte';
  import Roll from './Roll.svelte';
  import { app, settings } from '../state/weather.svelte';
  import { speed, temp, visibility } from '../lib/format';

  const w = $derived(app.weather!);
  const cells = $derived([
    ['humidity', 'Humidity', `${Math.round(w.current.humidity)}%`],
    ['pressure', 'Pressure', `${Math.round(w.current.pressureHpa)} mb`],
    ['visibility', 'Visibility', visibility(w.current.visibilityM, settings.speed)],
    ['wind', 'Wind', speed(w.current.windKmh, settings.speed)],
    ['uv', 'UV Index', String(Math.round(w.today.uvIndexMax))],
    ['dew', 'Dew Point', temp(w.current.dewPointC, settings.temp)],
  ]);
</script>

<dl class="grid">
  {#each cells as [icon, label, value]}
    <div class="cell">
      <Icon name={icon} size={1.5} />
      <div>
        <dt class="muted">{label}</dt>
        <dd><Roll {value} countUp /></dd>
      </div>
    </div>
  {/each}
</dl>

<style>
  .grid {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-flow: row;
    gap: 0.9rem 1.5rem;
    padding: 1rem 0.25rem;
  }
  .cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  dt {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  dd {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }
</style>
