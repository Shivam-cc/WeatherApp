// Web-project screenshots of the band at the sizes that matter: node scripts/shots-web.mjs <outDir> (from ui/).
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mockInvoke } from '../e2e/mock/invoke.ts';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const vite = spawn('npx vite --port 5176 --strictPort', { shell: true, stdio: 'ignore' });
const London = { name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257, timezone: 'Europe/London' };
let browser;
try {
  for (let i = 0; !(await fetch('http://localhost:5176/').then((r) => r.ok, () => false)); i++) if (i > 60) throw new Error('vite'); else await new Promise((r) => setTimeout(r, 500));
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [w, h] of [[1000, 620], [1920, 700], [1280, 620]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(mockInvoke, {});
    await page.addInitScript((c) => localStorage.setItem('recents', JSON.stringify({ list: [c] })), London);
    await page.goto('http://localhost:5176/?static');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.addStyleTag({ content: '.lab{display:none!important}' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}/web-${w}x${h}.png` });
    await page.close();
  }
} finally {
  await browser?.close();
  try { execFileSync('taskkill', ['/PID', String(vite.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
}
