import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  globalTimeout: 300_000,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: "test-results",
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "narrowMobile", use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
    { name: "ultrawide", use: { viewport: { width: 2560, height: 1440 } } },
  ],
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL ? undefined : {
    command: "npm run start -- --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
