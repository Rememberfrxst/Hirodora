// Optional Safari-engine checks; not a substitute for physical iPhone QA.
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  timeout: 180_000,
  use: { ...base.use, browserName: "webkit", launchOptions: {} },
});
