// Regenerates docs/screenshots/*.png: node scripts/screenshots.mjs (from ui/). Starts its own Vite dev server.
// Every image uses the MOCK data in e2e/mock/invoke.ts (labelled cities, hand-set conditions), not live forecasts.
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mockInvoke } from '../e2e/mock/invoke.ts';

const PORT = 5175;
const OUT = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
const CITIES = {
  London: { name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' },
  Reykjavik: { name: 'Reykjavik', region: 'Capital Region', country: 'Iceland', lat: 64.1355, lon: -21.8954, timezone: 'Atlantic/Reykjavik' },
  Mumbai: { name: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0728, lon: 72.8826, timezone: 'Asia/Kolkata' },
  Singapore: { name: 'Singapore', region: '', country: 'Singapore', lat: 1.2897, lon: 103.8501, timezone: 'Asia/Singapore' },
};
// time = the moment the sky is drawn for (and the frozen clock); at = scene clock for the frozen animation frame.
const SHOTS = [
  { file: 'clear-day', city: 'London', sky: 'Clear', time: '2026-03-20T12:00:00Z', tempC: 16 },
  { file: 'golden-hour', city: 'London', sky: 'Clear', time: '2026-03-20T17:30:00Z', tempC: 13 },
  { file: 'rain', city: 'Mumbai', sky: 'Rain', time: '2026-03-20T06:30:00Z', tempC: 27 },
  { file: 'snow', city: 'Reykjavik', sky: 'Snow', time: '2026-03-20T12:00:00Z', tempC: -2 },
  { file: 'thunderstorm', city: 'Singapore', sky: 'Thunderstorm', time: '2026-03-20T13:00:00Z', tempC: 26, isDay: false, at: 9.24 },
  { file: 'night', city: 'London', sky: 'Clear', time: '2026-03-20T23:00:00Z', tempC: 6, isDay: false },
];

const vite = spawn(`npx vite --port ${PORT} --strictPort`, { shell: true, stdio: 'ignore' });
const stopVite = () => { try { execFileSync('taskkill', ['/PID', String(vite.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} };
let browser;
try {
  for (let i = 0; ; i++) {
    if (await fetch(`http://localhost:${PORT}/`).then((r) => r.ok, () => false)) break;
    if (i > 60) throw new Error('vite did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(mockInvoke, { sky: s.sky, isDay: s.isDay ?? true, tempC: s.tempC });
    await page.addInitScript((c) => localStorage.setItem('recents', JSON.stringify({ list: [c] })), CITIES[s.city]);
    await page.clock.setFixedTime(new Date(s.time));
    await page.goto(`http://localhost:${PORT}/?preset=${s.sky}&time=${s.time}&seed=1&static&at=${s.at ?? 3}`);
    await page.getByRole('heading', { level: 1 }).filter({ hasText: s.city }).waitFor();
    await page.addStyleTag({ content: '.lab{display:none!important}' }); // dev-only scene sliders
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}${s.file}.png` });
    console.log('wrote', s.file);
    await page.close();
  }
} finally {
  await browser?.close();
  stopVite();
}
