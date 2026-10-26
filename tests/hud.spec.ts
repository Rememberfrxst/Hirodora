import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});

test("all HUD presets fit a small landscape screen without overlapping controls", async ({ page }) => {
  await page.setViewportSize({width:640,height:360});
  await page.goto("/"); await page.locator("[data-start]").click();
  await page.getByRole("button", {name:"Pause game",exact:true}).click();
  await page.getByRole("button", {name:"Custom HUD",exact:true}).click();
  for(const preset of ["compact","left","large"]) {
    await page.getByLabel("HUD preset").selectOption(preset);
    const boxes = await page.locator(".editor-control").evaluateAll(elements => elements.map(e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
    expect(boxes).toHaveLength(6);
    for(const r of boxes) {expect(r.x).toBeGreaterThanOrEqual(8);expect(r.y).toBeGreaterThanOrEqual(8);expect(r.x+r.w).toBeLessThanOrEqual(632);expect(r.y+r.h).toBeLessThanOrEqual(352);}
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
      const a=boxes[i],b=boxes[j];
      expect(a.x+a.w <= b.x || b.x+b.w <= a.x || a.y+a.h <= b.y || b.y+b.h <= a.y).toBe(true);
    }
  }
});
test("custom HUD saves drag and size, cancels edits, survives reload and resets presets", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.getByRole("button", { name: "Custom HUD", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Custom HUD editor" });
  await editor.getByLabel("HUD preset").selectOption("left");
  const move = editor.getByRole("button", {
    name: "Move Move control",
    exact: true,
  });
  const r = (await move.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 - 35, r.y + r.height / 2 - 25, {
    steps: 5,
  });
  await page.mouse.up();
  await editor.getByLabel("Selected control size").fill("120");
  await editor.getByRole("button", { name: "Save HUD", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hirodora-hud-v1")!),
  );
  expect(saved.controls.move.x).toBeLessThan(89);
  expect(saved.controls.move.size).toBe(120);
  await page
    .getByRole("button", { name: /^Resume escape/ })
    .click();
  const joystick = page.getByRole("region", { name: "Movement joystick" });
  expect((await joystick.boundingBox())!.width).toBe(120);
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sprint", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Crouch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Crouch", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.locator("[data-start]").click();
  expect(
    (await page
      .getByRole("region", { name: "Movement joystick" })
      .boundingBox())!.width,
  ).toBe(120);
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.getByRole("button", { name: "Custom HUD", exact: true }).click();
  await editor.getByLabel("HUD preset").selectOption("large");
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("hirodora-hud-v1")!).preset,
    ),
  ).toBe("left");
});
