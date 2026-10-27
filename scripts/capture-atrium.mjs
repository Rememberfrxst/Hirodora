import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "docs/screenshots/atrium-v13";
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
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3614");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.stats.subtitle = null;
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.emitChange();
  });
  return page;
}
async function save(page, name, position, target, item = null) {
  const result = await page.evaluate(
    ({ position, target, item }) => {
      const e = window.__HIRODORA__;
      e.camera.position.set(...position);
      e.camera.lookAt(...target);
      e.camera.updateMatrixWorld();
      e.equippedItem = item;
      if (item && !e.inventory.includes(item)) e.inventory.push(item);
      e.stats.subtitle = null;
      for (let i = 0; i < 60; i++)
        e.practicalLights.update(e.camera.position, 0.05);
      for (let i = 0; i < 20; i++)
        for (const g of e.worldData.guards)
          e.guardActors
            .get(g.id)
            ?.update(g, 0, 1 / 30, e.camera, "auto", e.mobile);
      e.scene.updateMatrixWorld(true);
      e.renderFrame(0.3);
      e.emitChange();
      return {
        position,
        target,
        item,
        calls: e.drawCalls,
        triangles: e.triangles,
      };
    },
    { position, target, item },
  );
  await page.screenshot({ path: `${directory}/${name}.png` });
  captures.push({ name, ...result });
}
try {
  const page = await start();
  // Camera identical to the pre-change 01-wide-corridor capture.
  await save(page, "01-atrium", [-5.8, 1.65, 2], [-60, 1.5, 1.5]);
  // Match the original Cell 46 gate's camera AND staged open-gate state.
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.gameFlags.cell46_reached = true;
    e.gameFlags.cell_46_open = true;
    e.gameFlags.passage_open = true;
    e.gameFlags.toilet_unbolted = true;
    e.openingProgress.toilet = 1;
    e.syncWorld();
  });
  await save(
    page,
    "02-independent-gates",
    [-12.5, 1.6, -8.5],
    [-10.5, 1.3, -2],
  );
  await save(
    page,
    "03-redeemed-warrior",
    [-10.7, 1.6, -4.7],
    [-10.7, 1.05, -6.6],
  );
  await save(
    page,
    "04-screwdriver-in-hand",
    [-6.1, 1.6, -5.4],
    [-6, 1.45, -1],
    "screwdriver",
  );
  await save(page, "05-lower-hall", [-18, -1.55, 5], [-4, 0, 5]);
  const mobile = await start(true);
  await save(
    mobile,
    "06-mobile-key",
    [-5.8, 1.65, 2],
    [-35, 1.3, 5],
    "cell_key",
  );
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify({ captures, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    `Captured ${captures.length} real rendered views in ${directory}`,
  );
} finally {
  await browser.close();
}
