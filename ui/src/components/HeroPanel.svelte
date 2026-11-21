<script lang="ts">
  import Icon from './Icon.svelte';
  import { app, settings } from '../state/weather.svelte';
  import Roll from './Roll.svelte';
  import LetterFade from './LetterFade.svelte';
  import { DUR } from '../motion/tokens';
  import { skyIcon, temp } from '../lib/format';

  const w = $derived(app.weather!);
  // The unit toggle rolls a little faster than a new city's numbers; the toggle sets this in the same tick as the unit.
  let dur = $state<number>(DUR.roll);
  $effect.pre(() => {
    app.weather;
    dur = DUR.roll;
  });
</script>

<section class="glass drops hero" aria-label="Current weather">
  <div class="row">
    <span class="temp"><Roll value={temp(w.current.tempC, settings.temp)} {dur} /></span>
    <div class="toggle" role="group" aria-label="Temperature unit">
      {#each ['C', 'F'] as const as u}
        <button aria-label={u === 'C' ? 'Celsius' : 'Fahrenheit'} aria-pressed={settings.temp === u} onclick={() => ((dur = DUR.unit), (settings.temp = u))}>{u}</button>
      {/each}
    </div>
    <div class="cond">
      <Icon name={skyIcon(w.current.sky, w.current.isDay)} size={2} />
      <span>{w.current.conditionText}</span>
    </div>
  </div>
  <h1><LetterFade text={w.location.name} /></h1>
  <p class="muted region">{[w.location.region, w.location.country].filter(Boolean).join(', ')}</p>
  <button class="change" onclick={() => (app.paletteOpen = true)}>
    <Icon name="pin" size={1} /> Change location
  </button>
</section>

<style>
  .hero {
    padding: 1.25rem 1.5rem;
    min-width: 21rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .temp {
    font-size: 6rem;
    font-weight: 300;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .toggle {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .toggle button {
    padding: 0.15rem 0.5rem;
    border-radius: 0.5rem;
    color: var(--ink-muted);
  }
  .toggle button[aria-pressed='true'] {
    background: var(--glass-border);
    color: var(--ink);
  }
  .cond {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    font-weight: 500;
  }
  h1 {
    margin: 0.5rem 0 0;
    font-size: 2rem;
    font-weight: 500;
  }
  .region {
    margin: 0.1rem 0 0.75rem;
    font-size: 0.95rem;
  }
  .change {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--accent);
  }
</style>
