import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "docs/screenshots/intro-v8";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 998, height: 510 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:3400");
await page.waitForFunction(() => window.__HIRODORA__?.guardsReady);
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.setGraphicsPreset("high");
  e.renderer.setPixelRatio(1);
});
await page.screenshot({ path: `${dir}/main-menu.png` });
await page.getByRole("button", { name: "Settings", exact: true }).click();
for (const tab of ["Game", "Audio", "Graphics", "Controls"]) {
  await page.getByRole("tab", { name: tab, exact: true }).click();
  await page.screenshot({ path: `${dir}/settings-${tab.toLowerCase()}.png` });
}
await page.getByRole("button", { name: "Back from settings" }).click();
await page.locator("[data-start]").click();
await page.evaluate(() => {
  const e = window.__HIRODORA__;
  e.overlayOpen = true;
});
for (const [name, t] of [
  ["gate-opens", 1.2],
  ["escape", 3.4],
  ["shot", 4.44],
  ["collapse", 5.6],
  ["gate-closes", 8.6],
  ["body-check", 13],
]) {
  await page.evaluate((t) => {
    const e = window.__HIRODORA__;
    e.introCaption = e.cinematic.seek(t, false, 0.5).caption;
    e.emitChange();
    e.scene.updateMatrixWorld(true);
    e.renderer.render(e.scene, e.camera);
  }, t);
  await page.screenshot({ path: `${dir}/intro-${name}.png` });
}
await page.evaluate(() => window.__HIRODORA__.finishIntro());
await page.screenshot({ path: `${dir}/cell47-ready.png` });
await writeFile(
  `${dir}/intro-capture.json`,
  JSON.stringify(
    {
      baseline: "cd3b1ee",
      viewport: { width: 998, height: 510 },
      frames: [1.2, 3.4, 4.44, 5.6, 8.6, 13],
      method:
        "Actual game meshes, rig and deterministic timeline; paused for each capture. No generated scenes.",
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Main menu, all settings tabs, cinematic phases and gameplay captured.",
);
