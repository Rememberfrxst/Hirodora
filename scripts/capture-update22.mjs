import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/update-v22";
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
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3900");
  await page.locator("[data-start]").click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
  });
  for (const [name, time] of [
    ["01-wake-up", 1.75],
    ["02-stay-down", 10.9],
    ["03-body-inspection", 19],
  ]) {
    const data = await page.evaluate((time) => {
      const e = window.__HIRODORA__;
      e.introCaption = e.cinematic.seek(time, false, 0.05).caption;
      for (let i = 0; i < 35; i++)
        e.practicalLights.update(e.camera.position, 0.05);
      e.renderFrame(0.05);
      e.emitChange();
      return {
        time,
        caption: e.introCaption,
        position: e.camera.position.toArray(),
        fov: e.camera.fov,
      };
    }, time);
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...data });
  }
  await page.getByRole("button", { name: /Skip intro/ }).click();
  for (const [name, action, seconds, position, target] of [
    ["04-table-meter", "bed_push", 2.8, [-5.6, 1.6, -6.9], [-4.7, 0.7, -8.2]],
    [
      "05-bolt-progress",
      "toilet_bolts",
      2.0,
      [-6.55, 1.45, -8.8],
      [-7.83, 0.045, -9.52],
    ],
    [
      "06-toilet-meter",
      "toilet_move",
      2.3,
      [-6.55, 1.45, -8.8],
      [-8, 0.55, -9.6],
    ],
  ]) {
    const data = await page.evaluate(
      ({ action, seconds, position, target }) => {
        const e = window.__HIRODORA__;
        e.overlayOpen = false;
        e.clearInput();
        e.caughtMeter = 0;
        e.caughtClatterLatched = false;
        e.stats.subtitle = null;
        e.munshiHint = null;
        e.inventory = ["cell_key", "screwdriver"];
        e.gameFlags.key_identified = true;
        e.gameFlags.bed_moved = action !== "bed_push";
        e.gameFlags.toilet_unbolted = action === "toilet_move";
        e.gameFlags.passage_open = false;
        e.openingProgress = {
          bed: action === "bed_push" ? 0 : 1,
          bolts: action === "toilet_move" ? 1 : 0,
          toilet: 0,
        };
        e.syncWorld();
        const p = action === "bed_push" ? [-5.6, 0, -8.1] : [-6.8, 0, -9.7];
        e.playerPos = p;
        const o = e.worldData.interactables.find((o) => o.id === action);
        e.playerRotY = Math.atan2(
          -(o.position[0] - p[0]),
          -(o.position[2] - p[2]),
        );
        e.cameraPitch = 0;
        e.move(0);
        e.beginInteract();
        if (e.activeHold !== action)
          throw Error("Cannot begin actual action " + action);
        for (let i = 0; i < Math.round(seconds * 30); i++)
          e.updateOpening(1 / 30);
        e.camera.position.set(...position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        e.contextualAction = action;
        for (let i = 0; i < 35; i++)
          e.practicalLights.update(e.camera.position, 0.05);
        e.equippedItem = action === "toilet_bolts" ? "screwdriver" : null;
        e.renderFrame(0.3);
        e.emitChange();
        return {
          action,
          seconds,
          risk: e.caughtMeter,
          progress: { ...e.openingProgress },
          position,
          target,
          fov: e.camera.fov,
        };
      },
      { action, seconds, position, target },
    );
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
          "Actual rendered game. Intro snapshots use deterministic scene seek; object captures advance real hold actions without guard simulation, then use fixed inspection cameras. These snapshots do not claim recorded voice playback; browser audio tests separately check all five clips.",
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Captured six v22 intro and object-meter views.");
} finally {
  await browser.close();
}
