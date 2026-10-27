import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const dir = "docs/verification/reference-v16",
  screenshots = "docs/screenshots/reference-v16";
const baseline = process.env.BASELINE_DIR || "/tmp/hirodora-reference-before";
await mkdir(dir, { recursive: true });
const cases = new Map(),
  runs = [];
for (const [i, path] of process.argv.slice(2).entries()) {
  const data = JSON.parse(await readFile(path, "utf8"));
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
if (cases.size !== 39 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Browser coverage incomplete: " + JSON.stringify([...cases]));
const unit = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 65\b/.test(unit)) throw Error("Unit checks incomplete");
await writeFile(`${dir}/unit-tests.txt`, unit);
const capture = JSON.parse(
  await readFile(`${screenshots}/capture.json`, "utf8"),
);
const before = JSON.parse(await readFile(`${baseline}/capture.json`, "utf8"));
await copyFile(`${baseline}/capture.json`, `${dir}/before-cameras.json`);
if (
  (await readdir(screenshots)).filter((f) => f.endsWith(".png")).length !== 6 ||
  capture.errors.length ||
  capture.captures.length !== 6
)
  throw Error("Invalid six-image capture");
const comparison = [];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [i, c] of capture.captures.entries()) {
  const b = before.captures[i];
  for (const field of ["position", "target", "item"])
    if (JSON.stringify(c[field]) !== JSON.stringify(b[field]))
      throw Error("Camera/equipment mismatch: " + c.name);
  if (c.cells !== 48 || c.guards !== 9 || c.fogDensity !== 0.028)
    throw Error("Unexpected rendered world");
  comparison.push({
    name: c.name,
    position: c.position,
    target: c.target,
    item: c.item,
    beforeSHA256: hash(await readFile(`${baseline}/${b.name}.png`)),
    afterSHA256: hash(await readFile(`${screenshots}/${c.name}.png`)),
    beforeFog: b.fogDensity,
    afterFog: c.fogDensity,
  });
}
const web = JSON.parse(await readFile("downloads/latest.json", "utf8")),
  android = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
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
const smoke = JSON.parse(
  await readFile("/tmp/hirodora-v16-apk/apk-assets-smoke.json", "utf8"),
);
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length ||
  smoke.serviceWorkers
)
  throw Error("APK payload verification mismatch");
await writeFile(
  `${dir}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
const grips = JSON.parse(
  await readFile("/tmp/hirodora-v16-grips-final/inspection.json", "utf8"),
);
if (
  grips.errors.length ||
  grips.items.length !== 9 ||
  grips.items.some((i) => !i.visible)
)
  throw Error("Additional held-item inspection incomplete");
await writeFile(
  `${dir}/held-item-inspection.json`,
  JSON.stringify(grips, null, 2) + "\n",
);
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.16.0",
      unitPassed: 65,
      browserCasesPassed: cases.size,
      additionalHeldItemRenders: grips.items.length,
      runs,
      scenarios: [...cases].map(([name, status]) => ({ name, status })),
      comparison,
      artifacts: { web, android },
      limits: [
        "Browser runs use SwiftShader, not physical phone GPUs.",
        "Before screenshot bytes remain local; published v15 images provide the atrium/driver comparisons.",
        "Latest status per case includes explicit focused reruns; see individual run statistics.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Validated 65 unit checks, 39 browser cases, six matched renders, ZIP integrity and actual APK payload.",
);
