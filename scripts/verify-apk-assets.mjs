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
