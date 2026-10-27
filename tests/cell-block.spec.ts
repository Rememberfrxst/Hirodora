import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("48 independent wide gates frame both floors and all rows load real fixtures", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    const cells = e.worldData.cells;
    const cuts = [];
    for (let x = -67; x < -4; x += 0.5)
      for (const z of [-1, 0, 18, 19])
        if (
          e.worldData.colliders.some(
            (b: any) =>
              x + 0.28 > b.min.x &&
              x - 0.28 < b.max.x &&
              z + 0.28 > b.min.z &&
              z - 0.28 < b.max.z &&
              b.max.y > 0,
          )
        )
          cuts.push([x, z]);
    const tables: any[] = [];
    e.scene.traverse((o: any) => {
      if (o.name === "CellAsset_Table") tables.push(o);
    });
    return {
      north: cells.filter((c: any) => c.side === "north").length,
      south: cells.filter((c: any) => c.side === "south").length,
      doors: cells.every((c: any) =>
        e.worldData.doors.has(`cell_${c.number}_door`),
      ),
      tables: tables.length,
      cuts,
    };
  });
  expect(result).toEqual({
    north: 24,
    south: 24,
    doors: true,
    tables: 48,
    cuts: [],
  });
});
test("hint/pause are the only top tools; context-only touch action and rotated arrows match the requested HUD", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await expect(page.locator(".hud-tools button")).toHaveCount(2);
  await expect(page.locator(".hint-bulb")).toBeVisible();
  await page.getByRole("button", { name: "Ask Munshi for a hint" }).click();
  await expect(page.locator(".hint-toast")).toBeVisible();
  // Exercise the touch flag independently of the CI browser's pointer hardware.
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.mobile = true;
    e.emitChange();
  });
  await expect(
    page.getByRole("button", { name: "Interact", exact: true }),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".arrow-crouch")
      .evaluate((e) => getComputedStyle(e).transform),
  ).toContain("-1");
  expect(
    await page
      .locator(".arrow-sprint")
      .evaluate((e) => getComputedStyle(e).transform),
  ).not.toBe("none");
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.gameFlags.key_identified = true;
    e.syncWorld();
    e.playerPos = [-5.6, 0, -8.1];
    e.playerRotY = -Math.PI / 2;
    e.move(0);
    e.emitChange();
  });
  await expect(
    page.getByRole("button", { name: "Interact", exact: true }),
  ).toBeVisible();
});
test("main-menu confirmation traps focus, defaults to No, cancels safely and confirms without deleting the checkpoint", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.getByRole("button", { name: "To main menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Exit to the main menu?" });
  await expect(
    dialog.getByRole("button", { name: "No", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Yes", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.__HIRODORA__.gameState)).toBe(
    "paused",
  );
  await page.getByRole("button", { name: "To main menu", exact: true }).click();
  await dialog.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.locator("[data-start]")).toBeVisible();
  expect(await page.evaluate(() => window.__HIRODORA__.hasSave)).toBe(true);
});
test("Cell 46 stays open for exploration in new games and previously closed saves", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    const latch = e.worldData.interactables.find(
      (o: any) => o.id === "cell_latch_46",
    );
    e.overlayOpen = true;
    const yaw = e.worldData.doors.get("cell_46_door").rotation.y;
    e.playerPos = [-10, 0, -3.2];
    e.playerRotY = 0;
    e.keys.KeyS = true;
    for (let i = 0; i < 90; i++) e.move(0.016);
    e.clearInput();
    const outside = e.playerPos[2];
    e.keys.KeyW = true;
    for (let i = 0; i < 90; i++) e.move(0.016);
    e.clearInput();
    const inside = e.playerPos[2];
    e.saveCheckpoint();
    // Simulate an older checkpoint that explicitly saved the gate as closed.
    const old = structuredClone(e.checkpoint);
    old.flags.cell_46_open = false;
    old.flags.cell46_reached = false;
    e.restoreCheckpoint(old);
    const restored = e.gameFlags.cell_46_open && e.doorIsOpen("cell_46_door");
    const restoredYaw = e.worldData.doors.get("cell_46_door").rotation.y;
    const heldOpen = latch.disabled;
    // Original campaign still unlocks this door through Locker 46.
    e.restoreCheckpoint({ ...old, flags: {} });
    const legacyLocked = !e.doorIsOpen("cell_46_door");
    e.gameFlags.locker_open = true;
    e.syncWorld();
    const legacyUnlocked = e.doorIsOpen("cell_46_door");
    e.restoreCheckpoint(old);
    return {
      outside,
      inside,
      yaw,
      restoredYaw,
      restored,
      heldOpen,
      legacyLocked,
      legacyUnlocked,
    };
  });
  expect(result.yaw).toBe(Math.PI / 2);
  expect(result.restoredYaw).toBe(Math.PI / 2);
  expect(result.outside).toBeGreaterThan(-0.5);
  expect(result.inside).toBeLessThan(-2.5);
  expect(result.restored).toBe(true);
  expect(result.heldOpen).toBe(true);
  expect(result.legacyLocked).toBe(true);
  expect(result.legacyUnlocked).toBe(true);
  const westward = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any,
      g = e.worldData.guards[1];
    g.position = [-62, 0, 0];
    g.state = "suspicious";
    g.suspicion = 50;
    g.stateTimer = 0;
    g.investigationTarget = [-66, 0, -8];
    g.lastHeardPosition = [-66, 0, -8];
    g.examining = false;
    e.paths.clear();
    e.pathGoals.clear();
    e.updateGuards(0.1);
    return g.position[0];
  });
  expect(westward).toBeLessThan(-62);
});
