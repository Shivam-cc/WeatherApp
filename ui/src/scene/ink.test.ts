import { describe, expect, it } from 'vitest';
import { MUTED_ALPHA, WHITE, contrast, inkFor, onBg } from './ink';
import { introProgress } from './intro';

const sky = (uSunElevation: number, uCloudCover = 0, uPrecip = 0, uFog = 0, uLightning = 0) => ({ uSunElevation, uCloudCover, uPrecip, uFog, uLightning });

describe('adaptive ink', () => {
  it('uses white text on a clear day, golden hour and a clear night', () => {
    for (const e of [45, 3, -20]) expect(inkFor(sky(e)).dark).toBe(false);
  });

  it('keeps a bright snowy day above 6:1 with whichever ink it picks', () => {
    const i = inkFor(sky(15, 0.85, 0, 0));
    expect(contrast(onBg(i._ink, MUTED_ALPHA, i._bg), i._bg)).toBeGreaterThanOrEqual(6);
  });

  it('stays light under a dark storm', () => {
    expect(inkFor(sky(15, 1, 0.85)).dark).toBe(false);
  });
});

// WCAG AA: 4.5:1 for normal text, over the whole sky space (sun angle x cloud x rain x fog x lightning).
describe('WCAG AA contrast sweep', () => {
  const elevations = [-20, -12, -8, -5, -2, 0, 2, 4, 6, 8, 10, 12, 15, 20, 30, 45, 70];
  const covers = [0, 0.25, 0.5, 0.75, 0.9, 1];
  const precips = [0, 0.4, 0.9];
  const fogs = [0, 1];
  const flashes = [0, 0.6];
  const states = elevations.flatMap((e) => covers.flatMap((c) => precips.flatMap((p) => fogs.flatMap((f) => flashes.map((l) => sky(e, c, p, f, l))))));

  it('sky panels: text, muted text and accent all reach 4.5:1', () => {
    let worst = 99;
    for (const s of states) {
      const i = inkFor(s);
      worst = Math.min(worst, contrast(i._ink, i._bg), contrast(onBg(i._ink, MUTED_ALPHA, i._bg), i._bg), contrast(i._accent, i._bg));
    }
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });

  it('dark band and dialogs: text, muted text and accent all reach 4.5:1', () => {
    let worst = 99;
    for (const s of states) {
      const i = inkFor(s);
      worst = Math.min(worst, contrast(WHITE, i._bandBg), contrast(onBg(WHITE, 0.7, i._bandBg), i._bandBg), contrast(i._accentBand, i._bandBg));
    }
    expect(worst).toBeGreaterThanOrEqual(4.5);
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
