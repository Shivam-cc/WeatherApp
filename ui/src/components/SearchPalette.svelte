<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { app, cancelLoad, loadCity, loadLocation, toast } from '../state/weather.svelte';
  import { searchCity } from '../lib/api';
  import { DUR } from '../motion/tokens';
  import { restoreFocus } from '../lib/focus';
  import type { Location } from '../bindings/Location';

  let q = $state('');
  let results = $state<Location[]>([]);
  let idx = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let seq = 0;
  let busy = $state(''); // city being loaded while the palette stays open
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
    q = '';
    busy = '';
    shake = false;
    tick().then(() => input?.focus());
  });

  // The palette stays open while loading. Success closes it; failure keeps the typed text and shakes the field.
  async function submit(label: string, go: () => Promise<boolean>) {
    if (busy) return;
    busy = label;
    const ok = await go();
    if (!busy) return; // cancelled with Esc: ignore the late result
    busy = '';
    if (ok) app.paletteOpen = false;
    else {
      shake = true;
      setTimeout(() => (shake = false), DUR.shake);
      tick().then(() => input?.focus());
    }
  }

  function close() {
    if (busy) (cancelLoad(), (busy = ''));
    app.paletteOpen = false;
  }

  const pick = (l: Location) => submit(l.name, () => loadLocation(l));

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') e.preventDefault(); // the field is the only stop, so keep focus on it
    else if (busy) return;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    } else if (e.key === 'Enter') {
      if (items[idx]) pick(items[idx]);
      else if (q.trim()) submit(q.trim(), () => loadCity(q.trim()));
    }
  }

  function global(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (app.paletteOpen) close();
      else app.paletteOpen = true;
    }
  }
</script>

<svelte:window onkeydown={global} />

{#if app.paletteOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={close}></div>
  <div class="glass palette on-dark" role="dialog" aria-modal="true" aria-label="Search location" aria-busy={!!busy}>
    <div class="field" class:shake class:busy={!!busy}>
      {#if busy}<span class="spin" aria-hidden="true"></span>{:else}<Icon name="search" />{/if}
      <input
        bind:this={input}
        value={busy ? `Loading ${busy}…` : q}
        oninput={(e) => (q = e.currentTarget.value)}
        readonly={!!busy}
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
    <div class="list" class:busy={!!busy} aria-hidden={!!busy}>
    <ul id="results" role="listbox" aria-label={q.trim() ? 'Suggestions' : 'Recent cities'}>
      {#each items as l, i}
        <!-- svelte-ignore a11y_click_events_have_key_events (keys are handled on the combobox input) -->
        <li id="r{i}" role="option" aria-selected={i === idx} onmouseenter={() => (idx = i)} onclick={() => pick(l)}>
          <b>{l.name}</b>
          <span class="muted">{[l.region, l.country].filter(Boolean).join(', ')}</span>
        </li>
      {/each}
    </ul>
    </div>
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
    isolation: isolate; /* nothing animated inside can paint outside the rounded corners */
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
  .spin {
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--glass-border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse {
    50% {
      opacity: 0.4;
    }
  }
  .busy input {
    color: var(--ink-muted);
  }
  /* Suggestions fade out and collapse while loading. */
  .list {
    display: grid;
    grid-template-rows: 1fr;
    transition:
      grid-template-rows var(--dur-base) var(--ease-out),
      opacity var(--dur-base);
  }
  .list > ul {
    min-height: 0;
    overflow: hidden;
  }
  .list.busy {
    grid-template-rows: 0fr;
    opacity: 0;
    pointer-events: none;
  }
  /* Reduced: the ring pulses instead of turning. Static: no spinner, the text alone says it. */
  :global([data-motion='reduced']) .spin {
    animation: pulse 1.2s ease-in-out infinite !important;
  }
  :global([data-motion='static']) .spin {
    display: none;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0.4rem; /* vertical padding lives on the first/last li so the list can collapse to 0 */
  }
  li:first-child {
    margin-top: 0.4rem;
  }
  li:last-child {
    margin-bottom: 0.4rem;
  }
  li {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-radius: 0.6rem;
    font-size: 0.9rem;
  }
  li[aria-selected='true'] {
    background: var(--glass-border);
  }
</style>
