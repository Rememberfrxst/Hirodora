import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1100, height: 720 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --port 3100 --strictPort",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "npm run preview -- --base=/Hirodora/ --port 3101 --host 0.0.0.0 --strictPort",
      url: "http://127.0.0.1:3101/Hirodora/",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
