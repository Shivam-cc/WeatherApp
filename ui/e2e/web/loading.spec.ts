import { test, expect, type Page } from '@playwright/test';
import { installMock } from '../mock/invoke';
import { LONDON, open } from './util';

const palette = (page: Page) => page.getByRole('dialog', { name: 'Search location' });
const field = (page: Page) => page.getByRole('combobox', { name: 'City' });
async function settle(page: Page, ok: boolean) {
  await page.waitForFunction(() => typeof (window as any).__settle === 'function'); // the mock registers it once the call arrives
  await page.evaluate((v) => (window as any).__settle(v), ok);
}

/** Opens the palette on a loaded London, makes the next weather call hang, and presses Enter on "Tokyo". */
async function startLoading(page: Page) {
  await open(page, { qs: 'static' });
  await page.evaluate(() => ((window as any).__defer = true));
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Tokyo');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(palette(page)).toHaveAttribute('aria-busy', 'true');
}

test('loading lives inside the palette: spinner row, no old pill, suggestions gone', async ({ page }) => {
  await startLoading(page);
  await expect(field(page)).toHaveValue('Loading Tokyo…');
  await expect(field(page)).toHaveAttribute('readonly', '');
  await expect(page.locator('.pill')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('.list')).toHaveCSS('opacity', '0');
  await expect(page.locator('main.app')).toHaveClass(/loading/); // stale data stays, desaturated
  await expect(page.getByText('Loading Tokyo…', { exact: true }).and(page.locator('[aria-live=polite]'))).toBeAttached(); // live region
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('loading-palette.png', { stylePath: 'e2e/web/hide-lab.css' });
});

test('nothing but the palette’s own children paints inside the palette box while loading', async ({ page }) => {
  await startLoading(page);
  await page.waitForTimeout(600); // let the suggestions finish collapsing so the box is final
  const box = (await palette(page).boundingBox())!;
  const stray = await page.evaluate(({ x, y, width, height }) => {
    const p = document.querySelector('[role=dialog]')!;
    const bad = new Set<string>();
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        const px = x + 12 + ((width - 24) * i) / 8;
        const py = y + 12 + ((height - 24) * j) / 8;
        const top = document.elementFromPoint(px, py)!;
        if (!p.contains(top)) bad.add(`${top.tagName}.${top.className}`);
      }
    return [...bad];
  }, box);
  expect(stray).toEqual([]);
});

test('Esc during loading cancels: palette closes, the late result is ignored', async ({ page }) => {
  await startLoading(page);
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
  await expect(page.locator('main.app')).not.toHaveClass(/loading/);
  await settle(page, true); // Tokyo arrives after the cancel
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('London');
});

test('success closes the palette and shows the new city', async ({ page }) => {
  await startLoading(page);
  await settle(page, true);
  await expect(palette(page)).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tokyo');
});

test('failure keeps the palette open with the typed text', async ({ page }) => {
  await startLoading(page);
  await settle(page, false);
  await expect(palette(page)).toHaveAttribute('aria-busy', 'false');
  await expect(field(page)).toHaveValue('Tokyo');
  await expect(field(page)).not.toHaveAttribute('readonly', '');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('palette closed (refresh): a 2px accent line at the top and no pill', async ({ page }) => {
  await installMock(page, {});
  await page.addInitScript((l) => {
    (window as any).__defer = true; // the launch restore of the last city hangs
    localStorage.setItem('recents', JSON.stringify({ list: [l] }));
  }, LONDON);
  await page.goto('/?static');
  const line = page.locator('.line');
  await expect(line).toBeVisible();
  const b = (await line.boundingBox())!;
  expect([b.y, b.height]).toEqual([0, 2]);
  await expect(page.locator('.pill')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(palette(page)).toBeHidden();
  await settle(page, true);
  await expect(line).toBeHidden();
});

for (const motion of ['reduced', 'static']) {
  test(`${motion} motion: spinner is reduced to a pulse (reduced) or text only (static)`, async ({ page }) => {
    await open(page, { qs: 'static', settings: { motion } });
    await page.evaluate(() => ((window as any).__defer = true));
    await page.keyboard.press('Control+k');
    await page.keyboard.type('Tokyo');
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(field(page)).toHaveValue('Loading Tokyo…');
    if (motion === 'static') await expect(page.locator('.spin')).toBeHidden(); // text only
    else await expect(page.locator('.spin')).toHaveCSS('animation-name', /pulse/);
  });
}
