import { defineConfig } from '@playwright/test';

// Web project: Vite dev server (dev-only scene params) + mocked invoke. Tauri projects launch the real app themselves.
// Visual tolerance: WebGL grain and antialiasing differ by a few pixels between runs, so allow 1% differing pixels
// with a per-pixel colour threshold of 0.2. Real scene changes move far more than that.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 30_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2 } },
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'web',
      testDir: 'e2e/web',
      use: { baseURL: 'http://localhost:5174', viewport: { width: 1000, height: 620 }, launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
    },
    { name: 'tauri-dev', testDir: 'e2e/tauri', timeout: 180_000, metadata: { mode: 'dev' } },
    { name: 'tauri-release', testDir: 'e2e/tauri', timeout: 120_000, metadata: { mode: 'release' } },
  ],
  webServer: { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60_000 },
});
