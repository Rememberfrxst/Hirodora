import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.env.CAPTURE_DIR || "/tmp/hirodora-v16-grips-final";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [],
  items = [];
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3682");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.reducedMotion = true;
    e.stats.subtitle = null;
    e.setGraphicsPreset("medium");
    e.camera.position.set(-6.1, 1.6, -5.4);
    e.camera.lookAt(-6, 1.45, -1);
    e.camera.updateMatrixWorld();
  });
  for (const id of [
    "dart_pistol",
    "heavy_crowbar",
    "spoon",
    "lockpick",
    "stethoscope",
    "pipe",
    "rubber_washer",
    "silencer",
    "steel_wool",
  ]) {
    const data = await page.evaluate((id) => {
      const e = window.__HIRODORA__;
      e.inventory = [id];
      e.equippedItem = id;
      e.renderFrame(0.3);
      e.emitChange();
      const item = e.firstPerson.items.get(id);
      return {
        id,
        visible: e.firstPerson.root.visible,
        scale: item.scale.toArray(),
        position: item.position.toArray(),
      };
    }, id);
    await page.screenshot({ path: `${directory}/${id}.png` });
    items.push(data);
  }
  await writeFile(
    `${directory}/inspection.json`,
    JSON.stringify({ items, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    `Rendered ${items.length} additional real held-item close-ups in ${directory}`,
  );
} finally {
  await browser.close();
}
