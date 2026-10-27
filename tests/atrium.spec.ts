import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";
test("stairs support actual player movement, gates are independent, and equipped tools persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(async () => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.clearInput();
    const independent = new Set(
      [...e.worldData.doors.values()].map((g: any) => g.uuid),
    ).size;
    const g48 = e.worldData.doors.get("cell_48_door"),
      before = g48.rotation.y;
    e.gameFlags.cell_46_open = true;
    e.syncWorld();
    const neighborSame = g48.rotation.y === before;
    // Walk the east staircase in real move() calls, then onto the lower hall.
    e.playerPos = [-5.5, 0, 5];
    e.playerRotY = 0;
    e.keys.KeyA = true;
    for (let i = 0; i < 300; i++) e.move(0.016);
    e.clearInput();
    const lower = [...e.playerPos],
      eye = e.camera.position.y;
    e.inventory = ["screwdriver", "cell_key"];
    e.equipItem("screwdriver");
    e.renderFrame(0.3);
    const held = e.firstPerson.root.visible;
    e.saveCheckpoint();
    e.equippedItem = null;
    e.loadCheckpoint();
    e.restoreCheckpoint(e.checkpoint);
    const restored = e.equippedItem;
    e.inventory.push("dart_pistol");
    e.equipItem(null);
    e.restoreCheckpoint(e.checkpoint);
    const unequipped = e.equippedItem === null;
    e.inventory = e.inventory.filter((id: string) => id !== "dart_pistol");
    e.equipItem("screwdriver");
    const reusedTool =
      e.firstPerson.items.get("stethoscope")?.children.length >= 1;
    return {
      independent,
      neighborSame,
      lower,
      eye,
      held,
      equipped: restored,
      unequipped,
      reusedTool,
      warrior:
        e.worldData.cell46NPC.getObjectByName("TheRedeemedWarrior") !==
        undefined,
    };
  });
  expect(r.independent).toBeGreaterThanOrEqual(24);
  expect(r.neighborSame).toBe(true);
  expect(r.lower[1]).toBeCloseTo(-3.2, 2);
  expect(r.eye).toBeLessThan(-1.3);
  expect(r.held).toBe(true);
  expect(r.equipped).toBe("screwdriver");
  expect(r.unequipped).toBe(true);
  expect(r.reusedTool).toBe(true);
  expect(r.warrior).toBe(true);
  await page.getByRole("button", { name: /SATCHEL/ }).click();
  await page.getByRole("button", { name: "Equip", exact: true }).click();
  expect(await page.evaluate(() => window.__HIRODORA__.equippedItem)).toBe(
    "cell_key",
  );
});
test("guards route down stairs and cannot capture a player through the gallery floor", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.playerPos = [-35, -3.2, 5];
    const g = e.worldData.guards[1];
    g.position = [-6, 0, 5];
    g.state = "searching";
    g.suspicion = 55;
    g.stateTimer = 12;
    g.investigationTarget = [-15, -3.2, 5];
    g.lastKnownPosition = [-15, -3.2, 5];
    g.lastHeardPosition = [-15, -3.2, 5];
    for (let i = 0; i < 250 && g.position[1] > -3; i++) e.updateGuards(0.05);
    const y = g.position[1];
    e.playerPos = [-5, -3.2, 5];
    g.position = [-5, 0, 5];
    g.state = "chase";
    g.suspicion = 100;
    g.lastKnownPosition = [...e.playerPos];
    e.updateGuards(0.1);
    return { y, x: g.position[0], state: e.gameState };
  });
  expect(r.y).toBeLessThan(-2.8);
  expect(r.state).toBe("playing");
});
