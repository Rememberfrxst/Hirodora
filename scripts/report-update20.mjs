import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const dir = "docs/verification/update-v20",
  shots = "docs/screenshots/update-v20";
await mkdir(dir, { recursive: true });
const clean = (s) => s.replace(/[ \t]+$/gm, "").trimEnd() + "\n",
  hash = (b) => createHash("sha256").update(b).digest("hex");
const cases = new Map(),
  runs = [];
for (const [i, file] of process.argv.slice(2).entries()) {
  const d = JSON.parse(await readFile(file, "utf8"));
  if (d.errors?.length) throw Error("Browser global errors");
  const visit = (s) => {
    for (const spec of s.specs || [])
      cases.set(
        spec.title,
        spec.tests.flatMap((t) => t.results).at(-1)?.status,
      );
    for (const child of s.suites || []) visit(child);
  };
  d.suites.forEach(visit);
  await copyFile(file, `${dir}/browser-${i + 1}.json`);
  runs.push({ file: `browser-${i + 1}.json`, stats: d.stats });
}
if (cases.size !== 21 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Selected coverage incomplete " + JSON.stringify([...cases]));
const units = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 80\b/.test(units)) throw Error("80 units required");
await writeFile(`${dir}/unit-tests.txt`, clean(units));
await writeFile(
  `${dir}/typescript.txt`,
  clean(execFileSync("npm", ["run", "lint"], { encoding: "utf8" })),
);
const capture = JSON.parse(await readFile(`${shots}/capture.json`, "utf8"));
if (
  capture.errors.length ||
  capture.captures.length !== 6 ||
  (await readdir(shots)).filter((f) => f.endsWith(".png")).length !== 6
)
  throw Error("Exactly six game captures required");
const phaseDir = "/workspace/hirodora-v20-phase1",
  phase = JSON.parse(await readFile(`${phaseDir}/capture.json`, "utf8")),
  comparisons = [];
for (const c of capture.captures) {
  const before = phase.captures.find((v) => v.name === c.name);
  for (const k of ["position", "target", "fov", "item"])
    if (JSON.stringify(before[k]) !== JSON.stringify(c[k]))
      throw Error("Camera mismatch");
  comparisons.push({
    name: c.name,
    position: c.position,
    target: c.target,
    fov: c.fov,
    beforeSHA256: hash(await readFile(`${phaseDir}/${c.name}.png`)),
    afterSHA256: hash(await readFile(`${shots}/${c.name}.png`)),
    beforeLocalOnly: true,
    beforeStage:
      "v20 first implementation render before UI/reload polish, not v19 baseline",
  });
}
const idle = capture.captures.find((c) => c.name === "04-right-hand-pistol"),
  reload = capture.captures.find((c) => c.reload);
if (
  !idle.rightVisible ||
  idle.leftVisible ||
  !reload.leftVisible ||
  reload.ammo !== 0
)
  throw Error("Rendered hand/magazine states mismatch");
const web = JSON.parse(await readFile("downloads/latest.json", "utf8")),
  android = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
for (const [file, sha] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
])
  if (hash(await readFile("downloads/" + file)) !== sha)
    throw Error("Release hash mismatch");
await writeFile(
  `${dir}/zip-integrity.txt`,
  clean(
    execFileSync("unzip", ["-t", "downloads/" + web.archive], {
      encoding: "utf8",
    }),
  ),
);
const smokeDir = process.env.APK_SMOKE_DIR || "/workspace/hirodora-v20-apk",
  smoke = JSON.parse(
    await readFile(`${smokeDir}/apk-assets-smoke.json`, "utf8"),
  );
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length ||
  smoke.serviceWorkers ||
  !smoke.pistol?.iconsDecoded ||
  !smoke.pistol.after.includes("5") ||
  !smoke.pistol.reloaded.includes("6")
)
  throw Error("APK smoke/reload failed");
await copyFile(
  `${smokeDir}/apk-assets-smoke.json`,
  `${dir}/apk-assets-smoke.json`,
);
const apk = "downloads/" + android.file,
  signature = execFileSync(
    `${process.env.ANDROID_HOME}/build-tools/35.0.0/apksigner`,
    ["verify", "--verbose", "--print-certs", apk],
    { encoding: "utf8" },
  );
if (
  !signature.includes(
    "Verified using v2 scheme (APK Signature Scheme v2): true",
  ) ||
  android.certificateSHA256 !==
    "d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca"
)
  throw Error("Release certificate mismatch");
await writeFile(`${dir}/apk-signature.txt`, clean(signature));
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
  clean(await readFile("/workspace/hirodora-v20-android-build.txt", "utf8")),
);
await writeFile(
  `${dir}/production-check.txt`,
  clean(await readFile("/workspace/hirodora-v20-check.txt", "utf8")),
);
const hands = JSON.parse(
    await readFile("src/assets/guards/hand-manifest.json", "utf8"),
  ),
  audio = JSON.parse(
    await readFile("src/assets/audio/compat-manifest.json", "utf8"),
  );
if (
  hash(
    execFileSync(
      "unzip",
      ["-p", apk, "assets/game/assets/first-person-arm-*.glb"],
      { maxBuffer: 10 * 1024 * 1024 },
    ),
  ) !== hands.runtimeSHA256
)
  throw Error("APK omitted current uploaded hands");
const apkFiles = execFileSync("unzip", ["-Z1", apk], {
    encoding: "utf8",
  }).split("\n"),
  js = execFileSync("unzip", ["-p", apk, "assets/game/assets/*.js"], {
    maxBuffer: 20 * 1024 * 1024,
  }).toString("utf8");
for (const a of audio.records) {
  const bytes = await readFile("src/assets/audio/" + a.file),
    base = a.file.split("/").pop().replace(".mp3", "-"),
    asset = apkFiles.find(
      (f) => f.startsWith("assets/game/assets/" + base) && f.endsWith(".mp3"),
    );
  if (asset) {
    if (hash(execFileSync("unzip", ["-p", apk, asset])) !== a.sha256)
      throw Error("APK MP3 hash mismatch");
  } else if (!js.includes(bytes.toString("base64")))
    throw Error("APK omitted MP3: " + a.file);
}
const credits = execFileSync(
  "unzip",
  ["-p", apk, "assets/game/CHARACTER-LICENSES.txt"],
  { encoding: "utf8" },
);
if (!credits.includes(hands.source)) throw Error("APK hand credits missing");
const blockers = JSON.parse(
  await readFile(`${dir}/network-blockers.json`, "utf8"),
);
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: web.version,
      unitPassed: 80,
      selectedBrowserCasesPassed: cases.size,
      wholeBrowserSuiteRerun: false,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      captures: capture,
      phaseComparisons: comparisons,
      hands,
      audio: {
        format: "MP3",
        recordings: audio.records.length,
        allPackagedBytesVerified: true,
      },
      artifacts: { web, android },
      androidLint: {
        errors: 0,
        warnings: (lint.match(/severity="Warning"/g) || []).length,
      },
      ios: blockers,
      limits: [
        "Chromium iPhone emulation is not Safari/WebKit or physical iOS certification.",
        "Hosted GitHub Pages availability not verified through this environment's blocked hostname.",
        "No IPA produced; macOS/Xcode and Apple signing are required.",
        "Authored support-hand reload gesture, not a detachable-magazine or motion-captured reload.",
        "Software Chromium/APK-payload checks are not real Android/iPhone GPU, frame-rate or thermal testing.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified 80 units, 21 selected browser scenarios, six rendered views, signed APK hands/all 70 MP3 bytes, reload smoke and release hashes. iOS limitations explicitly retained.",
);
