import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/update-v20";
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
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3790");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.inventory = ["pistol_10mm", "screwdriver", "cell_key"];
    e.gameFlags.can_attached = true;
  });
  for (const [name, position, target, item, reload] of [
    ["01-cell048-stairs", [-10, -2.15, 3], [-5.95, 0.2, 9], null, false],
    ["02-cell036-stairs", [-62, -2.15, 5], [-66.5, 0.2, -1], null, false],
    ["03-lower-numbers", [-11, -2.15, 2], [-11, -0.6, -2], null, false],
    [
      "04-right-hand-pistol",
      [-39, 1.65, 0],
      [-39, 1.5, 10],
      "pistol_10mm",
      false,
    ],
    ["05-pickup-dialogue", [-6, 1.65, -3.15], [-5.7, 0.9, -0.7], null, false],
    [
      "06-reload-support-hand",
      [-39, 1.65, 0],
      [-39, 1.5, 10],
      "pistol_10mm",
      true,
    ],
  ]) {
    const data = await page.evaluate(
      ({ name, position, target, item, reload }) => {
        const e = window.__HIRODORA__;
        e.camera.position.set(...position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        e.equippedItem = item;
        e.reloadRemaining = reload ? 0.9 : 0;
        e.stats.pistolAmmo = reload ? 0 : 6;
        e.stats.subtitle = null;
        e.munshiHint = null;
        e.activeInteractPrompt = null;
        e.contextualAction = null;
        if (name === "05-pickup-dialogue") {
          e.activeInteractPrompt = "Take the key";
          e.contextualAction = "cell_key_pickup";
          e.stats.subtitle = {
            speaker: "Prison Guard",
            text: "Where is the key?",
            timeRemaining: 30,
          };
        }
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
        e.emitChange();
        const left = e.firstPerson.arm.getObjectByName("LeftArmMesh"),
          right = e.firstPerson.arm.getObjectByName("RightArmMesh");
        return {
          position,
          target,
          item,
          reload,
          fov: e.camera.fov,
          ammo: e.stats.pistolAmmo,
          leftVisible: left.visible,
          rightVisible: right.visible,
          calls: e.drawCalls,
          triangles: e.triangles,
        };
      },
      { name, position, target, item, reload },
    );
    await page
      .locator(".pocket-item img")
      .evaluateAll(async (imgs) => Promise.all(imgs.map((i) => i.decode())));
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...data });
  }
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify(
      {
        captures,
        errors,
        method:
          "Real game render; fixed cameras and paused simulation. Pickup/dialogue view stages UI state to compare the reference layout, not recorded voice playback.",
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Captured six actual v20 game views.");
} finally {
  await browser.close();
}
