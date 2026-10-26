import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "docs/screenshots/hud-v7";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3200");
await page.locator("[data-start]").click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.setGraphicsPreset("high");
  e.renderer.setPixelRatio(1);
  e.overlayOpen = true;
  e.stats.subtitle = null;
  e.playerPos = [-6, 0, -5];
  e.playerRotY = -0.25;
  e.cameraPitch = 0;
  e.move(0);
  e.renderer.render(e.scene, e.camera);
  e.emitChange();
});
await page.screenshot({ path: `${directory}/mobile-controls.png` });
await page.getByRole("button", { name: "Pause game", exact: true }).click();
await page.getByRole("button", { name: "Custom HUD", exact: true }).click();
await page.screenshot({ path: `${directory}/editor-compact.png` });
await page.getByLabel("HUD preset").selectOption("left");
await page.screenshot({ path: `${directory}/editor-left-handed.png` });
await page.getByLabel("HUD preset").selectOption("large");
await page.screenshot({ path: `${directory}/editor-large.png` });
await page.getByRole("button", { name: "Cancel", exact: true }).click();
await page.getByRole("button", { name: /^Resume escape/ }).click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.inventory = ["cell_key", "screwdriver"];
  e.overlayOpen = true;
  e.emitChange();
});
await page.getByRole("button", { name: /SATCHEL/ }).click();
await page.screenshot({ path: `${directory}/inventory-cards.png` });
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Actual mobile controls, three editor presets and inventory cards captured.",
);
