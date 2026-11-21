import type { Sky } from '../bindings/Sky';

export type TempUnit = 'C' | 'F';
export type SpeedUnit = 'kmh' | 'mph';

const KM_TO_MI = 0.621371;

/** Rounded temperature; `+ 0` turns -0 into 0 so -0.3 reads "0°". */
export const temp = (c: number, u: TempUnit) => `${Math.round(u === 'F' ? (c * 9) / 5 + 32 : c) + 0}°`;

export const speed = (kmh: number, u: SpeedUnit) =>
  u === 'mph' ? `${Math.round(kmh * KM_TO_MI)} mph` : `${Math.round(kmh)} km/h`;

export function visibility(m: number | null, u: SpeedUnit) {
  if (m === null) return '—';
  const v = u === 'mph' ? (m / 1000) * KM_TO_MI : m / 1000;
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${u === 'mph' ? 'mi' : 'km'}`;
}

export const clock = (d: Date, tz: string, hour12: boolean) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12 }).format(d);

export const longDate = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(d);

/** "2026-11-21T15:00" -> "3 PM" / "15". */
export function hourLabel(time: string, hour12: boolean) {
  const h = Number(time.slice(11, 13));
  return hour12 ? `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}` : String(h).padStart(2, '0');
}

/** "2026-11-22" -> "Sun". Parsed as UTC so the viewer's timezone cannot shift the day. */
export const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

export type IconName = string;
export const skyIcon = (sky: Sky, isDay: boolean): IconName =>
  ({ Clear: isDay ? 'sun' : 'moon', Cloudy: 'cloud', Fog: 'fog', Rain: 'rain', Snow: 'snow', Thunderstorm: 'bolt' })[sky];

/** Smooth SVG path through points, with horizontal tangents at each point. */
export function smooth(pts: [number, number][]) {
  if (!pts.length) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += `C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}
