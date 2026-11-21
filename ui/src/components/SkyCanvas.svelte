<script lang="ts">
  import { app, settings } from '../state/weather.svelte';
  import { Scene } from '../scene/Scene';
  import { IDLE, presetTargets, targetsFor } from '../scene/presets';
  import { devParams } from '../scene/devParams';

  let { onready }: { onready?: (s: Scene) => void } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let scene: Scene | undefined = $state.raw();
  let first = true;
  const dev = devParams();

  export function applyData() {
    const now = dev.time ?? new Date();
    const w = app.weather;
    const t = dev.preset ? presetTargets(dev.preset, now) : w ? targetsFor(w, now) : IDLE;
    // Glass droplets fade in on the panels once rain is heavy.
    document.documentElement.style.setProperty('--rain', String(Math.max(0, ((t.uPrecip ?? 0) - 0.4) / 0.6)));
    if (!scene) return; // the effect below re-runs once the scene exists, and that first call snaps
    scene.thunder = (dev.preset ?? w?.current.sky) === 'Thunderstorm';
    if (first) scene.snap(t);
    else scene.setTarget(t);
    first = false;
  }

  $effect(() => {
    if (!canvas) return;
    let s: Scene;
    try {
      s = new Scene(canvas, dev.seed, dev.at);
    } catch (e) {
      console.warn('Sky disabled:', e); // the CSS gradient on <body> stays as the fallback
      return;
    }
    scene = s;
    onready?.(s);
    const move = (e: PointerEvent) => s.setParallax((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointermove', move);
      s.dispose();
      scene = undefined;
    };
  });

  // New data → tween to it; also refresh the sun position every minute.
  $effect(() => {
    app.weather;
    scene;
    applyData();
    const id = setInterval(applyData, 60_000);
    return () => clearInterval(id);
  });

  // Reduced-motion preference or Settings → Motion freezes the scene on a static frame.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = $state(reduce.matches);
  reduce.onchange = () => (reduced = reduce.matches);
  $effect(() => {
    if (scene) scene.animate = settings.motion === 'full' && !reduced && !dev.static;
  });
  $effect(() => {
    scene?.setQuality(settings.quality);
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }
</style>
