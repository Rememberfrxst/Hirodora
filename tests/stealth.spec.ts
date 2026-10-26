import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("adaptive resolution, paused preset changes and mobile resize never present a cleared frame", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const frames = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.stats.isInHidingSpot = true;
    e.reducedMotion = true;
    e.setGraphicsPreset("high");
    const brightness = () => {
      const gl = e.renderer.getContext(),
        p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        p,
      );
      let n = 0;
      for (let i = 0; i < p.length; i += 4) n += p[i] + p[i + 1] + p[i + 2];
      return n / ((p.length / 4) * 3);
    };
    const values = [];
    e.renderBounds = { initial: 0.85, min: 0.55, max: 1 };
    e.renderScale = 0.85;
    for (let i = 0; i < 4; i++) {
      e.frameAverage = 100;
      e.adaptiveScaleTime = 0;
      const t = performance.now();
      e.lastTime = t - 40;
      e.lastRender = t - 100;
      e.tick(t);
      cancelAnimationFrame(e.frameId);
      values.push({ brightness: brightness(), scale: e.renderScale });
    }
    e.pauseGame();
    e.setGraphicsPreset("medium");
    values.push({ brightness: brightness(), scale: e.renderScale });
    return values;
  });
  expect(frames[0].scale).toBe(0.75);
  expect(frames.every((f) => f.brightness > 2)).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  const nonblank = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    // Read in the resize task, before the browser discards the WebGL backbuffer.
    e.viewportWidth = -1;
    e.updateViewport();
    const gl = e.renderer.getContext(),
      p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      p,
    );
    return p.some((n, i) => i % 4 !== 3 && n > 0);
  });
  expect(nonblank).toBe(true);
});

test("spatial AI sees through bars but cannot cross them, loses sight and returns to its duty", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    const g = e.worldData.guards[0];
    e.worldData.guards.slice(1).forEach((other: any) => {
      other.state = "knocked_out";
      other.stateTimer = 9999;
    });
    g.position = [-5.7, 0, -0.7];
    g.rotationY = Math.PI;
    // An investigating officer faces the cell; the body examiner otherwise
    // intentionally looks away from it while unaware.
    g.state = "suspicious";
    g.suspicion = 35;
    g.stateTimer = 7;
    g.investigationTarget = [-5.7, 0, -3.1];
    g.examining = false;
    e.playerPos = [-5.7, 0, -3.1];
    e.stats.isCrouching = false;
    e.stats.isInHidingSpot = false;
    let minZ = g.position[2];
    for (let i = 0; i < 150; i++) {
      e.updateGuards(1 / 30);
      minZ = Math.min(minZ, g.position[2]);
    }
    const confirmed = g.state,
      seen = [...g.lastKnownPosition],
      notCaptured = e.gameState;
    e.playerPos = [-8.3, 0, -10.7];
    e.stats.isCrouching = true;
    for (let i = 0; i < 160; i++) e.updateGuards(1 / 30);
    const lost = g.state,
      memory = [...g.lastKnownPosition];
    for (let i = 0; i < 1000; i++) e.updateGuards(1 / 30);
    const returned = g.state,
      examining = g.examining;
    e.gameFlags.locker_open = true;
    e.syncWorld();
    e.playerPos = [-11, 0, -4];
    g.position = [-11, 0, -1];
    g.rotationY = Math.PI;
    g.state = "chase";
    g.suspicion = 80;
    g.lastKnownPosition = [...e.playerPos];
    for (let i = 0; i < 30; i++) e.updateGuards(1 / 30);
    return {
      confirmed,
      seen,
      notCaptured,
      minZ,
      lost,
      memory,
      returned,
      examining,
      enteredOpenCell: g.position[2],
    };
  });
  expect(result.confirmed).toBe("chase");
  expect(result.notCaptured).toBe("playing");
  expect(result.minZ).toBeGreaterThan(-1.8);
  expect(result.lost).toBe("searching");
  expect(result.memory).toEqual(result.seen);
  expect(result.returned).toBe("patrol");
  expect(result.examining).toBe(true);
  expect(result.enteredOpenCell).toBeLessThan(-2.2);
});

test("noise stays at its impact source; guard reacts while a puzzle is open", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.stats.isInHidingSpot = false;
    e.playerPos = [-28, 0, -10];
    const g = e.worldData.guards[0];
    g.rotationY = 0;
    g.suspicion = 0;
    e.activeMiniGame = { type: "vent_bolts", progress: 0, noiseSpike: 0 };
    e.emitNoise(100, "test-impact", [-6, 0, -6]);
    for (let i = 0; i < 36; i++) {
      const t = performance.now();
      e.lastTime = t - 50;
      e.lastRender = t;
      e.tick(t);
      cancelAnimationFrame(e.frameId);
    }
    return {
      state: g.state,
      target: g.investigationTarget,
      lastKnown: g.lastKnownPosition,
      event: e.noiseEvents[0]?.position,
    };
  });
  expect(result.state).not.toBe("patrol");
  expect(result.state).not.toBe("chase");
  expect(result.target).toEqual([-6, 0, -6]);
  expect(result.lastKnown).toBeUndefined();
  // The puzzle intentionally replaces the HUD. Return to gameplay to inspect
  // its state label without advancing the frozen simulation.
  await page.getByRole("button", { name: "Cancel puzzle" }).click();
  await expect(page.locator(".stealth-state")).toHaveText(
    /INVESTIGATING|SEARCHING/,
  );
});

test("two-handed weapon grip follows the active skeleton across officer LOD and returns to idle hands", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.newGame();
    e.cinematic.seek(4.5, false, 0.5);
    const g = e.worldData.guards[0],
      actor = e.guardActors.get(g.id),
      V = e.camera.position.constructor;
    e.camera.position.set(-5.7, 1.65, -1.2);
    e.camera.lookAt(-4.25, 1.4, 0.2);
    e.camera.updateMatrixWorld();
    const grips = [];
    for (const quality of ["desktop", "mobile"]) {
      actor.update(g, 0, 0.1, e.camera, quality, false);
      const socket = actor.weaponGrip(new V(-6.4, 1.2, -0.1)),
        model = actor.views.get(actor.tier).root;
      grips.push({
        tier: actor.tier,
        right: socket.position.distanceTo(socket.rightWrist),
        left: socket.position.distanceTo(socket.leftWrist),
        curl: model
          .getObjectByName("RightHandMiddle1")
          .quaternion.angleTo(
            actor.handRest.get(model.getObjectByName("RightHandMiddle1")),
          ),
      });
    }
    g.cinematicAim = false;
    actor.update(g, 0, 0.1, e.camera, "mobile", false);
    const finger = actor.views
      .get(actor.tier)
      .root.getObjectByName("RightHandMiddle1");
    return {
      grips,
      reset: finger.quaternion.angleTo(actor.handRest.get(finger)),
    };
  });
  expect(result.grips.map((g) => g.tier)).toEqual(["hero", "mobile"]);
  expect(
    result.grips.every((g) => g.right < 0.075 && g.left < 0.13 && g.curl > 0.7),
  ).toBe(true);
  expect(result.reset).toBeLessThan(0.001);
});
