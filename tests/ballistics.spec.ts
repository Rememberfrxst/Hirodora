import { test, expect, type Page } from "@playwright/test";
import { skipOpening } from "./helpers";
test.describe("mobile pistol", () => {
  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  test("touch pickups, can attachment and Fire pistol consume one round without stuck joystick", async ({
    page,
  }) => {
    await start(page);
    await aimPickup(page, "pistol_10mm_pickup");
    await page.getByRole("button", { name: "Interact", exact: true }).tap();
    await aimPickup(page, "can_attach");
    await page.getByRole("button", { name: "Interact", exact: true }).tap();
    expect(
      await page.evaluate(() => window.__HIRODORA__.gameFlags.can_attached),
    ).toBe(true);
    await page.getByRole("button", { name: "Fire pistol", exact: true }).tap();
    expect(
      await page.evaluate(() => window.__HIRODORA__.stats.pistolAmmo),
    ).toBe(5);
    await expect(
      page.getByRole("button", { name: "Fire pistol", exact: true }),
    ).toContainText("5");
    expect(
      await page.evaluate(() => (window.__HIRODORA__ as any).touchMove),
    ).toEqual([0, 0]);
    await expect(
      page.getByRole("progressbar", { name: "Health", exact: true }),
    ).toHaveAttribute("aria-valuenow", "200");
  });
});
async function start(page: Page) {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.clearInput();
    e.playerPos = [-10.7, 0, -4.35];
  });
}
async function aimPickup(page: Page, id: string) {
  await page.evaluate((id) => {
    const e = window.__HIRODORA__ as any,
      p = e.worldData.pickupMeshes.get(id).position;
    const dx = p.x - e.playerPos[0],
      dz = p.z - e.playerPos[2];
    e.playerRotY = Math.atan2(-dx, -dz);
    e.cameraPitch = Math.atan2(
      p.y + 0.035 - e.playerPos[1] - 1.65,
      Math.hypot(dx, dz),
    );
    e.move(0);
    e.emitChange();
  }, id);
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.contextualAction))
    .toBe(id);
}
test("Cell 46 actual gun/can models require aim and E, attach at the muzzle and persist", async ({
  page,
}) => {
  await start(page);
  await aimPickup(page, "can_attach");
  await page.keyboard.press("KeyE");
  expect(
    await page.evaluate(() => window.__HIRODORA__.gameFlags.can_attached),
  ).toBeUndefined();
  await aimPickup(page, "pistol_10mm_pickup");
  await page.keyboard.press("KeyE");
  expect(await page.evaluate(() => window.__HIRODORA__.equippedItem)).toBe(
    "pistol_10mm",
  );
  await aimPickup(page, "can_attach");
  await page.keyboard.press("KeyE");
  const data = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.renderFrame(0.3);
    const signs: number[] = [];
    e.scene.traverse((o: any) => {
      if (o.name.startsWith("CellNumber_")) signs.push(o.userData.cellNumber);
    });
    const gun = e.firstPerson.items.get("pistol_10mm"),
      can = gun.getObjectByName("CanAttachment");
    e.restoreCheckpoint(e.checkpoint);
    return {
      attached: e.gameFlags.can_attached,
      gunHidden: !e.worldData.pickupMeshes.get("pistol_10mm_pickup").visible,
      canHidden: !e.worldData.pickupMeshes.get("can_attach").visible,
      canVisible: can.visible,
      muzzleZ: can.position.z,
      signs,
      fog: e.scene.fog.density,
      health: e.stats.health,
      ammo: e.stats.pistolAmmo,
      handScale: e.firstPerson.arm.scale.x,
    };
  });
  expect(data.attached).toBe(true);
  expect(data.gunHidden && data.canHidden && data.canVisible).toBe(true);
  expect(data.muzzleZ).toBeGreaterThan(0.12);
  expect(new Set(data.signs).size).toBe(48);
  expect(data.fog).toBe(0.033);
  expect(data.health).toBe(200);
  expect(data.ammo).toBe(6);
  expect(data.handScale).toBe(1.12);
});
test("actual skin ray hits deal 100 twice or one headshot, corpses persist and New game resets them", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.inventory.push("pistol_10mm");
    e.equippedItem = "pistol_10mm";
    e.worldData.guards.forEach((g: any) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    });
    const place = (id: string, x: number, head = false) => {
      const g = e.worldData.guards.find((g: any) => g.id === id);
      g.position = [x, -3.8, 4];
      g.rotationY = Math.PI;
      g.state = "patrol";
      g.health = 200;
      g.dead = false;
      g.attackElapsed = undefined;
      e.playerPos = [x, -3.8, 0];
      e.playerRotY = Math.PI;
      e.cameraPitch = 0;
      e.move(0);
      e.camera.lookAt(x, g.position[1] + 1.15, 4);
      e.camera.updateMatrixWorld();
      for (let i = 0; i < 20; i++)
        e.guardActors.get(id).update(g, 0, 0.05, e.camera, "desktop", false);
      if (head) {
        const point = e.guardActors
          .get(id)
          .hitTarget.getObjectByName("Head")
          .getWorldPosition(e.camera.position.clone());
        point.y += 0.1;
        e.camera.lookAt(point);
        e.camera.updateMatrixWorld();
      }
      e.elapsed += 0.31;
      return g;
    };
    const g = place("guard_lower_center", -35);
    e.firePistol();
    const first = g.health,
      firstHit = e.lastBulletHit,
      ammo = e.stats.pistolAmmo;
    e.firePistol();
    const rateLimited = e.stats.pistolAmmo === ammo;
    e.elapsed += 0.31;
    e.firePistol();
    const second = g.health,
      position = [...g.position];
    for (let i = 0; i < 130; i++) e.updateGuards(1);
    const persistent =
      g.dead && g.position.every((v: number, i: number) => v === position[i]);
    const h = place("guard_lower_north_west", -34, true);
    e.firePistol();
    const head = { health: h.health, dead: h.dead, hit: e.lastBulletHit };
    const cp = structuredClone(e.checkpoint);
    e.restoreCheckpoint(cp);
    const saved = g.dead && h.dead && g.health === 0 && h.health === 0;
    e.newGame();
    e.finishIntro();
    cancelAnimationFrame(e.frameId);
    return {
      first,
      firstHit,
      rateLimited,
      second,
      persistent,
      head,
      saved,
      reset: e.worldData.guards.every((g: any) => !g.dead && g.health === 200),
      ammo: e.stats.pistolAmmo,
    };
  });
  expect(result.first).toBe(100);
  expect(result.firstHit).toBe("body");
  expect(result.rateLimited).toBe(true);
  expect(result.second).toBe(0);
  expect(result.persistent).toBe(true);
  expect(result.head).toEqual({ health: 0, dead: true, hit: "head" });
  expect(result.saved && result.reset).toBe(true);
  expect(result.ammo).toBe(6);
});
test("bullets cannot pass closed grilles, pause or fire without ammunition", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.inventory.push("pistol_10mm");
    e.equippedItem = "pistol_10mm";
    const g = e.worldData.guards[0];
    g.position = [-5.7, 0, -0.7];
    g.rotationY = Math.PI;
    g.examining = false;
    g.state = "patrol";
    e.playerPos = [-5.7, 0, -3.1];
    e.playerRotY = Math.PI;
    e.cameraPitch = 0;
    e.move(0);
    e.camera.lookAt(-5.7, 1.15, -0.7);
    e.camera.updateMatrixWorld();
    e.guardActors.get(g.id).update(g, 0, 0.2, e.camera, "desktop", false);
    e.firePistol();
    const blocked = (g.health ?? 200) === 200,
      ammo = e.stats.pistolAmmo;
    e.elapsed += 1;
    e.pauseGame();
    e.firePistol();
    const paused = e.stats.pistolAmmo === ammo;
    e.resumeGame();
    e.stats.pistolAmmo = 0;
    e.firePistol();
    return {
      blocked,
      paused,
      ammo: e.stats.pistolAmmo,
      health: g.health ?? 200,
    };
  });
  expect(result).toEqual({ blocked: true, paused: true, ammo: 0, health: 200 });
});
test("boxing cycles jab/cross/hook with high guard between strikes and preserves 200 player HP rules", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.worldData.guards.forEach((g: any) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    });
    const g = e.worldData.guards.find(
      (g: any) => g.id === "guard_lower_center",
    );
    g.position = [-35, -3.8, 4.9];
    g.rotationY = Math.PI;
    g.state = "chase";
    g.suspicion = 100;
    e.playerPos = [-35, -3.8, 4];
    g.lastKnownPosition = [...e.playerPos];
    e.camera.position.set(-35, -1.55, 3.5);
    e.camera.lookAt(-35, -1.8, 4.9);
    e.camera.updateMatrixWorld();
    const clips = new Set();
    for (let i = 0; i < 110; i++) {
      e.updateGuards(0.05);
      clips.add(e.guardActors.get(g.id).animation);
    }
    return { clips: [...clips], hp: e.stats.health, kinds: g.attackIndex };
  });
  expect(result.clips).toEqual(
    expect.arrayContaining(["Strike", "Cross", "Hook", "Boxing"]),
  );
  expect(result.hp).toBeLessThan(200);
  expect(result.hp).toBeGreaterThan(0);
  expect(result.kinds).toBeGreaterThanOrEqual(3);
});
