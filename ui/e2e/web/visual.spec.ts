import { test, expect } from '@playwright/test';
import { open } from './util';

// Equinox in London: sunrise ~06:00Z, sunset ~18:10Z.
const TIMES = { day: '2026-03-20T12:00:00Z', golden: '2026-03-20T17:30:00Z', night: '2026-03-20T23:00:00Z' };
const PRESETS = ['Clear', 'Cloudy', 'Fog', 'Rain', 'Snow', 'Thunderstorm'];
const SIZES = [{ width: 1000, height: 620 }, { width: 1440, height: 900 }];

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(1800); // let the CSS entrance choreography and number rolls finish
  await expect(page).toHaveScreenshot(`${name}.png`, { stylePath: 'e2e/web/hide-lab.css' });
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    for (const preset of PRESETS) {
      // 1440x900 baselines are ~0.9 MB each, so the large size covers golden hour only (all 6 presets).
      for (const [part, time] of Object.entries(TIMES).filter(([part]) => size.width === 1000 || part === 'golden')) {
        test(`${preset} ${part}`, async ({ page }) => {
          await open(page, { sky: preset, isDay: part !== 'night', qs: `preset=${preset}&time=${time}&seed=1&static&at=3` });
          await shot(page, `${preset}-${part}-${size.width}`);
        });
      }
    }
  });
}

test('thunderstorm bolt frame', async ({ page }) => {
  await open(page, { sky: 'Thunderstorm', isDay: false, qs: `preset=Thunderstorm&seed=1&at=9.24&static&time=${TIMES.night}` });
  await shot(page, 'bolt-1000');
});
