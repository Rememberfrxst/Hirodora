import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "docs/screenshots/ballistics-v18";
await mkdir(directory, { recursive: true });
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
  page.on("requestfailed", (r) => {
    if (r.failure()?.errorText !== "net::ERR_ABORTED")
      errors.push(`${r.url()}: ${r.failure()?.errorText}`);
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3730");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
  });
  return page;
}
async function takeGunAndCan(page) {
  return page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.playerPos = [-10.7, 0, -4.35];
    const aim = (id) => {
      const p = e.worldData.pickupMeshes.get(id).position;
      const dx = p.x - e.playerPos[0],
        dz = p.z - e.playerPos[2];
      e.playerRotY = Math.atan2(-dx, -dz);
      e.cameraPitch = Math.atan2(
        p.y + 0.035 - (e.playerPos[1] + 1.65),
        Math.hypot(dx, dz),
      );
      e.move(0);
    };
    aim("pistol_10mm_pickup");
    const gunFocus = e.contextualAction;
    e.overlayOpen = false;
    e.interact();
    e.overlayOpen = true;
    aim("can_attach");
    const canFocus = e.contextualAction;
    e.overlayOpen = false;
    e.interact();
    e.overlayOpen = true;
    return {
      gunFocus,
      canFocus,
      inventory: e.inventory,
      attached: e.gameFlags.can_attached,
    };
  });
}
async function save(page, name, position, target) {
  const state = await page.evaluate(
    ({ position, target }) => {
      const e = window.__HIRODORA__;
      e.contextualAction = null;
      e.activeInteractPrompt = null;
      e.stats.subtitle = null;
      e.munshiHint = null;
      e.camera.position.set(...position);
      e.camera.lookAt(...target);
      e.camera.updateMatrixWorld();
      for (let i = 0; i < 45; i++)
        e.practicalLights.update(e.camera.position, 0.05);
      for (let i = 0; i < 15; i++)
        for (const g of e.worldData.guards)
          e.guardActors
            .get(g.id)
            .update(g, 0, 0.05, e.camera, "auto", e.mobile);
      e.renderFrame(0.3);
      e.emitChange();
      const signs = [];
      e.scene.traverse((o) => {
        if (o.name.startsWith("CellNumber_")) signs.push(o.userData.cellNumber);
      });
      return {
        position,
        target,
        hp: e.stats.health,
        inventory: [...e.inventory],
        ammo: e.stats.pistolAmmo,
        attached: !!e.gameFlags.can_attached,
        signs: signs.length,
        fog: e.scene.fog.density,
        dead: e.worldData.guards
          .filter((g) => g.dead)
          .map((g) => ({ id: g.id, health: g.health, position: g.position })),
        animations: e.worldData.guards.map((g) => ({
          id: g.id,
          clip: e.guardActors.get(g.id).animation,
        })),
        triangles: e.triangles,
        calls: e.drawCalls,
      };
    },
    { position, target },
  );
  if (state.inventory.length)
    await page
      .locator(".pocket-item img")
      .first()
      .waitFor({ state: "visible" });
  await page.locator(".pocket-item img").evaluateAll(async (images) => {
    await Promise.all(images.map((i) => i.decode()));
  });
  await page.screenshot({ path: `${directory}/${name}.png` });
  const icons = await page
    .locator(".pocket-item img")
    .evaluateAll((images) =>
      images.map((i) => ({ width: i.naturalWidth, height: i.naturalHeight })),
    );
  captures.push({ name, ...state, icons });
}
try {
  const page = await start();
  await save(page, "01-corridor", [-6.5, 1.65, 0], [-65, 1.4, 4]);
  await save(
    page,
    "02-cell46-table",
    [-10.7, 1.48, -4.1],
    [-10.7, 1.03, -5.75],
  );
  const pickups = await takeGunAndCan(page);
  if (!pickups.attached)
    throw Error("Pickup/attachment failed " + JSON.stringify(pickups));
  await save(page, "03-can-equipped", [-6.5, 1.65, 0], [-65, 1.4, 4]);
  await page.evaluate(() => {
    const e = window.__HIRODORA__,
      g = e.worldData.guards.find((g) => g.id === "guard_lower_center");
    g.position = [-35, -3.2, 4];
    g.rotationY = Math.PI;
    g.state = "chase";
    g.attackKind = 1;
    g.attackElapsed = 0.35;
    e.equippedItem = null;
  });
  await save(page, "04-boxing-cross", [-35, -1.58, 2.2], [-35, -1.95, 4]);
  const combat = await page.evaluate(() => {
    const e = window.__HIRODORA__,
      g = e.worldData.guards.find((g) => g.id === "guard_lower_center");
    g.attackElapsed = undefined;
    g.state = "patrol";
    e.playerPos = [-35, -3.2, 0];
    e.equippedItem = "pistol_10mm";
    e.playerRotY = Math.PI;
    e.cameraPitch = Math.atan2(1.1 - 1.65, 4);
    e.move(0);
    e.guardActors.get(g.id).update(g, 0, 0.2, e.camera, "desktop", false);
    e.overlayOpen = false;
    e.firePistol();
    const first = g.health;
    e.elapsed += 0.31;
    e.firePistol();
    e.overlayOpen = true;
    for (let i = 0; i < 60; i++) e.updateGuards(0.05);
    return { first, second: g.health, dead: g.dead };
  });
  if (combat.first !== 100 || !combat.dead)
    throw Error("Actual two-shot damage failed " + JSON.stringify(combat));
  await save(page, "05-persistent-body", [-35, -1.85, 1], [-35, -2.8, 4]);
  const mobile = await start(true);
  await takeGunAndCan(mobile);
  await save(mobile, "06-mobile-pistol", [-24, -1.55, 1], [-48, -1.7, 3.5]);
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify({ captures, pickups, combat, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Six actual ballistics/header/boxing renders captured.");
} finally {
  await browser.close();
}
