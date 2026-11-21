<script lang="ts">
  // Dev-only: a slider per uniform. Dragging snaps the scene so you see each value immediately.
  import type { Scene } from '../scene/Scene';
  import { RANGES, TWEEN_KEYS } from '../scene/uniforms';

  let { scene, reset }: { scene: Scene; reset: () => void } = $props();
  // svelte-ignore state_referenced_locally (initial snapshot is intended)
  let vals = $state({ ...scene.tween.current });
  let fps = $state(0);
  let tier = $state('');

  $effect(() => {
    const id = setInterval(() => ((fps = Math.round(scene.fps)), (tier = scene.tier.name)), 500);
    return () => clearInterval(id);
  });

  function set(k: (typeof TWEEN_KEYS)[number], v: number) {
    vals[k] = v;
    scene.snap({ [k]: v });
  }
</script>

<details class="lab glass">
  <summary>SceneLab · {fps} fps · {tier}</summary>
  {#each TWEEN_KEYS as k}
    <label>
      <span>{k}</span>
      <input type="range" min={RANGES[k][0]} max={RANGES[k][1]} step="0.01" value={vals[k]} oninput={(e) => set(k, +e.currentTarget.value)} />
      <output>{vals[k].toFixed(2)}</output>
    </label>
  {/each}
  <button onclick={() => { reset(); vals = { ...scene.tween.current }; }}>Back to live data</button>
</details>

<style>
  .lab {
    position: fixed;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 30;
    padding: 0.5rem 0.75rem;
    font-size: 0.7rem;
    background: var(--band-bg);
  }
  summary {
    cursor: pointer;
  }
  label {
    display: grid;
    grid-template-columns: 7.5rem 7rem 2.5rem;
    align-items: center;
    gap: 0.4rem;
  }
  button {
    margin-top: 0.4rem;
    text-decoration: underline;
  }
</style>
