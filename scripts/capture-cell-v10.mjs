import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] || "after",
  directory = `docs/screenshots/cell-v10/${phase}`;
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
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3510");
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
  const views = [
    ["cell47", [-5.9, 1.6, -5.7], [-6.25, 1.25, -9.2]],
    ["bunk", [-5.85, 1.6, -6.8], [-4.25, 1.12, -8.4]],
    ["toilet", [-6.5, 1.35, -8.8], [-8.0, 0.55, -9.6]],
    ["sink", [-6.3, 1.6, -6.5], [-8.15, 1, -7.8]],
    ["window", [-6, 1.6, -6.2], [-6.8, 3.05, -10.4]],
    ["cell46", [-10.6, 1.6, -5.8], [-12.1, 1.2, -8.7]],
    ["corridor", [-6, 1.6, 0.5], [7, 1.7, 0]],
  ];
  const gameplay = await page.evaluate(() => {
    const e = window.__HIRODORA__;
    return {
      colliders: e.worldData.colliders.map((b) => [
        ...b.min.toArray(),
        ...b.max.toArray(),
      ]),
      doors: [...e.worldData.doorColliders].map(([id, b]) => [
        id,
        ...b.min.toArray(),
        ...b.max.toArray(),
      ]),
      interactions: e.worldData.interactables.map(
        ({ id, position, radius, actionType, actionRequiredItem }) => ({
          id,
          position,
          radius,
          actionType,
          actionRequiredItem,
        }),
      ),
    };
  });
  const renders = [];
  for (const [name, position, target] of views) {
    await page.evaluate(
      ({ position, target }) => {
        const e = window.__HIRODORA__;
        e.camera.position.set(...position);
        e.camera.lookAt(...target);
        e.camera.updateMatrixWorld();
        for (let i = 0; i < 60; i++)
          e.practicalLights.update(e.camera.position, 0.05);
        e.scene.updateMatrixWorld(true);
        e.renderer.render(e.scene, e.camera);
      },
      { position, target },
    );
    await page.screenshot({ path: `${directory}/${name}.png` });
    renders.push(
      await page.evaluate(() => {
        const e = window.__HIRODORA__;
        return {
          calls: e.renderer.info.render.calls,
          triangles: e.renderer.info.render.triangles,
        };
      }),
    );
  }
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify({ phase, views, gameplay, renders, errors }, null, 2) + "\n",
  );
  if (phase === "after") {
    await page.evaluate(() => {
      const e = window.__HIRODORA__;
      e.gameFlags.toilet_unbolted = true;
      e.gameFlags.passage_open = true;
      e.openingProgress.toilet = 1;
      e.syncWorld();
      e.stats.subtitle = null;
      e.emitChange();
      e.camera.position.set(-6.4, 1.4, -6.7);
      e.camera.lookAt(-8, 0.8, -7.7);
      e.camera.updateMatrixWorld();
      e.scene.updateMatrixWorld(true);
      e.renderer.render(e.scene, e.camera);
    });
    await page.screenshot({ path: `${directory}/toilet-parked.png` });
  }
  if (errors.length) throw Error(errors.join("\n"));
  console.log(`Captured ${phase}: ${views.length} matched views.`);
} finally {
  await browser.close();
}
