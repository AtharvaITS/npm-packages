import { defineConfig, devices } from '@playwright/test';

const functional = { testIgnore: /performance\.spec\.ts/ };

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    env: { PLAYWRIGHT: '1' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, ...functional },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, ...functional },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, ...functional },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
      ...functional,
    },
    // Timing-sensitive checks run last, alone, so other browsers don't compete for the CPU.
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /performance\.spec\.ts/,
      dependencies: ['chromium', 'firefox', 'webkit', 'mobile'],
    },
  ],
});
