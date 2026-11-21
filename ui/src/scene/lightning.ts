import { mulberry32 } from './prng';

export interface Flash {
  env: number; // 0..1 screen-flash envelope
  bolt: number; // 0..1 bolt visibility (flickers during the first ~350ms)
  x: number; // bolt x position, 0..1
  seed: number; // bolt shape seed
}

/** Flash times are a pure function of (seed, time): a flash every 4-12 s, double-pulse, ~600ms long. */
export class Lightning {
  private starts: number[];
  private shapes: { x: number; seed: number }[] = [];
  private out: Flash = { env: 0, bolt: 0, x: 0, seed: 0 }; // reused: this runs every frame during a storm
  private rnd;

  constructor(private seed: number) {
    this.rnd = mulberry32(seed);
    this.starts = [];
    this.push(0);
  }

  private push(after: number) {
    const r = mulberry32(this.seed + this.starts.length * 7919);
    this.shapes.push({ x: 0.15 + 0.7 * r(), seed: r() * 50 });
    this.starts.push(after + this.gap());
  }

  private gap() {
    return 4 + 8 * this.rnd();
  }

  at(t: number): Flash {
    while (this.starts[this.starts.length - 1] <= t) this.push(this.starts[this.starts.length - 1]);
    let i = this.starts.length - 1;
    while (i >= 0 && this.starts[i] > t) i--;
    const o = this.out;
    if (i < 0) {
      o.env = o.bolt = o.x = o.seed = 0;
      return o;
    }
    const dt = t - this.starts[i];
    const env = Math.exp(-dt * 7) + (dt > 0.18 ? 0.7 * Math.exp(-(dt - 0.18) * 9) : 0);
    o.env = Math.min(1, env);
    o.bolt = dt < 0.35 && Math.floor(dt * 30) % 3 !== 1 ? 1 - dt / 0.35 : 0;
    o.x = this.shapes[i].x;
    o.seed = this.shapes[i].seed;
    return o;
  }

  /** Start times so far (for tests). */
  get flashStarts() {
    return this.starts;
  }
}
