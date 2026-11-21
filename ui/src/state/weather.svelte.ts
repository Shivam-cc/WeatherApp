import { getWeather, getWeatherAt } from '../lib/api';
import type { Weather } from '../bindings/Weather';
import type { Location } from '../bindings/Location';
import type { SpeedUnit, TempUnit } from '../lib/format';

function saved<T extends object>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') };
  } catch {
    return fallback;
  }
}

// Motion and quality are stored now and consumed by the scene in later phases.
export const settings = $state({
  temp: 'C' as TempUnit,
  speed: 'kmh' as SpeedUnit,
  hour12: true,
  motion: 'full' as 'full' | 'reduced' | 'static',
  quality: 'auto' as 'auto' | 'high' | 'battery',
  ...saved('settings', {}),
});

export const app = $state({
  weather: null as Weather | null,
  loading: false,
  recents: (() => {
    const r = saved<{ list: Location[] }>('recents', { list: [] }).list;
    return Array.isArray(r) ? r.slice(0, 5) : [];
  })(),
  toasts: [] as { id: number; text: string }[],
  paletteOpen: false,
  settingsOpen: false,
});

$effect.root(() => {
  $effect(() => localStorage.setItem('settings', JSON.stringify(settings)));
  $effect(() => localStorage.setItem('recents', JSON.stringify({ list: app.recents })));
});

let toastId = 0;
export function toast(text: string) {
  const id = ++toastId;
  app.toasts.push({ id, text });
  setTimeout(() => dismissToast(id), 4000);
}
export function dismissToast(id: number) {
  app.toasts = app.toasts.filter((t) => t.id !== id);
}

async function run(p: Promise<Weather>) {
  app.loading = true;
  try {
    const w = await p;
    app.weather = w;
    const l = w.location;
    app.recents = [l, ...app.recents.filter((r) => r.lat !== l.lat || r.lon !== l.lon)].slice(0, 5);
  } catch (e) {
    toast(String(e));
  } finally {
    app.loading = false;
  }
}

export const loadLocation = (l: Location) => run(getWeatherAt(l));
export const loadCity = (name: string) => run(getWeather(name));

/** Reopen the last city on launch. */
export const restore = () => app.recents[0] && loadLocation(app.recents[0]);
