import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";
test("Cell 048 and 036 stairs work in both directions, lower signs are below the slab, checkpoint remains stable", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.clearInput();
    const flights = [];
    for (const s of [
      { cell: 48, x: -5.95, top: 8.4, bottom: 0.2, yaw: 0 },
      { cell: 36, x: -66.5, top: -0.4, bottom: 7.8, yaw: Math.PI },
    ]) {
      const sign = Math.sign(s.bottom - s.top);
      e.playerPos = [s.x, 0, s.top - sign * 0.45];
      e.playerRotY = s.yaw;
      e.keys.KeyW = true;
      for (let i = 0; i < 245; i++) e.move(0.016);
      e.clearInput();
      const down = [...e.playerPos];
      e.playerPos = [s.x, -3.8, s.bottom + sign * 0.4];
      e.keys.KeyS = true;
      for (let i = 0; i < 245; i++) e.move(0.016);
      e.clearInput();
      const up = [...e.playerPos];
      flights.push({
        cell: s.cell,
        down,
        up,
        model: !!e.scene.getObjectByName(`Stairs_Cell${s.cell}`),
      });
    }
    e.playerPos = [-39, 0, 4];
    e.saveCheckpoint();
    e.restoreCheckpoint(e.checkpoint);
    const signs: any[] = [];
    e.scene.traverse((o: any) => {
      if (o.name.startsWith("CellNumber_"))
        signs.push({ number: o.userData.cellNumber, y: o.position.y });
    });
    return {
      flights,
      signs,
      restored: [...e.playerPos],
      version: e.checkpoint.layoutVersion,
    };
  });
  console.log("v20 stairs:", JSON.stringify(r));
  for (const f of r.flights) {
    expect(f.model).toBe(true);
    expect(f.down[1]).toBeCloseTo(-3.8, 3);
    expect(f.up[1]).toBeCloseTo(0, 3);
  }
  expect(r.signs).toHaveLength(48);
  expect(new Set(r.signs.map((s) => s.number)).size).toBe(48);
  for (const s of r.signs.filter((s) => s.number < 36)) {
    expect(s.y).toBeCloseTo(-0.68, 2);
    expect(s.y).toBeLessThan(-0.5);
  }
  expect(r.restored).toEqual([-39, 0, 4]);
  expect(r.version).toBe(18);
});
test("six shots, unlimited reloads, pause/cancel, right-hand-only idle and support hand during reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.clearInput();
    e.inventory = ["pistol_10mm", "screwdriver"];
    e.equippedItem = "pistol_10mm";
    e.overlayOpen = false;
    e.stats.isInHidingSpot = false;
    e.renderFrame(0.3);
    const left = e.firstPerson.arm.getObjectByName("LeftArmMesh"),
      right = e.firstPerson.arm.getObjectByName("RightArmMesh");
    const idle = { left: left.visible, right: right.visible };
    const shoot = () => {
      e.elapsed += 0.31;
      e.fireWeapon();
    };
    for (let i = 0; i < 6; i++) shoot();
    const empty = e.stats.pistolAmmo;
    shoot();
    const seventh = e.stats.pistolAmmo;
    e.reloadPistol();
    e.renderFrame(0.016);
    const reloadLeft = left.visible;
    const remaining = e.reloadRemaining;
    e.gameState = "paused";
    e.updateReload(0.05);
    const paused = e.reloadRemaining === remaining;
    e.gameState = "playing";
    const cycles = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      e.reloadPistol();
      for (let i = 0; i < 40; i++) e.updateReload(0.05);
      cycles.push(e.stats.pistolAmmo);
      if (cycle < 2) for (let i = 0; i < 6; i++) shoot();
    }
    e.renderFrame(0.016);
    const finishedLeft = left.visible;
    shoot();
    e.reloadPistol();
    e.equipItem("screwdriver");
    e.renderFrame(0.3);
    const cancelled = !e.isReloading && !left.visible;
    e.equipItem("pistol_10mm");
    e.stats.pistolAmmo = 3;
    e.saveCheckpoint();
    e.stats.pistolAmmo = 0;
    e.restoreCheckpoint(e.checkpoint);
    e.emitChange();
    return {
      idle,
      empty,
      seventh,
      reloadLeft,
      paused,
      cycles,
      finishedLeft,
      cancelled,
      saved: e.stats.pistolAmmo,
    };
  });
  expect(r).toEqual({
    idle: { left: false, right: true },
    empty: 0,
    seventh: 0,
    reloadLeft: true,
    paused: true,
    cycles: [6, 6, 6],
    finishedLeft: false,
    cancelled: true,
    saved: 3,
  });
  await expect(page.locator(".objective")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "10mm pistol magazine" }),
  ).toContainText("∞");
  await page.keyboard.press("KeyR");
  expect(await page.evaluate(() => window.__HIRODORA__.isReloading)).toBe(true);
});
test.describe("iPhone-sized touch compatibility (Chromium emulation, not Safari certification)", () => {
  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  });
  test("Safari install guidance, MP3 decode, landscape controls, touch reload and bottom dialogue", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator(".ios-install-note")).toContainText(
      "Add to Home Screen",
    );
    await page.locator("[data-start]").tap();
    await skipOpening(page);
    const audio = await page.evaluate(async () => {
      const url = "/src/game/audio.ts";
      const { sound } = await import(url);
      await sound.preload();
      return sound.failures;
    });
    expect(audio).toEqual([]);
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      e.inventory = ["pistol_10mm"];
      e.equippedItem = "pistol_10mm";
      e.stats.pistolAmmo = 0;
      e.stats.subtitle = {
        speaker: "Prison Guard",
        text: "Where is the key?",
        timeRemaining: 30,
      };
      e.emitChange();
    });
    await page
      .getByRole("button", { name: "Reload pistol", exact: true })
      .tap();
    expect(await page.evaluate(() => window.__HIRODORA__.isReloading)).toBe(
      true,
    );
    await expect(page.locator(".subtitle")).toContainText("Where is the key?");
    const sub = await page.locator(".subtitle").boundingBox();
    expect(sub!.y).toBeGreaterThan(180);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("dialog", { name: "Turn your phone sideways." }),
    ).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await page
      .getByRole("button", { name: "Resume escape", exact: true })
      .tap();
    await expect(
      page.getByRole("region", { name: "Movement joystick" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});
