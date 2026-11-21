const RAD = Math.PI / 180;

/** Solar elevation in degrees (NOAA simplified formulas, no refraction). */
export function solarElevation(latDeg: number, lonDeg: number, date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const doy = Math.floor((date.getTime() - start) / 864e5) + 1;
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24); // fractional year
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const trueSolarMin = hour * 60 + eqTime + 4 * lonDeg; // input is UTC, so no timezone term
  const ha = (trueSolarMin / 4 - 180) * RAD;
  const lat = latDeg * RAD;
  const cosZen = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZen))) / RAD;
}

const SYNODIC_DAYS = 29.530588853;
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14); // a known new moon

/** 0 = new, 0.5 = full, back to 1 = new. */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - NEW_MOON_2000) / 864e5;
  return (((days / SYNODIC_DAYS) % 1) + 1) % 1;
}
