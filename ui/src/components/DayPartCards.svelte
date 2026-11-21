<script lang="ts">
  import Icon from './Icon.svelte';
  import { app, settings } from '../state/weather.svelte';
  import { skyIcon, temp } from '../lib/format';

  const w = $derived(app.weather!);
  const parts = $derived([
    ['Morning', w.dayParts.morning],
    ['Afternoon', w.dayParts.afternoon],
    ['Evening', w.dayParts.evening],
  ] as const);
</script>

<div class="head">
  <h2>Today’s</h2>
  <button aria-label="Settings" onclick={() => (app.settingsOpen = true)}><Icon name="settings" /></button>
</div>
<div class="cards">
  {#each parts as [label, p]}
    <div class="card">
      <span class="muted label">{label}</span>
      <Icon name={skyIcon(p.sky, label !== 'Evening')} size={1.75} />
      <span class="t">{temp(p.tempC, settings.temp)}</span>
    </div>
  {/each}
</div>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.9rem 0.5rem;
    border-radius: var(--radius-card);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    transition:
      transform var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .card:hover {
    transform: translateY(-2px);
    border-color: var(--glass-highlight);
    box-shadow: 0 0 1.25rem color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .label {
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .t {
    font-size: 1.5rem;
    font-weight: 500;
  }
</style>
