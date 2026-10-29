import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = "docs/screenshots/update-v24";
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
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4206");
  await page.locator("[data-start]").click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
  });
  for (const [name, time] of [
    ["01-intro-left-sentry", 10.9],
    ["02-belt-key", 23],
  ]) {
    const state = await page.evaluate(
      ({ time, name }) => {
        const e = window.__HIRODORA__;
        for (let i = 0; i < 25; i++) e.cinematic.seek(time, false, 0.05);
        e.introCaption = e.cinematic.seek(time, false, 0.05).caption;
        if (name === "02-belt-key") {
          const key = e.worldData.pickupMeshes.get("cell_key_pickup");
          e.camera.position.set(-4.8, 1.4, -1.6);
          e.camera.lookAt(key.position);
          e.camera.updateMatrixWorld();
        }
        for (let i = 0; i < 30; i++)
          e.practicalLights.update(e.camera.position, 0.05);
        e.renderFrame(0.05);
        e.emitChange();
        return {
          time,
          position: e.camera.position.toArray(),
          caption: e.introCaption,
          keyPosition: e.worldData.pickupMeshes
            .get("cell_key_pickup")
            .position.toArray(),
        };
      },
      { time, name },
    );
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...state });
  }
  await page.getByRole("button", { name: /Skip intro/ }).click();
  for (const [name, action, seconds] of [
    ["03-table-caught-only", "bed_push", 2.8],
    ["04-visible-screwdriver", "driver", 0],
    ["05-individual-bolt", "toilet_bolt_0", 1.3],
    ["06-toilet-caught-only", "toilet_move", 2.5],
  ]) {
    const state = await page.evaluate(
      ({ name, action, seconds }) => {
        const e = window.__HIRODORA__;
        e.clearInput();
        e.overlayOpen = false;
        e.caughtMeter = 0;
        e.pushStrain = 0;
        e.caughtClatterLatched = false;
        e.inventory = ["cell_key"];
        e.equippedItem = null;
        e.gameFlags.key_identified = true;
        e.gameFlags.bed_moved = action !== "bed_push";
        e.gameFlags.toilet_unbolted = action === "toilet_move";
        e.gameFlags.passage_open = false;
        e.openingProgress = {
          bed: action === "bed_push" ? 0 : 1,
          bolts: action === "toilet_move" ? 1 : 0,
          toilet: 0,
          boltSteps: action === "toilet_move" ? [1, 1, 1, 1] : [0, 0, 0, 0],
        };
        if (action.startsWith("toilet_bolt")) {
          e.inventory.push("screwdriver");
          e.equippedItem = "screwdriver";
        }
        e.syncWorld();
        e.playerPos = action === "bed_push" ? [-5.6, 0, -8.1] : [-6.8, 0, -9.7];
        e.stats.isCrouching = action.startsWith("toilet_bolt");
        const id = action === "driver" ? "screwdriver_pickup" : action,
          o = e.worldData.interactables.find((o) => o.id === id);
        e.playerRotY = Math.atan2(
          -(o.position[0] - e.playerPos[0]),
          -(o.position[2] - e.playerPos[2]),
        );
        e.cameraPitch = action.startsWith("toilet_bolt")
          ? -Math.atan2(
              1 - (o.position[1] - 1),
              Math.hypot(
                o.position[0] - e.playerPos[0],
                o.position[2] - e.playerPos[2],
              ),
            )
          : 0;
        e.move(0);
        if (action !== "driver") {
          e.beginInteract();
          if (!e.activeHold)
            throw Error("No hold " + id + " " + e.contextualAction);
          for (let i = 0; i < Math.round(seconds / 0.05); i++)
            e.updateOpening(0.05);
        }
        if (action === "bed_push") {
          e.camera.position.set(-5.6, 1.6, -6.9);
          e.camera.lookAt(-4.7, 0.7, -8.2);
        }
        if (action === "driver") {
          e.playerPos = [-5.4, 0, -9.3];
          e.camera.position.set(-5.4, 1.15, -9.3);
          e.camera.lookAt(-4.45, 0.03, -8.7);
          e.contextualAction = "screwdriver_pickup";
          e.activeInteractPrompt = "Take the screwdriver";
          e.elapsed = 2.46;
        }
        if (action === "toilet_move") {
          e.camera.position.set(-6.2, 1.5, -8.9);
          e.camera.lookAt(-7.7, 0.5, -9.3);
        }
        e.camera.updateMatrixWorld();
        e.stats.subtitle = null;
        e.munshiHint = null;
        e.overlayOpen = true;
        for (let i = 0; i < 35; i++)
          e.practicalLights.update(e.camera.position, 0.05);
        e.renderFrame(0.3);
        e.emitChange();
        return {
          action,
          seconds,
          progress: e.openingProgress,
          risk: e.caughtMeter,
          position: e.camera.position.toArray(),
          selectedBolt: e.focusedBolt,
        };
      },
      { name, action, seconds },
    );
    await page.screenshot({ path: `${dir}/${name}.png` });
    captures.push({ name, ...state });
  }
  if (errors.length) throw Error(errors.join("\n"));
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify(
      {
        method:
          "Actual rendered game with fixed intro seeks and inspection cameras. Object views advance real holds; later puzzle prerequisites and highlight phase are seeded for inspection. Not a human playthrough or phone FPS benchmark.",
        captures,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
console.log("Six v24 interaction and intro views captured.");
