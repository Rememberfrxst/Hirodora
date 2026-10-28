import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("supplied cargo matches physical bounds, leaves cell lanes clear and uses real wooden stairs", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const data = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.stats.isInHidingSpot = true;
    const THREEBox = e.worldData.colliders[0].constructor;
    const cargo = e.worldData.cargo.map((root: any) => {
      const b = new THREEBox().setFromObject(root);
      const proxy = e.worldData.colliders.find(
        (c: any) =>
          Math.abs(c.min.x - b.min.x) < 0.03 &&
          Math.abs(c.min.z - b.min.z) < 0.03 &&
          Math.abs(c.max.y - b.max.y) < 0.03,
      );
      return {
        name: root.name,
        proxy: !!proxy,
        min: b.min.toArray(),
        max: b.max.toArray(),
      };
    });
    const stairs: any[] = [];
    e.scene.traverse((o: any) => {
      if (o.name === "CellAsset_WoodStairs")
        stairs.push(new THREEBox().setFromObject(o));
    });
    const blocked = e.worldData.colliders
      .filter((b: any) => b.min.y < -2.9 && b.max.y > -2)
      .some(
        (b: any) =>
          b.min.z < -0.7 && b.max.z > -0.3 && b.min.x < -20 && b.max.x > -60,
      );
    return {
      cargo,
      stairs: stairs.map((b) => ({
        min: b.min.toArray(),
        max: b.max.toArray(),
      })),
      blocked,
      health: e.stats.health,
    };
  });
  expect(data.cargo).toHaveLength(13);
  expect(data.health).toBe(200);
  for (const c of data.cargo) {
    expect(c.proxy).toBe(true);
    expect(c.min[2]).toBeGreaterThan(0.9);
    expect(c.max[2]).toBeLessThan(7.1);
  }
  expect(data.stairs).toHaveLength(2);
  for (const s of data.stairs) {
    expect(s.min[1]).toBeLessThan(-3.1);
    expect(s.max[1]).toBeGreaterThan(1);
    expect(s.max[0] - s.min[0]).toBeGreaterThan(7);
  }
});

test("guard strikes have windup, can miss, respect walls/floors and reduce 200 HP until defeat", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.clearInput();
    e.worldData.guards.forEach((g: any) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    });
    const g = e.worldData.guards.find(
        (g: any) => g.id === "guard_lower_center",
      ),
      actor = e.guardActors.get(g.id);
    const place = () => {
      e.playerPos = [-35, -3.2, 4];
      g.position = [-35, -3.2, 4.9];
      g.rotationY = Math.PI;
      g.state = "chase";
      g.suspicion = 100;
      g.lastKnownPosition = [...e.playerPos];
      g.attackElapsed = undefined;
      g.attackCooldown = 0;
      e.stats.isInHidingSpot = false;
    };
    place();
    e.updateGuards(0.05);
    for (let i = 0; i < 5; i++) e.updateGuards(0.05);
    const windup = e.stats.health,
      animation = actor.animation;
    for (let i = 0; i < 3; i++) e.updateGuards(0.05);
    const first = e.stats.health;
    for (let i = 0; i < 20; i++) e.updateGuards(0.05);
    const separation = Math.hypot(
      g.position[0] - e.playerPos[0],
      g.position[2] - e.playerPos[2],
    );
    // Escape during a later windup, rather than assigning damage through test APIs.
    place();
    e.damageGrace = 0;
    e.updateGuards(0.05);
    e.playerPos = [-35, -3.2, 2.8];
    for (let i = 0; i < 10; i++) e.updateGuards(0.05);
    const miss = e.stats.health;
    // A closed barred gate and a whole storey both prevent a strike.
    g.position = [-5.7, 0, -0.7];
    g.rotationY = Math.PI;
    g.attackElapsed = undefined;
    g.attackCooldown = 0;
    e.playerPos = [-5.7, 0, -2.6];
    for (let i = 0; i < 60; i++) e.updateGuards(0.05);
    const bars = e.stats.health;
    g.position = [-35, 0, 4];
    e.playerPos = [-35, -3.2, 4];
    g.attackElapsed = undefined;
    for (let i = 0; i < 20; i++) e.updateGuards(0.05);
    const floor = e.stats.health;
    place();
    e.damageGrace = 0;
    for (let i = 0; i < 320 && e.gameState === "playing"; i++)
      e.updateGuards(0.05);
    return {
      windup,
      animation,
      first,
      separation,
      miss,
      bars,
      floor,
      hp: e.stats.health,
      state: e.gameState,
      caught: e.stats.timesCaught,
    };
  });
  expect(result.windup).toBe(200);
  expect(result.animation).toBe("Strike");
  expect(result.first).toBe(175);
  expect(result.separation).toBeGreaterThanOrEqual(0.85);
  expect(result.miss).toBe(175);
  expect(result.bars).toBe(175);
  expect(result.floor).toBe(175);
  expect(result.hp).toBe(0);
  expect(result.state).toBe("gameover");
  expect(result.caught).toBe(1);
});

