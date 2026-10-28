import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = "docs/verification/update-v23";
await mkdir(dir, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const inputs = [
  ["chromium-route-initial.json", "route-tests", "chromium"],
  ["chromium-route-focused.json", "route-final", "chromium"],
  ["chromium-trace-collision.json", "chromium-final", "chromium"],
  ["webkit-trace-collision.json", "webkit-final", "webkit"],
  ["chromium-release.json", "chromium-release", "chromium"],
  ["webkit-release.json", "webkit-release", "webkit"],
];
const cases = new Map(),
  runs = [];
for (const [file, name, engine] of inputs) {
  const path = `/workspace/hirodora-v23-${name}.json`,
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
if (cases.size !== 6 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Incomplete selected checks " + JSON.stringify([...cases]));
for (const [source, dest] of [
  ["/workspace/hirodora-v23-check-release.txt", "check-build.txt"],
  ["/workspace/hirodora-v23-units-final.txt", "unit-before-final-curl.txt"],
  ["/workspace/hirodora-v23-android-build.txt", "android-build.txt"],
  [
    "/workspace/hirodora-v23-apk/apk-assets-smoke.json",
    "apk-assets-smoke.json",
  ],
])
  await copyFile(source, `${dir}/${dest}`);
if (!/pass 85\b/.test(await readFile(`${dir}/check-build.txt`, "utf8")))
  throw Error("Unit checks missing");
const shots = "docs/screenshots/update-v23",
  capture = JSON.parse(await readFile(`${shots}/capture.json`, "utf8"));
if (
  capture.errors.length ||
  capture.captures.length !== 6 ||
  (await readdir(shots)).filter((f) => f.endsWith(".png")).length !== 6
)
  throw Error("Exactly six game captures required");
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
  throw Error("Stale or incomplete APK route smoke");
if (
  apk.certificateSHA256 !==
  "d7175da40c348c91e8a8663635d3a130115aba916e5ce889e40b646c009f33ca"
)
  throw Error("Signing identity changed");
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
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.23.0",
      unitPassed: 85,
      chromiumSelectedPassed: 4,
      webkitSelectedPassed: 2,
      wholeBrowserSuiteRerun: false,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      captures: capture.captures.map((c) => ({ ...c, sha256: null })),
      chapters: {
        securityRooms: 3,
        securityGuards: 6,
        tunnelFloorY: -4,
        militaryMetres: [110, 70],
        militaryGuards: 10,
      },
      combat: {
        playerHP: 200,
        enemyBulletDamage: 50,
        playerBodyDamage: 100,
        playerHeadDamage: 200,
        automaticRespawnSeconds: 2,
        safeMilestonesOnly: true,
      },
      web,
      apk,
      knownLimits: [
        "Modular first-playable route; not final AAA art or a fully continuous open world. Door/ladder interactions transition between isolated chapters.",
        "Selected browser tests seed later enemy-death states for gate/victory assertions; this is not a full human combat playthrough.",
        "No physical iPhone or Android performance/thermal certification, native signed IPA or completed public Pages configuration.",
      ],
      testNotes: [
        "Initial skin-ray fixture sampled the newly reset officer before animation crossfade settled. It now settles the real rig and verifies two actual body hits.",
        "Concurrent Chromium/WebKit runners originally shared test-results and collided during trace cleanup. Release reruns use independent output directories; all six selected cases pass.",
        "The anatomical unit check rejected a 100.97-degree finger bend during tuning. The final grip preserves segment lengths and keeps adjacent finger bends below 90 degrees.",
        "Final post-test visual corrections preserve sign UVs, keep dock water unsupported and hollow the boat hull. Package build/check and APK smoke use those final files.",
        "APK payload smoke runs the actual signed archive locally in mobile Chromium, including a restored military checkpoint with the ten-guard hint. It is not a physical Android run.",
      ],
    },
    null,
    2,
  ) + "\n",
);
const report = JSON.parse(await readFile(`${dir}/report.json`, "utf8"));
for (const c of report.captures)
  c.sha256 = hash(await readFile(`${shots}/${c.name}.png`));
await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + "\n");
console.log(
  "Verified 85 unit checks, four selected Chromium and two WebKit cases, six captures, APK route smoke and matching release hashes.",
);
