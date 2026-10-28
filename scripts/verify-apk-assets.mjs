import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, extname } from "node:path";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const captureDir = process.env.CAPTURE_DIR || "docs/screenshots/android-v6";
await mkdir(captureDir, { recursive: true });
const directory = await mkdtemp(join(tmpdir(), "hirodora-apk-smoke-"));
execFileSync("unzip", [
  "-q",
  `downloads/Hirodora-${version}-android.apk`,
  "assets/game/*",
  "-d",
  directory,
]);
const host = "https://appassets.androidplatform.net";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const errors = [],
  unavailable = [],
  served = new Set();
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (
    url.origin !== host ||
    !url.pathname.startsWith("/assets/game/") ||
    url.pathname.includes("..")
  ) {
    unavailable.push(url.href);
    return route.abort();
  }
  const mime =
    {
      ".js": "application/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".webp": "image/webp",
      ".glb": "model/gltf-binary",
      ".ogg": "audio/ogg",
      ".mp3": "audio/mpeg",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
    }[extname(url.pathname)] || "application/octet-stream";
  try {
    const body = await readFile(join(directory, url.pathname));
    served.add(url.pathname);
    await route.fulfill({ status: 200, contentType: mime, body });
  } catch {
    unavailable.push(url.pathname);
    await route.abort();
  }
});
await page.goto(host + "/assets/game/index.html");
await page.locator("[data-start]").tap({ timeout: 120000 });
await page.getByRole("button", { name: /Skip intro/ }).waitFor();
await page.screenshot({ path: `${captureDir}/apk-assets-intro.png` });
await page.getByRole("button", { name: /Skip intro/ }).tap();
await page.getByRole("button", { name: "Pause game", exact: true }).waitFor();
await page.screenshot({
  path: `${captureDir}/apk-assets-gameplay.png`,
});
await page.getByRole("button", { name: "Pause game", exact: true }).tap();
await page.getByRole("button", { name: "Start new game", exact: true }).tap();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Start new game", exact: true })
  .tap();
