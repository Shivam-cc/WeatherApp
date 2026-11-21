export type TierName = 'low' | 'medium' | 'high';

export interface Tier {
  name: TierName;
  particles: number; // nominal particle count from the spec; the shader maps it to layers
  layers: number; // precipitation depth layers (1 layer ~ 1000 particles of rain/snow)
  octaves: number; // cloud fbm octaves
  maxDpr: number;
  post: 0 | 1 | 2; // 0 off, 1 bloom only, 2 bloom + grain + vignette
  fps: number; // frame-rate cap
}

export const TIERS: Record<TierName, Tier> = {
  high: { name: 'high', particles: 4000, layers: 4, octaves: 6, maxDpr: 2, post: 2, fps: 60 },
  medium: { name: 'medium', particles: 2000, layers: 3, octaves: 4, maxDpr: 1.5, post: 1, fps: 60 },
  low: { name: 'low', particles: 800, layers: 2, octaves: 3, maxDpr: 1, post: 0, fps: 30 },
};

const ORDER: TierName[] = ['low', 'medium', 'high'];

// The spec says step up under 12 ms, which a 60 Hz display can never show (a frame is 16.7 ms).
// We measure the gap between animation frames, so "holding full rate" means <= 17.5 ms on average.
const DOWN_MS = 20;
const UP_MS = 17.5;
const WINDOW = 60;
const BASE_HOLD_MS = 10_000;

/** Auto mode: watches a rolling 60-frame average and steps the tier down or up. */
export class QualityController {
  private buf: number[] = [];
  private calmSince: number | null = null;
  private hold = BASE_HOLD_MS;
  private lastUp = -Infinity;
  private idx: number;

  constructor(start: TierName = 'high') {
    this.idx = ORDER.indexOf(start);
  }

  get tier(): TierName {
    return ORDER[this.idx];
  }

  /** Feed one frame interval (ms) at time `now` (ms). Returns the new tier when it changes. */
  sample(dt: number, now: number): TierName | null {
    if (dt > 100) return null; // tab was hidden or the app stalled; not a rendering cost
    this.buf.push(dt);
    if (this.buf.length > WINDOW) this.buf.shift();
    if (this.buf.length < WINDOW) return null;
    const avg = this.buf.reduce((a, b) => a + b, 0) / WINDOW;

    if (avg > DOWN_MS) {
      if (this.idx === 0) return null;
      // Dropping soon after stepping up means that tier does not hold: wait longer before trying again.
      this.hold = now - this.lastUp < 60_000 ? Math.min(this.hold * 2, 80_000) : BASE_HOLD_MS;
      this.idx--;
      return this.change();
    }
    if (avg <= UP_MS) {
      this.calmSince ??= now;
      if (now - this.calmSince >= this.hold && this.idx < ORDER.length - 1) {
        this.idx++;
        this.lastUp = now;
        return this.change();
      }
    } else this.calmSince = null;
    return null;
  }

  private change() {
    this.buf.length = 0;
    this.calmSince = null;
    return this.tier;
  }
}
