import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] || "after",
  dir = "docs/screenshots/stealth-v9";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } }),
  errors = [];
page.setDefaultTimeout(120_000);
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3500");
await page.locator("[data-start]").click();
await page.getByRole("button", { name: /Skip intro/ }).click();
const resize = await page.evaluate(() => {
  const e = window.__HIRODORA__;
  cancelAnimationFrame(e.frameId);
  e.reducedMotion = true;
  e.setGraphicsPreset("high");
  e.renderScale = 0.85;
  e.renderBounds = { initial: 0.85, min: 0.55, max: 1 };
  e.renderer.setPixelRatio(0.85);
  e.frameAverage = 100;
  e.adaptiveScaleTime = 0;
  const now = performance.now();
  e.lastTime = now - 40;
  e.lastRender = now - 100;
  e.tick(now);
  cancelAnimationFrame(e.frameId);
  const gl = e.renderer.getContext(),
    pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4)
    sum += pixels[i] + pixels[i + 1] + pixels[i + 2];
  return {
    mean: sum / ((pixels.length / 4) * 3),
    scale: e.renderScale,
    width: gl.drawingBufferWidth,
    blank: sum === 0,
  };
});
await page.screenshot({ path: `${dir}/${phase}-resize-frame.png` });
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.newGame();
  e.overlayOpen = true;
  e.cinematic.seek(4.5, false, 0.5);
  e.camera.position.set(-5.7, 1.65, -1.2);
  e.camera.lookAt(-4.25, 1.4, 0.2);
  e.camera.updateMatrixWorld();
  e.renderer.setPixelRatio(1);
  e.scene.updateMatrixWorld(true);
  e.renderer.render(e.scene, e.camera);
});
await page.screenshot({ path: `${dir}/${phase}-gun-grip.png` });
let ai;
if (phase === "after") {
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.overlayOpen = false;
    e.finishIntro();
    e.stats.subtitle = null;
    e.move(0);
    e.updateGuards(1 / 30);
    e.emitChange();
    e.scene.updateMatrixWorld(true);
    e.renderer.render(e.scene, e.camera);
  });
  await page.screenshot({ path: `${dir}/cell47-stable.png` });
  const investigating = await page.evaluate(() => {
    const e = window.__HIRODORA__,
      g = e.worldData.guards[0];
    e.playerPos = [-8.3, 0, -10.7];
    e.stats.isCrouching = true;
    e.emitNoise(100, "staged-bar-impact", [-6, 0, -3]);
    for (let i = 0; i < 33; i++) e.updateGuards(1 / 30);
    e.emitChange();
    e.scene.updateMatrixWorld(true);
    e.renderer.render(e.scene, e.camera);
    return {
      state: g.state,
      suspicion: g.suspicion,
      target: g.investigationTarget,
    };
  });
  await page.screenshot({ path: `${dir}/investigating.png` });
  const searching = await page.evaluate(() => {
    const e = window.__HIRODORA__,
      g = e.worldData.guards[0];
    for (let i = 0; i < 240 && g.state !== "searching"; i++)
      e.updateGuards(1 / 30);
    for (let i = 0; i < 24; i++) e.updateGuards(1 / 30);
    e.emitChange();
    e.scene.updateMatrixWorld(true);
    e.renderer.render(e.scene, e.camera);
    return {
      state: g.state,
      suspicion: g.suspicion,
      target: g.investigationTarget,
      scan: g.scanTime,
    };
  });
  await page.screenshot({ path: `${dir}/searching.png` });
  ai = { investigating, searching };
}
await writeFile(
  `${dir}/${phase}-render.json`,
  JSON.stringify(
    {
      resize,
      errors,
      ai,
      gripCamera: { position: [-5.7, 1.65, -1.2], target: [-4.25, 1.4, 0.2] },
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(phase, JSON.stringify(resize));
