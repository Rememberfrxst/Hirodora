import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const dir = "docs/verification/sliding-v15";
await mkdir(dir, { recursive: true });
const runs = [],
  cases = new Map();
for (const [i, file] of process.argv.slice(2).entries()) {
  const data = JSON.parse(await readFile(file, "utf8"));
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
if (cases.size !== 12 || [...cases.values()].some((s) => s !== "passed"))
  throw Error("Targeted coverage is incomplete: " + JSON.stringify([...cases]));
const unit = execFileSync("npm", ["test"], { encoding: "utf8" });
if (!/(?:ℹ|#) pass 63\b/.test(unit)) throw Error("Unit checks incomplete.");
await writeFile(`${dir}/unit-tests.txt`, unit);
const images = (await readdir("docs/screenshots/sliding-v15")).filter((p) =>
  p.endsWith(".png"),
);
const capture = JSON.parse(
  await readFile("docs/screenshots/sliding-v15/capture.json", "utf8"),
);
const before = JSON.parse(
  await readFile("docs/screenshots/atrium-v14/capture.json", "utf8"),
);
if (
  images.length !== 6 ||
  capture.errors.length ||
  capture.captures.some((c) => c.cellCount !== 48 || c.cell46Slide !== 1)
)
  throw Error("Invalid final screenshot set.");
for (let i = 0; i < 2; i++)
  for (const field of ["position", "target"])
    if (
      JSON.stringify(capture.captures[i][field]) !==
      JSON.stringify(before.captures[i][field])
    )
      throw Error("Comparison camera mismatch.");
const web = JSON.parse(await readFile("downloads/latest.json", "utf8"));
const android = JSON.parse(
  await readFile("downloads/android-latest.json", "utf8"),
);
for (const [file, hash] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
])
  if (
    createHash("sha256")
      .update(await readFile("downloads/" + file))
      .digest("hex") !== hash
  )
    throw Error("Artifact hash mismatch.");
const crc = execFileSync("unzip", ["-t", "downloads/" + web.archive], {
  encoding: "utf8",
});
await writeFile(`${dir}/zip-integrity.txt`, crc);
const smoke = JSON.parse(
  await readFile("/tmp/hirodora-v15-final-apk/apk-assets-smoke.json", "utf8"),
);
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length
)
  throw Error("Final APK smoke mismatch.");
await writeFile(
  `${dir}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
await writeFile(
  `${dir}/report.json`,
  JSON.stringify(
    {
      version: "0.15.0",
      layout: {
        cells: 48,
        corridorWidth: 18,
        doorWidth: 1.4,
        slideSeconds: 0.7,
      },
      unitChecks: 63,
      targetedBrowserScenarios: cases.size,
      runs,
      cases: [...cases],
      images,
      web,
      android,
      note: "Targeted gate/layout regression coverage; the entire 37-scenario browser suite was not rerun. Physical-device GPU/thermal testing remains open.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Verified 63 unit checks, 12 targeted scenarios, six matched renders and final APK/ZIP hashes.",
);
