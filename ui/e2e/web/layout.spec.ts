import { test, expect } from '@playwright/test';
import { open } from './util';
import { audit } from '../layout-audit';

const SIZES = [
  [834, 517], // the real default window at 120% DPI (1000x620 physical px)
  [1000, 620],
  [1280, 620],
  [1440, 700],
  [1920, 700],
  [1440, 900],
  [2560, 1440],
] as const;
const TABS = ['Today’s Forecast', 'Hourly Forecast', 'Daily Forecast'];

for (const [width, height] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height } });
    TABS.forEach((tab, i) => {
      test(`no clipping on ${tab}`, async ({ page }) => {
        await open(page, { qs: 'static' });
        await page.getByRole('tab', { name: tab }).click();
        await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
        await page.waitForTimeout(1800); // entrance + tab slide
        expect(await page.evaluate(audit), `tab ${i}`).toEqual([]);
      });
    });
  });
}
