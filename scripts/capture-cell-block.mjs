import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "docs/screenshots/block-v12";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [],
  captures = [];
async function start(mobile = false) {
  const page = await browser.newPage({
    viewport: mobile
      ? { width: 960, height: 450 }
      : { width: 1280, height: 800 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3611");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.stats.subtitle = null;
    e.reducedMotion = true;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.emitChange();
  });
  return page;
}
async function pose(page, position, target) {
  return page.evaluate(
    ({ position, target }) => {
      const e = window.__HIRODORA__;
      e.camera.position.set(...position);
      e.camera.lookAt(...target);
      e.camera.updateMatrixWorld();
      for (let i = 0; i < 60; i++)
        e.practicalLights.update(e.camera.position, 0.05);
      e.scene.updateMatrixWorld(true);
      e.renderer.render(e.scene, e.camera);
      let batches = 0,
        instances = 0;
      e.scene.traverse((o) => {
        if (o.isInstancedMesh) {
          batches++;
          instances += o.count;
        }
      });
      return {
        position,
        target,
        calls: e.renderer.info.render.calls,
        triangles: e.renderer.info.render.triangles,
        batches,
        instances,
      };
    },
    { position, target },
  );
}
async function save(page, name, details = {}) {
  await page.screenshot({ path: `${directory}/${name}.png` });
  captures.push({ name, ...details });
}
try {
  const page = await start();
  await save(
    page,
    "01-wide-corridor",
    await pose(page, [-5.8, 1.65, 2], [-60, 1.5, 1.5]),
  );
  await save(
    page,
    "02-opposite-cells",
    await pose(page, [-23, 1.65, 0.6], [-22.5, 1.35, 10]),
  );
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.gameFlags.cell46_reached = true;
    e.gameFlags.cell_46_open = true;
    e.gameFlags.passage_open = true;
    e.gameFlags.toilet_unbolted = true;
    e.openingProgress.toilet = 1;
    e.syncWorld();
    e.emitChange();
  });
  await save(
    page,
    "03-cell46-gate",
    await pose(page, [-12.5, 1.6, -8.5], [-10.5, 1.3, -2]),
  );
  await page.keyboard.press("KeyM");
  await page.getByRole("button", { name: "Close map" }).waitFor();
  await save(page, "04-floor-plan", {
    description: "Actual floor-plan UI uses the same 24-cell layout metadata",
  });
  await page.getByRole("button", { name: "Close map" }).click();
  await pose(page, [-6.1, 1.6, -5.4], [-6, 1.5, -1]);
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.getByRole("button", { name: "To main menu", exact: true }).click();
  await page.getByRole("dialog", { name: "Exit to the main menu?" }).waitFor();
  await save(page, "06-main-menu-confirmation", {
    description:
      "Real Yes/No confirmation over paused gameplay; defaults to No",
  });
  const mobile = await start(true);
  await pose(mobile, [-5.9, 1.6, -5.7], [-6.25, 1.25, -9.2]);
  await mobile.getByRole("button", { name: "Ask Munshi for a hint" }).click();
  await save(mobile, "05-mobile-controls", {
    viewport: { width: 960, height: 450 },
    description:
      "Reference-matched vector arrow/bulb icons; original desktop-path PNGs are unavailable",
  });
  const cells = await page.evaluate(() => window.__HIRODORA__.worldData.cells);
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify(
      {
        cells,
        captures,
        errors,
        characterStatus:
          "Original characters retained: warrior exceeds 32 MiB transfer limit; police upload lacks source/license and skin rig. Not claimed as integrated.",
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    `Captured exactly ${captures.length} gameplay/UI images in ${directory}.`,
  );
} finally {
  await browser.close();
}
