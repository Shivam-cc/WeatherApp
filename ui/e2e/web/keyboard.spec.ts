import { test, expect } from '@playwright/test';
import { open } from './util';

const palette = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Search location' });

test.beforeEach(async ({ page }) => {
  await open(page, { qs: 'static' });
  await page.addStyleTag({ content: '.lab{display:none!important}' }); // dev-only overlay is a focus stop that production lacks
});

test('Ctrl+K opens the palette with the field focused; arrows + Enter pick a suggestion', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'City' })).toBeFocused();
  await page.keyboard.type('lon');
  const opts = page.getByRole('option');
  await expect(opts).toHaveCount(2);
  await expect(opts.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(opts.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(opts.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp'); // wraps
  await expect(opts.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(palette(page)).toBeHidden();
  await expect(page.locator('.region')).toHaveText('Ontario, Canada');
});

test('Escape closes the palette and focus returns to the opener', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Change location' });
  await opener.focus();
  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
  await expect(opener).toBeFocused();
});

test('tabs move with ArrowLeft/ArrowRight and wrap', async ({ page }) => {
  const tabs = page.getByRole('tab');
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft'); // wraps to the last tab
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(2)).toBeFocused();
});

test('settings sheet traps focus, makes the page inert, and Escape restores focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Settings' });
  await opener.focus();
  await opener.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Settings' });
  await expect(sheet).toBeVisible();
  await expect(page.locator('main.app')).toHaveAttribute('inert', '');
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  }
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.locator('main.app')).not.toHaveAttribute('inert');
  await expect(opener).toBeFocused();
});

test('background is inert while the palette is open', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await expect(page.locator('main.app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('main.app')).not.toHaveAttribute('inert');
});
