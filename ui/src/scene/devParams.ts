import type { Sky } from '../bindings/Sky';

const SKIES: Sky[] = ['Clear', 'Cloudy', 'Fog', 'Rain', 'Snow', 'Thunderstorm'];

export interface DevParams {
  seed: number;
  time?: Date; // moment used for sun and moon
  preset?: Sky; // overrides live weather
  at?: number; // scene clock in seconds, for reproducible animation frames
  static: boolean; // freeze motion
}

/** `?seed=&time=&preset=` (plus `at`, `static`): reproducible scenes for tests and screenshots. Dev builds only. */
export function devParams(search = location.search, dev = import.meta.env.DEV): DevParams {
  const q = new URLSearchParams(dev ? search : '');
  const time = q.get('time') ? new Date(q.get('time')!) : undefined;
  const preset = SKIES.find((s) => s.toLowerCase() === q.get('preset')?.toLowerCase());
  const at = q.get('at') === null ? undefined : Number(q.get('at'));
  return {
    seed: Number(q.get('seed')) || 1,
    time: time && !isNaN(time.getTime()) ? time : undefined,
    preset,
    at: at === undefined || isNaN(at) ? undefined : at,
    static: q.has('static'),
  };
}
