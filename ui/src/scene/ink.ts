// CPU port of the shader's palette and weather grading, used to pick readable text colours.
type RGB = [number, number, number];
interface Look {
  uSunElevation: number;
  uCloudCover: number;
  uPrecip: number;
  uFog: number;
  uLightning: number;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const luma = (c: RGB) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

const NIGHT = { top: [0.015, 0.03, 0.1], hor: [0.05, 0.08, 0.2] } as const;
const BLUE = { top: [0.08, 0.12, 0.32], hor: [0.55, 0.38, 0.58] } as const;
const GOLD = { top: [0.22, 0.34, 0.62], hor: [1.0, 0.58, 0.38] } as const;
const DAY = { top: [0.14, 0.4, 0.82], hor: [0.62, 0.8, 0.95] } as const;

function palette(e: number) {
  const [t1, t2, t3] = [ss(-9, -3, e), ss(-3, 3, e), ss(6, 14, e)];
  const pick = (k: 'top' | 'hor') => mix(mix(mix([...NIGHT[k]], [...BLUE[k]], t1), [...GOLD[k]], t2), [...DAY[k]], t3);
  return { top: pick('top'), hor: pick('hor') };
}

const css = (c: RGB, a = 1) => `rgba(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(',')},${a})`;
const DARK_INK: RGB = [35 / 255, 35 / 255, 45 / 255];

/** Approximate brightness of the sky behind the top panels, 0..1. */
export function panelLuminance(u: Look) {
  const { top, hor } = palette(u.uSunElevation);
  const grey = luma(top);
  const graded = mix(top, [grey * (1 - 0.3 * u.uPrecip), grey * (1 - 0.3 * u.uPrecip), grey * (1 - 0.3 * u.uPrecip)], u.uCloudCover * 0.55).map(
    (v) => v * (1 - 0.2 * u.uCloudCover),
  ) as RGB;
  const day = ss(-8, 6, u.uSunElevation);
  const cloud = (0.1 + 0.65 * day) * (1 - 0.45 * u.uPrecip);
  const w = u.uCloudCover * 0.9;
  let l = luma(graded) * (1 - w) + cloud * w;
  l = l * (1 - u.uFog * 0.6) + luma(hor) * 0.9 * u.uFog * 0.6;
  return Math.min(1, l + 0.3 * u.uLightning);
}

/** Colours for text on the sky panels (adaptive) and on the dark band/dialogs (always light). */
export function inkFor(u: Look) {
  const dark = panelLuminance(u) > 0.5;
  const { hor } = palette(u.uSunElevation);
  const white: RGB = [1, 1, 1];
  const ink = dark ? DARK_INK : white;
  const accent = dark ? mix(hor, [0, 0, 0], 0.55) : mix(hor, white, 0.25);
  // On the dark band the accent must stay light even when the sky is bright.
  const accentBand = mix(hor, white, luma(hor) < 0.5 ? 0.5 : 0.3);
  return { dark, ink: css(ink), muted: css(ink, 0.7), accent: css(accent), accentBand: css(accentBand) };
}
