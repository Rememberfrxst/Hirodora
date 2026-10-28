import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";
test("Cell 015 route: real entry, gated rooms, 50-damage gunfire, checkpoint respawn, tunnel and boat", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = false;
    const aimAction = (id: string, pos: number[]) => {
      e.playerPos = pos;
      e.clearInput();
      const list = e.region
        ? e.escapeWorld.actions.get(e.region)
        : e.worldData.interactables;
      const o = list.find((o: any) => o.id === id);
      e.playerRotY = Math.atan2(
        -(o.position[0] - pos[0]),
        -(o.position[2] - pos[2]),
      );
      e.cameraPitch = 0;
      e.move(0);
      if (e.contextualAction !== id)
        throw Error(`Expected ${id}, got ${e.contextualAction}`);
      e.interact();
    };
    e.inventory = ["pistol_10mm", "screwdriver"];
    e.equippedItem = "pistol_10mm";
    const cell = e.worldData.cells.find((c: any) => c.number === 15);
    aimAction("route_enter", [cell.centerX, cell.floorY, cell.rear + 1.6]);
    const entry = {
      region: e.region,
      count: e.activeGuards.length,
      health: e.stats.health,
    };
    aimAction("route_gate_1", [111, 0, 6]);
    const locked = !e.gameFlags.route_gate_1;
    e.playerPos = [102, 0, 6];
    e.playerRotY = -Math.PI / 2;
    e.move(0);
    const guards = e.activeGuards,
      shooter = guards[0];
    for (const g of guards) {
      g.state = "knocked_out";
      g.stateTimer = 1000;
    }
    Object.assign(shooter, {
      position: [107, 0, 6],
      state: "chase",
      suspicion: 100,
      rotationY: -Math.PI / 2,
      visionAngle: 360,
      visionRange: 30,
      shotCooldown: 0,
      shotWindup: undefined,
    });
    // A solid wall between the same two positions must cancel an almost-ready shot.
    const THREE_BOX = e.worldData.opening.bedBounds.clone();
    THREE_BOX.min.set(104, 0, 5);
    THREE_BOX.max.set(104.4, 3, 7);
    e.escapeWorld.colliders.get("secret").push(THREE_BOX);
    shooter.shotWindup = 0.79;
    for (let i = 0; i < 30; i++) {
      e.elapsed += 0.05;
      e.updateGuards(0.05);
    }
    const covered = e.stats.health;
    e.escapeWorld.colliders.get("secret").pop();
    Object.assign(shooter, {
      position: [107, 0, 6],
      state: "chase",
      suspicion: 100,
      rotationY: -Math.PI / 2,
      shotCooldown: 0,
    });
    const health: number[] = [];
    let last = 200;
    for (let i = 0; i < 400 && e.gameState === "playing"; i++) {
      e.elapsed += 0.05;
      e.updateGuards(0.05);
      if (last !== e.stats.health) {
        last = e.stats.health;
        health.push(last);
      }
    }
    const dead = e.gameState;
    e.updateRespawn(2.1);
    const respawn = {
      region: e.region,
      health: e.stats.health,
      pos: [...e.playerPos],
      state: e.gameState,
    };
    // Shoot the actual taller officer mesh through the visible chest, twice.
    const g = e.activeGuards[0];
    g.position = [107, 0, 6];
    g.rotationY = -Math.PI / 2;
    for (const other of e.activeGuards.slice(1)) {
      other.state = "knocked_out";
      other.stateTimer = 1000;
    }
    e.playerPos = [102, 0, 6];
    e.playerRotY = -Math.PI / 2;
    e.cameraPitch = Math.atan2(1.68 - 1.15, 5);
    e.move(0);
    e.camera.lookAt(107, 1.15, 6);
    e.camera.updateMatrixWorld();
    for (let i = 0; i < 20; i++)
      e.guardActors
        .get(g.id)
        .update(g, 0, 0.05, e.camera, e.guardQuality, e.mobile);
    e.scene.updateMatrixWorld(true);
    e.firePistol();
    const first = g.health;
    e.elapsed += 0.4;
    e.firePistol();
    const second = g.health;
    // Check the physical closed bulkhead, not only its interaction flag.
    e.playerPos = [111, 0, 6];
    e.playerRotY = -Math.PI / 2;
    e.keys.KeyW = true;
    for (let i = 0; i < 20; i++) e.move(0.05);
    e.clearInput();
    const stoppedX = e.playerPos[0];
    for (const g of e.activeGuards.slice(0, 2)) {
      g.dead = true;
      g.health = 0;
    }
    aimAction("route_gate_1", [111, 0, 6]);
    for (const g of e.activeGuards.slice(2, 4)) {
      g.dead = true;
      g.health = 0;
    }
    aimAction("route_gate_2", [123, 0, 6]);
    for (const g of e.activeGuards) {
      g.dead = true;
      g.health = 0;
    }
    aimAction("route_hatch", [132, 0, 8.5]);
    const underground = [...e.playerPos];
    e.keys.KeyW = true;
    for (let i = 0; i < 140; i++) e.move(0.05);
    e.clearInput();
    const walkedTunnel = e.playerPos[2];
    aimAction("route_military", [132, -4, 32]);
    const military = { region: e.region, count: e.activeGuards.length };
    aimAction("route_sea_gate", [275.2, 0, 0]);
    const dockLocked = !e.gameFlags.route_sea_gate;
    for (const g of e.activeGuards) {
      g.dead = true;
      g.health = 0;
    }
    aimAction("route_sea_gate", [275.2, 0, 0]);
    aimAction("route_boat", [285.5, 0, 0]);
    return {
      entry,
      locked,
      covered,
      health,
      dead,
      respawn,
      first,
      second,
      stoppedX,
      underground,
      walkedTunnel,
      military,
      dockLocked,
      ending: e.gameState,
      escaped: e.gameFlags.island_escaped,
    };
  });
  expect(result.entry).toEqual({ region: "secret", count: 6, health: 200 });
  expect(result.locked).toBe(true);
  expect(result.covered).toBe(200);
  expect(result.health).toEqual([150, 100, 50, 0]);
  expect(result.dead).toBe("gameover");
  expect(result.respawn).toEqual({
    region: "secret",
    health: 200,
    pos: [102, 0, 6],
    state: "playing",
  });
  expect(result.first).toBe(100);
  expect(result.second).toBe(0);
  expect(result.stoppedX).toBeLessThan(111.8);
  expect(result.underground[1]).toBe(-4);
  expect(result.walkedTunnel).toBeGreaterThan(30);
  expect(result.military).toEqual({ region: "military", count: 10 });
  expect(result.dockLocked).toBe(true);
  expect(result.ending).toBe("victory");
  expect(result.escaped).toBe(true);
});

test("route checkpoint survives reload and New game restores the original prison", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.overlayOpen = true;
    e.inventory = ["pistol_10mm"];
    e.equippedItem = "pistol_10mm";
    e.routeAction("route_enter");
    e.overlayOpen = true;
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      return { region: e.region, n: e.activeGuards.length, hp: e.stats.health };
    }),
  ).toEqual({ region: "secret", n: 6, hp: 200 });
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.newGame();
  });
  expect(
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      return {
        region: e.region ?? null,
        state: e.gameState,
        n: e.activeGuards.length,
      };
    }),
  ).toEqual({ region: null, state: "intro", n: 9 });
});
