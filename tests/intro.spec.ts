import { test, expect } from "@playwright/test";
test("reference menu has three choices and settings tabs change real persisted values", async ({
  page,
}) => {
  // This persistence check initializes the full WebGL scene twice. Allow
  // software-rendered CI more total time without relaxing individual actions.
  test.setTimeout(180_000);
  await page.goto("/");
  await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
  const menu = page.getByRole("main", { name: "Hirodora main menu" });
  await expect(menu.getByRole("button")).toHaveCount(3);
  await expect(
    menu.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await menu.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Graphics", exact: true }).click();
  expect(
    await page
      .getByRole("tab", { name: "Graphics", exact: true })
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(96, 158, 44)");
  await page.getByLabel("FOV", { exact: true }).fill("82");
  await page.getByLabel("Screen Scale", { exact: true }).fill("0.6");
  expect(
    await page.evaluate(() => (window.__HIRODORA__ as any).camera.fov),
  ).toBe(82);
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await page.getByLabel("SFX", { exact: true }).fill("0.35");
  await page.getByRole("button", { name: "Back from settings" }).click();
  await page.reload();
  await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
  expect(
    await page.evaluate(() => (window.__HIRODORA__ as any).camera.fov),
  ).toBe(82);
});
test("new-game cinematic fires once, pauses safely, closes gate and releases a playable checkpoint", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await expect(page.getByRole("button", { name: /Skip intro/ })).toBeVisible();
  const result = await page.evaluate(async () => {
    const e = window.__HIRODORA__ as any;
    const modulePath = "/src/game/audio.ts";
    const { sound } = await import(modulePath);
    let shots = 0;
    const original = sound.playGunshot.bind(sound);
    sound.playGunshot = (p: any) => {
      shots++;
      original(p);
    };
    e.overlayOpen = true;
    e.cinematic.start();
    const screen = e.camera.position
      .clone()
      .set(-5.25, 1.3, -4.4)
      .project(e.camera);
    const startsVisible = Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1;
    e.updateIntro(12.05);
    e.updateIntro(0.2);
    e.pauseGame();
    const stopped = e.cinematic.time;
    e.updateIntro(2);
    const paused = e.cinematic.time === stopped;
    e.resumeGame();
    e.overlayOpen = true;
    for (let i = 0; i < 260; i++) e.updateIntro(0.05);
    return {
      shots,
      startsVisible,
      paused,
      state: e.gameState,
      door: e.worldData.doors.get("cell_47_door").rotation.y,
      pose: e.worldData.opening.body.userData.animation,
      done: e.gameFlags.intro_done,
      examining: e.worldData.guards[0].examining,
      inventory: e.inventory,
    };
  });
  expect(result).toEqual({
    shots: 1,
    startsVisible: true,
    paused: true,
    state: "playing",
    door: 0,
    pose: "Death",
    done: true,
    examining: true,
    inventory: [],
  });
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.getByRole("button", { name: "To main menu", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Exit to the main menu?" })
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: /Skip intro/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeVisible();
});
test("skipping intro reaches the same corpse/key/closed-gate state on mobile", async ({
  browser,
}) => {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto("/");
  await page.locator("[data-start]").tap();
  await page.getByRole("button", { name: /Skip intro/ }).tap();
  expect(
    await page.evaluate(() => {
      const e = window.__HIRODORA__;
      return {
        state: e.gameState,
        pose: e.worldData.opening.body.userData.animation,
        door: e.worldData.doors.get("cell_47_door")!.rotation.y,
      };
    }),
  ).toEqual({ state: "playing", pose: "Death", door: 0 });
  await page.close();
});
