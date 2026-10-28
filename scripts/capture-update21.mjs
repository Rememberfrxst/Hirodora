import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/update-v21";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const captures = [],
  errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(180000);
  page.on("pageerror", (e) => errors.push(e.message));
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route(/first-person-arm\.glb$/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3806");
  await page.waitForFunction(() => window.__HIRODORA__?.loadingCompleted === 2);
  await page.screenshot({ path: `${dir}/01-real-loading.png` });
  captures.push({
    name: "01-real-loading",
    actualStage: 2,
    totalStages: 8,
    method:
      "Capture holds the real arm request to inspect genuine pending asset work.",
  });
  release();
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  const settle = async (p) =>
    p.evaluate(() => {
      const e = window.__HIRODORA__;
      cancelAnimationFrame(e.frameId);
      e.overlayOpen = true;
      e.reducedMotion = true;
      e.inventory = ["pistol_10mm", "screwdriver", "cell_key"];
      e.stats.subtitle = null;
      e.munshiHint = null;
      e.activeInteractPrompt = null;
      e.setGraphicsPreset("high");
      e.renderer.setPixelRatio(1);
    });
  await settle(page);
  for (const [name, position, target, item, reload, shot] of [
    [
      "02-toilet-bolts",
      [-6.5, 1.35, -8.8],
      [-8, 0.55, -9.6],
      null,
      false,
      false,
    ],
    [
      "03-pistol-grip",
      [-39, 1.65, 0],
      [-39, 1.5, 10],
      "pistol_10mm",
      false,
      false,
    ],
    [
      "04-shot-effect",
      [-39, 1.65, 0],
      [-39, 1.5, 10],
      "pistol_10mm",
      false,
      true,
    ],
    ["05-reload", [-39, 1.65, 0], [-39, 1.5, 10], "pistol_10mm", true, false],
  ]) {
    const state = await page.evaluate(
      ({ position, target, item, reload, shot }) => {
        const e = window.__HIRODORA__;
        e.camera.position.set(...position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        e.equippedItem = item;
        e.reloadRemaining = reload ? 0.9 : 0;
        e.stats.pistolAmmo = reload ? 0 : 6;
        e.gameFlags.can_attached = !shot;
        for (let i = 0; i < 35; i++) {
          e.practicalLights.update(e.camera.position, 0.05);
          for (const g of e.worldData.guards)
            e.guardActors
              .get(g.id)
              ?.update(
                g,
                g.examining ? 0 : 0.8,
                0.05,
                e.camera,
                e.guardQuality,
                e.mobile,
              );
        }
        e.renderFrame(0.3);
        if (shot) {
          e.firstPerson.shoot();
          e.stats.pistolAmmo = 5;
          e.renderFrame(0.016);
        }
        e.emitChange();
        return {
          position,
          target,
          item,
          reload,
          shot,
          fov: e.camera.fov,
          drawCalls: e.drawCalls,
          triangles: e.triangles,
          leftVisible: e.firstPerson.leftMesh.visible,
          flash: e.firstPerson.muzzleFlash.visible,
        };
      },
      { position, target, item, reload, shot },
    );
    await page
      .locator(".pocket-item img")
      .evaluateAll(async (imgs) => Promise.all(imgs.map((i) => i.decode())));
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...state });
  }
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.setDefaultTimeout(180000);
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(process.env.GAME_URL || "http://127.0.0.1:3806");
  await mobile.locator("[data-start]").tap();
  await mobile.getByRole("button", { name: /Skip intro/ }).tap();
  await mobile.getByRole("button", { name: "Pause game", exact: true }).tap();
  await mobile.getByRole("button", { name: "Settings", exact: true }).tap();
  await mobile.getByRole("tab", { name: "Controls", exact: true }).tap();
  await mobile.getByRole("button", { name: "Custom HUD", exact: true }).tap();
  const widget = mobile.getByRole("button", {
      name: "Move Gun info control",
      exact: true,
    }),
    b = await widget.boundingBox();
  await mobile.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await mobile.mouse.down();
  await mobile.mouse.move(270, 115, { steps: 8 });
  await mobile.mouse.up();
  await mobile.getByRole("button", { name: "Save HUD", exact: true }).tap();
  await mobile.getByRole("button", { name: "Back from settings" }).tap();
  await mobile
    .getByRole("button", { name: "Resume escape", exact: true })
    .tap();
  await settle(mobile);
  const state = await mobile.evaluate(() => {
    const e = window.__HIRODORA__;
    e.camera.position.set(-39, 1.65, 0);
    e.camera.lookAt(-39, 1.5, 10);
    e.camera.updateMatrixWorld();
    e.equippedItem = "pistol_10mm";
    e.stats.pistolAmmo = 6;
    for (let i = 0; i < 35; i++)
      e.practicalLights.update(e.camera.position, 0.05);
    e.renderFrame(0.3);
    e.emitChange();
    return {
      layout: JSON.parse(localStorage.getItem("hirodora-hud-v1")),
      viewport: [innerWidth, innerHeight],
    };
  });
  await mobile.screenshot({ path: `${dir}/06-mobile-custom-hud.png` });
  captures.push({ name: "06-mobile-custom-hud", ...state });
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify(
      {
        captures,
        errors,
        method:
          "Actual game renders and loading UI; fixed camera for desktop grip, recoil and reload; mobile card moved through the real Custom HUD editor.",
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Captured six v21 views.");
} finally {
  await browser.close();
}
