import { test, expect, Page } from "@playwright/test";
import type { GameEngine } from "../src/game/engine";
declare global {
  interface Window {
    __HIRODORA__: GameEngine;
  }
}

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).click();
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeVisible();
}

// Fixtures place the player at a legal approach point; interactions and puzzles use real UI.
// Separate collision and reachability tests exercise navigation across the actual geometry.
async function approach(page: Page, id: string, position: [number, number]) {
  await page.evaluate(
    ({ id, position }) => {
      const e = window.__HIRODORA__,
        obj = e.worldData.interactables.find((i) => i.id === id)!;
      e.playerPos = [position[0], 0, position[1]];
      e.playerRotY = Math.atan2(
        -(obj.position[0] - position[0]),
        -(obj.position[2] - position[1]),
      );
      e.cameraPitch = 0;
      e.stats.subtitle = null;
      e.emitChange();
    },
    { id, position },
  );
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.activeInteractPrompt))
    .not.toBeNull();
  await page.keyboard.press("KeyE");
}

test("desktop starts, moves, crouches, pauses and closes intel without stuck input", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  const before = await page.evaluate(() => window.__HIRODORA__.playerPos[2]);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  expect(
    await page.evaluate(() => window.__HIRODORA__.playerPos[2]),
  ).toBeLessThan(before);
  await page.keyboard.press("KeyC");
  expect(await page.evaluate(() => window.__HIRODORA__.stats.isCrouching)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Facility map", exact: true }).click();
  await expect(page.getByText("Know your way out.")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__HIRODORA__.overlayOpen)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await expect(page.getByText("The night can wait.")).toBeVisible();
  await page.getByLabel("Master volume").fill("35");
  await page.getByRole("button", { name: "Resume escape" }).click();
  expect(errors).toEqual([]);
});

test("tool requirements, all four puzzles, crafting, checkpoints and Brotherhood ending", async ({
  page,
}) => {
  await start(page);
  // Deterministic progression fixture isolates puzzle logic from patrol timing.
  await page.evaluate(() =>
    window.__HIRODORA__.worldData.guards.forEach((g) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    }),
  );
  await approach(page, "vent_bolts_interact", [-7.5, -8.6]);
  await expect(page.getByText("Required: Reinforced Spoon")).toBeVisible();
  await approach(page, "spoon_pickup", [-6, -7]);
  expect(
    await page.evaluate(() => window.__HIRODORA__.inventory.includes("spoon")),
  ).toBe(true);
  await approach(page, "vent_bolts_interact", [-7.5, -8.6]);
  await expect(
    page.getByRole("dialog", { name: "A quiet way through." }),
  ).toBeVisible();
  const steady = page.getByRole("button", { name: "Hold steady" });
  await steady.focus();
  await page.keyboard.down("Space");
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await page.keyboard.up("Space");
  expect(
    await page.evaluate(() => window.__HIRODORA__.gameFlags.vent_unbolted),
  ).toBe(true);
  await approach(page, "cell_46_locker", [-12.1, -9]);
  await expect(
    page.getByText("Boulder blocks the locker. Earn his trust first."),
  ).toBeVisible();
  await approach(page, "boulder_npc", [-10.7, -4.5]);
  for (
    let i = 0;
    i < 20 &&
    !(await page.evaluate(
      () => window.__HIRODORA__.gameFlags.boulder_pacified,
    ));
    i++
  )
    await page.getByRole("button", { name: "Push back" }).press("Enter");
  expect(
    await page.evaluate(() => window.__HIRODORA__.gameFlags.boulder_pacified),
  ).toBe(true);
  await approach(page, "cell_46_locker", [-12.1, -9]);
  await approach(page, "master_c_door_interact", [0.2, 0]);
  expect(await page.evaluate(() => window.__HIRODORA__.stats.act)).toBe(2);
  await approach(page, "lockpick_pickup", [0, 3.5]);
  await approach(page, "stethoscope_pickup", [-8, 9]);
  await approach(page, "pipe_pickup", [4.8, 8]);
  await approach(page, "steel_wool_pickup", [6.1, 8]);
  await approach(page, "rubber_washer_pickup", [7.5, 8]);
  await approach(page, "crafting_bench", [6, 4.5]);
  expect(
    await page.evaluate(() =>
      window.__HIRODORA__.inventory.includes("silencer"),
    ),
  ).toBe(true);
  await approach(page, "warden_safe_interact", [11.3, -8.6]);
  const dial = page.getByRole("button", {
    name: "Turn dial plus 5",
    exact: true,
  });
  for (let i = 0; i < 4; i++) await dial.click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Turn dial plus 1", exact: true })
      .click();
  await page.getByRole("button", { name: "Set tumbler" }).click();
  for (let i = 0; i < 8; i++) await dial.click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Turn dial plus 1", exact: true })
      .click();
  await page.getByRole("button", { name: "Set tumbler" }).click();
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Turn dial minus 5", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Turn dial minus 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Set tumbler" }).click();
  expect(await page.evaluate(() => window.__HIRODORA__.stats.act)).toBe(3);
  await page.reload();
  await page.getByRole("button", { name: "CONTINUE ESCAPE" }).click();
  expect(
    await page.evaluate(() =>
      window.__HIRODORA__.inventory.includes("warden_ledger"),
    ),
  ).toBe(true);
  await page.evaluate(() =>
    window.__HIRODORA__.worldData.guards.forEach((g) => {
      g.state = "knocked_out";
      g.stateTimer = 9999;
    }),
  );
  await approach(page, "sea_gate_interact", [13, 0]);
  for (const angle of [35, -42, 18]) {
    await page.getByLabel("Pick angle").fill(String(angle));
    await page.getByRole("button", { name: "Apply tension" }).click();
  }
  await approach(page, "boulder_rescue_tunnel", [19, 1]);
  await approach(page, "sea_tunnel_exit", [26, 0]);
  await expect(page.getByText("No one left behind.")).toBeVisible();
  expect(await page.evaluate(() => window.__HIRODORA__.endingType)).toBe(
    "brotherhood",
  );
});

