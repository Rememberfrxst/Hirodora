import { test, expect } from "@playwright/test";
import { skipOpening } from "./helpers";

test("reference corridor, fog and gloved grips retain saved equipment through quick slots", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const data = await page.evaluate(() => {
    const e = window.__HIRODORA__ as any;
    cancelAnimationFrame(e.frameId);
    e.clearInput();
    e.overlayOpen = true;
    e.inventory = ["cell_key", "screwdriver", "spoon"];
    e.equippedItem = "screwdriver";
    e.renderFrame(0.3);
    e.emitChange();
    const hand = e.firstPerson.arm.getObjectByName("RightHand");
    const wrist = hand.quaternion.toArray();
    const driver = e.firstPerson.items.get("screwdriver");
    const local = driver.position.toArray();
    // Exercise the actual equipment-update path repeatedly, without queuing
    // forty complete multi-million-triangle prison renders in one JS task.
    for (let i = 0; i < 20; i++) {
      e.firstPerson.update("cell_key", 0, 0.3, false, true, false, true);
      e.firstPerson.update("screwdriver", 0, 0.3, false, true, false, true);
    }
    e.renderFrame(0.3);
    const stable = hand.quaternion
      .toArray()
      .every((v: number, i: number) => Math.abs(v - wrist[i]) < 1e-9);
    const heldScales = [
      "pipe",
      "rubber_washer",
      "lockpick",
      "stethoscope",
      "steel_wool",
    ].map((id) => e.firstPerson.items.get(id).scale.x);
    const pistol = e.firstPerson.items.get("dart_pistol"),
      forward = e.camera.position
        .clone()
        .set(0, 0, 1)
        .applyQuaternion(pistol.quaternion)
        .toArray();
    const materials: string[] = [];
    e.firstPerson.arm.traverse((o: any) => {
      if (o.isMesh)
        materials.push(
          ...(Array.isArray(o.material) ? o.material : [o.material]).map(
            (m: any) => m.name,
          ),
        );
    });
    const north = e.worldData.cells.find((c: any) => c.number === 47),
      south = e.worldData.cells.find((c: any) => c.number === 48);
    e.overlayOpen = false;
    e.emitChange();
    return {
      width: south.front - north.front,
      depth: south.rear - south.front,
      fog: e.scene.fog.density,
      stable,
      materials,
      heldScales,
      forward,
      local,
      cells: e.worldData.cells.length,
      guards: e.worldData.guards.length,
    };
  });
  expect(data.width).toBe(12);
  expect(data.depth).toBe(9.5);
  expect(data.fog).toBe(0.028);
  expect(data.stable).toBe(true);
  expect(data.materials).toContain("Black leather glove");
  expect(data.heldScales).toEqual([0.5, 0.25, 0.5, 0.5, 0.3]);
  expect(data.forward[0]).toBeCloseTo(0);
  expect(data.forward[1]).toBeCloseTo(1);
  expect(data.forward[2]).toBeCloseTo(0);
  expect(data.local).toEqual([-0.028, 0.11, 0.09]);
  expect(data.cells).toBe(48);
  expect(data.guards).toBe(9);
  const pockets = page.getByRole("navigation", { name: "Carried items" });
  await expect(pockets.locator(".pocket-item")).toHaveCount(3);
  await expect(pockets.locator("img")).toHaveCount(3);
  await pockets
    .getByRole("button", { name: "Equip Cell key", exact: true })
    .click();
  expect(await page.evaluate(() => window.__HIRODORA__.equippedItem)).toBe(
    "cell_key",
  );
  await pockets
    .getByRole("button", { name: "Unequip Cell key", exact: true })
    .click();
  expect(await page.evaluate(() => window.__HIRODORA__.equippedItem)).toBe(
    null,
  );
  await pockets
    .getByRole("button", { name: "Equip Screwdriver", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hirodora-checkpoint-v3") || "{}")
          .equippedItem,
    ),
  ).toBe("screwdriver");
});

test.describe("mobile pocket HUD", () => {
  test.use({
    viewport: { width: 640, height: 360 },
    isMobile: true,
    hasTouch: true,
  });
  test("mobile pocket icons remain tappable and clear of left controls on small landscape screens", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-start]").click();
    await skipOpening(page);
    await page.evaluate(() => {
      const e = window.__HIRODORA__ as any;
      cancelAnimationFrame(e.frameId);
      e.inventory = ["cell_key", "screwdriver"];
      e.emitChange();
    });
    const pockets = page.getByRole("navigation", { name: "Carried items" });
    const box = (await pockets.boundingBox())!,
      stick = (await page
        .getByRole("region", { name: "Movement joystick" })
        .boundingBox())!;
    expect(box.y).toBeGreaterThan(stick.y + stick.height);
    expect(box.x + box.width).toBeLessThan(640);
    expect(box.y + box.height).toBeLessThanOrEqual(360);
    await pockets
      .getByRole("button", { name: "Equip Screwdriver", exact: true })
      .tap();
    expect(await page.evaluate(() => window.__HIRODORA__.equippedItem)).toBe(
      "screwdriver",
    );
    expect(
      await page.evaluate(() => (window.__HIRODORA__ as any).touchMove),
    ).toEqual([0, 0]);
  });
});
