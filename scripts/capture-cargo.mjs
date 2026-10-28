import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/cargo-v17";
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
async function start(mobile = false) {
  const page = await browser.newPage({
    viewport: mobile
      ? { width: 960, height: 450 }
      : { width: 1280, height: 800 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3702");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.stats.subtitle = null;
    e.inventory = ["cell_key", "screwdriver"];
    e.emitChange();
  });
  return page;
}
async function save(page, name, position, target, item = null) {
  const data = await page.evaluate(
    ({ name, position, target, item }) => {
      const e = window.__HIRODORA__;
      e.camera.position.set(...position);
      e.camera.lookAt(...target);
      e.camera.updateMatrixWorld();
      e.equippedItem = item;
      for (let i = 0; i < 60; i++)
        e.practicalLights.update(e.camera.position, 0.05);
      for (let i = 0; i < 20; i++)
        for (const g of e.worldData.guards)
          e.guardActors
            .get(g.id)
            ?.update(
              g,
              name === "04-officer-walk" && g.id === "guard_lower_center"
                ? 1.3
                : 0,
              1 / 30,
              e.camera,
              "auto",
              e.mobile,
            );
      e.renderFrame(0.3);
      e.emitChange();
      return {
        position,
        target,
        item,
        hp: e.stats.health,
        cargo: e.worldData.cargo.length,
        cells: e.worldData.cells.length,
        guards: e.worldData.guards.length,
        triangles: e.triangles,
        calls: e.drawCalls,
        animations: e.worldData.guards.map((g) => ({
          id: g.id,
          clip: e.guardActors.get(g.id)?.animation,
        })),
      };
    },
    { name, position, target, item },
  );
  await page.screenshot({ path: `${dir}/${name}.png` });
  captures.push({ name, ...data });
}
try {
  const page = await start();
  await save(page, "01-corridor", [-6.5, 1.65, 0], [-65, 1.4, 4]);
  await save(
    page,
    "02-cargo-cover",
    [-24, -1.55, 1],
    [-48, -1.7, 3.5],
    "screwdriver",
  );
  await save(page, "03-wooden-stairs", [-18, -1.55, 5], [-4, 0, 5]);
  await page.evaluate(() => {
    const e = window.__HIRODORA__,
      g = e.worldData.guards.find((g) => g.id === "guard_lower_center");
    g.position = [-35, -3.2, 4];
    g.rotationY = Math.PI;
    g.examining = false;
    g.state = "patrol";
    const actor = e.guardActors.get(g.id);
    for (let i = 0; i < 20; i++)
      actor.update(g, 1.3, 0.05, e.camera, "desktop", false);
  });
  // Move the actor through its walk clip, then freeze at that stride pose.
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.camera.position.set(-35, -1.6, 1.4);
    e.camera.lookAt(-35, -2.1, 4);
    e.camera.updateMatrixWorld();
    const g = e.worldData.guards.find((g) => g.id === "guard_lower_center");
    e.guardActors.get(g.id).update(g, 1.3, 0.05, e.camera, "desktop", false);
  });
  await save(page, "04-officer-walk", [-35, -1.6, 1.4], [-35, -2.1, 4]);
  await save(page, "05-officer-kneel", [-5.7, 1.3, 1.8], [-5.7, 0.7, -0.7]);
  const mobile = await start(true);
  await mobile.evaluate(() => {
    const e = window.__HIRODORA__;
    const g = e.worldData.guards.find((g) => g.id === "guard_lower_center");
    e.playerPos = [-35, -3.2, 4];
    g.position = [-35, -3.2, 4.9];
    g.rotationY = Math.PI;
    g.state = "chase";
    g.suspicion = 100;
    g.lastKnownPosition = [...e.playerPos];
    for (let i = 0; i < 80; i++) {
      e.updateGuards(0.05);
      if (
        e.stats.health === 175 &&
        g.attackElapsed >= 0.15 &&
        g.attackElapsed < 0.3
      )
        break;
    }
    e.stats.subtitle = null;
  });
  await save(
    mobile,
    "06-mobile-health",
    [-35, -1.52, 4],
    [-35, -1.8, 5],
    "cell_key",
  );
  await writeFile(
    `${dir}/capture.json`,
    JSON.stringify({ captures, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Captured six real cargo/combat gameplay views.");
} finally {
  await browser.close();
}
