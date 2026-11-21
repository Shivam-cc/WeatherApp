// Real-window loading-state capture: node scripts/repro-real-loading.mjs <outDir> [after] (from ui/). Delays get_weather* by holding the promise.
import { launch } from '../e2e/tauri/launch.ts';
import { mkdirSync } from 'node:fs';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const { page, stop } = await launch('release');
try {
  await page.evaluate(() => localStorage.setItem('recents', JSON.stringify({ list: [{ name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' }] })));
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  // IPC goes over fetch to ipc.localhost, so hold the weather requests there.
  let release;
  const held = new Promise((r) => (release = r));
  await page.route(/ipc\.localhost\/get_weather/, async (route) => { await held; await route.continue(); });
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(400);
  await page.keyboard.type('Tokyo');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/real-1-typed.png` });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/real-2-loading.png` });
  console.log(JSON.stringify(await page.evaluate(() => {
    const d = (e) => { const r = e.getBoundingClientRect(); return `${e.tagName}.${e.className} [${[r.x, r.y, r.width, r.height].map(Math.round)}] role=${e.getAttribute('role')}`; };
    return { palette: !!document.querySelector('[role=dialog]'), progressbars: [...document.querySelectorAll('[role=progressbar]')].map(d), atTopCentre: document.elementsFromPoint(500, 40).slice(0, 3).map(d) };
  }), null, 1));
  release();
  await page.getByRole('heading', { level: 1, name: 'Tokyo' }).waitFor({ timeout: 20000 }).catch(() => console.log('Tokyo did not load'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/real-3-done.png` });
} finally {
  await stop();
}
