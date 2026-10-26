import { test, expect, Page } from "@playwright/test";
import type { GameEngine } from "../src/game/engine";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
declare global {
  interface Window {
    __HIRODORA__: GameEngine;
  }
}

async function start(page: Page) {
  await page.goto("/");
  // Exercise the original campaign as a migrated v2 checkpoint. The new opening
  // has separate end-to-end coverage in opening.spec.ts.
  await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
  await page.evaluate(() =>
    window.__HIRODORA__.restoreCheckpoint({
      id: "legacy",
      name: "Cell 47",
      playerPosition: [-6, 0, -6],
      playerRotationY: 0,
      act: 1,
      inventory: ["small_key", "note_from_unknown"],
      flags: {},
    }),
  );
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
  const surfaces = await page
    .locator(
      ".objective, .stealth-state, .hud-tools button, .stealth-meters, .satchel-button, .subtitle",
    )
    .evaluateAll((elements) =>
      elements.map((element) => ({
        color: getComputedStyle(element).backgroundColor,
        image: getComputedStyle(element).backgroundImage,
      })),
    );
  expect(
    surfaces.every(
      (surface) =>
        surface.color === "rgba(0, 0, 0, 0)" && surface.image === "none",
    ),
  ).toBe(true);
  const before = await page.evaluate(() => window.__HIRODORA__.playerPos[2]);
  await page.keyboard.down("KeyW");
  try {
    await expect
      .poll(() => page.evaluate(() => window.__HIRODORA__.playerPos[2]))
      .toBeLessThan(before);
  } finally {
    await page.keyboard.up("KeyW");
  }
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
  await page.getByLabel("Officer quality").selectOption("mobile");
  expect(await page.evaluate(() => window.__HIRODORA__.guardQuality)).toBe(
    "mobile",
  );
  await page.getByRole("button", { name: "Resume escape" }).click();
  expect(errors).toEqual([]);
});

test("rigged officers animate independently, patrol, switch LOD and retain non-lethal dart hits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (
      msg.type() === "warning" &&
      /PropertyBinding|No target node/.test(msg.text())
    )
      errors.push(msg.text());
  });
  await start(page);
  const result = await page.evaluate(async () => {
    const e = window.__HIRODORA__ as any;
    const Bounds = e.worldData.colliders[0].constructor;
    e.overlayOpen = true;
    e.stats.isInHidingSpot = true;
    e.stats.noiseLevel = 0;
    const g = e.worldData.guards[0],
      actor = e.guardActors.get(g.id);
    g.position = [-5, 0, 0];
    g.rotationY = Math.PI / 2;
    g.state = "patrol";
    g.currentWaypoint = 1;
    actor.root.rotation.y = Math.PI / 2;
    e.camera.position.set(-5, 1.6, 3);
    e.camera.lookAt(-5, 1, 0);
    e.camera.updateMatrixWorld();
    const initial = g.position[0];
    for (let i = 0; i < 60; i++) e.updateGuards(1 / 60);
    const moved = g.position[0] - initial,
      patrolClip = actor.animation;
    const a = actor.views.get("hero"),
      b = e.guardActors.get(e.worldData.guards[1].id).views.get("hero");
    const meshes = (root: any) => {
      const list: any[] = [];
      root.traverse((o: any) => {
        if (o.isSkinnedMesh) list.push(o);
      });
      return list;
    };
    const am = meshes(a.root)[0],
      bm = meshes(b.root)[0];
    const sharedGeometry = am.geometry === bm.geometry,
      separateSkeleton =
        am.skeleton !== bm.skeleton &&
        am.skeleton.bones[0] !== bm.skeleton.bones[0];
    const leg = a.root.getObjectByName("LeftLeg");
    const before = leg.quaternion.clone();
    actor.update(g, 1.3, 0.25, e.camera, "desktop", false);
    const jointMoved = before.angleTo(leg.quaternion) > 0.01;
    actor.update(g, 1.3, 0.05, e.camera, "mobile", true);
    const mobileTier = actor.tier;
    e.camera.position.set(-5, 1.6, 23);
    e.camera.lookAt(-5, 1, 0);
    e.camera.updateMatrixWorld();
    actor.update(g, 1.3, 0.05, e.camera, "desktop", false);
    const farTier = actor.tier;
    g.position = [-5, 0, 0];
    g.rotationY = 0;
    g.state = "patrol";
    actor.root.rotation.y = 0;
    e.playerPos = [-5, 0, 2];
    e.camera.position.set(-5, 1.55, 2);
    e.camera.lookAt(-5, 1.1, 0);
    e.camera.updateMatrixWorld();
    actor.update(g, 0, 0.1, e.camera, "desktop", false);
    e.scene.updateMatrixWorld(true);
    e.equippedItem = "dart_pistol";
    e.inventory.push("dart_pistol");
    e.stats.dartAmmo = 3;
    e.overlayOpen = false;
    e.fireDart();
    e.overlayOpen = true;
    const dartState = g.state;
    for (let i = 0; i < 40; i++)
      actor.update(g, 0, 0.05, e.camera, "desktop", false);
    e.scene.updateMatrixWorld(true);
    const collapseBounds = new Bounds().setFromObject(actor.hitTarget, true);
    const collapseClip = actor.animation;
    e.restoreCheckpoint({
      name: "Cell 47",
      act: 1,
      playerPosition: [-6, 0, -6],
      playerRotationY: 0,
      inventory: ["small_key", "note_from_unknown"],
      flags: {},
    });
    actor.update(g, 0, 0.05, e.camera, "desktop", false);
    return {
      moved,
      patrolClip,
      sharedGeometry,
      separateSkeleton,
      jointMoved,
      mobileTier,
      farTier,
      dartState,
      collapseClip,
      collapseHeight: collapseBounds.max.y - collapseBounds.min.y,
      reset: g.state,
    };
  });
  expect(result.moved).toBeGreaterThan(1.1);
  expect(result.patrolClip).toBe("Walk");
  expect(
    result.sharedGeometry && result.separateSkeleton && result.jointMoved,
  ).toBe(true);
  expect(result.mobileTier).toBe("mobile");
  expect(result.farTier).toBe("distant");
  expect(result.dartState).toBe("knocked_out");
  expect(result.collapseClip).toBe("Collapse");
  expect(result.collapseHeight).toBeLessThan(0.8);
  expect(result.reset).toBe("patrol");
  expect(errors).toEqual([]);
});

