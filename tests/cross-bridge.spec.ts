import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("actual player and officer cross Cell 041/054 bridge; side rails, lower clearance and checkpoint work", async ({
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
    e.playerPos = [-39, 0, 0];
    e.playerRotY = Math.PI;
    e.keys.KeyW = true;
    for (let i = 0; i < 250; i++) e.move(0.016);
    e.clearInput();
    const crossed = [...e.playerPos];
    e.playerPos = [-39, 0, 4];
    e.playerRotY = 0;
    e.keys.KeyD = true;
    for (let i = 0; i < 100; i++) e.move(0.016);
    e.clearInput();
    const stopped = [...e.playerPos];
    e.saveCheckpoint();
    e.playerPos = [-6, 0, -6];
    e.restoreCheckpoint(e.checkpoint);
    const restored = [...e.playerPos];
    // Pass beneath the span along the lower hall. The pre-existing pallet at
    // [-39, -3.2, 2.25] intentionally blocks a straight north-to-south walk.
    e.playerPos = [-37, -3.2, 4];
    e.playerRotY = Math.PI / 2;
    e.keys.KeyW = true;
    for (let i = 0; i < 70; i++) e.move(0.016);
    e.clearInput();
    const below = [...e.playerPos];
    e.stats.isInHidingSpot = true;
    // Isolate routing evidence from footsteps emitted by the movement checks.
    // Otherwise the real hearing system correctly abandons this synthetic target.
    e.noiseEvents = [];
    e.stats.noiseLevel = 0;
    e.worldData.guards.forEach((g: any) => {
      g.state = "knocked_out";
      g.stateTimer = 999;
    });
    const g = e.worldData.guards[1];
    g.position = [-37, 0, 0];
    g.state = "searching";
    g.suspicion = 55;
    g.stateTimer = 20;
    g.scanTime = 0;
    g.unseenTime = 0;
    g.investigationTarget = [-39, 0, 8];
    g.lastKnownPosition = [-39, 0, 8];
    g.lastHeardPosition = [-39, 0, 8];
    const officerCrossing: number[][] = [];
    for (let i = 0; i < 280 && g.position[2] < 7.6; i++) {
      e.updateGuards(0.05);
      if (g.position[2] > 1.2 && g.position[2] < 6.8)
        officerCrossing.push([...g.position]);
    }
    e.inventory = ["cell_key", "screwdriver", "pistol_10mm"];
    e.equippedItem = "cell_key";
    e.renderFrame(0.3);
    const fp = e.firstPerson,
      hand = fp.arm.getObjectByName("RightHand");
    const point = (name: string) =>
      hand.worldToLocal(
        fp.arm
          .getObjectByName(name)
          .getWorldPosition(e.camera.position.clone()),
      );
    const center = point("RightHandIndex4")
      .add(point("RightHandThumb4"))
      .multiplyScalar(0.5);
    const key = fp.items.get("cell_key");
    const contact = key.position
      .clone()
      .add(e.camera.position.clone().fromArray(key.userData.graspPoint));
    return {
      keyError: contact.distanceTo(center),
      crossed,
      stopped,
      restored,
      below,
      officer: [...g.position],
      officerCrossing,
      bridge: !!e.scene.getObjectByName("Cell041_054_MetalBridge"),
    };
  });
  console.log("Bridge mechanics:", JSON.stringify(r));
  expect(r.bridge).toBe(true);
  expect(r.keyError).toBeLessThan(0.00001);
  expect(r.crossed[2]).toBeGreaterThan(7.5);
  expect(r.crossed[1]).toBe(0);
  expect(r.stopped[0]).toBeGreaterThan(-39);
  expect(r.stopped[0]).toBeLessThan(-38.4);
  expect(r.restored).toEqual(r.stopped);
  expect(r.below[0]).toBeLessThan(-39.5);
  expect(r.below[2]).toBeCloseTo(4);
  expect(r.below[1]).toBeCloseTo(-3.2);
  expect(r.officer[2]).toBeGreaterThan(7.5);
  expect(r.officer[1]).toBe(0);
  expect(r.officerCrossing.length).toBeGreaterThan(20);
  for (const p of r.officerCrossing) {
    expect(Math.abs(p[0] + 39)).toBeLessThan(0.6);
    expect(p[1]).toBe(0);
  }
});
