import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const dir = "docs/verification/cargo-v17";
const screenshots = "docs/screenshots/cargo-v17";
const baseline = "docs/screenshots/reference-v16";
await mkdir(dir, { recursive: true });
const cases = new Map(),
  runs = [];
for (const [i, path] of process.argv.slice(2).entries()) {
  const data = JSON.parse(await readFile(path, "utf8"));
  if (data.errors?.length) throw Error("Global browser-run errors: " + path);
  const visit = (suite) => {
    for (const spec of suite.specs || [])
      cases.set(
        spec.title,
        spec.tests.flatMap((t) => t.results).at(-1)?.status,
      );
    for (const child of suite.suites || []) visit(child);
  };
  data.suites.forEach(visit);
  await copyFile(path, `${dir}/browser-${i + 1}.json`);
  runs.push({ file: `browser-${i + 1}.json`, stats: data.stats });
}
if (cases.size !== 24 || [...cases.values()].some((s) => s !== "passed"))
  throw Error(
    "Selected browser coverage incomplete: " + JSON.stringify([...cases]),
  );
const unit = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 70\b/.test(unit)) throw Error("Unit checks incomplete");
await writeFile(`${dir}/unit-tests.txt`, unit);
await writeFile(
  `${dir}/typescript.txt`,
  execFileSync("npm", ["run", "lint"], { encoding: "utf8" }).trimEnd() + "\n",
);
const capture = JSON.parse(
  await readFile(`${screenshots}/capture.json`, "utf8"),
);
const before = JSON.parse(await readFile(`${baseline}/capture.json`, "utf8"));
if (
  (await readdir(screenshots)).filter((f) => f.endsWith(".png")).length !== 6 ||
  capture.errors.length ||
  capture.captures.length !== 6
)
  throw Error("Invalid six-image capture");
for (const [i, c] of capture.captures.entries()) {
  if (
    c.cells !== 48 ||
    c.guards !== 9 ||
    c.cargo !== 13 ||
    c.hp !== (i === 5 ? 175 : 200)
  )
    throw Error("Unexpected rendered world/state: " + c.name);
}
if (
  !capture.captures[3].animations.some((a) => a.clip === "Walk") ||
  !capture.captures[5].animations.some((a) => a.clip === "Strike")
)
  throw Error("Action capture incomplete");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const comparison = [];
for (const i of [0, 2]) {
  const b = before.captures[i],
    c = capture.captures[i];
  for (const field of ["position", "target"])
    if (JSON.stringify(c[field]) !== JSON.stringify(b[field]))
      throw Error("Camera mismatch: " + c.name);
  comparison.push({
    before: `${baseline}/${b.name}.png`,
    after: `${screenshots}/${c.name}.png`,
    position: c.position,
    target: c.target,
    beforeSHA256: hash(await readFile(`${baseline}/${b.name}.png`)),
    afterSHA256: hash(await readFile(`${screenshots}/${c.name}.png`)),
    note: "Same camera position and target; inventory and health HUD differ.",
  });
}
const web = JSON.parse(await readFile("downloads/latest.json", "utf8"));
const android = JSON.parse(
  await readFile("downloads/android-latest.json", "utf8"),
);
for (const [file, expected] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
])
  if (hash(await readFile("downloads/" + file)) !== expected)
    throw Error("Artifact hash mismatch");
const crc = execFileSync("unzip", ["-t", "downloads/" + web.archive], {
  encoding: "utf8",
});
await writeFile(`${dir}/zip-integrity.txt`, crc);
const smokeDir = process.env.APK_SMOKE_DIR || "/workspace/hirodora-v17-apk";
const smoke = JSON.parse(
  await readFile(`${smokeDir}/apk-assets-smoke.json`, "utf8"),
);
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length ||
  smoke.serviceWorkers
)
  throw Error("APK payload verification mismatch");
for (const asset of ["wood-stairs-", "wood-box-", "cargo-pallet-"])
  if (!smoke.served.some((url) => url.includes(asset) && url.endsWith(".glb")))
    throw Error("Actual APK did not load the supplied asset: " + asset);
await writeFile(
  `${dir}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
const sdk = process.env.ANDROID_HOME;
if (!sdk) throw Error("ANDROID_HOME is required for signature verification");
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
  throw Error("APK release signature mismatch");
await writeFile(`${dir}/apk-signature.txt`, signature);
const androidLint = await readFile(
  "android/app/build/reports/lint-results-release.xml",
  "utf8",
);
if (/severity="(?:Error|Fatal)"/.test(androidLint))
  throw Error("Android lint errors remain");
await copyFile(
  "android/app/build/reports/lint-results-release.xml",
  `${dir}/android-lint.xml`,
);
const assets = JSON.parse(
  await readFile("src/assets/environment/cargo-manifest.json", "utf8"),
);
for (const source of assets.sources)
  if (
    hash(await readFile("src/assets/environment/" + source.file)) !==
    source.runtimeSHA256
  )
    throw Error("Cargo asset hash mismatch");
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.17.0",
      unitPassed: 70,
      selectedBrowserCasesPassed: cases.size,
      wholeBrowserSuiteRerun: false,
      typescript: "passed",
      androidLint: {
        errors: 0,
        warnings: (androidLint.match(/severity="Warning"/g) || []).length,
      },
      apkV2Signature: "passed; existing release certificate",
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      screenshots: capture.captures.map((c) => ({
        name: c.name,
        hp: c.hp,
        triangles: c.triangles,
        calls: c.calls,
      })),
      comparison,
      assets: assets.sources,
      artifacts: { web, android },
      limits: [
        "Browser checks use SwiftShader, not physical phone GPUs.",
        "Only selected regression scenarios were rerun; individual run statistics retain failures and focused reruns if any.",
        "Earlier temporary run files were lost on environment resume; this report records the retained final-code rerun.",
        "Kneeling/strike clips are authored skeletal poses, not new motion capture, chair-sitting AI or physics combat.",
        "Hardware FPS, thermal and device-specific WebView testing remains pending.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Validated 70 unit checks, 24 selected browser cases, six renders, two identical cameras, ZIP integrity and actual APK payload.",
);
