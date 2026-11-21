import { mulberry32 } from './prng';

export interface Flash {
  env: number; // 0..1 screen-flash envelope
  bolt: number; // 0..1 bolt visibility (flickers during the first ~350ms)
  x: number; // bolt x position, 0..1
  seed: number; // bolt shape seed
}

const NONE: Flash = { env: 0, bolt: 0, x: 0, seed: 0 };

/** Flash times are a pure function of (seed, time): a flash every 4-12 s, double-pulse, ~600ms long. */
export class Lightning {
  private starts: number[];
  private rnd;

  constructor(private seed: number) {
    this.rnd = mulberry32(seed);
    this.starts = [this.gap()];
  }

  private gap() {
    return 4 + 8 * this.rnd();
  }

  at(t: number): Flash {
    while (this.starts[this.starts.length - 1] <= t) this.starts.push(this.starts[this.starts.length - 1] + this.gap());
    let i = this.starts.length - 1;
    while (i >= 0 && this.starts[i] > t) i--;
    if (i < 0) return NONE;
    const dt = t - this.starts[i];
    const env = Math.exp(-dt * 7) + (dt > 0.18 ? 0.7 * Math.exp(-(dt - 0.18) * 9) : 0);
    const r = mulberry32(this.seed + i * 7919);
    return { env: Math.min(1, env), bolt: dt < 0.35 && Math.floor(dt * 30) % 3 !== 1 ? 1 - dt / 0.35 : 0, x: 0.15 + 0.7 * r(), seed: r() * 50 };
  }

  /** Start times so far (for tests). */
  get flashStarts() {
    return this.starts;
  }
}