test("HP persists through checkpoints, old saves get 200, and searches kneel without replacing AI", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.stats.health = 125;
    e.saveCheckpoint();
    const cp = structuredClone(e.checkpoint);
    e.stats.health = 25;
    e.restoreCheckpoint(cp);
    const restored = e.stats.health;
    delete cp.stats.health;
    e.restoreCheckpoint(cp);
    const legacy = e.stats.health;
    const cargo = e.worldData.cargo.find(
      (root: any) => root.name === "LowerHall_WoodBox",
    );
    const inside = [...cargo.position.toArray()];
    cp.layoutVersion = 16;
    cp.playerPosition = [inside[0], inside[1], 1 + (inside[2] - 1) / 0.75];
    e.restoreCheckpoint(cp);
    const escapedCargo = Math.hypot(
      e.playerPos[0] - inside[0],
      e.playerPos[2] - inside[2],
    );
    const clearOfCargo = e.worldData.colliders.every(
      (b: any) =>
        !(
          b.max.y > e.playerPos[1] + 0.12 &&
          b.min.y < e.playerPos[1] + 1.7 &&
          e.playerPos[0] + 0.27 > b.min.x &&
          e.playerPos[0] - 0.27 < b.max.x &&
          e.playerPos[2] + 0.27 > b.min.z &&
          e.playerPos[2] - 0.27 < b.max.z
        ),
    );
    e.worldData.guards.forEach((g: any) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    });
    const g = e.worldData.guards.find(
      (g: any) => g.id === "guard_lower_center",
    );
    e.stats.isInHidingSpot = true;
    g.position = [-35, -3.2, 4];
    g.rotationY = Math.PI;
    g.state = "searching";
    g.suspicion = 40;
    g.stateTimer = 12;
    g.investigationTarget = [...g.position];
    g.lastKnownPosition = [...g.position];
    // Pose checks must look at the actor: offscreen animation sampling is
    // intentionally throttled while authoritative search timers still advance.
    e.camera.position.set(-35, -1.55, 1.4);
    e.camera.lookAt(-35, -2.1, 4);
    e.camera.updateMatrixWorld();
    for (let i = 0; i < 35; i++) e.updateGuards(0.05);
    const actor = e.guardActors.get(g.id),
      animation = actor.animation,
      state = g.state;
    const hips = actor.hitTarget.getObjectByName("Hips").position.y;
    e.newGame();
    e.finishIntro();
    cancelAnimationFrame(e.frameId);
    return {
      restored,
      legacy,
      escapedCargo,
      clearOfCargo,
      animation,
      state,
      hips,
      newHealth: e.stats.health,
    };
  });
  expect(result.restored).toBe(125);
  expect(result.legacy).toBe(200);
  expect(result.escapedCargo).toBeGreaterThan(0.6);
  expect(result.clearOfCargo).toBe(true);
  expect(result.newHealth).toBe(200);
  expect(result.animation).toBe("Kneel");
  expect(result.state).toBe("searching");
  expect(result.hips).toBeLessThan(0.8);
  await expect(
    page.getByRole("progressbar", { name: "Health", exact: true }),
  ).toHaveAttribute("aria-valuenow", "200");
});