test("closed walls block guard sight and movement; all required rooms have routes", async ({
  page,
}) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const e = window.__HIRODORA__;
    const modulePath = "/src/game/navigation.ts";
    const navigation: typeof import("../src/game/navigation") = await import(
      /* @vite-ignore */ modulePath
    );
    const before = e.worldData.guards[0].suspicion;
    e.playerPos = [-6, 0, -6];
    e.worldData.guards[0].position = [-6, 0, 0];
    e.worldData.guards[0].rotationY = Math.PI;
    const internal = e as unknown as {
      obstructed(a: number[], b: number[]): boolean;
      blockers(): Parameters<typeof navigation.findPath>[2];
    };
    const occluded = internal.obstructed(
      e.worldData.guards[0].position,
      e.playerPos,
    );
    e.gameFlags.locker_open = true;
    e.gameFlags.master_door_unlocked = true;
    e.gameFlags.sea_gate_open = true;
    const blocks = internal.blockers();
    const goals: [number, number][] = [
      [-11.4, -4],
      [-8, 9],
      [0, 4],
      [6, 5],
      [11.3, -9],
      [26, 0],
    ];
    return {
      occluded,
      before,
      reachable: goals.map(
        (goal) => navigation.findPath([-10, 0], goal, blocks).length > 0,
      ),
    };
  });
  expect(result.occluded).toBe(true);
  expect(result.reachable).toEqual([true, true, true, true, true, true]);
});

test("mobile joystick, drag look, crouch and release work in portrait and landscape", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await start(page);
  const startPos = await page.evaluate(() => [
    ...window.__HIRODORA__.playerPos,
  ]);
  const joystick = page.getByRole("region", { name: "Movement joystick" });
  const rect = (await joystick.boundingBox())!;
  const touch = await context.newCDPSession(page);
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 35 }],
  });
  await page.waitForTimeout(300);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    await page.evaluate(() => window.__HIRODORA__.playerPos[2]),
  ).toBeLessThan(startPos[2]);
  await page.getByRole("button", { name: "Crouch", exact: true }).tap();
  expect(await page.evaluate(() => window.__HIRODORA__.stats.isCrouching)).toBe(
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Interact", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("production assets load from a subdirectory and the game reloads offline", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3101/Hirodora/");
  await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).click();
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeVisible();
  await context.close();
});
