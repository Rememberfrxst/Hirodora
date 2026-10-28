import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";
test("nine officers patrol both levels and a lower cell can be opened, entered and saved", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.stats.isInHidingSpot = true;
    const guards = e.worldData.guards;
    const before = guards.map((g: any) => [...g.position]);
    for (let i = 0; i < 200; i++) e.updateGuards(0.05);
    const patrols = guards
      .filter((g: any) => !g.examining)
      .map((g: any) => ({
        distance: Math.hypot(
          g.position[0] - before[guards.indexOf(g)][0],
          g.position[2] - before[guards.indexOf(g)][2],
        ),
        level: g.position[1],
        expected: g.patrolRoute[0][1],
      }));
    e.clearInput();
    e.stats.isInHidingSpot = false;
    const gate = e.worldData.interactables.find(
      (o: any) => o.id === "cell_latch_22",
    );
    e.playerPos = [gate.position[0], -3.2, -0.9];
    e.playerRotY = 0;
    e.move(0);
    e.overlayOpen = false;
    e.interact();
    const opened = e.gameFlags.cell_22_open;
    e.updateCellGates(0.7);
    e.overlayOpen = true;
    e.keys.KeyW = true;
    for (let i = 0; i < 90; i++) e.move(0.016);
    e.clearInput();
    const entered = [...e.playerPos];
    e.saveCheckpoint();
    e.playerPos = [-6, 0, -6];
    e.restoreCheckpoint(e.checkpoint);
    const box = e.worldData.doorColliders.get("cell_22_door");
    return {
      patrols,
      count: guards.length,
      upper: guards.filter((g: any) => g.patrolRoute[0][1] === 0).length,
      lower: guards.filter((g: any) => g.patrolRoute[0][1] < 0).length,
      actors: e.guardActors.size,
      opened,
      entered,
      restored: [...e.playerPos],
      gateY: box.min.y,
      dotBorder: getComputedStyle(document.querySelector(".reticle")!)
        .borderTopWidth,
    };
  });
  expect(r.count).toBe(9);
  expect(r.actors).toBe(9);
  expect(r.upper).toBe(4);
  expect(r.lower).toBe(5);
  for (const patrol of r.patrols) {
    expect(patrol.distance).toBeGreaterThan(2);
    expect(patrol.level).toBeCloseTo(patrol.expected, 2);
  }
  expect(r.opened).toBe(true);
  expect(r.entered[2]).toBeLessThan(-2.5);
  expect(r.restored).toEqual(r.entered);
  expect(r.gateY).toBeLessThan(-3);
  expect(r.dotBorder).toBe("0px");
});
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
    e.playerPos = [-5.5, 0, 4];
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
  expect(r.independent).toBeGreaterThanOrEqual(48);
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
    e.playerPos = [-35, -3.2, 4];
    e.worldData.guards.forEach((other: any) => {
      other.state = "knocked_out";
      other.stateTimer = 100;
    });
    const g = e.worldData.guards[1];
    g.position = [-6, 0, 4];
    g.state = "searching";
    g.suspicion = 55;
    g.stateTimer = 12;
    g.investigationTarget = [-15, -3.2, 4];
    g.lastKnownPosition = [-15, -3.2, 4];
    g.lastHeardPosition = [-15, -3.2, 4];
    for (let i = 0; i < 250 && g.position[1] > -3; i++) e.updateGuards(0.05);
    const y = g.position[1];
    e.playerPos = [-5, -3.2, 4];
    g.position = [-5, 0, 4];
    g.state = "chase";
    g.suspicion = 100;
    g.lastKnownPosition = [...e.playerPos];
    e.updateGuards(0.1);
    return { y, x: g.position[0], state: e.gameState };
  });
  expect(r.y).toBeLessThan(-2.8);
  expect(r.state).toBe("playing");
});
