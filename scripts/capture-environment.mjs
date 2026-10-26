import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] || "after";
const directory = `docs/screenshots/environment/${phase}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3002");
await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
await page.locator("[data-start]").click();
const views = [
  ["cell-47", [-6, 1.6, -5], [-7.1, 1.6, -9.3]],
  ["bunk", [-5.85, 1.6, -6.8], [-4.25, 1.12, -8.4]],
  ["fixtures", [-6.1, 1.6, -8.35], [-7.7, 0.9, -9.3]],
  ["window-ceiling", [-6, 1.6, -6.2], [-6.8, 3.25, -10.4]],
  ["corridor", [-6, 1.6, 0.5], [7, 1.7, 0]],
  ["guard-front", [-5, 1.62, 1.2], [-5, 1.25, -0.8]],
  ["guard-side", [-3, 1.6, -0.8], [-5, 1.15, -0.8]],
];
const report = { phase, viewport: [1280, 800], views, errors, renders: [] };
report.gameplay = await page.evaluate(() => {
  const e = window.__HIRODORA__;
  return {
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
  };
});
for (const [name, position, target] of views) {
  await page.evaluate(
    ({ position, target, name }) => {
      const e = window.__HIRODORA__;
      e.overlayOpen = true;
      e.stats.subtitle = null;
      e.reducedMotion = true;
      e.setGraphicsPreset("high");
      e.setGuardQuality("desktop");
      e.renderer.setPixelRatio(1);
      e.camera.position.set(...position);
      e.camera.lookAt(...target);
      e.camera.updateMatrixWorld();
      e.guardKey.position.set(-6, 3.25, -6);
      e.guardKey.target.position.set(-6, 0, -7.5);
      if (name.startsWith("guard")) {
        const g = e.worldData.guards[0];
        g.position = [-5, 0, -0.8];
        g.rotationY = 0;
        g.state = "patrol";
        const a = e.guardActors.get(g.id);
        a.reset();
        a.root.rotation.y = 0;
        for (let i = 0; i < 20; i++)
          a.update(g, 0, 0.05, e.camera, "desktop", false);
        e.guardKey.position.set(-5, 3.1, 0);
        e.guardKey.target.position.set(-5, 0, 0);
      }
      e.scene.updateMatrixWorld(true);
      e.renderer.render(e.scene, e.camera);
    },
    { position, target, name },
  );
  await page.screenshot({ path: `${directory}/${name}.png` });
  report.renders.push(
    await page.evaluate(() => ({
      calls: window.__HIRODORA__.renderer.info.render.calls,
      triangles: window.__HIRODORA__.renderer.info.render.triangles,
    })),
  );
}
await writeFile(
  `${directory}/capture.json`,
  JSON.stringify(report, null, 2) + "\n",
);
if(phase==='after') {
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const mobile=await context.newPage();
  await mobile.goto(process.env.GAME_URL || 'http://127.0.0.1:3002');
  await mobile.locator('[data-start]').tap();
  await mobile.evaluate(()=>{window.__HIRODORA__.stats.subtitle=null;window.__HIRODORA__.emitChange();});
  await mobile.screenshot({path:`${directory}/mobile.png`});
  await context.close();
}
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(`Captured ${views.length} matched ${phase} views.`);
