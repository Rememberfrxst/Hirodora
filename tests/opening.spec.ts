import { skipOpening, openHudEditor } from "./helpers";
import { test, expect, Page } from "@playwright/test";
import type { GameEngine } from "../src/game/engine";
declare global {
  interface Window {
    __HIRODORA__: GameEngine;
  }
}
async function aim(page: Page, id: string, x: number, z: number) {
  await page.evaluate(
    ({ id, x, z }) => {
      const e = window.__HIRODORA__,
        o = e.worldData.interactables.find((o) => o.id === id)!;
      e.playerPos = [x, 0, z];
      e.playerRotY = Math.atan2(-(o.position[0] - x), -(o.position[2] - z));
      e.cameraPitch = 0;
      e.stats.subtitle = null;
      (e as any).move(0);
      e.emitChange();
    },
    { id, x, z },
  );
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.contextualAction))
    .toBe(id);
}
async function finishHold(page: Page, id: string) {
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.activeHold))
    .toBe(id);
  // Advance the real simulation at a fixed contact timestep. SwiftShader is far
  // slower than real-time, so wall-clock holding would test CI's GPU speed.
  await page.evaluate((id) => {
    const e = window.__HIRODORA__ as any;
    const hard = e.hardPush;
    for (let i = 0; i < 420 && e.activeHold; i++) {
      if (!hard && e.caughtMeter >= 65) {
        e.endInteract();
        for (let cool = 0; cool < 65; cool++) {
          e.updateOpening(1 / 30);
          e.move(1 / 30);
          e.updateGuards(1 / 30);
        }
        const target = e.worldData.interactables.find((o: any) => o.id === id);
        e.playerRotY = Math.atan2(
          -(target.position[0] - e.playerPos[0]),
          -(target.position[2] - e.playerPos[2]),
        );
        e.move(0);
        e.beginInteract();
      }
      e.updateOpening(1 / 30);
      e.move(1 / 30);
      e.updateGuards(1 / 30);
    }
    e.emitChange();
  }, id);
}
test("Cell 47 key twist, quiet bed, tool, toilet, passage, save and return", async ({
  page,
}) => {
  // This scenario loads the complete PBR/rig scene twice. Give software GPU CI
  // total setup headroom without relaxing interaction or puzzle assertions.
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() =>
    (window.__HIRODORA__ as any).renderer.setPixelRatio(0.35),
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.__HIRODORA__.worldData.guards[0].examining),
    )
    .toBe(true);
  await aim(page, "cell_key_pickup", -5.8, -2.7);
  await page.keyboard.press("KeyE");
  expect(
    await page.evaluate(() =>
      window.__HIRODORA__.inventory.includes("cell_key"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => window.__HIRODORA__.getItem("cell_key").name),
  ).toBe("Cell key");
  expect(
    await page.evaluate(() => window.__HIRODORA__.gameFlags.key_identified),
  ).toBeUndefined();
  await aim(page, "cell47_lock", -5.0, -3.0);
  await page.keyboard.press("KeyE");
  await expect(
    page
      .getByText("This key is for Cell 42. It won't open Cell 47.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.__HIRODORA__.getItem("cell_key").name),
  ).toBe("Cell 42 key");
  await aim(page, "bed_push", -5.6, -8.1);
  await page.keyboard.down("KeyE");
  await finishHold(page, "bed_push");
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.openingProgress.bed), {
      timeout: 30000,
    })
    .toBe(1);
  await page.keyboard.up("KeyE");
  expect(
    await page.evaluate(() => window.__HIRODORA__.worldData.guards[0].state),
  ).toBe("patrol");
  await aim(page, "screwdriver_pickup", -5.8, -9.0);
  await page.keyboard.press("KeyE");
  await aim(page, "toilet_bolts", -6.8, -9.7);
  await page.keyboard.down("KeyE");
  await finishHold(page, "toilet_bolts");
  await expect
    .poll(
      () => page.evaluate(() => window.__HIRODORA__.gameFlags.toilet_unbolted),
      { timeout: 25000 },
    )
    .toBe(true);
  await page.keyboard.up("KeyE");
  await aim(page, "toilet_move", -6.8, -9.7);
  await page.keyboard.down("KeyE");
  await finishHold(page, "toilet_move");
  await expect
    .poll(
      () => page.evaluate(() => window.__HIRODORA__.gameFlags.passage_open),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.keyboard.up("KeyE");
  await aim(page, "passage47", -7.3, -10.3);
  await page.keyboard.press("KeyE");
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    for (let i = 0; i < 30; i++) e.updateOpening(0.05);
  });
  await expect(page.getByText("A way through.")).toBeVisible();
  await page.getByRole("button", { name: "Explore Cell 46" }).click();
  await aim(page, "passage46", -10.1, -9.7);
  await page.keyboard.press("KeyE");
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    for (let i = 0; i < 30; i++) e.updateOpening(0.05);
  });
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.playerPos[0]))
    .toBeGreaterThan(-8);
  await page.reload();
  await page.locator("[data-start]").click();
  await skipOpening(page);
  expect(
    await page.evaluate(() => window.__HIRODORA__.getItem("cell_key").name),
  ).toBe("Cell 42 key");
  expect(
    await page.evaluate(() => window.__HIRODORA__.gameFlags.passage_open),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("audio recordings decode, blocked movement is silent and channels persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(async () => {
    const modulePath = "/src/game/audio.ts";
    const { sound } = await import(modulePath);
    await sound.preload();
    const e = window.__HIRODORA__ as any;
    e.overlayOpen = true;
    e.playerPos = [-3.6, 0, -6];
    e.playerRotY = -Math.PI / 2;
    e.keys.KeyW = true;
    const before = sound.playedEvents;
    for (let i = 0; i < 100; i++) e.move(0.016);
    e.clearInput();
    sound.setBusVolume("footsteps", 0.24);
    return {
      samples: sound.readySamples,
      failures: sound.failures,
      played: sound.playedEvents - before,
      level: sound.getBusVolume("footsteps"),
    };
  });
  expect(result.samples).toBeGreaterThan(40);
  expect(result.failures).toEqual([]);
  expect(result.played).toBe(0);
  expect(result.level).toBe(0.24);
});
test("hard pushing alerts the examining guard, then he returns to the body without crossing bars", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.renderer.setPixelRatio(0.35);
    e.gameFlags.key_identified = true;
    e.syncWorld();
  });
  await aim(page, "bed_push", -5.6, -8.1);
  await page.keyboard.down("KeyR");
  await finishHold(page, "bed_push");
  await page.keyboard.up("KeyR");
  const result = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any,
      g = e.worldData.guards[0];
    const alarmed = g.state !== "patrol",
      noise = e.stats.peakNoise;
    e.stats.noiseLevel = 0;
    // Bars now transmit sight. Retreat and crouch beyond his reduced sight range
    // rather than standing in plain view and expecting him to forget the player.
    e.playerPos = [-8.3, 0, -10.7];
    e.stats.isCrouching = true;
    let closestZ = g.position[2];
    for (let i = 0; i < 1800; i++) {
      e.updateGuards(1 / 30);
      closestZ = Math.min(closestZ, g.position[2]);
    }
    return {
      alarmed,
      noise,
      z: g.position[2],
      examining: g.examining,
      state: g.state,
      closestZ,
    };
  });
  expect(result.alarmed).toBe(true);
  expect(result.noise).toBeGreaterThan(70);
  expect(result.z).toBeGreaterThan(-1.8);
  expect(result.state).toBe("patrol");
  expect(result.examining).toBe(true);
  // The external slide track now reserves a 0.9m guard approach clearance.
  expect(result.closestZ).toBeLessThan(-0.85);
  expect(result.closestZ).toBeGreaterThan(-1.6);
});
test("mobile contextual holding releases on cancel and rotation without stuck input", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("[data-start]").tap();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    e.gameFlags.key_identified = true;
    e.syncWorld();
  });
  await aim(page, "bed_push", -5.6, -8.1);
  const button = page.getByRole("button", { name: "Interact", exact: true });
  await expect(button).toBeVisible();
  const bounds = (await button.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.activeHold))
    .toBe("bed_push");
  await button.dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
    bubbles: true,
  });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__HIRODORA__.activeHold)).toBeNull();
  expect(errors).toEqual([]);
  await page.evaluate(() => window.__HIRODORA__.beginInteract());
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Turn your phone sideways.")).toBeVisible();
  expect(await page.evaluate(() => window.__HIRODORA__.activeHold)).toBeNull();
  await context.close();
});
