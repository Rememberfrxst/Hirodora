import { test, expect } from "@playwright/test";
test.use({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
});
test("production Safari web app starts under repository path and reopens from its offline cache", async ({
  page,
  context,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const port = Number(new URL(baseURL!).port) + 1;
  const url = `http://127.0.0.1:${port}/Hirodora/`;
  await page.goto(url);
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 90000 });
  await expect(page.locator(".ios-install-note")).toContainText(
    "Add to Home Screen",
  );
  await page.locator("[data-start]").tap();
  await page.getByRole("button", { name: /Skip intro/ }).tap();
  await expect(
    page.getByRole("region", { name: "Movement joystick" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause game", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Resume escape", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(
    async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !!r?.active && !!navigator.serviceWorker.controller;
    },
    undefined,
    { timeout: 90000 },
  );
  const cached = await page.evaluate(async () => {
    const keys = (await caches.keys()).filter((k) => k.startsWith("hirodora-"));
    const files = await (await caches.open(keys[0])).keys();
    return files.map((r) => new URL(r.url).pathname);
  });
  expect(cached.some((p) => p.endsWith("index.html"))).toBe(true);
  expect(cached.some((p) => p.includes("rock16-mobile-normal"))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 90000 });
  await page.locator("[data-start]").tap();
  const skip = page.getByRole("button", { name: /Skip intro/ });
  if (await skip.isVisible()) await skip.tap();
  await expect(
    page.getByRole("region", { name: "Movement joystick" }),
  ).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
