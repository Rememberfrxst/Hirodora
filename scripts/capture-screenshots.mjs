import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const url = process.env.GAME_URL || "http://127.0.0.1:3000";
await mkdir("docs/screenshots", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
await page.evaluate(() => window.__HIRODORA__.renderer.setPixelRatio(1));
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/title.png" });
await page.locator("[data-start]").click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.playerPos = [-6, 0, -5];
  e.playerRotY = -0.25;
  e.stats.subtitle = null;
  e.emitChange();
});
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/cell-47.png" });

// Authentic engine, GLB, materials and prison lighting. Camera/guard are staged
// only for the front, side and detail showcases, not represented as live gameplay.
async function showcase(file, rotation = 0, detail = false) {
  await page.evaluate(
    ({ rotation, detail }) => {
      const e = window.__HIRODORA__;
      e.overlayOpen = true;
      e.stats.subtitle = null;
      e.emitChange();
      e.setGuardQuality("desktop");
      e.camera.position.set(-5, detail ? 1.63 : 1.6, detail ? 0.35 : 2.0);
      e.camera.lookAt(-5, detail ? 1.5 : 1.03, -0.8);
      e.camera.updateMatrixWorld();
      const g = e.worldData.guards[0];
      g.position = [-5, 0, -0.8];
      g.rotationY = rotation;
      g.state = "patrol";
      const actor = e.guardActors.get(g.id);
      actor.root.rotation.y = rotation;
      actor.reset();
      for (let i = 0; i < 20; i++)
        actor.update(g, 0, 0.05, e.camera, "desktop", false);
      e.scene.updateMatrixWorld(true);
      e.renderer.render(e.scene, e.camera);
    },
    { rotation, detail },
  );
  await page.screenshot({ path: `docs/screenshots/${file}.png` });
}
await showcase("guard");
await showcase("guard-side", Math.PI / 2);
await showcase("guard-detail", 0, true);

// Capture the real patrol simulation, with legal corridor positions and AI running.
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.setGuardQuality("auto");
  e.playerPos = [-4, 0, 1.5];
  e.playerRotY = 0;
  e.cameraPitch = 0.12;
  e.stats.subtitle = null;
  e.stats.noiseLevel = 0;
  e.stats.isCrouching = true;
  const g = e.worldData.guards[0];
  g.position = [-5, 0, 0];
  g.rotationY = Math.PI / 2;
  g.currentWaypoint = 1;
  g.state = "patrol";
  g.suspicion = 0;
  e.overlayOpen = false;
  e.emitChange();
});
await page.waitForTimeout(450);
await page.screenshot({ path: "docs/screenshots/guard-gameplay.png" });
console.log(
  "Actual gameplay render:",
  await page.evaluate(() => ({
    calls: window.__HIRODORA__.renderer.info.render.calls,
    triangles: window.__HIRODORA__.renderer.info.render.triangles,
    officers: [...window.__HIRODORA__.guardActors.values()].map((a) => ({
      lod: a.tier,
      clip: a.animation,
    })),
  })),
);
await page.close();
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const mobile = await context.newPage();
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(url);
await mobile.locator("[data-start]").tap();
await mobile.evaluate(() => {
  const e = window.__HIRODORA__;
  e.stats.subtitle = null;
  e.emitChange();
  e.renderer.setPixelRatio(1);
});
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: "docs/screenshots/mobile.png" });
await context.close();
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  "Captured real front, side, detail, patrol gameplay, cell, title and mobile renders.",
);
