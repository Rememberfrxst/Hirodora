import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "docs/screenshots/assets-v11";
await mkdir(directory, { recursive: true });
const views = [
  ["01-cell47", [-5.9, 1.6, -5.7], [-6.25, 1.25, -9.2]],
  ["02-table", [-5.85, 1.4, -6.8], [-4.25, 0.65, -8.4]],
  ["03-toilet", [-6.5, 1.35, -8.8], [-8.0, 0.55, -9.6]],
  ["04-screwdriver", [-4.9, 0.65, -9.25], [-4.45, 0.07, -8.7]],
  ["05-cellblock", [-6, 1.6, 0.5], [-20, 1.65, -3]],
  ["06-mobile", [-5.9, 1.6, -5.7], [-6.25, 1.25, -9.2]],
];
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const results = [],
    errors = [];
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 960, height: 450 }
        : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:3600");
    if (!(await page.evaluate(() => !!window.__HIRODORA__)))
      throw Error(
        "Matched-camera capture requires the development server; production deliberately hides its inspection API.",
      );
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
    for (const [name, position, target] of views.filter(
      (v) => v[0].includes("mobile") === mobile,
    )) {
      const metrics = await page.evaluate(
        ({ name, position, target }) => {
          const e = window.__HIRODORA__;
          e.openingProgress.bed = name.includes("screwdriver") ? 1 : 0;
          e.gameFlags.bed_moved = name.includes("screwdriver");
          e.syncWorld();
          e.camera.position.set(...position);
          e.camera.lookAt(...target);
          e.camera.updateMatrixWorld();
          for (let i = 0; i < 60; i++)
            e.practicalLights.update(e.camera.position, 0.05);
          e.scene.updateMatrixWorld(true);
          e.renderer.render(e.scene, e.camera);
          return {
            calls: e.renderer.info.render.calls,
            triangles: e.renderer.info.render.triangles,
            colliders: e.worldData.colliders.map((b) => [
              ...b.min.toArray(),
              ...b.max.toArray(),
            ]),
            interactions: e.worldData.interactables.map(
              ({ id, radius, actionType, actionRequiredItem }) => ({
                id,
                radius,
                actionType,
                actionRequiredItem,
              }),
            ),
          };
        },
        { name, position, target },
      );
      await page.screenshot({ path: `${directory}/${name}.png` });
      results.push({ name, position, target, mobile, ...metrics });
    }
    await page.close();
  }
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify({ views, results, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    `Captured exactly ${results.length} real game views in ${directory}`,
  );
} finally {
  await browser.close();
}
