import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const url = process.env.GAME_URL || "http://127.0.0.1:3000";
await mkdir("docs/screenshots", { recursive: true });
await page.goto(url);
await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).waitFor();
await page.evaluate(() => window.__HIRODORA__.renderer.setPixelRatio(1));
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/title.png" });
await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.playerPos = [-6, 0, -5];
  e.playerRotY = -0.25;
  e.stats.subtitle = null;
});
await page.waitForTimeout(350);
await page.screenshot({ path: "docs/screenshots/cell-47.png" });
// An explicitly staged camera showcases the actual guard model and game geometry.
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.playerPos = [-5, 0, 1.45];
  e.playerRotY = 0;
  e.cameraPitch = 0.18;
  const guard = e.worldData.guards[0];
  guard.position = [-5, 0, -1.2];
  guard.rotationY = 0;
  guard.state = "knocked_out";
  guard.suspicion = 0;
  guard.stateTimer = 999;
  guard.investigationTarget = undefined;
  const model = e.worldData.guardMeshes.get(guard.id);
  model.position.set(...guard.position);
  model.rotation.set(0, 0, 0);
  for (const joint of [
    "leftArm",
    "rightArm",
    "leftLeg",
    "rightLeg",
    "leftKnee",
    "rightKnee",
    "head",
  ])
    model.userData[joint].rotation.x = 0;
  e.stats.subtitle = null;
  e.worldData.guards[1].state = "knocked_out";
  e.worldData.guards[1].stateTimer = 999;
});
await page.waitForTimeout(250);
await page.screenshot({ path: "docs/screenshots/guard.png" });
console.log(
  "Render diagnostics:",
  await page.evaluate(() => ({
    drawCalls: window.__HIRODORA__.renderer.info.render.calls,
    triangles: window.__HIRODORA__.renderer.info.render.triangles,
  })),
);
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.playerPos = [-5, 0, -0.05];
  e.cameraPitch = 0.02;
});
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/guard-detail.png" });
// Finish the high-resolution desktop renderer before creating the mobile scene.
await page.close();
const mobileContext = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const mobile = await mobileContext.newPage();
await mobile.goto(url);
await mobile.getByRole("button", { name: "BEGIN THE ESCAPE" }).tap();
await mobile.evaluate(() => {
  window.__HIRODORA__.stats.subtitle = null;
  window.__HIRODORA__.renderer.setPixelRatio(1);
});
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: "docs/screenshots/mobile.png" });
// Generate standards-compatible PNG app icons from the project's own SVG.
const icon = await readFile("public/icon.svg", "utf8");
const iconPage = await browser.newPage();
for (const size of [192, 512]) {
  await iconPage.setViewportSize({ width: size, height: size });
  await iconPage.setContent(
    `<style>html,body{margin:0;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>${icon}`,
  );
  await iconPage.screenshot({ path: `public/icon-${size}.png` });
}
await browser.close();
console.log("Captured four real game screenshots and generated app icons.");
