import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("full barred cell fronts retain collision while small doors slide, protect actors and restore", async ({
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
    const cell = e.worldData.cells.find((c: any) => c.number === 36);
    const gate = e.worldData.doors.get("cell_36_door");
    const s = gate.userData.slider;
    e.gameFlags.cell_36_open = false;
    e.syncWorld(true);
    const closedX = gate.position.x;
    e.playerPos = [cell.doorX + 0.7, 0, -3.4];
    e.gameFlags.cell_36_open = true;
    e.syncWorld();
    const before = gate.position.x;
    e.updateCellGates(0.35);
    const half = gate.position.x;
    e.updateCellGates(0.35);
    const openX = gate.position.x;
    e.playerRotY = 0;
    e.keys.KeyS = true;
    for (let i = 0; i < 90; i++) e.move(0.016);
    e.clearInput();
    const exited = e.playerPos[2];
    e.playerPos = [cell.left + 0.65, 0, -3.4];
    e.keys.KeyS = true;
    for (let i = 0; i < 90; i++) e.move(0.016);
    e.clearInput();
    const panelStopped = e.playerPos[2];
    e.playerPos = [cell.doorX + 0.7, 0, s.closedZ];
    e.gameFlags.cell_36_open = false;
    e.syncWorld();
    e.updateCellGates(0.7);
    const protectedPlayer = s.fraction === 1;
    e.playerPos = [-6, 0, -6];
    e.updateCellGates(0.7);
    const closed = s.fraction === 0;
    e.gameFlags.cell_36_open = true;
    e.syncWorld();
    e.updateCellGates(0.35);
    e.saveCheckpoint();
    e.restoreCheckpoint(e.checkpoint);
    const restored = s.fraction === 1;
    const officer = e.worldData.guards[1];
    officer.position = [cell.doorX + 0.7, 0, s.closedZ];
    e.gameFlags.cell_36_open = false;
    e.syncWorld();
    e.updateCellGates(0.7);
    const protectedGuard = s.fraction === 1;
    return {
      closedX,
      before,
      half,
      openX,
      travel: s.travel,
      yaw: gate.rotation.y,
      exited,
      panelStopped,
      protectedPlayer,
      protectedGuard,
      closed,
      restored,
      gates: [...e.worldData.doors.values()].filter(
        (g: any) => g.userData.slider,
      ).length,
    };
  });
  expect(r.gates).toBe(48);
  expect(r.before).toBe(r.closedX);
  expect(r.half).toBeCloseTo(r.closedX + r.travel / 2, 5);
  expect(r.openX).toBeCloseTo(r.closedX + r.travel, 5);
  expect(r.yaw).toBe(0);
  expect(r.exited).toBeGreaterThan(-0.5);
  expect(r.panelStopped).toBeLessThan(-2.2);
  expect(r.protectedPlayer).toBe(true);
  expect(r.protectedGuard).toBe(true);
  expect(r.closed).toBe(true);
  expect(r.restored).toBe(true);
});
