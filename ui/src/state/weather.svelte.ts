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
  loadingLabel: '', // city being loaded, for the palette and the live region
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

let gen = 0; // newest request wins; cancelLoad() bumps it so a late result is ignored

/** Drops the in-flight load (Esc in the palette): its result, success or failure, is ignored. */
export function cancelLoad() {
  gen++;
  app.loading = false;
}

async function run(label: string, p: Promise<Weather>): Promise<boolean> {
  const mine = ++gen;
  app.loading = true;
  app.loadingLabel = label;
  try {
    const w = await p;
    if (mine !== gen) return false;
    app.weather = w;
    const l = w.location;
    app.recents = [l, ...app.recents.filter((r) => r.lat !== l.lat || r.lon !== l.lon)].slice(0, 5);
    return true;
  } catch (e) {
    if (mine === gen) toast(String(e));
    return false;
  } finally {
    if (mine === gen) app.loading = false;
  }
}

export const loadLocation = (l: Location) => run(l.name, getWeatherAt(l));
export const loadCity = (name: string) => run(name, getWeather(name));

/** Reopen the last city on launch. */
export const restore = () => app.recents[0] && loadLocation(app.recents[0]);
