// Mock of Tauri's `invoke` for browser tests and screenshots. Self-contained: it is serialized into the page.
// Cities and numbers are a MOCK dataset (not real forecasts), generated deterministically.
import type { Page } from '@playwright/test';

export type MockOpts = { sky?: string; isDay?: boolean; tempC?: number }; // tempC: headline temperature, everything else shifts with it

export function mockInvoke(opts: MockOpts) {
  const NOT_FOUND = 'City not found. Check the spelling and try again.';
  const CITIES = [
    { name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' },
    { name: 'London', region: 'Ontario', country: 'Canada', lat: 42.9834, lon: -81.233, timezone: 'America/Toronto' },
    { name: 'Tokyo', region: 'Tokyo', country: 'Japan', lat: 35.6895, lon: 139.6917, timezone: 'Asia/Tokyo' },
    { name: 'Reykjavik', region: 'Capital Region', country: 'Iceland', lat: 64.1355, lon: -21.8954, timezone: 'Atlantic/Reykjavik' },
    { name: 'Singapore', region: '', country: 'Singapore', lat: 1.2897, lon: 103.8501, timezone: 'Asia/Singapore' },
    { name: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0728, lon: 72.8826, timezone: 'Asia/Kolkata' },
  ];
  const CODE: Record<string, [number, string]> = {
    Clear: [0, 'Clear sky'],
    Cloudy: [3, 'Overcast'],
    Fog: [45, 'Fog'],
    Rain: [61, 'Rain'],
    Snow: [71, 'Snow'],
    Thunderstorm: [95, 'Thunderstorm'],
  };
  const sky = opts.sky ?? 'Clear';
  const [code, text] = CODE[sky];
  const isDay = opts.isDay ?? true;
  const d = (opts.tempC ?? 12) - 12; // shift applied to every temperature
  const wet = sky === 'Rain' || sky === 'Thunderstorm';

  const build = (location: (typeof CITIES)[number]) => {
    const hourly = Array.from({ length: 48 }, (_, i) => {
      const day = i < 12 ? '20' : i < 36 ? '21' : '22';
      return {
        time: `2026-03-${day}T${String((12 + i) % 24).padStart(2, '0')}:00`,
        tempC: Math.round((12 + d + 4 * Math.sin(((i - 3) / 24) * 2 * Math.PI)) * 10) / 10,
        weatherCode: code,
        precipProb: wet ? 70 : 5,
      };
    });
    const part = { tempC: 12 + d, weatherCode: code, sky };
    return {
      location,
      timezone: location.timezone,
      utcOffsetSeconds: 0,
      current: {
        tempC: 12 + d,
        windKmh: sky === 'Thunderstorm' ? 34 : 11,
        windDirDeg: 240,
        humidity: wet ? 88 : 62,
        pressureHpa: 1013,
        dewPointC: 7.5 + d,
        visibilityM: sky === 'Fog' ? 800 : 10000,
        cloudCover: sky === 'Clear' ? 5 : 90,
        precipMm: wet ? 1.2 : 0,
        rainMm: wet ? 1.2 : 0,
        snowfallCm: sky === 'Snow' ? 0.8 : 0,
        weatherCode: code,
        isDay,
        sky,
        conditionText: text,
      },
      today: { highC: 15 + d, lowC: 6 + d, uvIndexMax: 4, sunrise: '2026-03-20T06:02', sunset: '2026-03-20T18:14' },
      dayParts: { morning: { ...part, tempC: 8 + d }, afternoon: { ...part, tempC: 14 + d }, evening: { ...part, tempC: 10 + d } },
      hourly,
      daily: [15, 13, 12, 14, 16].map((max, i) => ({ date: `2026-03-${20 + i}`, code, max: max + d, min: max + d - 8 })),
    };
  };

  (window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
  (window as any).__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
    transformCallback: () => 0,
    invoke: async (cmd: string, args: any) => {
      await new Promise((r) => setTimeout(r, 30));
      if (cmd === 'search_city') {
        const q = String(args.query).trim().toLowerCase();
        return CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
      }
      if (cmd === 'get_weather_at') return build(args.location);
      if (cmd === 'get_weather') {
        const c = CITIES.find((c) => c.name.toLowerCase() === String(args.city).trim().toLowerCase());
        if (!c) throw NOT_FOUND;
        return build(c);
      }
      if (cmd.startsWith('plugin:')) return 0; // window/event plumbing used by SkyCanvas
      throw `unknown command ${cmd}`;
    },
  };
}

export const installMock = (page: Page, opts: MockOpts = {}) => page.addInitScript(mockInvoke, opts);
