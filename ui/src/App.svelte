<script lang="ts">
  import HeroPanel from './components/HeroPanel.svelte';
  import TimePanel from './components/TimePanel.svelte';
  import Tabs from './components/Tabs.svelte';
  import MetricsGrid from './components/MetricsGrid.svelte';
  import HourlyTimeline from './components/HourlyTimeline.svelte';
  import DailyChart from './components/DailyChart.svelte';
  import DayPartCards from './components/DayPartCards.svelte';
  import SearchPalette from './components/SearchPalette.svelte';
  import SettingsSheet from './components/SettingsSheet.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import LoadingState from './components/LoadingState.svelte';
  import Toast from './components/Toast.svelte';
  import { app, restore, settings } from './state/weather.svelte';
  import { temp } from './lib/format';

  let tab = $state(0);
  const w = $derived(app.weather);

  restore();
</script>

<main class="app" class:loading={app.loading}>
  {#if w}
    <section class="top">
      <HeroPanel />
      <TimePanel />
    </section>
    <section class="band">
      <div class="left">
        <Tabs bind:active={tab} />
        <div id="panel" role="tabpanel" aria-labelledby="tab-{tab}">
          {#if tab === 0}<MetricsGrid />{:else if tab === 1}<HourlyTimeline />{:else}<DailyChart />{/if}
        </div>
      </div>
      <div class="right"><DayPartCards /></div>
    </section>
  {:else}
    <EmptyState />
  {/if}
</main>

<LoadingState />
<SearchPalette />
<SettingsSheet />
<Toast />
<div class="sr-only" aria-live="polite">
  {#if w}{w.location.name}: {temp(w.current.tempC, settings.temp)}, {w.current.conditionText}{/if}
</div>

<style>
  .app {
    height: 100vh;
    display: grid;
    grid-template-rows: 62fr 38fr;
    /* Placeholder sky until the WebGL scene lands in Phase 5. */
    background: linear-gradient(180deg, #2b3a67 0%, #8a5a83 55%, #ffb38a 100%);
    transition: filter var(--dur-base);
  }
  .app.loading {
    filter: saturate(0.6);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: clamp(1rem, 1.5vw, 3rem);
  }
  .band {
    display: grid;
    grid-template-columns: 58fr 42fr;
    gap: clamp(1rem, 2vw, 3rem);
    padding: 0.75rem clamp(1rem, 1.5vw, 3rem) clamp(1rem, 1.5vw, 3rem);
    background: var(--band-bg);
    backdrop-filter: blur(var(--blur));
    min-height: 0;
  }
  .left,
  .right {
    min-width: 0;
  }
</style>
