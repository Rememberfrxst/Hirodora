import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = "docs/screenshots/update-v23";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [],
  captures = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(180000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4102");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.inventory = ["pistol_10mm", "screwdriver", "cell_key"];
    e.equippedItem = "pistol_10mm";
    e.munshiHint = null;
    e.stats.subtitle = null;
    e.clearInput();
  });
  for (const [name, stage, position, target] of [
    ["01-pistol-and-taller-officer", "grip", [-39, 1.68, 0], [-39, 1.4, 6]],
    ["02-cell015-hidden-door", "door", null, null],
    ["03-security-wing", "secret", [102.7, 1.68, 6], [111, 1.4, 5.8]],
    ["04-underground-passage", "tunnel", [132, -2.32, 13], [132, -2.4, 32]],
    ["05-island-military", "military", [184, 1.68, 0], [248, 1.8, 0]],
    ["06-escape-boat", "boat", [281, 1.68, 1.7], [287, 0.7, 0]],
  ]) {
    const state = await page.evaluate(
      ({ stage, position, target }) => {
        const e = window.__HIRODORA__;
        if (stage === "grip") {
          const g = e.activeGuards[0];
          g.position = [-39, 0, 6];
          g.state = "patrol";
          g.examining = false;
          g.rotationY = Math.PI;
        }
        if (stage === "door") {
          e.setRegion(undefined);
          const c = e.worldData.cells.find((c) => c.number === 15);
          position = [c.centerX, c.floorY + 1.68, c.rear + 3.3];
          target = [c.centerX, c.floorY + 1.35, c.rear + 0.3];
        }
        if (stage === "secret") e.routeAction("route_enter");
        if (stage === "tunnel") {
          e.setRegion("secret");
          e.gameFlags.route_command_clear = true;
        }
        if (stage === "military") e.routeAction("route_military");
        if (stage === "boat") {
          e.gameFlags.route_sea_gate = true;
          e.escapeWorld.sync(e.gameFlags);
        }
        e.overlayOpen = true;
        e.clearInput();
        e.stats.subtitle = null;
        e.munshiHint = null;
        e.activeInteractPrompt = null;
        e.contextualAction = null;
        e.activeHold = null;
        e.playerPos = [position[0], position[1] - 1.68, position[2]];
        e.camera.position.fromArray(position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        for (let i = 0; i < 25; i++)
          for (const g of e.activeGuards) {
            e.guardActors
              .get(g.id)
              .update(g, 0, 0.05, e.camera, e.guardQuality, e.mobile);
            e.updateEnemyWeapon(g);
          }
        e.practicalLights.update(e.camera.position, 0.05);
        e.renderFrame(0.3);
        e.emitChange();
        return {
          position,
          target,
          region: e.region ?? "prison",
          activeOfficers: e.activeGuards.length,
          drawCalls: e.drawCalls,
          triangles: e.triangles,
        };
      },
      { stage, position, target },
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
          "Actual high-quality game renders. Fixed inspection cameras and frozen patrol poses; not recorded combat or a physical-device FPS benchmark.",
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
console.log("Six v23 gameplay views captured.");
