import { describe, expect, it } from 'vitest';
import { inkFor } from './ink';
import { introProgress } from './intro';

const sky = (uSunElevation: number, uCloudCover = 0, uPrecip = 0, uFog = 0) => ({ uSunElevation, uCloudCover, uPrecip, uFog, uLightning: 0 });
const luminanceOf = (css: string) => Number(css.match(/\d+/g)![0]);

describe('adaptive ink', () => {
  it('uses white text on a clear day, golden hour and a clear night', () => {
    for (const e of [45, 3, -20]) expect(inkFor(sky(e)).dark).toBe(false);
  });

  it('switches to dark text on the brightest case, a snowy overcast day', () => {
    const i = inkFor(sky(15, 0.85, 0, 0));
    expect(i.dark).toBe(true);
    expect(luminanceOf(i.ink)).toBeLessThan(60);
  });

  it('stays light under a dark storm', () => {
    expect(inkFor(sky(15, 1, 0.85)).dark).toBe(false);
  });

  it('always gives the dark band a light accent', () => {
    for (const s of [sky(45), sky(15, 0.85), sky(-20), sky(3)]) {
      const [r, g, b] = inkFor(s).accentBand.match(/\d+/g)!.slice(0, 3).map(Number);
      expect(0.3 * r + 0.59 * g + 0.11 * b).toBeGreaterThan(110);
    }
  });
});

describe('introProgress', () => {
  it('fades over 900 ms, rises from 500 ms, and is done at 1200 ms', () => {
    expect(introProgress(0)).toEqual({ fade: 0, rise: 0, done: false });
    expect(introProgress(900).fade).toBe(1);
    expect(introProgress(400).rise).toBe(0);
    expect(introProgress(1200)).toEqual({ fade: 1, rise: 1, done: true });
  });
});
