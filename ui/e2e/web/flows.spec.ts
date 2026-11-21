import { test, expect, type Page } from '@playwright/test';
import { open } from './util';

const palette = (page: Page) => page.getByRole('dialog', { name: 'Search location' });
const running = (page: Page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);

test('search success loads the typed city', async ({ page }) => {
  await open(page, { loaded: false, qs: 'static' });
  await page.getByRole('button', { name: /Search/ }).click();
  await page.keyboard.type('Tokyo');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tokyo');
  await expect(page.locator('.cell')).toHaveCount(6);
  await expect(page.locator('.cards .card')).toHaveCount(3);
});

test('unknown city shows the toast and reopens the palette with a shaking field', async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Atlantis');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('City not found. Check the spelling and try again.');
  await expect(palette(page)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'City' })).toHaveValue('Atlantis');
  await expect(page.locator('.field')).toHaveClass(/shake/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('London'); // old city kept
});

test('C/F toggle converts the headline temperature', async ({ page }) => {
  await open(page, { qs: 'static' });
  const temp = page.locator('.hero .temp .roll'); // odometer digits are decorative; the label carries the value
  await expect(temp).toHaveAttribute('aria-label', '12°');
  await page.getByRole('button', { name: 'Fahrenheit' }).click();
  await expect(page.getByRole('button', { name: 'Fahrenheit' })).toHaveAttribute('aria-pressed', 'true');
  await expect(temp).toHaveAttribute('aria-label', '54°');
  await page.getByRole('button', { name: 'Celsius' }).click();
  await expect(temp).toHaveAttribute('aria-label', '12°');
});

for (const motion of ['reduced', 'static']) {
  test(`Settings → Motion ${motion} leaves no running animations`, async ({ page }) => {
    await open(page, { qs: 'static', settings: { motion } });
    await expect.poll(() => running(page), { timeout: 10_000 }).toBe(0); // transitions started by the load may still be finishing
  });
}

test('prefers-reduced-motion leaves no running animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, { qs: 'static' });
  await expect.poll(() => running(page), { timeout: 10_000 }).toBe(0);
});
