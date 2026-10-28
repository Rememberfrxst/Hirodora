import { test, expect } from "@playwright/test";
import { openHudEditor, skipOpening } from "./helpers";

test("loading reports actual unfinished work, prevents start, then releases a complete scene", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(/first-person-arm\.glb$/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  const loading = page.getByRole("region", { name: "Loading game" });
  await expect(loading).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Game assets loaded" }),
  ).toHaveAttribute("value", "2", { timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "New game", exact: true }),
  ).toBeDisabled();
  const state = await page.evaluate(() => ({
    ready: window.__HIRODORA__.guardsReady,
    stage: window.__HIRODORA__.loadingCompleted,
  }));
  expect(state).toEqual({ ready: false, stage: 2 });
  release();
  await expect(loading).toBeHidden({ timeout: 90000 });
  await expect(page.locator("[data-start]")).toBeEnabled();
  expect(await page.evaluate(() => window.__HIRODORA__.loadingCompleted)).toBe(
    8,
  );
});

test("clean HUD, larger toilet bolts, anatomical pistol grip and pooled shot effects", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const r = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = false;
    e.clearInput();
    e.playerPos = [-39, 0, 4];
    e.camera.position.set(-39, 1.65, 4);
    e.camera.lookAt(-39, 1.65, 10);
    e.inventory = ["pistol_10mm", "screwdriver", "cell_key"];
    e.equippedItem = "pistol_10mm";
    e.stats.pistolAmmo = 6;
    e.renderFrame(0.3);
    e.emitChange();
    const f = e.firstPerson,
      bolts = e.worldData.opening.toilet.userData.bolts;
    f.shoot();
    e.renderFrame(0.016);
    const shot = {
      flash: f.muzzleFlash.visible,
      smoke: f.muzzleSmoke.visible,
      light: f.muzzleLight.intensity,
      kick: f.root.rotation.x,
    };
    for (let i = 0; i < 30; i++) e.renderFrame(0.016);
    return {
      shot,
      ended: !f.muzzleFlash.visible && !f.muzzleSmoke.visible,
      bolts: bolts.map((b: any) => ({
        name: b.name,
        washer: b.children.length,
      })),
      socket: f.items.get("pistol_10mm").position.y,
      left: f.leftMesh.visible,
    };
  });
  expect(r.shot.flash && r.shot.smoke).toBe(true);
  expect(r.shot.light).toBeGreaterThan(0);
  expect(r.shot.kick).toBeGreaterThan(0.03);
  expect(r.ended).toBe(true);
  expect(r.bolts).toHaveLength(4);
  expect(
    r.bolts.every((b: {name:string; washer:number}) => b.name === "ToiletMountingBolt" && b.washer === 2),
  ).toBe(true);
  expect(r.socket).toBe(0.15);
  expect(r.left).toBe(false);
  await expect(page.locator(".stealth-meters,.satchel-button")).toHaveCount(0);
  const hud = await page
    .locator(".weapon-hud")
    .evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      opacity: getComputedStyle(el).opacity,
    }));
  expect(hud).toEqual({ bg: "rgba(3, 4, 3, 0.5)", opacity: "1" });
  const hp = await page.locator(".health-hud").boundingBox();
  expect(hp!.y + hp!.height).toBeGreaterThan(680);
  expect(errors).toEqual([]);
});

test.describe("mobile HUD", () => {
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  test("ammo card drags, resizes and persists; mobile uses the 1K PBR maps", async ({
    page,
  }) => {
    const materialRequests: string[] = [];
    page.on("request", (r) => {
      if (/rock16.*webp/.test(r.url()) && !r.url().includes("import"))
        materialRequests.push(r.url());
    });
    await page.goto("/");
    await page.locator("[data-start]").click();
    await skipOpening(page);
    expect(materialRequests.some((x) => x.includes("mobile-normal"))).toBe(
      true,
    );
    expect(materialRequests.some((x) => /rock16-normal\.webp$/.test(x))).toBe(
      false,
    );
    await page.getByRole("button", { name: "Pause game", exact: true }).tap();
    await openHudEditor(page);
    const card = page.getByRole("button", {
        name: "Move Gun info control",
        exact: true,
      }),
      box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(400, 130, { steps: 6 });
    await page.mouse.up();
    await page.getByLabel("Selected control size").fill("170");
    await page.getByRole("button", { name: "Save HUD", exact: true }).click();
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("hirodora-hud-v1")!).weapon,
    );
    expect(saved.x).toBeGreaterThan(40);
    expect(saved.size).toBe(170);
    await page.getByRole("button", { name: "Back from settings" }).click();
    await page
      .getByRole("button", { name: "Resume escape", exact: true })
      .click();
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      e.inventory = ["pistol_10mm"];
      e.equippedItem = "pistol_10mm";
      e.emitChange();
    });
    const rendered = (await page.locator(".weapon-hud").boundingBox())!;
    expect(rendered.x).toBeGreaterThan(280);
    expect(rendered.width).toBe(170);
    await page.reload();
    await page.locator("[data-start]").click();
    await skipOpening(page);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hirodora-hud-v1")!).weapon,
      ),
    ).toEqual(saved);
  });
});
