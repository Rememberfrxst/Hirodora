import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("five original voice recordings decode, play once across pause/resume and match the new intro", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  const result = await page.evaluate(async () => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    const audioModule = "/src/game/audio.ts";
    const { sound } = await import(audioModule);
    const plays: any[] = [];
    const play = sound.playIntroVoice.bind(sound);
    sound.playIntroVoice = (id: string, offset: number, position: any) => {
      const ok = play(id, offset, position);
      plays.push({ id, ok });
      return ok;
    };
    e.cinematic.start();
    for (let i = 0; i < 48; i++) e.updateIntro(0.05);
    const wake = {
      position: e.camera.position.toArray(),
      clip: e.worldData.opening.body.userData.animation,
      caption: e.introCaption,
    };
    e.pauseGame();
    const t = e.cinematic.time;
    e.updateIntro(1);
    const paused = e.cinematic.time === t;
    e.resumeGame();
    e.overlayOpen = true;
    for (let i = 0; i < 500 && e.gameState === "intro"; i++)
      e.updateIntro(0.05);
    return {
      plays,
      paused,
      wake,
      state: e.gameState,
      done: e.gameFlags.intro_done,
      failures: sound.failures,
      samples: sound.readySamples,
    };
  });
  expect(result.plays.map((c) => c.id)).toEqual([
    "cellmate-wakeup",
    "cellmate-door",
    "player-escape",
    "guard-stay-down",
    "guard-dead",
  ]);
  expect(result.plays.every((c) => c.ok)).toBe(true);
  expect(result.samples).toBe(75);
  expect(result.failures).toEqual([]);
  expect(result.paused).toBe(true);
  expect(result.wake.clip).toBe("Idle");
  expect(result.state).toBe("playing");
  expect(result.done).toBe(true);
});

test("object meter fills, release cools without losing work, threshold sends real noise to the guard", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = false;
    e.clearInput();
    e.gameFlags.key_identified = true;
    e.syncWorld();
    e.playerPos = [-5.6, 0, -8.1];
    const obj = e.worldData.interactables.find((o: any) => o.id === "bed_push");
    e.playerRotY = Math.atan2(
      -(obj.position[0] - e.playerPos[0]),
      -(obj.position[2] - e.playerPos[2]),
    );
    e.cameraPitch = 0;
    e.move(0);
    e.beginInteract();
    for (let i = 0; i < 180; i++) {
      e.updateOpening(1 / 30);
      e.move(1 / 30);
      e.updateGuards(1 / 30);
    }
    const full = {
      risk: e.caughtMeter,
      progress: e.openingProgress.bed,
      guard: e.worldData.guards[0].state,
      noise: e.stats.peakNoise,
    };
    e.endInteract();
    const saved = e.openingProgress.bed;
    for (let i = 0; i < 105; i++) {
      e.updateOpening(1 / 30);
      e.move(1 / 30);
      e.updateGuards(1 / 30);
    }
    const cooled = e.caughtMeter;
    const movedTable = e.worldData.interactables.find((o:any)=>o.id==='bed_push');
    e.playerRotY = Math.atan2(-(movedTable.position[0]-e.playerPos[0]),-(movedTable.position[2]-e.playerPos[2]));
    e.move(0);
    e.emitChange();
    return { full, cooled, saved, progress: e.openingProgress.bed };
  });
  expect(result.full.risk).toBe(100);
  expect(result.full.noise).toBeGreaterThanOrEqual(100);
  expect(result.full.guard).not.toBe("patrol");
  expect(result.full.progress).toBeLessThan(1);
  expect(result.cooled).toBe(0);
  expect(result.progress).toBe(result.saved);
  await expect(
    page.getByRole("progressbar", { name: "Noise risk", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Action progress", exact: true }),
  ).toBeVisible();
});

test.describe("touch object meters", () => {
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  test("white bolt progress and red risk stay visible on touch; releasing retains progress", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-start]").tap();
    await skipOpening(page);
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      cancelAnimationFrame(e.frameId);
      e.overlayOpen = false;
      e.clearInput();
      e.inventory = ["screwdriver"];
      e.gameFlags.key_identified = true;
      e.gameFlags.bed_moved = true;
      e.openingProgress.bed = 1;
      e.syncWorld();
      e.playerPos = [-6.8, 0, -9.7];
      const o = e.worldData.interactables.find(
        (o: any) => o.id === "toilet_bolts",
      );
      e.playerRotY = Math.atan2(
        -(o.position[0] - e.playerPos[0]),
        -(o.position[2] - e.playerPos[2]),
      );
      e.cameraPitch = 0;
      e.move(0);
      e.emitChange();
    });
    const action = page.getByRole("button", { name: "Interact", exact: true });
    const hit = (await action.boundingBox())!;
    await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
    await page.mouse.down();
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      for (let i = 0; i < 45; i++) e.updateOpening(1 / 30);
      e.emitChange();
    });
    const red = page.getByRole("progressbar", {
        name: "Noise risk",
        exact: true,
      }),
      white = page.getByRole("progressbar", {
        name: "Action progress",
        exact: true,
      });
    await expect(red).toBeVisible();
    await expect(white).toBeVisible();
    expect(Number(await red.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    expect(Number(await white.getAttribute("value"))).toBeGreaterThan(0);
    const box = (await red.boundingBox())!;
    expect(box.y).toBeGreaterThan(60);
    expect(box.y + box.height).toBeLessThan(190);
    await page.mouse.up();
    expect(
      await page.evaluate(() => window.__HIRODORA__.activeHold),
    ).toBeNull();
  });
});
