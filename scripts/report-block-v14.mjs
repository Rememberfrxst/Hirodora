import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const directory = "docs/verification/atrium-v14";
await mkdir(directory, { recursive: true });
const reports = process.argv.slice(2);
if (!reports.length)
  throw Error(
    "Supply the full Playwright JSON report, then any correction reports.",
  );
const statuses = new Map();
const runs = [];
for (let i = 0; i < reports.length; i++) {
  const data = JSON.parse(await readFile(reports[i], "utf8"));
  const cases = [];
  const visit = (suite) => {
    for (const spec of suite.specs || []) {
      const results = spec.tests.flatMap((t) => t.results);
      const status = results.at(-1)?.status;
      cases.push({ title: spec.title, status });
      statuses.set(spec.title, status);
    }
    for (const sub of suite.suites || []) visit(sub);
  };
  data.suites.forEach(visit);
  runs.push({ report: `browser-${i + 1}.json`, stats: data.stats, cases });
  await copyFile(reports[i], `${directory}/browser-${i + 1}.json`);
}
if (statuses.size !== 36 || [...statuses.values()].some((s) => s !== "passed"))
  throw Error(
    "Browser coverage has unverified scenarios: " +
      JSON.stringify([...statuses]),
  );
const unitOutput = execFileSync("npm", ["test"], { encoding: "utf8" });
await writeFile(`${directory}/unit-tests.txt`, unitOutput);
const units = Number(unitOutput.match(/(?:ℹ|#) pass (\d+)/)?.[1]);
if (units !== 61) throw Error("Unexpected unit coverage.");
const capture = JSON.parse(
  await readFile("docs/screenshots/atrium-v14/capture.json", "utf8"),
);
const before = JSON.parse(
  await readFile("docs/screenshots/atrium-v13/capture.json", "utf8"),
);
const images = (await readdir("docs/screenshots/atrium-v14")).filter((n) =>
  n.endsWith(".png"),
);
if (images.length !== 6 || capture.errors.length)
  throw Error("Invalid screenshot set.");
for (let i = 0; i < 2; i++)
  for (const key of ["position", "target"])
    if (
      JSON.stringify(capture.captures[i][key]) !==
      JSON.stringify(before.captures[i][key])
    )
      throw Error("Comparison camera changed.");
if (
  capture.captures.some(
    (c) => c.cellCount !== 48 || c.upperGuards !== 4 || c.lowerGuards !== 5,
  )
)
  throw Error("Capture does not show the final two-floor scene.");
const web = JSON.parse(await readFile("downloads/latest.json", "utf8"));
const android = JSON.parse(
  await readFile("downloads/android-latest.json", "utf8"),
);
const digest = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
if (
  (await digest("downloads/" + web.archive)) !== web.sha256 ||
  (await digest("downloads/" + android.file)) !== android.sha256
)
  throw Error("Packaged artifact hash mismatch.");
const zip = execFileSync("unzip", ["-t", "downloads/" + web.archive], {
  encoding: "utf8",
});
await writeFile(`${directory}/zip-integrity.txt`, zip);
const smoke = JSON.parse(
  await readFile("/tmp/hirodora-v14-apk-smoke/apk-assets-smoke.json", "utf8"),
);
if (
  smoke.apkSHA256 !== android.sha256 ||
  smoke.pageErrors.length ||
  smoke.missing.length ||
  smoke.serviceWorkers
)
  throw Error("Final APK smoke mismatch.");
await writeFile(
  `${directory}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
const report = {
  version: "0.14.0",
  units,
  browserScenarios: statuses.size,
  runs,
  screenshots: images,
  comparedCameras: 2,
  web,
  android,
  note: "Software-rendered browser and APK payload validation; physical Android GPU/thermal QA remains open.",
};
await writeFile(
  `${directory}/report.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Verified ${units} unit checks, ${statuses.size} browser scenarios, six renders, ZIP integrity and matching signed APK payload.`,
);
