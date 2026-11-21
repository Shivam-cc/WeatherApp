<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { app, loadCity, loadLocation, toast } from '../state/weather.svelte';
  import { searchCity } from '../lib/api';
  import { DUR } from '../motion/tokens';
  import { restoreFocus } from '../lib/focus';
  import type { Location } from '../bindings/Location';

  let q = $state('');
  let results = $state<Location[]>([]);
  let idx = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let seq = 0;
  let retry = ''; // query to restore if a submitted search fails
  let shake = $state(false);

  const items = $derived(q.trim() ? results : app.recents);

  // 250ms debounce; `seq` drops answers that arrive after a newer query.
  $effect(() => {
    const term = q.trim();
    idx = 0;
    if (!term) return void (results = []);
    const id = setTimeout(async () => {
      const n = ++seq;
      try {
        const r = await searchCity(term);
        if (n === seq) results = r;
      } catch (e) {
        if (n === seq) toast(String(e));
      }
    }, 250);
    return () => clearTimeout(id);
  });

  $effect(() => {
    if (!app.paletteOpen) return restoreFocus();
    const failed = retry !== ''; // plain variable: reading `shake` here would make this effect re-run
    q = retry;
    retry = '';
    if (failed) {
      shake = true;
      setTimeout(() => (shake = false), DUR.shake);
    }
    tick().then(() => input?.focus());
  });

  // Close at once so the loader shows; if the search fails, reopen with the same text and shake the field.
  async function submit(go: () => Promise<boolean>) {
    const typed = q.trim();
    app.paletteOpen = false;
    await tick(); // let the close flush so reopening below re-runs the open effect
    if (!(await go())) {
      retry = typed;
      app.paletteOpen = true;
    }
  }

  const pick = (l: Location) => submit(() => loadLocation(l));

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') app.paletteOpen = false;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    } else if (e.key === 'Enter') {
      if (items[idx]) pick(items[idx]);
      else if (q.trim()) submit(() => loadCity(q.trim()));
    }
  }

  function global(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      app.paletteOpen = !app.paletteOpen;
    }
  }
</script>

<svelte:window onkeydown={global} />

{#if app.paletteOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={() => (app.paletteOpen = false)}></div>
  <div class="glass palette on-dark" role="dialog" aria-modal="true" aria-label="Search location">
    <div class="field" class:shake>
      <Icon name="search" />
      <input
        bind:this={input}
        bind:value={q}
        onkeydown={key}
        role="combobox"
        aria-expanded="true"
        aria-controls="results"
        aria-activedescendant={items[idx] ? `r${idx}` : undefined}
        aria-label="City"
        placeholder="Search city"
        autocomplete="off"
      />
    </div>
    <ul id="results" role="listbox" aria-label={q.trim() ? 'Suggestions' : 'Recent cities'}>
      {#each items as l, i}
        <li id="r{i}" role="option" aria-selected={i === idx}>
          <button tabindex="-1" onmouseenter={() => (idx = i)} onclick={() => pick(l)}>
            <b>{l.name}</b>
            <span class="muted">{[l.region, l.country].filter(Boolean).join(', ')}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 40;
  }
  .palette {
    position: fixed;
    top: 18vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(32rem, 90vw);
    z-index: 41;
    background: var(--band-bg);
    overflow: hidden;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid var(--glass-border);
  }
  input {
    flex: 1;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    font-size: 1.1rem;
    outline: none;
  }
  .field.shake {
    animation: shake var(--dur-shake, 400ms) linear;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0.4rem;
  }
  li button {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 0.6rem;
    font-size: 0.9rem;
  }
  li[aria-selected='true'] button {
    background: var(--glass-border);
  }
</style>
