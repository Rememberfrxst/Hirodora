import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("toilet parking keeps its metal valve clear of the sink throughout the slide", async ({
  page,
}) => {
  await init(page);
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any,
      B = e.worldData.colliders[0].constructor;
    let sink: any;
    e.scene.traverse((o: any) => {
      if (
        o.name === "CellAsset_Sink" &&
        Math.abs(o.parent.position.x + 8.27) < 0.01
      )
        sink = o;
    });
    const sinkBounds = new B().setFromObject(sink),
      overlaps: number[] = [];
    e.gameFlags.toilet_unbolted = true;
    e.gameFlags.passage_open = true;
    for (let i = 0; i <= 10; i++) {
      e.openingProgress.toilet = i / 10;
      e.syncWorld();
      e.scene.updateMatrixWorld(true);
      e.worldData.opening.toilet.traverse((o: any) => {
        if (
          o.isMesh &&
          o.material.name === "BrushedSteel" &&
          new B().setFromObject(o).intersectsBox(sinkBounds)
        )
          overlaps.push(i);
      });
    }
    return {
      overlaps,
      yaw: e.worldData.opening.toilet.rotation.y,
      z: e.worldData.opening.toilet.position.z,
    };
  });
  expect(result.overlaps).toEqual([]);
  expect(result.yaw).toBeCloseTo(Math.PI / 2);
  expect(result.z).toBeCloseTo(-8);
});
async function init(page: any) {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(async () => {
    const path = "/src/game/audio.ts";
    const { sound } = await import(path);
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    await sound.preload();
  });
}
test("bed and ceramic movement audio follow geometry, stop on release and keep original stealth noise", async ({
  page,
}) => {
  await init(page);
  const result = await page.evaluate(async () => {
    const path = "/src/game/audio.ts",
      { sound } = await import(path),
      e = window.__HIRODORA__ as any;
    e.overlayOpen = false;
    e.gameFlags.key_identified = true;
    e.syncWorld();
    e.playerPos = [-5.6, 0, -8.1];
    const o = e.worldData.interactables.find((o: any) => o.id === "bed_push");
    e.playerRotY = Math.atan2(
      -(o.position[0] - e.playerPos[0]),
      -(o.position[2] - e.playerPos[2]),
    );
    e.beginInteract();
    e.updateOpening(1 / 30);
    const initial = sound.objectAudioSnapshot();
    for (let i = 0; i < 20; i++) e.updateOpening(1 / 30);
    const moved = sound.objectAudioSnapshot(),
      noise = e.stats.peakNoise;
    e.endInteract();
    await new Promise((r) => setTimeout(r, 160));
    const stopped = {
      actions: sound.activeObjectActions,
      voices: (sound as any).objectVoices.size,
    };
    sound.objectAction({
      id: "fixture",
      kind: "toilet",
      phase: "start",
      position: [-8.05, 0.15, -9.7],
      intensity: 0.32,
    });
    sound.objectAction({
      id: "fixture",
      kind: "toilet",
      phase: "update",
      position: [-8.05, 0.15, -8.4],
      intensity: 0.32,
    });
    const toilet = sound.objectAudioSnapshot();
    e.pauseGame();
    await new Promise((r) => setTimeout(r, 100));
    return {
      initial,
      moved,
      noise,
      stopped,
      toilet,
      paused: sound.activeObjectActions,
      failures: sound.failures,
      samples: sound.readySamples,
    };
  });
  expect(result.initial[0].kind).toBe("bed");
  expect(result.initial[0].playing).toBe(true);
  expect(result.moved[0].position[2]).toBeGreaterThan(
    result.initial[0].position[2],
  );
  expect(result.noise).toBe(5);
  expect(result.stopped).toEqual({ actions: 0, voices: 0 });
  expect(result.toilet[0].position).toEqual([-8.05, 0.15, -8.4]);
  expect(result.paused).toBe(0);
  expect(result.failures).toEqual([]);
  expect(result.samples).toBeGreaterThanOrEqual(69);
});
test("bars transmit audio but solid cell walls attenuate; idle cell remains silent", async ({
  page,
}) => {
  await init(page);
  const result = await page.evaluate(async () => {
    const path = "/src/game/audio.ts",
      { sound } = await import(path),
      e = window.__HIRODORA__ as any;
    e.playerPos = [-5.7, 0, -3];
    const bars = sound.occlusion!([-5.7, 0, -0.7]);
    e.playerPos = [-6, 0, -6];
    const wall = sound.occlusion!([-11, 1, -6]);
    sound.resetSceneAudio();
    sound.setAmbience("cell", 0);
    await new Promise((r) => setTimeout(r, 200));
    return {
      bars,
      wall,
      actions: sound.activeObjectActions,
      loops: (sound as any).loops.map((x: any) => x.gain.gain.value),
    };
  });
  expect(result.bars).toBe(0);
  expect(result.wall).toBeGreaterThan(0);
  expect(result.actions).toBe(0);
  expect(result.loops.every((x: number) => Math.abs(x) < 0.00001)).toBe(true);
});
test("guard dialogue steals a low-priority effect at the mobile voice cap without touching AI", async ({
  page,
}) => {
  await init(page);
  const result = await page.evaluate(async () => {
    const path = "/src/game/audio.ts",
      { sound } = await import(path),
      audio = sound as any,
      e = window.__HIRODORA__ as any;
    sound.resetSceneAudio();
    await new Promise((r) => setTimeout(r, 100));
    audio.lightweight = true;
    for (let i = 0; i < 12; i++)
      audio.play("toilet-scrape", "sfx", 0.1, [-6, 0, -6]);
    const before = e.worldData.guards.map((g: any) => g.suspicion);
    sound.guardVoice("chase", [-6, 0, -3]);
    return {
      count: sound.activeVoices,
      dialogue: [...audio.priorities.values()].includes(100),
      before,
      after: e.worldData.guards.map((g: any) => g.suspicion),
    };
  });
  expect(result.count).toBe(12);
  expect(result.dialogue).toBe(true);
  expect(result.after).toEqual(result.before);
});
