import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/android-v6";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3200");
await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
await page.screenshot({ path: `${dir}/title.png` });
await page.locator("[data-start]").click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.overlayOpen = true;
  e.stats.subtitle = null;
  e.setGraphicsPreset("high");
  e.renderer.setPixelRatio(1);
  e.camera.position.set(-5, 1.65, 1.15);
  e.camera.lookAt(-5, 1.3, -0.8);
  e.camera.updateMatrixWorld();
  const guard = e.worldData.guards[0];
  guard.examining = false;
  guard.position = [-5, 0, -0.8];
  guard.rotationY = 0;
  guard.state = "patrol";
  const actor = e.guardActors.get(guard.id);
  actor.reset();
  actor.root.rotation.y = 0;
  for (let i = 0; i < 20; i++)
    actor.update(guard, 0, 0.05, e.camera, "desktop", false);
  e.guardKey.position.set(-5, 3.1, 0);
  e.guardKey.target.position.set(-5, 0, 0);
  e.scene.updateMatrixWorld(true);
  e.renderer.render(e.scene, e.camera);
});
await page.screenshot({ path: `${dir}/officer.png` });
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.overlayOpen = false;
  e.pauseGame();
});
await page.getByRole("button", { name: "Start new game", exact: true }).click();
await page.screenshot({ path: `${dir}/new-game.png` });
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Captured actual title, staged officer and restart UI from current game.",
);
