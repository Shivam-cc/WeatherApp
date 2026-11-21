import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const CDP = 'http://127.0.0.1:9222';

export const RELEASE_EXE = resolve(ROOT, 'target/release/weather-app.exe');

async function up() {
  try {
    return (await fetch(`${CDP}/json/version`)).ok;
  } catch {
    return false;
  }
}

/** Starts the real app with WebView2's debugging port open and returns its page plus a stop function. */
export async function launch(mode: 'dev' | 'release') {
  if (await up()) throw new Error('port 9222 is already in use; close the running app first');
  const env = { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9222' };
  const child: ChildProcess =
    mode === 'dev'
      ? spawn('npm run tauri dev', { cwd: ROOT, env, shell: true, stdio: 'ignore' })
      : spawn(RELEASE_EXE, { cwd: ROOT, env, stdio: 'ignore' });
  // /T kills the whole tree (npm -> cargo -> app); a plain kill would orphan the window.
  const kill = () => {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  };
  try {
    for (let i = 0; !(await up()); i++) {
      if (i > 180) throw new Error('app did not expose CDP within 3 minutes');
      await new Promise((r) => setTimeout(r, 1000));
    }
    const browser = await chromium.connectOverCDP(CDP);
    // The page list can briefly hold about:blank while the webview navigates, so wait for the app page.
    let page: Page | undefined;
    for (let i = 0; i < 60 && !page; i++) {
      page = browser.contexts().flatMap((c) => c.pages()).find((p) => /^https?:\/\/(localhost:1420|tauri\.localhost)/.test(p.url()));
      if (!page) await new Promise((r) => setTimeout(r, 500));
    }
    if (!page) throw new Error('app page not found');
    return {
      page,
      stop: async () => {
        await browser.close().catch(() => {});
        kill();
      },
    };
  } catch (e) {
    kill();
    throw e;
  }
}
