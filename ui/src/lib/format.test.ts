import { describe, expect, it } from 'vitest';
import { hourLabel, skyIcon, smooth, speed, temp, visibility, weekday } from './format';

describe('format', () => {
  it('converts and rounds temperatures', () => {
    expect([temp(21.5, 'C'), temp(0, 'F'), temp(-0.3, 'C'), temp(-17.8, 'F')]).toEqual(['22°', '32°', '0°', '0°']);
  });

  it('converts speed and visibility', () => {
    expect([speed(100, 'kmh'), speed(100, 'mph')]).toEqual(['100 km/h', '62 mph']);
    expect([visibility(24140, 'kmh'), visibility(3200, 'kmh'), visibility(16100, 'mph'), visibility(null, 'kmh')]).toEqual([
      '24 km',
      '3.2 km',
      '10 mi',
      '—',
    ]);
  });

  it('labels hours in both clock styles', () => {
    expect([hourLabel('2026-11-21T00:00', true), hourLabel('2026-11-21T15:00', true), hourLabel('2026-11-21T09:00', false)]).toEqual([
      '12 AM',
      '3 PM',
      '09',
    ]);
  });

  it('names weekdays without timezone drift', () => {
    expect(weekday('2026-11-21')).toBe('Sat');
  });

  it('picks icons by sky and daylight', () => {
    expect([skyIcon('Clear', true), skyIcon('Clear', false), skyIcon('Rain', true)]).toEqual(['sun', 'moon', 'rain']);
  });

  it('builds a smooth path', () => {
    expect(smooth([])).toBe('');
    expect(smooth([[0, 0], [10, 10]])).toBe('M0,0C5,0 5,10 10,10');
  });
});
