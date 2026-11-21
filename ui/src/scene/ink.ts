// CPU port of the shader's palette and weather grading, used to pick readable text colours.
export type RGB = [number, number, number];
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
const luma = (c: RGB) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const NIGHT = { top: [0.015, 0.03, 0.1], hor: [0.05, 0.08, 0.2] } as const;
const BLUE = { top: [0.08, 0.12, 0.32], hor: [0.55, 0.38, 0.58] } as const;
const GOLD = { top: [0.22, 0.34, 0.62], hor: [1.0, 0.58, 0.38] } as const;
const DAY = { top: [0.14, 0.4, 0.82], hor: [0.62, 0.8, 0.95] } as const;

function palette(e: number) {
  const [t1, t2, t3] = [ss(-9, -3, e), ss(-3, 3, e), ss(6, 14, e)];
  const pick = (k: 'top' | 'hor') => mix(mix(mix([...NIGHT[k]], [...BLUE[k]], t1), [...GOLD[k]], t2), [...DAY[k]], t3);
  return { top: pick('top'), hor: pick('hor') };
}

// ---- WCAG contrast ------------------------------------------------------------------------

const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const relLuminance = (c: RGB) => 0.2126 * lin(clamp01(c[0])) + 0.7152 * lin(clamp01(c[1])) + 0.0722 * lin(clamp01(c[2]));
export const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const css = (c: RGB, a = 1) => `rgba(${c.map((v) => Math.round(clamp01(v) * 255)).join(',')},${a})`;
const WHITE: RGB = [1, 1, 1];
const BLACK: RGB = [0, 0, 0];
const DARK_INK: RGB = [20 / 255, 22 / 255, 31 / 255];
// Glass tint behind text: dark glass for white ink, pale glass for dark ink. Keeps mid-tone skies readable.
const LIGHT_INK_TINT: RGB = [8 / 255, 12 / 255, 20 / 255];
// Bright skies (sunny days) need a darker glass so white text still has contrast; the tint deepens with sky brightness.
const lightInkTint = (sky: RGB) => ({ rgb: LIGHT_INK_TINT, a: Math.min(0.78, Math.max(0.5, 0.5 + (luma(sky) - 0.3))) });
const TINT_FOR_DARK_INK = { rgb: WHITE, a: 0.5 };
const BAND = { rgb: [10 / 255, 14 / 255, 22 / 255] as RGB, a: 0.72 }; // --band-bg
const MUTED_ALPHA = 0.85;
// The model only approximates the shader, so aim well above 4.5:1 (checked against real pixels in Phase 8).
const ACCENT_MIN = 6;

/** Approximate colour of the sky behind the top panels. */
export function panelColor(u: Look): RGB {
  const { top, hor } = palette(u.uSunElevation);
  const g = luma(top) * (1 - 0.3 * u.uPrecip);
  const sky = mix(top, [g, g, g], u.uCloudCover * 0.55).map((v) => v * (1 - 0.2 * u.uCloudCover)) as RGB;
  const day = ss(-8, 6, u.uSunElevation);
  const base = mix([0.12, 0.14, 0.22], WHITE, day).map((v) => v * (1 - 0.45 * u.uPrecip)) as RGB;
  const cloudShade = 0.73 * (0.35 + 0.65 * (0.1 + 0.9 * day));
  const cloud = base.map((v) => v * cloudShade) as RGB;
  let c = mix(sky, cloud, u.uCloudCover * 0.9);
  // Sun glow and bloom lift the sky by up to ~0.2 near the sun; assume the worst.
  c = c.map((v) => v + 0.2 * ss(-8, 1, u.uSunElevation)) as RGB;
  c = mix(c, mix(hor, [luma(hor), luma(hor), luma(hor)], 0.4), u.uFog * 0.6);
  return c.map((v) => v + 0.32 * u.uLightning) as RGB;
}

/** Brightness of the sky behind the panels (0..1). */
export const panelLuminance = (u: Look) => luma(panelColor(u));

const over = (bg: RGB, t: { rgb: RGB; a: number }) => mix(bg, t.rgb, t.a);
const onBg = (fg: RGB, a: number, bg: RGB) => mix(bg, fg, a);

/** Push `c` toward `toward` until it reaches `min` contrast on `bg` (or full strength). */
function ensure(c: RGB, bg: RGB, toward: RGB, min: number): RGB {
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const x = mix(c, toward, t);
    if (contrast(x, bg) >= min) return x;
  }
  return toward;
}

/** Colours for text on the sky panels (adaptive) and on the dark band/dialogs (always light). */
export function inkFor(u: Look) {
  const sky = panelColor(u);
  const { hor } = palette(u.uSunElevation);
  const tintLight = lightInkTint(sky);
  const bgLight = over(sky, tintLight);
  const bgDark = over(sky, TINT_FOR_DARK_INK);
  // White ink is the look we want; switch to dark only when white would fall below 6:1 and dark does better.
  const whiteC = contrast(onBg(WHITE, MUTED_ALPHA, bgLight), bgLight);
  const dark = whiteC < 6 && contrast(onBg(DARK_INK, MUTED_ALPHA, bgDark), bgDark) > whiteC;
  const bg = dark ? bgDark : bgLight;
  const ink = dark ? DARK_INK : WHITE;
  const accent = ensure(dark ? mix(hor, BLACK, 0.45) : mix(hor, WHITE, 0.25), bg, dark ? BLACK : WHITE, ACCENT_MIN);
  const bandBg = over(sky, BAND);
  const accentBand = ensure(mix(hor, WHITE, 0.3), bandBg, WHITE, ACCENT_MIN);
  const tint = dark ? TINT_FOR_DARK_INK : tintLight;
  return {
    dark,
    ink: css(ink),
    muted: css(ink, MUTED_ALPHA),
    accent: css(accent),
    accentBand: css(accentBand),
    glass: css(tint.rgb, tint.a),
    // For tests: the colours text actually sits on.
    _bg: bg,
    _bandBg: bandBg,
    _ink: ink,
    _accent: accent,
    _accentBand: accentBand,
  };
}

export { MUTED_ALPHA, WHITE, onBg };
