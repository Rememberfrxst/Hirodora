import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/bridge-v19";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const views = [
  ["01-bridge-overview", [-33, 1.65, 0], [-39, 0.75, 5], null],
  ["02-crossing", [-39, 1.65, 1.4], [-39, 1.4, 10], null],
  ["03-lower-clearance", [-34, -1.55, 5], [-39, 0.2, 4], null],
  ["04-pistol", [-39, 1.65, 0], [-39, 1.5, 10], "pistol_10mm"],
  ["05-screwdriver", [-39, 1.65, 0], [-39, 1.5, 10], "screwdriver"],
  ["06-key", [-39, 1.65, 0], [-39, 1.5, 10], "cell_key"],
];
const errors = [],
  captures = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3780");
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
  for (const [name, position, target, item] of views) {
    const state = await page.evaluate(
      ({ position, target, item }) => {
        const e = window.__HIRODORA__;
        e.camera.position.set(...position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        e.equippedItem = item;
        e.stats.subtitle = null;
        e.munshiHint = null;
        e.contextualAction = null;
        e.activeInteractPrompt = null;
        for (let i = 0; i < 45; i++)
          e.practicalLights.update(e.camera.position, 0.05);
        // Advance presentation only, so a paused capture does not show the
        // zero-time rest pose. Gameplay positions and the test camera stay fixed.
        for (let i = 0; i < 35; i++)
          for (const guard of e.worldData.guards)
            e.guardActors
              .get(guard.id)
              ?.update(
                guard,
                guard.examining ? 0 : 0.8,
                0.05,
                e.camera,
                e.guardQuality,
                e.mobile,
              );
        e.renderFrame(0.3);
        e.emitChange();
        const hand = e.firstPerson.arm?.getObjectByName("RightHand"),
          fingers = {};
        if (hand)
          for (const n of [
            "RightHandIndex4",
            "RightHandMiddle4",
            "RightHandThumb4",
          ]) {
            const b = e.firstPerson.arm.getObjectByName(n);
            if (b)
              fingers[n] = hand
                .worldToLocal(b.getWorldPosition(e.camera.position.clone()))
                .toArray();
          }
        return {
          position,
          target,
          item,
          fov: e.camera.fov,
          handScale: e.firstPerson.arm?.scale.toArray(),
          fingers,
          calls: e.drawCalls,
          triangles: e.triangles,
        };
      },
      { position, target, item },
    );
    await page.locator(".pocket-item img").first().waitFor();
    await page
      .locator(".pocket-item img")
      .evaluateAll(async (list) => Promise.all(list.map((i) => i.decode())));
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...state });
  }
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify({ captures, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Captured six real bridge/held-item views.");
} finally {
  await browser.close();
}
