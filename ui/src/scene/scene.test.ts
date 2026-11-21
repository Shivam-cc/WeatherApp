import { describe, expect, it } from 'vitest';
import { moonPhase, solarElevation } from './sun';
import { UniformTween } from './uniforms';
import { targetsFor } from './presets';
import type { Weather } from '../bindings/Weather';

describe('sun', () => {
  it('is near zenith at the equator on an equinox noon, and deep below at midnight', () => {
    expect(solarElevation(0, 0, new Date('2026-03-20T12:00:00Z'))).toBeGreaterThan(85);
    expect(solarElevation(0, 0, new Date('2026-03-20T00:00:00Z'))).toBeLessThan(-80);
  });

  it('matches the winter-solstice noon sun in London (90 - 51.5 - 23.4 = 15 deg)', () => {
    expect(solarElevation(51.5, 0, new Date('2026-12-21T12:00:00Z'))).toBeCloseTo(15, 0);
  });

  it('shifts with longitude', () => {
    // 90 degrees east is six hours ahead: UTC 06:00 there is local noon.
    expect(solarElevation(0, 90, new Date('2026-03-20T06:00:00Z'))).toBeGreaterThan(85);
  });

  it('computes moon phase from a known new and full moon', () => {
    expect(moonPhase(new Date('2000-01-06T18:14:00Z'))).toBeCloseTo(0, 2);
    expect(moonPhase(new Date('2000-01-21T04:40:00Z'))).toBeCloseTo(0.5, 1);
  });
});

describe('UniformTween', () => {
  it('eases to the target without cuts and finishes exactly', () => {
    const t = new UniformTween(undefined, 1000);
    t.snap({ uCloudCover: 0 });
    t.set({ uCloudCover: 1 }, 0);
    expect(t.update(500)).toBe(true);
    expect(t.current.uCloudCover).toBeCloseTo(0.5, 5);
    expect(t.update(1000)).toBe(false);
    expect(t.current.uCloudCover).toBe(1);
  });

  it('restarts from the current value when retargeted mid-tween', () => {
    const t = new UniformTween(undefined, 1000);
    t.snap({ uFog: 0 });
    t.set({ uFog: 1 }, 0);
    t.update(500);
    t.set({ uFog: 0 }, 500);
    expect(t.update(500)).toBe(true);
    expect(t.current.uFog).toBeCloseTo(0.5, 5);
  });
});

const weather = (over: Partial<Weather['current']>) =>
  ({
    location: { name: 'X', region: '', country: '', lat: 51.5, lon: 0, timezone: '' },
    current: { cloudCover: 0, precipMm: 0, snowfallCm: 0, windKmh: 10, windDirDeg: 180, visibilityM: 10000, isDay: true, sky: 'Clear', ...over },
  }) as Weather;

describe('targetsFor', () => {
  const now = new Date('2026-06-21T12:00:00Z');

  it('lets presets set floors that data can only raise', () => {
    const rain = targetsFor(weather({ sky: 'Rain', cloudCover: 20 }), now);
    expect(rain.uCloudCover).toBeGreaterThanOrEqual(0.8);
    expect(rain.uPrecip).toBe(0.3);
    expect(targetsFor(weather({ sky: 'Rain', precipMm: 3 }), now).uPrecip).toBe(0.5);
    expect(targetsFor(weather({ sky: 'Clear', cloudCover: 40 }), now).uCloudCover).toBe(0.4);
  });

  it('turns on fog for the Fog sky or visibility under 1 km', () => {
    expect(targetsFor(weather({ sky: 'Fog' }), now).uFog).toBe(1);
    expect(targetsFor(weather({ visibilityM: 800 }), now).uFog).toBe(1);
    expect(targetsFor(weather({ visibilityM: null }), now).uFog).toBe(0);
  });

  it('passes wind in radians and computes the sun from the location', () => {
    const t = targetsFor(weather({}), now);
    expect(t.uWindDir).toBeCloseTo(Math.PI, 5);
    expect(t.uSunElevation).toBeGreaterThan(55);
  });
});
