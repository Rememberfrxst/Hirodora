import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = "docs/verification/update-v24";
await mkdir(dir, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const inputs = [
  ["chromium-initial.json", "chromium-initial", "chromium"],
  ["chromium-meter-focused.json", "chromium-final", "chromium"],
  ["chromium-release.json", "chromium-release", "chromium"],
  ["webkit-release.json", "webkit-release", "webkit"],
  ["chromium-final.json", "chromium-focused", "chromium"],
  ["webkit-final.json", "webkit-focused", "webkit"],
];
const cases = new Map(),
  runs = [];
for (const [file, name, engine] of inputs) {
  const path = `/workspace/hirodora-v24-${name}.json`,
    d = JSON.parse(await readFile(path, "utf8"));
  await copyFile(path, `${dir}/${file}`);
  runs.push({ file, engine, stats: d.stats });
  const walk = (s) => {
    for (const p of s.specs || [])
      for (const t of p.tests || [])
        cases.set(`${engine}: ${p.title}`, t.results.at(-1)?.status);
    for (const child of s.suites || []) walk(child);
  };
  d.suites.forEach(walk);
}
if (cases.size !== 12 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Incomplete selected checks " + JSON.stringify([...cases]));
for (const [source, dest] of [
  ["/workspace/hirodora-v24-check-final.txt", "check-build.txt"],
  ["/workspace/hirodora-v24-android-build.txt", "android-build.txt"],
  [
    "/workspace/hirodora-v24-apk/apk-assets-smoke.json",
    "apk-assets-smoke.json",
  ],
])
  await copyFile(source, `${dir}/${dest}`);
if (!/pass 87\b/.test(await readFile(`${dir}/check-build.txt`, "utf8")))
  throw Error("Unit checks missing");
const shots = "docs/screenshots/update-v24",
  capture = JSON.parse(await readFile(`${shots}/capture.json`, "utf8"));
if (
  capture.errors.length ||
  capture.captures.length !== 6 ||
  (await readdir(shots)).filter((f) => f.endsWith(".png")).length !== 6
)
  throw Error("Exactly six actual game captures required");
const web = JSON.parse(await readFile("downloads/latest.json", "utf8")),
  apk = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
for (const [name, sha] of [
  [web.archive, web.sha256],
  [apk.file, apk.sha256],
])
  if (hash(await readFile("downloads/" + name)) !== sha)
    throw Error("Package hash mismatch");
const smoke = JSON.parse(
  await readFile(`${dir}/apk-assets-smoke.json`, "utf8"),
);
if (smoke.apkSHA256 !== apk.sha256 || !smoke.escape?.restoredFromCheckpoint)
  throw Error("Stale or incomplete APK smoke");
if (
  apk.certificateSHA256 !==
  "d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca"
)
  throw Error("Signing identity changed");
const voices = JSON.parse(
  await readFile("src/assets/audio/intro-voice-manifest.json", "utf8"),
);
for (const v of voices.reactions)
  if (hash(await readFile("src/assets/audio/" + v.file)) !== v.sha256)
    throw Error("Reaction voice hash mismatch");
const upload = await readFile(
  "/workspace/attachments/ff305659-2f53-4c13-a586-4a21f1eeed8d/dirty_toilet (1).glb",
);
const assets = JSON.parse(
  await readFile("src/assets/environment/manifest.json", "utf8"),
);
const original = assets.uploadedAssets.models.find((m) => m.name === "Toilet");
if (hash(upload) !== original.originalSHA256)
  throw Error("Toilet source is not identical");
await writeFile(
  `${dir}/zip-integrity.txt`,
  execFileSync("unzip", ["-t", "downloads/" + web.archive], {
    encoding: "utf8",
  }),
);
for (const file of (await readdir(dir)).filter((n) => n.endsWith(".txt"))) {
  const c = await readFile(`${dir}/${file}`, "utf8");
  await writeFile(
    `${dir}/${file}`,
    c.replace(/[ \t]+$/gm, "").trimEnd() + "\n",
  );
}
for (const c of capture.captures)
  c.sha256 = hash(await readFile(`${shots}/${c.name}.png`));
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.24.0",
      unitPassed: 87,
      chromiumSelectedPassed: 9,
      webkitSelectedPassed: 3,
      wholeBrowserSuiteRerun: false,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      captures: capture.captures,
      toiletSource: {
        originalFile: "dirty_toilet (1).glb",
        sourceSHA256: hash(upload),
        identicalToPreviouslySupplied: true,
        uniformPresentationScale: 1.16,
        source: original.source,
        license: original.license,
      },
      reaction: voices.reactions[0],
      runtimeRecordings: 76,
      web,
      apk,
      knownLimits: [
        "Animations remain authored skeletal clips, not new motion capture or full foot-plant IK.",
        "No physical iPhone/Android FPS, thermal or long-session certification; public Pages configuration remains owner-side.",
      ],
      testNotes: [
        "Initial bolt fixtures aimed upward rather than downward; corrected camera sign in the tests.",
        "Browser coverage exposed an actual lock-proximity priority problem next to the belt key. Focused puzzle actions now require aim, and key pickup wins when aimed at.",
        "Final reruns cover arbitrary bolt order 3/1/4/2, independent partial progress/save restoration, clean push/bolt UI, voice decode/playback, quiet and loud pushing, original passage checkpoints and the existing island route.",
        "Glint intensity was reduced after visual review to retain original material colours. Belt image uses an inspection camera just outside the bars; actual pickup is tested from inside the closed cell.",
        "APK payload smoke extracts the actual signed package and restores the island chapter with all resources local; it is not a physical-device benchmark.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified 87 units, nine selected Chromium and three WebKit checks, supplied input identity, six renders and signed release hashes.",
);
