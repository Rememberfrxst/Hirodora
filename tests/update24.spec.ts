import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";
test("belt key voice, push-only risk, visible screwdriver, four independent bolts and passage", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(async () => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = false;
    e.clearInput();
    e.updateGuards(0.05);
    const path = "/src/game/audio.ts";
    const { sound } = await import(path);
    const aim = (id: string, p: number[]) => {
      e.playerPos = [...p];
      e.clearInput();
      const o = e.worldData.interactables.find((o: any) => o.id === id);
      if (!o) throw Error("Missing " + id);
      e.playerRotY = Math.atan2(
        -(o.position[0] - p[0]),
        -(o.position[2] - p[2]),
      );
      e.cameraPitch = 0;
      e.move(0);
      if (id.startsWith("toilet_bolt_")) {
        const mesh =
            e.worldData.opening.toilet.userData.bolts[Number(id.slice(-1))],
          target = mesh.getWorldPosition(e.camera.position.clone());
        e.cameraPitch = -Math.atan2(
          e.camera.position.y - target.y,
          Math.hypot(target.x - p[0], target.z - p[2]),
        );
        e.move(0);
      }
      if (e.contextualAction !== id)
        throw Error(
          `Aim ${id}: got ${e.contextualAction}, at ${p}, object ${o.position}`,
        );
    };
    aim("cell_key_pickup", [-4.4, 0, -2.45]);
    const keyY = e.worldData.pickupMeshes.get("cell_key_pickup").position.y;
    e.interact();
    const keyVoice = sound.playedIntroCues.includes("guard-key-missing");
    aim("cell47_lock", [-5.3, 0, -3]);
    e.interact();
    aim("bed_push", [-5.6, 0, -8.1]);
    e.beginInteract();
    for (let i = 0; i < 30; i++) e.updateOpening(0.05);
    const earlyRate = e.caughtMeter;
    e.endInteract();
    // Save a real held state to inspect the actual UI outside evaluate.
    e.emitChange();
    const tableUI = {
      risk: !!document.querySelector('[aria-label="Noise risk"]'),
    };
    const finishPush = (id: string) => {
      let n = 0;
      while (
        !e.gameFlags[id === "bed_push" ? "bed_moved" : "passage_open"] &&
        n++ < 40
      ) {
        const o = e.worldData.interactables.find((o: any) => o.id === id);
        e.playerRotY = Math.atan2(
          -(o.position[0] - e.playerPos[0]),
          -(o.position[2] - e.playerPos[2]),
        );
        e.move(0);
        e.beginInteract();
        if (e.activeHold !== id) throw Error("Cannot start " + id);
        for (let i = 0; i < 24 && e.activeHold; i++) e.updateOpening(0.05);
        e.endInteract();
        for (let i = 0; i < 30; i++) e.updateOpening(0.05);
      }
      if (n >= 40) throw Error("Work did not finish " + id);
    };
    finishPush("bed_push");
    const driver = e.worldData.pickupMeshes.get("screwdriver_pickup");
    const driverY = driver.position.y,
      driverVisible = driver.visible;
    aim("screwdriver_pickup", [-5.4, 0, -9]);
    e.interact();
    let noRisk = true;
    const order = [2, 0, 3, 1];
    const done: number[] = [];
    for (const i of order) {
      aim("toilet_bolt_" + i, [-6.8, 0, -9.7]);
      e.beginInteract();
      if (e.activeBolt !== i) throw Error("Wrong bolt selected");
      for (let j = 0; j < 20; j++) e.updateOpening(0.05);
      const part = e.openingProgress.boltSteps[i];
      e.endInteract();
      const cp = structuredClone(e.checkpoint);
      e.restoreCheckpoint(cp);
      if (e.openingProgress.boltSteps[i] !== part)
        throw Error("Partial bolt progress lost");
      aim("toilet_bolt_" + i, [-6.8, 0, -9.7]);
      e.beginInteract();
      for (let j = 0; j < 40 && e.activeHold; j++) e.updateOpening(0.05);
      noRisk &&= e.caughtMeter === 0;
      done.push(e.openingProgress.boltSteps[i]);
    }
    const unbolted = e.gameFlags.toilet_unbolted;
    aim("toilet_move", [-6.8, 0, -9.7]);
    finishPush("toilet_move");
    return {
      keyY,
      keyVoice,
      earlyRate,
      driverY,
      driverVisible,
      done,
      noRisk,
      unbolted,
      passage: e.gameFlags.passage_open,
      tableUI,
      samples: sound.readySamples,
    };
  });
  expect(r.keyY).toBeGreaterThan(0.85);
  expect(r.keyVoice).toBe(true);
  expect(r.samples).toBe(76);
  expect(r.earlyRate).toBeGreaterThan(10);
  expect(r.driverY).toBeGreaterThan(0);
  expect(r.driverVisible).toBe(true);
  expect(r.done).toEqual([1, 1, 1, 1]);
  expect(r.noRisk).toBe(true);
  expect(r.unbolted && r.passage).toBe(true);
});
test("push UI has only Caught-meter; bolt UI only its own progress and Hold Unscrew", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.gameFlags.key_identified = true;
    e.syncWorld();
    e.playerPos = [-5.6, 0, -8.1];
    const o = e.worldData.interactables.find((o: any) => o.id === "bed_push");
    e.playerRotY = Math.atan2(
      -(o.position[0] - e.playerPos[0]),
      -(o.position[2] - e.playerPos[2]),
    );
    e.move(0);
    e.emitChange();
  });
  await expect(
    page.getByRole("progressbar", { name: "Noise risk", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Action progress", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Push hard/ })).toHaveCount(0);
  await expect(page.locator(".interact-prompt")).not.toContainText(
    /Table|Move/,
  );
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.inventory = ["screwdriver"];
    e.syncWorld();
    e.playerPos = [-6.8, 0, -9.7];
    const b = e.worldData.opening.toilet.userData.bolts[0],
      p = b.getWorldPosition(e.camera.position.clone());
    e.playerRotY = Math.atan2(-(p.x - e.playerPos[0]), -(p.z - e.playerPos[2]));
    e.cameraPitch = -Math.atan2(
      e.playerPos[1] + 1.68 - p.y,
      Math.hypot(p.x - e.playerPos[0], p.z - e.playerPos[2]),
    );
    e.move(0);
    e.emitChange();
  });
  await expect(
    page.getByRole("progressbar", { name: "Noise risk", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Action progress", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".interact-prompt")).toContainText("Bolt 1 / 4");
  await expect(page.locator(".interact-prompt")).toContainText("Unscrew");
});
