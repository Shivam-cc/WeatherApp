/** Launch choreography for the sky: fade in from black over 900 ms, then the skyline rises (starts at 500 ms, 700 ms long). */
export function introProgress(ms: number) {
  const c = (x: number) => Math.min(1, Math.max(0, x));
  const f = c(ms / 900);
  return {
    fade: f * f * (3 - 2 * f),
    rise: 1 - (1 - c((ms - 500) / 700)) ** 3,
    done: ms >= 1200,
  };
}
