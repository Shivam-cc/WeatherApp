export interface SkyUniforms {
  uTime: number;
  uSunElevation: number; // degrees, -18..90
  uIsDay: number; // 0|1 (smoothed by the tween)
  uCloudCover: number; // 0..1
  uPrecip: number; // 0..1 (normalized mm/h)
  uSnow: number; // 0..1
  uWindSpeed: number; // km/h
  uWindDir: number; // radians
  uFog: number; // 0..1
  uLightning: number; // 0..1 flash envelope
  uMoonPhase: number; // 0..1
  uParallax: [number, number]; // from the mouse, -1..1
}

export const DEFAULTS: SkyUniforms = {
  uTime: 0,
  uSunElevation: 30,
  uIsDay: 1,
  uCloudCover: 0.1,
  uPrecip: 0,
  uSnow: 0,
  uWindSpeed: 8,
  uWindDir: 0,
  uFog: 0,
  uLightning: 0,
  uMoonPhase: 0.5,
  uParallax: [0, 0],
};

/** Slider ranges for SceneLab, also the set of uniforms that tween. */
export const RANGES = {
  uSunElevation: [-18, 90],
  uIsDay: [0, 1],
  uCloudCover: [0, 1],
  uPrecip: [0, 1],
  uSnow: [0, 1],
  uWindSpeed: [0, 80],
  uWindDir: [0, 6.283],
  uFog: [0, 1],
  uLightning: [0, 1],
  uMoonPhase: [0, 1],
} as const;

export type TweenKey = keyof typeof RANGES;
export const TWEEN_KEYS = Object.keys(RANGES) as TweenKey[];

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Every scene uniform eases toward its target over `dur` ms; there are no hard cuts. */
export class UniformTween {
  current: Record<TweenKey, number>;
  private from: Record<TweenKey, number>;
  private to: Record<TweenKey, number>;
  private start = -Infinity;

  constructor(
    init: SkyUniforms = DEFAULTS,
    private dur = 2500,
  ) {
    this.current = Object.fromEntries(TWEEN_KEYS.map((k) => [k, init[k]])) as Record<TweenKey, number>;
    this.from = { ...this.current };
    this.to = { ...this.current };
  }

  /** Start easing from wherever we are now (also when interrupted mid-tween). */
  set(target: Partial<Record<TweenKey, number>>, now: number) {
    this.from = { ...this.current };
    this.to = { ...this.to, ...target };
    this.start = now;
  }

  snap(target: Partial<Record<TweenKey, number>>) {
    Object.assign(this.current, target);
    this.from = { ...this.current };
    this.to = { ...this.current };
    this.start = -Infinity;
  }

  /** Returns true while still moving. */
  update(now: number): boolean {
    const t = Math.min(1, Math.max(0, (now - this.start) / this.dur));
    if (t >= 1) {
      Object.assign(this.current, this.to);
      return false;
    }
    const e = easeInOut(t);
    for (const k of TWEEN_KEYS) this.current[k] = this.from[k] + (this.to[k] - this.from[k]) * e;
    return true;
  }
}
