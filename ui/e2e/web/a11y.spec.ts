import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { open } from './util';

// Zero serious/critical violations. The dev-only SceneLab overlay is not shipped, so it is excluded.
async function scan(page: Page) {
  await page.waitForTimeout(1500); // let entrance animations finish so contrast is measured on final colours
  const { violations } = await new AxeBuilder({ page }).exclude('.lab').analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test('empty state', async ({ page }) => {
  await open(page, { loaded: false, qs: 'static' });
  await expect(page.getByRole('heading', { name: 'Search a city' })).toBeVisible();
  await scan(page);
});

test('loaded', async ({ page }) => {
  await open(page, { qs: 'static' });
  await scan(page);
});

test('daily tab', async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.getByRole('tab', { name: 'Daily Forecast' }).click();
  await scan(page);
});

test('palette open', async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('lon');
  await expect(page.getByRole('option')).toHaveCount(2);
  await scan(page);
});

test('settings open', async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await scan(page);
});

test('error toast', async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('zzzz');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('City not found');
  await scan(page);
});
