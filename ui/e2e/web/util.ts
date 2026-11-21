import { expect, type Page } from '@playwright/test';
import { installMock, type MockOpts } from '../mock/invoke';

export const LONDON = { name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' };

/** Opens the app with the invoke mock, a frozen wall clock and (optionally) London as the saved last city. */
export async function open(page: Page, o: MockOpts & { qs?: string; loaded?: boolean; settings?: object } = {}) {
  const { qs = '', loaded = true, settings, ...mock } = o;
  await installMock(page, mock);
  await page.clock.setFixedTime(new Date('2026-03-20T12:00:00Z'));
  await page.addInitScript(
    ([recents, s]) => {
      if (recents) localStorage.setItem('recents', JSON.stringify({ list: [recents] }));
      if (s) localStorage.setItem('settings', JSON.stringify(s));
    },
    [loaded ? LONDON : null, settings ?? null] as const,
  );
  await page.goto(`/?${qs}`);
  if (loaded) await expect(page.getByRole('heading', { level: 1 })).toHaveText('London');
}
