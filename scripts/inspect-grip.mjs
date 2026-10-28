import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = process.env.CAPTURE_DIR || "/workspace/hirodora-grip-study";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
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
  page.setDefaultTimeout(180000);
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3798");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.camera.position.set(-39, 1.65, 0);
    e.camera.lookAt(-39, 1.5, 10);
    e.equippedItem = "pistol_10mm";
    e.setGraphicsPreset("high");
    e.renderer.setPixelRatio(1);
    e.renderFrame(0.3);
  });
  const records = [];
  for (const y of [0.12, 0.15, 0.17]) {
    records.push(
      await page.evaluate((y) => {
        const e = window.__HIRODORA__,
          f = e.firstPerson,
          gun = f.items.get("pistol_10mm");
        gun.position.y = y;
        e.renderFrame(0);
        return { y, hand: f.hand.position.toArray() };
      }, y),
    );
    await page.screenshot({ path: `${dir}/socket-${y}.png` });
  }
  await writeFile(`${dir}/records.json`, JSON.stringify(records, null, 2));
} finally {
  await browser.close();
}
