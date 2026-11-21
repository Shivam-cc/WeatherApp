import { cubicInOut, expoOut } from 'svelte/easing';
import { settings } from '../state/weather.svelte';

/** Mirrors the CSS custom properties in styles/tokens.css (milliseconds). */
export const DUR = {
  fast: 160,
  base: 320,
  slow: 700,
  scene: 2500,
  ink: 400,
  launchSky: 900,
  roll: 600, // numbers rolling to new data
  unit: 450, // C/F toggle
  shake: 400,
  draw: 900, // daily chart path
  toast: 4000,
} as const;

export const EASE = { out: expoOut, inOut: cubicInOut } as const;

const reduceQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Full motion only when neither Settings nor the OS asks for less. */
export const motionOn = () => settings.motion === 'full' && !reduceQuery?.matches;

/** Fly params that fall back to a plain cross-fade when motion is reduced. */
export const flyParams = (x = 0, y = 0, duration: number = DUR.base) => ({
  x: motionOn() ? x : 0,
  y: motionOn() ? y : 0,
  duration: settings.motion === 'static' ? 0 : duration,
  easing: EASE.out,
});
