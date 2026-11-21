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
  import SkyCanvas from './components/SkyCanvas.svelte';
  import SceneLab from './dev/SceneLab.svelte';
  import type { Scene } from './scene/Scene';
  import { app, restore, settings } from './state/weather.svelte';
  import { temp } from './lib/format';
  import { fly } from 'svelte/transition';
  import { DUR, flyParams } from './motion/tokens';

  let tab = $state(0);
  let dir = $state(1); // slide direction of the incoming tab content
  const setTab = (n: number) => {
    dir = Math.sign(n - tab) || 1;
    tab = n;
  };
  let sky: SkyCanvas | undefined = $state();
  let scene: Scene | undefined = $state.raw();
  const w = $derived(app.weather);

  restore();

  // CSS hooks for Settings -> Motion (Full / Reduced / Static).
  $effect(() => {
    document.documentElement.dataset.motion = settings.motion;
  });
</script>

<SkyCanvas bind:this={sky} onready={(s) => (scene = s)} />
{#if import.meta.env.DEV && scene}<SceneLab {scene} reset={() => sky?.applyData()} />{/if}

<main class="app" class:loading={app.loading}>
  {#if w}
    <section class="top">
      <div class="enter" style="--i: 0"><HeroPanel /></div>
      <div class="enter" style="--i: 1"><TimePanel /></div>
    </section>
    <section class="band on-dark">
      <div class="left enter" style="--i: 2">
        <Tabs active={tab} onselect={setTab} />
        <div id="panel" role="tabpanel" aria-labelledby="tab-{tab}">
          {#key tab}
            <div in:fly={flyParams(dir * 12, 0, DUR.base)}>
              {#if tab === 0}<MetricsGrid />{:else if tab === 1}<HourlyTimeline />{:else}<DailyChart />{/if}
            </div>
          {/key}
        </div>
      </div>
      <div class="right enter" style="--i: 3"><DayPartCards /></div>
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
