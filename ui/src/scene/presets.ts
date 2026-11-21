import type { Weather } from '../bindings/Weather';
import type { Sky } from '../bindings/Sky';
import { moonPhase, solarElevation } from './sun';
import type { TweenKey } from './uniforms';

type Targets = Partial<Record<TweenKey, number>>;

/** Minimum scene values per sky type; live data can only raise them. */
const FLOOR: Record<Sky, { cloud: number; precip: number; snow: number }> = {
  Clear: { cloud: 0, precip: 0, snow: 0 },
  Cloudy: { cloud: 0.5, precip: 0, snow: 0 },
  Fog: { cloud: 0.6, precip: 0, snow: 0 },
  Rain: { cloud: 0.8, precip: 0.3, snow: 0 },
  Snow: { cloud: 0.8, precip: 0, snow: 0.4 },
  Thunderstorm: { cloud: 0.9, precip: 0.6, snow: 0 },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function targetsFor(w: Weather, now: Date): Targets {
  const c = w.current;
  const f = FLOOR[c.sky];
  return {
    uSunElevation: solarElevation(w.location.lat, w.location.lon, now),
    uIsDay: c.isDay ? 1 : 0,
    uCloudCover: Math.max(f.cloud, clamp01(c.cloudCover / 100)),
    uPrecip: Math.max(f.precip, clamp01(c.precipMm / 6)),
    uSnow: Math.max(f.snow, clamp01(c.snowfallCm / 2)),
    uWindSpeed: c.windKmh,
    uWindDir: (c.windDirDeg * Math.PI) / 180,
    uFog: c.sky === 'Fog' || (c.visibilityM !== null && c.visibilityM < 1000) ? 1 : 0,
    uMoonPhase: moonPhase(now),
  };
}

/** Pretty golden-hour sky shown before any city is loaded. */
export const IDLE: Targets = {
  uSunElevation: 4,
  uIsDay: 1,
  uCloudCover: 0.35,
  uPrecip: 0,
  uSnow: 0,
  uWindSpeed: 10,
  uFog: 0,
  uLightning: 0,
};
