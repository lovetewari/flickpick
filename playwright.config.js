import { defineConfig, devices } from '@playwright/test';

// E2E runs against a real Next.js server with all network egress stubbed in
// the specs (Supabase REST + app APIs) — no secrets, CI-safe, deterministic.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  // Cold `next dev` route compiles under parallel workers can exceed the 5s
  // default — this is dev-server latency, not app behavior.
  expect: { timeout: 15000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key',
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // iPhone viewport/touch emulation on chromium — one browser binary for CI
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});
