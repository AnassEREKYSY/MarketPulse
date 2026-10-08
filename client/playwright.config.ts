import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];
const PORT = 4330;

// The API is mocked per test (e2e/mock-api.ts); only the Angular dev server runs.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env['PW_CHROMIUM_PATH'] ? { executablePath: process.env['PW_CHROMIUM_PATH'] } : {},
  },
  webServer: { command: `npx ng serve --port ${PORT}`, port: PORT, reuseExistingServer: !isCI, timeout: 180_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
