<script lang="ts">
  import { app, settings } from '../state/weather.svelte';
  import { smooth, temp, weekday } from '../lib/format';

  const W = 500;
  const H = 60;
  const days = $derived(app.weather!.daily);
  const [lo, hi] = $derived([Math.min(...days.map((d) => d.min)), Math.max(...days.map((d) => d.max))]);
  const span = $derived(Math.max(hi - lo, 1));
  const y = (v: number) => H - 6 - ((v - lo) / span) * (H - 12);
  const path = $derived(smooth(days.map((d, i) => [((i + 0.5) / days.length) * W, y(d.max)])));
</script>

<div class="chart" role="img" aria-label="Five day forecast: {days.map((d) => `${weekday(d.date)} ${temp(d.max, settings.temp)}`).join(', ')}">
  <div class="plot">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
      <!-- pathLength=1 lets the draw-on animation use a 0..1 dash regardless of the curve's real length -->
      <path d={path} pathLength="1" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
    {#each days as d, i}
      <i class="pt" style="left: {((i + 0.5) / days.length) * 100}%; top: {(y(d.max) / H) * 100}%; animation-delay: {900 + i * 80}ms"></i>
    {/each}
  </div>
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
  .plot {
    position: relative;
    height: 2.5rem;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  path {
    stroke-dasharray: 1;
    animation: draw var(--dur-draw) var(--ease-inout) backwards;
  }
  @keyframes draw {
    from {
      stroke-dashoffset: 1;
    }
  }
  .pt {
    position: absolute;
    width: 0.5rem;
    height: 0.5rem;
    margin: -0.25rem 0 0 -0.25rem;
    border-radius: 50%;
    background: var(--accent);
    animation: pop var(--dur-base) var(--ease-out) backwards;
  }
  @keyframes pop {
    from {
      transform: scale(0);
      opacity: 0;
    }
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