await page.getByRole("button", { name: /Skip intro/ }).tap();
await page.getByRole("button", { name: "Pause game", exact: true }).waitFor();
// Give asynchronous sound decoding a chance to exercise bundled OGG URLs too.
await page.waitForTimeout(1500);
let pistol;
if (process.env.VERIFY_PISTOL === "true") {
  const weaponCheckpoint = await page.evaluate(() => {
    const key = "hirodora-checkpoint-v3",
      cp = JSON.parse(localStorage.getItem(key) || "null");
    if (!cp) throw Error("No real APK checkpoint to extend");
    cp.inventory.push("pistol_10mm");
    cp.equippedItem = "pistol_10mm";
    cp.flags.can_attached = true;
    cp.flags.intro_done = true;
    cp.flags.intro_pending = false;
    cp.stats.pistolAmmo = 6;
    return cp;
  });
  // Install after unload handlers have saved the old live session, but before
  // the replacement application's constructor reads its checkpoint.
  await page.addInitScript(
    (cp) => localStorage.setItem("hirodora-checkpoint-v3", JSON.stringify(cp)),
    weaponCheckpoint,
  );
  await page.reload();
  await page.locator("[data-start]").tap({ timeout: 120000 });
  const fire = page.getByRole("button", { name: "Fire pistol", exact: true });
  try {
    await fire.waitFor({ timeout: 120000 });
  } catch (error) {
    await page.screenshot({ path: `${captureDir}/pistol-start-failure.png` });
    await writeFile(
      `${captureDir}/pistol-start-failure.json`,
      JSON.stringify(
        await page.evaluate(() => ({
          text: document.body.innerText,
          checkpoint: JSON.parse(
            localStorage.getItem("hirodora-checkpoint-v3") || "null",
          ),
        })),
        null,
        2,
      ),
    );
    await browser.close();
    throw error;
  }
  const before = await fire.innerText();
  await fire.tap();
  await page.waitForFunction(() =>
    document.querySelector(".touch-fire")?.textContent?.includes("5"),
  );
  const after = await fire.innerText();
  await page.getByRole("button", { name: "Reload pistol", exact: true }).tap();
  await page
    .getByRole("progressbar", { name: "Reload progress", exact: true })
    .waitFor();
  await page.screenshot({ path: `${captureDir}/apk-assets-reload.png` });
  try {
    await page.waitForFunction(
      () => document.querySelector(".touch-fire")?.textContent?.includes("6"),
      null,
      { timeout: 120000 },
    );
  } catch (error) {
    await writeFile(
      `${captureDir}/reload-failure.json`,
      JSON.stringify(
        await page.evaluate(() => ({
          state: document.body.dataset.state,
          text: document.body.innerText,
          progress: document
            .querySelector('[aria-label="Reload progress"]')
            ?.getAttribute("value"),
        })),
        null,
        2,
      ),
    );
    await page.screenshot({ path: `${captureDir}/reload-failure.png` });
    await browser.close();
    throw error;
  }
  const reloaded = await fire.innerText();
  const icons = page.locator(".pocket-item img");
  await icons.first().waitFor();
  await icons.evaluateAll(async (list) =>
    Promise.all(list.map((i) => i.decode())),
  );
  pistol = {
    before,
    after,
    reloaded,
    iconsDecoded: await icons.evaluateAll((list) =>
      list.every((i) => i.naturalWidth > 0),
    ),
  };
  if (
    !before.includes("6") ||
    !after.includes("5") ||
    !reloaded.includes("6") ||
    !pistol.iconsDecoded
  )
    throw Error("APK pistol UI failed");
}
let escape;
if (process.env.VERIFY_ESCAPE === "true") {
  const cp = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hirodora-checkpoint-v3") || "null"),
  );
  if (!cp) throw Error("No packaged checkpoint for route restore check");
  cp.region = "military";
  cp.playerPosition = [182, 0, 0];
  cp.playerRotationY = -Math.PI / 2;
  cp.name =
    "Cross the military compound. Clear island sentries and open the dock gate.";
  cp.flags.route_command_clear = true;
  cp.flags.intro_pending = false;
  cp.flags.intro_done = true;
  cp.stats.health = 200;
  cp.stats.pistolAmmo = 6;
  cp.stats.act = 1;
  cp.inventory = ["pistol_10mm"];
  cp.equippedItem = "pistol_10mm";
  await page.addInitScript(
    (cp) => localStorage.setItem("hirodora-checkpoint-v3", JSON.stringify(cp)),
    cp,
  );
  await page.reload();
  await page.locator("[data-start]").tap({ timeout: 120000 });
  await page
    .getByRole("button", { name: "Ask Munshi for a hint", exact: true })
    .tap();
  await page.waitForFunction(
    () => document.body.innerText.includes("10 armed guards remain"),
    null,
    { timeout: 120000 },
  );
  escape = {
    region: "military",
    restoredFromCheckpoint: true,
    hint: await page.locator(".hint-toast p").innerText(),
  };
  await page.screenshot({ path: `${captureDir}/apk-island-compound.png` });
}
const workers = await page.evaluate(
  async () => (await navigator.serviceWorker.getRegistrations()).length,
);
await browser.close();
const report = {
  version,
  apkSHA256: createHash("sha256")
    .update(await readFile(`downloads/Hirodora-${version}-android.apk`))
    .digest("hex"),
  method:
    "Actual APK assets extracted and served in Chromium at the native HTTPS origin with all requests intercepted locally. This is not an Android device performance test.",
  served: [...served].sort(),
  missing: unavailable,
  pageErrors: errors,
  serviceWorkers: workers,
  pistol,
  escape,
};
await writeFile(
  `${captureDir}/apk-assets-smoke.json`,
  JSON.stringify(report, null, 2) + "\n",
);
if (errors.length || unavailable.length || workers)
  throw Error(JSON.stringify(report));
console.log(
  `APK-contained game started and reset; ${served.size} local assets served, no network requests or script errors.`,
);
