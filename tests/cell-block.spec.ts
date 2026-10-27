import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("24 independent gates frame the upper galleries and both rows load real fixtures", async ({
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
      for (const z of [-1, 0, 10, 11])
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
    north: 12,
    south: 12,
    doors: true,
    tables: 24,
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
test("Cell 46 exploration gate unlocks after the chapter and gate state survives save/load", async ({
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
    const locked = latch.disabled;
    e.gameFlags.cell46_reached = true;
    e.syncWorld();
    e.playerPos = [-10.1, 0, -3.2];
    e.playerRotY = Math.atan2(
      -(latch.position[0] + 10.1),
      -(latch.position[2] + 3.2),
    );
    e.overlayOpen = false;
    e.interact();
    const opened = !!e.gameFlags.cell_46_open,
      yaw = e.worldData.doors.get("cell_46_door").rotation.y;
    e.loadCheckpoint();
    return { locked, opened, yaw, restored: !!e.gameFlags.cell_46_open };
  });
  expect(result).toEqual({
    locked: true,
    opened: true,
    yaw: Math.PI / 2,
    restored: true,
  });
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
