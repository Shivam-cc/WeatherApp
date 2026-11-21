<script lang="ts">
  const TABS = ['Today’s Forecast', 'Hourly Forecast', 'Daily Forecast'] as const;
  let { active, onselect }: { active: number; onselect: (n: number) => void } = $props();

  function key(e: KeyboardEvent) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = (active + d + TABS.length) % TABS.length;
    onselect(next);
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role=tab]')[next].focus();
  }
</script>

<div class="tabs" role="tablist" aria-label="Forecast view" tabindex="-1" onkeydown={key}>
  {#each TABS as t, i}
    <button role="tab" id="tab-{i}" aria-selected={active === i} aria-controls="panel" tabindex={active === i ? 0 : -1} onclick={() => onselect(i)}>{t}</button>
  {/each}
  <span class="bar" style="transform: translateX({active * 100}%)"></span>
</div>

<style>
  .tabs {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid var(--glass-border);
  }
  button {
    padding: 0.6rem 0.25rem;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--ink-muted);
  }
  button[aria-selected='true'] {
    color: var(--ink);
  }
  .bar {
    position: absolute;
    left: 0;
    bottom: -1px;
    width: calc(100% / 3);
    height: 2px;
    background: var(--accent);
    transition: transform var(--dur-base) var(--ease-inout);
  }
</style>
