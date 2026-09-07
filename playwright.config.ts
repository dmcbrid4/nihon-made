import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    // getAppConfig() falls back to "browser" mode only when *none* of these
    // are set; a real .env.local with cloud credentials (from deploying this
    // app) would otherwise put the dev server in "unavailable" mode here.
    env: {
      DATABASE_URL: "",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      OWNER_EMAIL: "",
      APP_PASSWORD: "",
    },
  },
});