test("failed officer downloads block play and can be retried without a primitive fallback", async ({
  page,
}) => {
  await page.route("**/*.glb", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry model download" }),
  ).toBeVisible();
  await expect(page.locator("[data-start]")).toBeDisabled();
  expect(await page.evaluate(() => window.__HIRODORA__.guardActors.size)).toBe(
    0,
  );
  await page.unroute("**/*.glb");
  await page.getByRole("button", { name: "Retry model download" }).click();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await page.locator("[data-start]").click();
  await expect(
    page.getByRole("button", { name: "Pause game", exact: true }),
  ).toBeVisible();
});

test("authored environment loads locally and graphics presets preserve collision and gameplay state", async ({
  page,
}) => {
  await start(page);
  const baseline = JSON.parse(
    await readFile(
      new URL(
        "../docs/screenshots/environment/before/capture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const geometry = await page.evaluate(() => {
    const e = window.__HIRODORA__;
    return JSON.stringify({
      colliders: e.worldData.colliders.map((b) => [
        ...b.min.toArray(),
        ...b.max.toArray(),
      ]),
      interactions: e.worldData.interactables.map(
        ({ id, position, radius, actionRequiredItem, actionType }) => ({
          id,
          position,
          radius,
          actionRequiredItem,
          actionType,
        }),
      ),
      doors: [...e.worldData.doorColliders].map(([id, b]) => [
        id,
        ...b.min.toArray(),
        ...b.max.toArray(),
      ]),
    });
  });
  const current = JSON.parse(geometry);
  // The opening deliberately adds cells, a shared-wall aperture and movable
  // furniture. Retain exact regression checks on the rest of the campaign.
  const unchanged = (b: number[]) => b[0] >= -3 || (b[2] >= 1.8 && b[3] > -16);
  expect(current.colliders.filter(unchanged)).toEqual(
    baseline.gameplay.colliders.filter(unchanged),
  );
  for (const interaction of baseline.gameplay.interactions)
    expect(
      current.interactions.find((o: any) => o.id === interaction.id),
    ).toEqual(interaction);
  expect(
    current.doors.filter(([id]: [string]) =>
      baseline.gameplay.doors.some(([old]: [string]) => old === id),
    ),
  ).toEqual(baseline.gameplay.doors);
  expect(
    current.doors.filter(([id]: [string]) => /^cell_4[2-5]_door$/.test(id)),
  ).toHaveLength(4);
  const before = await page.evaluate(() => ({
    position: window.__HIRODORA__.playerPos,
    inventory: window.__HIRODORA__.inventory,
    flags: window.__HIRODORA__.gameFlags,
  }));
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  const assets = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    const names: string[] = [];
    e.scene.traverse((o: any) => {
      if (o.name.startsWith("CellAsset_")) names.push(o.name);
    });
    return names;
  });
  expect(assets.filter((n) => n === "CellAsset_Bunk")).toHaveLength(6);
  expect(assets).toContain("CellAsset_Toilet");
  expect(assets).toContain("CellAsset_Sink");
  expect(assets.filter((n) => n === "CellAsset_Window")).toHaveLength(2);
  for (const preset of ["low", "medium", "high", "ultra"]) {
    await page.getByLabel("Graphics preset").selectOption(preset);
    const config = await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      return {
        preset: e.graphicsPreset,
        shadows: e.renderer.shadowMap.enabled,
        windowShadow: e.worldData.windowLight.castShadow,
        size: e.guardKey.shadow.mapSize.x,
        position: e.playerPos,
        inventory: e.inventory,
        flags: e.gameFlags,
      };
    });
    expect(config.preset).toBe(preset);
    expect(config.shadows).toBe(["high", "ultra"].includes(preset));
    expect(config.windowShadow).toBe(config.shadows);
    expect(config.size).toBe(preset === "ultra" ? 2048 : 1024);
    expect({
      position: config.position,
      inventory: config.inventory,
      flags: config.flags,
    }).toEqual(before);
  }
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

