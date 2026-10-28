import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const dir = "docs/verification/ballistics-v18",
  shots = "docs/screenshots/ballistics-v18";
await mkdir(dir, { recursive: true });
const cases = new Map(),
  runs = [];
for (const [i, path] of process.argv.slice(2).entries()) {
  const data = JSON.parse(await readFile(path, "utf8"));
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
  await copyFile(path, `${dir}/browser-${i + 1}.json`);
  runs.push({ file: `browser-${i + 1}.json`, stats: data.stats });
}
if (cases.size !== 21 || [...cases.values()].some((s) => s !== "passed"))
  throw Error(
    "Selected browser coverage incomplete: " + JSON.stringify([...cases]),
  );
const units = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 74\b/.test(units)) throw Error("74 unit checks required");
await writeFile(`${dir}/unit-tests.txt`, units.trimEnd() + "\n");
await writeFile(
  `${dir}/typescript.txt`,
  execFileSync("npm", ["run", "lint"], { encoding: "utf8" }).trimEnd() + "\n",
);
const capture = JSON.parse(await readFile(`${shots}/capture.json`, "utf8"));
if (
  capture.errors.length ||
  capture.captures.length !== 6 ||
  (await readdir(shots)).filter((f) => f.endsWith(".png")).length !== 6
)
  throw Error("Six real captures required");
for (const c of capture.captures) {
  if (
    c.signs !== 48 ||
    c.fog !== 0.033 ||
    c.hp !== 200 ||
    c.icons.some((i) => !i.width || !i.height)
  )
    throw Error("Rendered world/icon mismatch: " + c.name);
}
if (
  !capture.pickups.attached ||
  capture.combat.first !== 100 ||
  capture.combat.second !== 0 ||
  !capture.combat.dead ||
  capture.captures[4].dead.length !== 1 ||
  !capture.captures[3].animations.some((a) => a.clip === "Cross")
)
  throw Error("Rendered action verification failed");
const before = JSON.parse(
    await readFile("docs/screenshots/cargo-v17/capture.json", "utf8"),
  ).captures[0],
  after = capture.captures[0];
for (const key of ["position", "target"])
  if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    throw Error("Before/after camera mismatch");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const comparison = {
  position: after.position,
  target: after.target,
  before: "docs/screenshots/cargo-v17/01-corridor.png",
  after: `${shots}/01-corridor.png`,
};
comparison.beforeSHA256 = hash(await readFile(comparison.before));
comparison.afterSHA256 = hash(await readFile(comparison.after));
const web = JSON.parse(await readFile("downloads/latest.json", "utf8")),
  android = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
for (const [file, sha] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
])
  if (hash(await readFile("downloads/" + file)) !== sha)
    throw Error("Artifact checksum mismatch");
await writeFile(
  `${dir}/zip-integrity.txt`,
  execFileSync("unzip", ["-t", "downloads/" + web.archive], {
    encoding: "utf8",
  }).trimEnd() + "\n",
);
const smoke = JSON.parse(
  await readFile(
    (process.env.APK_SMOKE_DIR || "/workspace/hirodora-v18-apk") +
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
  !smoke.pistol.after.includes("23")
)
  throw Error("Actual APK pistol smoke failed");
for (const prefix of ["pistol-10mm-", "soda-can-"])
  if (!smoke.served.some((url) => url.includes(prefix)))
    throw Error("APK omitted weapon/icon asset: " + prefix);
const icon = await readFile("src/assets/equipment/pistol_10mm.webp");
// Vite embeds this small WebP into JavaScript rather than issuing a request.
// Verify its exact bytes in the actual signed package, plus runtime decoding.
const apkJS = execFileSync(
  "unzip",
  ["-p", "downloads/" + android.file, "assets/game/assets/*.js"],
  { maxBuffer: 20 * 1024 * 1024 },
).toString("utf8");
if (
  !apkJS.includes(icon.toString("base64")) &&
  !smoke.served.some((url) => url.includes("pistol_10mm-"))
)
  throw Error("Actual APK lacks the pistol icon");
await writeFile(
  `${dir}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
const sdk = process.env.ANDROID_HOME;
if (!sdk) throw Error("ANDROID_HOME required");
const signature = execFileSync(
  `${sdk}/build-tools/35.0.0/apksigner`,
  ["verify", "--verbose", "--print-certs", "downloads/" + android.file],
  { encoding: "utf8" },
);
if (
  !signature.includes(
    "Verified using v2 scheme (APK Signature Scheme v2): true",
  ) ||
  !signature.includes(android.certificateSHA256)
)
  throw Error("APK signing mismatch");
await writeFile(`${dir}/apk-signature.txt`, signature.trimEnd() + "\n");
const lint = await readFile(
  "android/app/build/reports/lint-results-release.xml",
  "utf8",
);
if (/severity="(?:Error|Fatal)"/.test(lint)) throw Error("Android lint errors");
await copyFile(
  "android/app/build/reports/lint-results-release.xml",
  `${dir}/android-lint.xml`,
);
const assets = JSON.parse(
  await readFile("src/assets/ballistics/manifest.json", "utf8"),
);
for (const a of assets.sources)
  if (
    hash(await readFile("src/assets/ballistics/" + a.file)) !== a.runtimeSHA256
  )
    throw Error("Runtime model mismatch");
const audio = JSON.parse(
  await readFile("/workspace/hirodora-pistol-audio-preview/edit.json", "utf8"),
);
await writeFile(
  `${dir}/audio-edit.json`,
  JSON.stringify(audio, null, 2) + "\n",
);
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.18.0",
      unitPassed: 74,
      selectedBrowserCasesPassed: cases.size,
      wholeBrowserSuiteRerun: false,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      comparison,
      assets,
      sound: {
        uploadedClipPublished: false,
        blockedHostname: "mixkit.co",
        error: "CONNECT HTTP 403: not allowlisted",
        fallback:
          "Existing credited local guard-gunshot recording; filtered/quieter with can",
        privateAudition: audio,
      },
      artifacts: { web, android },
      androidLint: {
        errors: 0,
        warnings: (lint.match(/severity="Warning"/g) || []).length,
      },
      limits: [
        "Software-rendered Chromium, not physical-phone FPS/thermal certification.",
        "Authored skeletal boxing, not new motion capture, physics melee or advanced footwork.",
        "Only selected browser scenarios rerun; retained run files include any focused reruns.",
        "Uploaded Mixkit derivative remains private pending source-license verification.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified 74 unit checks, 21 selected browser cases, six renders, matched corridor camera, APK pistol firing/icon, signing and ZIP integrity.",
);
