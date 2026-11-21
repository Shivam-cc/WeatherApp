<script lang="ts">
  import { app, settings } from '../state/weather.svelte';
  import { smooth, temp, weekday } from '../lib/format';

  const W = 500;
  const H = 60;
  const days = $derived(app.weather!.daily);
  const [lo, hi] = $derived([Math.min(...days.map((d) => d.min)), Math.max(...days.map((d) => d.max))]);
  const span = $derived(Math.max(hi - lo, 1));
  const path = $derived(
    smooth(days.map((d, i) => [((i + 0.5) / days.length) * W, H - 6 - ((d.max - lo) / span) * (H - 12)])),
  );
</script>

<div class="chart" role="img" aria-label="Five day forecast: {days.map((d) => `${weekday(d.date)} ${temp(d.max, settings.temp)}`).join(', ')}">
  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
    <path d={path} fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
  </svg>
  <div class="cols">
    {#each days as d, i}
      <div class="col" class:today={i === 0}>
        <span class="muted">{i === 0 ? 'Today' : weekday(d.date)}</span>
        <b>{temp(d.max, settings.temp)}</b>
        <span class="range"><i style="bottom: {((d.min - lo) / span) * 100}%; height: {((d.max - d.min) / span) * 100}%"></i></span>
        <span class="muted">{temp(d.min, settings.temp)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .chart {
    padding: 0.5rem 0;
  }
  svg {
    display: block;
    width: 100%;
    height: 2.5rem;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    text-align: center;
  }
  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
  }
  .today > span:first-child {
    color: var(--accent);
  }
  b {
    font-size: 1.1rem;
    font-weight: 600;
  }
  .range {
    position: relative;
    width: 0.35rem;
    height: 2.5rem;
    border-radius: 3px;
    background: var(--glass-bg);
  }
  .range i {
    position: absolute;
    left: 0;
    width: 100%;
    border-radius: 3px;
    background: var(--accent);
  }
</style>
