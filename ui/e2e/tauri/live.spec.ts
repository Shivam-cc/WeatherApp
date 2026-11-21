import { test, expect, type Page } from '@playwright/test';
import { launch } from './launch';

// Real app window (WebView2 over CDP), real IPC, real network. Mode comes from the project: dev window or release exe.
test.describe.configure({ mode: 'serial' });

let page: Page;
let stop: () => Promise<void>;
let saved: Record<string, string | null>;
const problems: string[] = []; // console errors, uncaught exceptions, CSP violations

test.beforeAll(async ({}, testInfo) => {
  ({ page, stop } = await launch(testInfo.project.metadata.mode));
  page.on('console', (m) => (m.type() === 'error' || /Content Security Policy/i.test(m.text())) && problems.push(`console.${m.type()}: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // The DOM event is the reliable CSP signal; console routing of violations varies.
  await page.addInitScript(() => {
    (window as any).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as any).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  // Start from a clean slate, and put the user's saved city/settings back afterwards.
  saved = await page.evaluate(() => ({ recents: localStorage.getItem('recents'), settings: localStorage.getItem('settings') }));
  await page.evaluate(() => localStorage.clear());
  await page.reload(); // reload so the listeners above see the whole page load
  await expect(page.getByRole('heading', { name: 'Search a city' })).toBeVisible();
});

test.afterAll(async () => {
  if (page) {
    await page.evaluate((s) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) if (v !== null) localStorage.setItem(k, v);
    }, saved).catch(() => {});
  }
  await stop?.();
});

const search = async (text: string) => {
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search location' })).toBeVisible();
  await page.keyboard.type(text);
};

test('searching London loads real data through Tauri IPC', async () => {
  await search('London');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('London', { timeout: 20_000 });
  await expect(page.locator('.hero .temp .roll')).toHaveAttribute('aria-label', /^-?\d+°$/);
  await expect(page.locator('.cell')).toHaveCount(6);
  await expect(page.locator('.cards .card')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Daily Forecast' }).click();
  await expect(page.locator('.chart svg path')).toBeVisible();
});

test('picking a suggestion loads that exact location (get_weather_at)', async () => {
  await search('Paris');
  const second = page.getByRole('option').nth(1);
  await expect(second).toBeVisible({ timeout: 20_000 });
  const name = await second.locator('b').innerText();
  const place = await second.locator('span').innerText();
  await second.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name, { timeout: 20_000 });
  await expect(page.locator('.region')).toHaveText(place);
});

test('nonsense search shows the friendly not-found toast', async () => {
  await search('zzqxjvkwpl');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('City not found. Check the spelling and try again.', { timeout: 20_000 });
});

test('the CSP is enforced (a foreign origin is blocked by connect-src)', async ({}, testInfo) => {
  const before = problems.length;
  // Observed: the dev window (pages served by Vite) raises no violation for a foreign origin, so only the release build proves the CSP.
  test.skip(testInfo.project.metadata.mode === 'dev', 'CSP is not enforced for the Vite-served dev window');
  const directive = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        document.addEventListener('securitypolicyviolation', (e) => resolve(e.violatedDirective), { once: true });
        fetch('https://example.com/').catch(() => {});
        setTimeout(() => resolve('none'), 5000);
      }),
  );
  expect(directive).toMatch(/^connect-src/);
  await page.evaluate(() => (window as any).__csp.splice(0)); // provoked on purpose, so drop its console noise too
  problems.length = before;
});

test('no console errors, page errors or CSP violations during the whole run', async () => {
  expect(await page.evaluate(() => (window as any).__csp)).toEqual([]);
  expect(problems).toEqual([]);
});
