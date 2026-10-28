import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const clean = (text) => text.replace(/[ \t]+$/gm, "").trimEnd() + "\n";
const dir = "docs/verification/bridge-v19",
  shots = "docs/screenshots/bridge-v19";
await mkdir(dir, { recursive: true });
const cases = new Map(),
  runs = [];
for (const [i, file] of process.argv.slice(2).entries()) {
  const data = JSON.parse(await readFile(file, "utf8"));
  if (data.errors?.length) throw Error("Global browser errors");
  const visit = (s) => {
    for (const spec of s.specs || [])
      cases.set(
        spec.title,
        spec.tests.flatMap((t) => t.results).at(-1)?.status,
      );
    for (const child of s.suites || []) visit(child);
  };
  data.suites.forEach(visit);
  await copyFile(file, `${dir}/browser-${i + 1}.json`);
  runs.push({ file: `browser-${i + 1}.json`, stats: data.stats });
}
if (cases.size !== 11 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Browser coverage incomplete: " + JSON.stringify([...cases]));
const unit = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 77\b/.test(unit)) throw Error("77 unit checks required");
await writeFile(`${dir}/unit-tests.txt`, clean(unit));
await writeFile(
  `${dir}/typescript.txt`,
  clean(execFileSync("npm", ["run", "lint"], { encoding: "utf8" })),
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const capture = JSON.parse(await readFile(`${shots}/capture.json`, "utf8"));
const beforeDir = process.env.BEFORE_DIR || "/workspace/hirodora-v19-before";
const before = JSON.parse(await readFile(`${beforeDir}/capture.json`, "utf8"));
if (
  capture.errors.length ||
  before.errors.length ||
  capture.captures.length !== 6 ||
  (await readdir(shots)).filter((n) => n.endsWith(".png")).length !== 6
)
  throw Error("Six real views required");
const comparisons = [];
for (const c of capture.captures) {
  const b = before.captures.find((b) => b.name === c.name);
  for (const k of ["position", "target", "fov", "item"])
    if (JSON.stringify(c[k]) !== JSON.stringify(b[k]))
      throw Error("Camera/item mismatch " + c.name);
  comparisons.push({
    name: c.name,
    position: c.position,
    target: c.target,
    fov: c.fov,
    item: c.item,
    beforeSHA256: hash(await readFile(`${beforeDir}/${c.name}.png`)),
    afterSHA256: hash(await readFile(`${shots}/${c.name}.png`)),
    beforeLocalOnly: true,
    after: `${shots}/${c.name}.png`,
  });
}
const web = JSON.parse(await readFile("downloads/latest.json", "utf8")),
  android = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
for (const [file, sha] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
])
  if (hash(await readFile("downloads/" + file)) !== sha)
    throw Error("Artifact mismatch");
await writeFile(
  `${dir}/zip-integrity.txt`,
  execFileSync("unzip", ["-t", "downloads/" + web.archive], {
    encoding: "utf8",
  }),
);
const smoke = JSON.parse(
  await readFile(
    (process.env.APK_SMOKE_DIR || "/workspace/hirodora-v19-apk") +
      "/apk-assets-smoke.json",
    "utf8",
  ),
);
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length ||
  smoke.serviceWorkers ||
  !smoke.pistol?.iconsDecoded ||
  !smoke.pistol.after.includes("23") ||
  !smoke.served.some((url) => url.includes("metal-bridge-"))
)
  throw Error("APK bundled-asset smoke failed");
await copyFile(
  (process.env.APK_SMOKE_DIR || "/workspace/hirodora-v19-apk") +
    "/apk-assets-smoke.json",
  `${dir}/apk-assets-smoke.json`,
);
const signature = execFileSync(
  `${process.env.ANDROID_HOME}/build-tools/35.0.0/apksigner`,
  ["verify", "--verbose", "--print-certs", "downloads/" + android.file],
  { encoding: "utf8" },
);
if (
  !signature.includes(
    "Verified using v2 scheme (APK Signature Scheme v2): true",
  ) ||
  android.certificateSHA256 !==
    "d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca"
)
  throw Error("Release signing mismatch");
await writeFile(`${dir}/apk-signature.txt`, signature);
const lint = await readFile(
  "android/app/build/reports/lint-results-release.xml",
  "utf8",
);
if (/severity="(?:Error|Fatal)"/.test(lint)) throw Error("Android lint errors");
await copyFile(
  "android/app/build/reports/lint-results-release.xml",
  `${dir}/android-lint.xml`,
);
await writeFile(
  `${dir}/android-build.txt`,
  clean(await readFile("/workspace/hirodora-v19-android-build.txt", "utf8")),
);
await writeFile(
  `${dir}/production-check.txt`,
  clean(await readFile("/workspace/hirodora-v19-check.txt", "utf8")),
);
const bridge = JSON.parse(
    await readFile("src/assets/environment/bridge-manifest.json", "utf8"),
  ),
  hand = JSON.parse(
    await readFile("src/assets/guards/hand-manifest.json", "utf8"),
  );
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: web.version,
      unitPassed: 77,
      selectedBrowserCasesPassed: cases.size,
      wholeBrowserSuiteRerun: false,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      comparisons,
      bridge,
      hand,
      artifacts: { web, android },
      androidLint: {
        errors: 0,
        warnings: (lint.match(/severity="Warning"/g) || []).length,
      },
      limits: [
        "Software-rendered Chromium, not physical-phone FPS/thermal or Android WebView certification.",
        "Before screenshots retained locally to publish only six latest PNGs; exact-camera hashes recorded.",
        "Existing guard models, AI, cells, puzzles, gun damage and checkpoints retained; not a new guard redesign.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified 77 units, 11 browser scenarios, six matched cameras, signed APK payload and release hashes.",
);
