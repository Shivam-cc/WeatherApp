<script lang="ts">
  import { app, settings } from '../state/weather.svelte';
  import { Scene } from '../scene/Scene';
  import { IDLE, targetsFor } from '../scene/presets';

  let { onready }: { onready?: (s: Scene) => void } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let scene: Scene | undefined;
  let first = true;

  export function applyData() {
    const t = app.weather ? targetsFor(app.weather, new Date()) : IDLE;
    if (first) scene?.snap(t);
    else scene?.setTarget(t);
    first = false;
  }

  $effect(() => {
    if (!canvas) return;
    try {
      scene = new Scene(canvas);
    } catch (e) {
      console.warn('Sky disabled:', e); // the CSS gradient on <body> stays as the fallback
      return;
    }
    onready?.(scene);
    const move = (e: PointerEvent) => scene?.setParallax((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointermove', move);
      scene?.dispose();
      scene = undefined;
    };
  });

  // New data → tween to it; also refresh the sun position every minute.
  $effect(() => {
    app.weather;
    applyData();
    const id = setInterval(applyData, 60_000);
    return () => clearInterval(id);
  });

  // Reduced-motion preference or Settings → Motion freezes the scene on a static frame.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = $state(reduce.matches);
  reduce.onchange = () => (reduced = reduce.matches);
  $effect(() => {
    if (scene) scene.animate = settings.motion === 'full' && !reduced;
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
