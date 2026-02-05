// File: playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Keep deterministic runs while you're stabilizing
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/fx-test-report.json' }],
  ],

  // Per-test timeout and entire-run cap
  timeout: 30_000,
  globalTimeout: 120_000,

  expect: {
    timeout: 5_000,
  },

  // Auto-start dev server for tests (Vite only, no Electron)
  webServer: {
    command: 'pnpm run vite',
    url: 'http://localhost:5173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Helps WebAudio/media-related APIs behave in headless runs
        launchOptions: {
          args: [
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
  ],
});
