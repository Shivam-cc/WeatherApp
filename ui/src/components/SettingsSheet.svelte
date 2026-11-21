<script lang="ts">
  import Icon from './Icon.svelte';
  import { app, settings } from '../state/weather.svelte';
  import { restoreFocus } from '../lib/focus';

  // [label, key, [value, text][]]
  const groups = [
    ['Temperature', 'temp', [['C', '°C'], ['F', '°F']]],
    ['Speed', 'speed', [['kmh', 'km/h'], ['mph', 'mph']]],
    ['Clock', 'hour12', [[true, '12-hour'], [false, '24-hour']]],
    ['Motion', 'motion', [['full', 'Full'], ['reduced', 'Reduced'], ['static', 'Static']]],
    ['Quality', 'quality', [['auto', 'Auto'], ['high', 'High'], ['battery', 'Battery']]],
  ] as const;

  let sheet: HTMLElement | undefined = $state();
  $effect(() => {
    if (app.settingsOpen) sheet?.querySelector('button')?.focus();
    else restoreFocus();
  });
</script>

{#if app.settingsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={() => (app.settingsOpen = false)}></div>
  <div class="glass sheet on-dark" role="dialog" tabindex="-1" aria-modal="true" aria-label="Settings" bind:this={sheet} onkeydown={(e) => e.key === 'Escape' && (app.settingsOpen = false)}>
    <header>
      <h2>Settings</h2>
      <button aria-label="Close settings" onclick={() => (app.settingsOpen = false)}><Icon name="close" /></button>
    </header>
    {#each groups as [label, key, opts]}
      <div class="group" role="group" aria-label={label}>
        <span class="muted">{label}</span>
        <div class="opts">
          {#each opts as [v, text]}
            <button aria-pressed={settings[key] === v} onclick={() => ((settings as Record<string, unknown>)[key] = v)}>{text}</button>
          {/each}
        </div>
      </div>
    {/each}
    <h3>About</h3>
    <p class="muted about">
      Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>, licensed CC BY 4.0, free for non-commercial use.
    </p>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    top: 1rem;
    right: 1rem;
    bottom: 1rem;
    width: 21rem;
    z-index: 41;
    padding: 1.25rem;
    background: var(--band-bg);
    overflow-y: auto;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  h2,
  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  h3 {
    margin-top: 1.5rem;
    font-size: 0.95rem;
  }
  .group {
    margin-top: 1rem;
    font-size: 0.85rem;
  }
  .opts {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.35rem;
  }
  .opts button {
    flex: 1;
    padding: 0.4rem;
    border-radius: 0.6rem;
    border: 1px solid var(--glass-border);
    font-size: 0.8rem;
  }
  .opts button[aria-pressed='true'] {
    background: var(--glass-border);
  }
  .about {
    font-size: 0.8rem;
    line-height: 1.5;
  }
  a {
    color: var(--accent);
  }
</style>
