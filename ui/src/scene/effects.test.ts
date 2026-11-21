import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';
import { Lightning } from './lightning';
import { QualityController } from './quality';

describe('mulberry32', () => {
  it('repeats for the same seed and differs between seeds', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(8)()).not.toBe(mulberry32(7)());
  });
});

describe('Lightning', () => {
  it('flashes every 4-12 s, deterministically', () => {
    const l = new Lightning(3);
    l.at(200);
    const s = l.flashStarts;
    const gaps = s.slice(1).map((v, i) => v - s[i]);
    expect(s[0]).toBeGreaterThanOrEqual(4);
    expect(gaps.every((g) => g >= 4 && g <= 12)).toBe(true);
    expect(new Lightning(3).at(50)).toEqual(new Lightning(3).at(50));
  });

  it('is dark before the first flash, full at its start and gone within 600ms', () => {
    const l = new Lightning(3);
    const t0 = l.at(0).env === 0 ? l.flashStarts[0] : -1;
    expect(t0).toBeGreaterThan(0);
    expect(l.at(t0 - 0.01).env).toBe(0);
    expect(l.at(t0).env).toBeCloseTo(1, 5);
    expect(l.at(t0 + 0.6).env).toBeLessThan(0.05);
  });
});

describe('QualityController', () => {
  const feed = (q: QualityController, ms: number, from: number, seconds: number) => {
    let now = from;
    let changed: string | null = null;
    for (; now < from + seconds * 1000; now += ms) changed = q.sample(ms, now) ?? changed;
    return { now, changed };
  };

  it('steps down when the 60-frame average exceeds 20 ms', () => {
    const q = new QualityController('high');
    expect(feed(q, 25, 0, 1.6).changed).toBe('medium');
    expect(q.tier).toBe('medium');
  });

  it('steps up only after 10 s of holding full frame rate', () => {
    const q = new QualityController('medium');
    expect(feed(q, 16.7, 0, 9).changed).toBeNull();
    expect(feed(q, 16.7, 9000, 2).changed).toBe('high');
  });

  it('waits longer after a step up that did not hold', () => {
    const q = new QualityController('medium');
    let { now } = feed(q, 16.7, 0, 11); // up to high
    expect(q.tier).toBe('high');
    ({ now } = feed(q, 25, now, 2)); // overloaded again: back to medium, hold doubles to 20 s
    expect(q.tier).toBe('medium');
    ({ now } = feed(q, 16.7, now, 12));
    expect(q.tier).toBe('medium'); // 10 s is no longer enough
    feed(q, 16.7, now, 10);
    expect(q.tier).toBe('high');
  });

  it('ignores stalls and never goes below low', () => {
    const q = new QualityController('low');
    expect(feed(q, 500, 0, 60).changed).toBeNull();
    expect(feed(q, 40, 60000, 5).changed).toBeNull();
    expect(q.tier).toBe('low');
  });
});

import { devParams } from './devParams';
import { presetTargets } from './presets';

describe('devParams', () => {
  it('reads seed, time, preset, at and static in dev builds', () => {
    const p = devParams('?seed=42&time=2026-06-21T20:30:00Z&preset=rain&at=12.5&static', true);
    expect([p.seed, p.time?.toISOString(), p.preset, p.at, p.static]).toEqual([42, '2026-06-21T20:30:00.000Z', 'Rain', 12.5, true]);
  });

  it('ignores everything in production builds and bad values', () => {
    expect(devParams('?seed=42&preset=Rain', false)).toEqual({ seed: 1, time: undefined, preset: undefined, at: undefined, static: false });
    expect(devParams('?time=nope&preset=Hail', true).time).toBeUndefined();
  });
});

describe('presetTargets', () => {
  it('gives each sky its signature and a night sun for a night time', () => {
    const night = new Date('2026-01-10T00:00:00Z');
    expect(presetTargets('Snow', night).uSnow).toBeGreaterThan(0.5);
    expect(presetTargets('Fog', night).uFog).toBe(1);
    expect(presetTargets('Thunderstorm', night).uWindSpeed).toBeGreaterThan(25);
    expect(presetTargets('Clear', night).uIsDay).toBe(0);
  });
});
