<script lang="ts">
  import { app, settings } from '../state/weather.svelte';
  import { hourLabel, smooth, temp } from '../lib/format';

  const COL = 56; // viewBox units per hour; the real width is 3.5rem per hour
  const H = 48;
  const hours = $derived(app.weather!.hourly);
  const path = $derived.by(() => {
    const ts = hours.map((h) => h.tempC);
    const [lo, hi] = [Math.min(...ts), Math.max(...ts)];
    return smooth(ts.map((t, i) => [i * COL + COL / 2, H - 6 - ((t - lo) / Math.max(hi - lo, 1)) * (H - 12)]));
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable region must be keyboard reachable) -->
<div class="scroll" role="region" aria-label="Hourly forecast" tabindex="0">
  <div class="inner" style="width: {hours.length * 3.5}rem">
    <div class="row">
      {#each hours as h, i}
        <span class:now={i === 0}>{i === 0 ? 'Now' : hourLabel(h.time, settings.hour12)}</span>
      {/each}
    </div>
    <svg viewBox="0 0 {hours.length * COL} {H}" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
    <div class="row temps">
      {#each hours as h}<span>{temp(h.tempC, settings.temp)}</span>{/each}
    </div>
    <div class="row bars">
      {#each hours as h}
        <span title="{Math.round(h.precipProb)}% chance of precipitation">
          <i style="height: {h.precipProb * 0.4}%"></i>
          <small class="muted">{Math.round(h.precipProb)}%</small>
        </span>
      {/each}
    </div>
  </div>
</div>

<style>
  .scroll {
    overflow-x: auto;
    padding: 0.5rem 0;
    scrollbar-width: thin;
  }
  .row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .now {
    color: var(--accent);
  }
  svg {
    display: block;
    width: 100%;
    height: 2.25rem;
  }
  .temps {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .bars span {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    height: 2.75rem;
    gap: 0.15rem;
  }
  i {
    width: 0.6rem;
    min-height: 2px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--ink) 55%, transparent);
  }
  small {
    font-size: 0.65rem;
  }
</style>