test("mobile landscape controls work and portrait rotation safely pauses without stuck input", async ({
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
  await page.getByRole("button", { name: "Jump", exact: true }).tap();
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.jumpHeight))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__HIRODORA__.jumpHeight))
    .toBe(0);
  await page.getByRole("button", { name: "Sprint", exact: true }).tap();
  expect(await page.evaluate(() => window.__HIRODORA__.touchSprint)).toBe(true);
  await expect(
    page.getByRole("button", { name: "Sprint", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const actions = await page
    .locator(".custom-actions button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const r = button.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
  expect(actions.length).toBeGreaterThanOrEqual(4);
  expect(actions.every((rect) => rect.w >= 44 && rect.h >= 44)).toBe(true);
  for (let i = 0; i < actions.length; i++)
    for (let j = i + 1; j < actions.length; j++) {
      const a = actions[i],
        b = actions[j];
      expect(
        a.x + a.w <= b.x ||
          b.x + b.w <= a.x ||
          a.y + a.h <= b.y ||
          b.y + b.h <= a.y,
      ).toBe(true);
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("dialog", { name: "Turn your phone sideways." }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__HIRODORA__.gameState)).toBe(
    "paused",
  );
  expect(await page.evaluate(() => window.__HIRODORA__.touchSprint)).toBe(
    false,
  );
  const pausedPosition = await page.evaluate(() => [
    ...window.__HIRODORA__.playerPos,
  ]);
  await page.keyboard.press("KeyP");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__HIRODORA__.gameState)).toBe(
    "paused",
  );
  expect(await page.evaluate(() => window.__HIRODORA__.playerPos)).toEqual(
    pausedPosition,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("dialog", { name: "Turn your phone sideways." }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Resume escape" }).tap();
  await expect(
    page.getByRole("button", { name: "Interact", exact: true }),
  ).toBeInViewport();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__HIRODORA__.playerPos)).toEqual(
    pausedPosition,
  );
  const canvas = await page.locator("canvas").boundingBox();
  expect(canvas!.width).toBe(844);
  expect(canvas!.height).toBe(390);
  expect(
    await page.evaluate(() => (window.__HIRODORA__ as any).camera.aspect),
  ).toBeCloseTo(844 / 390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("portrait mobile launch gates play and handles denied fullscreen/unsupported rotation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: () =>
        Promise.reject(
          new DOMException("Fullscreen denied", "NotAllowedError"),
        ),
    });
    Object.defineProperty(screen, "orientation", {
      configurable: true,
      value: { type: "portrait-primary" },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Turn your phone sideways." }),
  ).toBeVisible();
  await expect(page.locator(".game-content")).toHaveAttribute("inert", "");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.__HIRODORA__.gameState)).toBe(
    "title",
  );
  await page.getByRole("button", { name: "Try fullscreen & landscape" }).tap();
  await expect(page.getByRole("status")).toContainText(
    "Automatic rotation is not supported",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".rotate-screen")).toHaveCount(0);
  await page.locator("[data-start]").tap();
  await expect(
    page.getByRole("button", { name: "Jump", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
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

test("downloaded standalone HTML runs in an offline browser without network requests", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    requests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await context.setOffline(true);
  // The managed test browser blocks file:// navigation by administrator policy.
  // Load the unmodified downloaded document into an offline blank page to validate its self-containment.
  await page.setContent(
    await readFile(resolve(`downloads/Hirodora-${version}.html`), "utf8"),
  );
  await page.getByRole("button", { name: "BEGIN THE ESCAPE" }).tap();
  await expect(
    page.getByRole("button", { name: "Jump", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause game", exact: true }).tap();
  await expect(page.getByText("The night can wait.")).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
