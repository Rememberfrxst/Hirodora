import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/opening";
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
const errors = [],
  cameras = [
    { name: "cell47", position: [-6, 0, -5], yaw: -0.25, pitch: 0 },
    { name: "corridor", position: [-6, 0, -3.8], yaw: Math.PI, pitch: -0.35 },
  ];
async function pose(page, view) {
  await page.evaluate((v) => {
    const e = window.__HIRODORA__;
    e.playerPos = v.position;
    e.playerRotY = v.yaw;
    e.cameraPitch = v.pitch;
    e.stats.subtitle = null;
    e.munshiHint = null;
    e.overlayOpen = true;
    e.move(0);
    e.emitChange();
    e.camera.updateMatrixWorld();
    for (const g of e.worldData.guards)
      e.guardActors.get(g.id).update(g, 0, 0.5, e.camera, "desktop", false);
    e.scene.updateMatrixWorld(true);
    e.renderer.render(e.scene, e.camera);
  }, view);
}
for (const phase of ["before", "after"].filter(phase => !process.argv[2] || process.argv[2] === phase)) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    phase === "before"
      ? process.env.BEFORE_URL || "http://127.0.0.1:3004"
      : process.env.GAME_URL || "http://127.0.0.1:3002",
  );
  await page.locator("[data-start]").click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.overlayOpen = true;
  });
  for (const view of cameras) {
    await pose(page, view);
    await page.screenshot({ path: `${dir}/${phase}-${view.name}.png` });
  }
  if (phase === "after") {
    await page.evaluate(() => {
      const e = window.__HIRODORA__;
      function aim(id, x, z) {
        const o = e.worldData.interactables.find((o) => o.id === id);
        e.playerPos = [x, 0, z];
        e.playerRotY = Math.atan2(-(o.position[0] - x), -(o.position[2] - z));
        e.cameraPitch = 0;
        e.overlayOpen = false;
        e.move(0);
      }
      aim("cell_key_pickup", -5.8, -2.7);
      e.interact();
      aim("cell47_lock", -5, -3);
      e.interact();
      e.overlayOpen = true;
      e.emitChange();
      e.renderer.render(e.scene, e.camera);
    });
    await page.screenshot({ path: `${dir}/wrong-key.png` });
    await page.evaluate(() => {
      const e = window.__HIRODORA__;
      e.overlayOpen = false;
      e.playerPos = [-5.6, 0, -8.1];
      e.playerRotY = -Math.PI / 2;
      e.move(0);
      e.beginInteract();
      for (let i = 0; i < 60; i++) e.updateOpening(1 / 30);
      e.move(0);
      e.overlayOpen = true;
      e.emitChange();
      e.renderer.render(e.scene, e.camera);
    });
    await page.screenshot({ path: `${dir}/bed-push.png` });
    await page.evaluate(() => {
      const e = window.__HIRODORA__;
      function aim(id, x, z) {
        const o = e.worldData.interactables.find((o) => o.id === id);
        e.playerPos = [x, 0, z];
        e.playerRotY = Math.atan2(-(o.position[0] - x), -(o.position[2] - z));
        e.cameraPitch = 0;
        e.move(0);
      }
      function finish() {
        for (let i = 0; i < 330 && e.activeHold; i++) e.updateOpening(1 / 30);
      }
      e.overlayOpen = false;
      finish();
      aim("screwdriver_pickup", -5.8, -9);
      e.interact();
      aim("toilet_bolts", -6.8, -9.7);
      e.beginInteract();
      finish();
      aim("toilet_move", -6.8, -9.7);
      e.beginInteract();
      finish();
      e.endInteract();
      e.overlayOpen = true;
    });
    await pose(page, { position: [-6.8, 0, -10.4], yaw: 1.95, pitch: -0.32 });
    await page.screenshot({ path: `${dir}/passage.png` });
    const diagnostics = await page.evaluate(() => ({
      flags: window.__HIRODORA__.gameFlags,
      progress: window.__HIRODORA__.openingProgress,
      inventory: window.__HIRODORA__.inventory,
      render: window.__HIRODORA__.renderer.info.render,
    }));
    await writeFile(
      dir + "/capture.json",
      JSON.stringify({ baseline: process.env.BEFORE_COMMIT || "25ab543", cameras, diagnostics }, null, 2),
    );
    if (!diagnostics.flags.passage_open)
      throw Error("Screenshot flow did not open the actual passage");
    await page.evaluate(() => {
      const e = window.__HIRODORA__, o = e.worldData.interactables.find(o => o.id === 'passage47');
      e.overlayOpen = false; e.playerPos = [-7.3, 0, -10.3]; e.playerRotY = Math.atan2(-(o.position[0] + 7.3), -(o.position[2] + 10.3));
      e.move(0); e.interact(); for (let i = 0; i < 30; i++) e.updateOpening(.05);
      e.move(0); e.emitChange(); e.renderer.render(e.scene, e.camera);
    });
    await page.screenshot({ path: `${dir}/cell46-checkpoint.png` });
    await page.evaluate(() => window.__HIRODORA__.continueChapter());
    await pose(page, { position: [-10.2, 0, -4.3], yaw: .55, pitch: -.1 });
    await page.screenshot({ path: `${dir}/cell46.png` });
    await pose(page, { position: [-13, 0, .8], yaw: Math.PI / 2, pitch: .05 });
    await page.screenshot({ path: `${dir}/cellblock.png` });
  }
  await page.close();
}
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3002");
await page.locator("[data-start]").tap();
await pose(page, { position: [-6, 0, -3.8], yaw: Math.PI, pitch: -0.35 });
await page.screenshot({ path: dir + "/mobile.png" });
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Verified actual opening renders; identical before/after cameras; no browser errors.",
);
