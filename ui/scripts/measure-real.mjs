// Measures/screenshots the REAL release window over CDP at several viewport sizes: node scripts/measure-real.mjs <outDir> (from ui/).
// Close any running Weather window first (port 9222 + shared WebView2 profile).
import { launch } from '../e2e/tauri/launch.ts';
import { audit } from '../e2e/layout-audit.ts';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const SIZES = [[834, 517], [1000, 620], [1280, 620], [1440, 700], [1920, 700], [1440, 900], [2560, 1440]];
const { page, stop } = await launch('release');
try {
  console.log('native inner size', await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]));
  await page.evaluate(() => localStorage.setItem('recents', JSON.stringify({ list: [{ name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' }] })));
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30000 });
  // Native window first: no emulation, whatever size the OS actually gave the webview.
  for (const [i, tab] of ['Today’s Forecast', 'Hourly Forecast', 'Daily Forecast'].entries()) {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForTimeout(1500);
    const bad = await page.evaluate(audit);
    console.log(`native tab${i}: ${bad.length ? `CLIPS (${bad.slice(0, 4).join('; ')})` : 'ok'}`);
    await page.screenshot({ path: `${out}/native-tab${i}.png` });
  }
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    for (const [i, tab] of ['Today’s Forecast', 'Hourly Forecast', 'Daily Forecast'].entries()) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(1500);
      const bad = await page.evaluate(audit);
      const worst = Math.max(0, ...bad.map((b) => +(/by (\d+)px|clips (\d+)px/.exec(b)?.[1] ?? 0)));
      console.log(`${w}x${h} tab${i}: ${bad.length ? `CLIPS (worst ${worst}px, ${bad.length} findings)` : 'ok'}`);
      if (i === 0 || bad.length) await page.screenshot({ path: `${out}/${w}x${h}-tab${i}.png` });
    }
  }
} finally {
  await stop();
}
