import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4317",
    video: "on",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:4317/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
