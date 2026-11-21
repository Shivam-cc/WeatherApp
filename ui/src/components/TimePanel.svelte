<script lang="ts">
  import Icon from './Icon.svelte';
  import { app, settings } from '../state/weather.svelte';
  import { clock, longDate } from '../lib/format';

  const w = $derived(app.weather!);
  const zones = $derived([
    { label: 'Local', tz: w.timezone },
    { label: 'UTC', tz: 'UTC' },
    { label: 'EST', tz: 'America/New_York' },
    { label: 'IST', tz: 'Asia/Kolkata' },
    { label: 'JST', tz: 'Asia/Tokyo' },
  ]);

  let now = $state(new Date());
  let sel = $state(0);
  const tz = $derived(zones[sel].tz);

  $effect(() => {
    const id = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(id);
  });
</script>

<section class="glass time" aria-label="Local time">
  <div class="clock">{clock(now, tz, settings.hour12)}</div>
  <div class="muted date">{longDate(now, tz)}</div>
  <div class="chips">
    {#each zones as z, i}
      <button aria-pressed={sel === i} onclick={() => (sel = i)}>{z.label}</button>
    {/each}
    <button class="next" aria-label="Next time zone" onclick={() => (sel = (sel + 1) % zones.length)}>
      <Icon name="arrow" size={1} />
    </button>
  </div>
</section>

<style>
  .time {
    padding: 1.25rem 1.5rem;
    text-align: right;
  }
  .clock {
    font-size: 2.25rem;
    font-weight: 500;
  }
  .date {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }
  .chips {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .chips button {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    color: var(--ink-muted);
  }
  .chips button[aria-pressed='true'] {
    background: var(--glass-border);
    color: var(--ink);
  }
  .next {
    display: grid;
    place-items: center;
  }
</style>
