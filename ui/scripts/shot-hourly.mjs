// Real release window, Hourly tab at 1000x620: node scripts/shot-hourly.mjs <out.png> (from ui/).
import { launch } from '../e2e/tauri/launch.ts';
const { page, stop } = await launch('release');
try {
  await page.evaluate(() => localStorage.setItem('recents', JSON.stringify({ list: [{ name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' }] })));
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30000 });
  await page.setViewportSize({ width: 1000, height: 620 });
  await page.getByRole('tab', { name: 'Hourly Forecast' }).click();
  await page.waitForTimeout(1800);
  console.log(await page.evaluate(() => { const e = document.querySelector('[aria-label="Hourly forecast"]'); return { gutter: e.offsetHeight - e.clientHeight, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }; }));
  await page.screenshot({ path: process.argv[2] });
} finally { await stop(); }
