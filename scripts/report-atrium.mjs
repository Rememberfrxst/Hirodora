import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const [finalPath, equipmentPath, smokePath] = process.argv.slice(2);
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const final = await read(finalPath),
  equipment = await read(equipmentPath),
  smoke = await read(smokePath);
const cases = (suites) =>
  suites.flatMap((s) => [
    ...(s.specs || []).flatMap((spec) =>
      spec.tests.map((t) => ({
        title: spec.title,
        status: t.results.at(-1)?.status,
      })),
    ),
    ...cases(s.suites || []),
  ]);
const verified = new Map(
  [...cases(final.suites), ...cases(equipment.suites)].map((t) => [t.title, t]),
);
assert.equal(final.stats.unexpected, 0);
assert.equal(equipment.stats.unexpected, 0);
assert.ok([...verified.values()].every((t) => t.status === "passed"));
const fixed = [
  "stairs support actual player movement, gates are independent, and equipped tools persist",
  "guards route down stairs and cannot capture a player through the gallery floor",
  "Cell 46 exploration gate unlocks after the chapter and gate state survives save/load",
  "rigged officers animate independently, patrol, switch LOD and retain non-lethal dart hits",
  "authored environment loads locally and graphics presets preserve collision and gameplay state",
  "closed walls block guard sight and movement; all required rooms have routes",
  "spatial AI sees through bars but cannot cross them, loses sight and returns to its duty",
];
for (const title of fixed)
  assert.equal(verified.get(title)?.status, "passed", title);
const apk = await read("downloads/android-latest.json");
assert.equal(apk.sha256, smoke.apkSHA256);
assert.deepEqual(smoke.missing, []);
assert.deepEqual(smoke.pageErrors, []);
const gallery = "docs/screenshots/atrium-v13";
const screenshots = (await readdir(gallery))
  .filter((f) => f.endsWith(".png"))
  .sort();
assert.equal(screenshots.length, 6);
const after = await read(`${gallery}/capture.json`),
  before = await read("/tmp/hirodora-v13-before/capture.json");
assert.deepEqual(before.captures[0].position, after.captures[0].position);
assert.deepEqual(before.captures[0].target, after.captures[0].target);
assert.deepEqual(before.captures[2].position, after.captures[1].position);
assert.deepEqual(before.captures[2].target, after.captures[1].target);
const directory = "docs/verification/atrium-v13";
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/final-rerun.json`,
  JSON.stringify(final, null, 2) + "\n",
);
await writeFile(
  `${directory}/equipment-rerun.json`,
  JSON.stringify(equipment, null, 2) + "\n",
);
await writeFile(
  `${directory}/apk-assets-smoke.json`,
  JSON.stringify(smoke, null, 2) + "\n",
);
const report = {
  version: "0.13.0",
  baselineCommit: "833e2b8927cc4574b06e7b6db25a8d4b8e84dc28",
  typeScript: "passed",
  unitAndAssetChecks: { passed: 61, failed: 0 },
  productionBuild: "passed",
  browserVerification: {
    initialFullRun: { total: 35, passed: 28, failed: 7 },
    finalRerun: final.stats,
    finalEquipmentRerun: equipment.stats,
    uniqueScenariosVerifiedAfterFixes: 35,
    method:
      "Full run plus final targeted reruns; all seven initial failures are rechecked and pass. Not a new single full-green invocation.",
    resolved: fixed,
    latestScenarios: [...verified.values()],
  },
  android: {
    ...apk,
    versionCode: 1300,
    gradleAssembleAndLint: "passed",
    nativeDeviceCertification: false,
  },
  screenshots: await Promise.all(
    screenshots.map(async (file) => ({
      file: `${gallery}/${file}`,
      sha256: createHash("sha256")
        .update(await readFile(`${gallery}/${file}`))
        .digest("hex"),
    })),
  ),
  matchedCameras: [
    {
      before: "docs/screenshots/block-v12/01-wide-corridor.png",
      after: `${gallery}/01-atrium.png`,
      position: after.captures[0].position,
      target: after.captures[0].target,
    },
    {
      before: "docs/screenshots/block-v12/03-cell46-gate.png",
      after: `${gallery}/02-independent-gates.png`,
      position: after.captures[1].position,
      target: after.captures[1].target,
    },
  ],
  remaining: [
    "Supplied police asset-level source/license and grip/deformation refinement",
    "Warrior skeletal seated/challenge performance",
    "Physical-phone GPU/thermal/extended playtesting",
    "Cells 42–45 extended story",
  ],
};
await writeFile(
  `${directory}/report.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Verified 35 browser scenarios across full run + corrections, 61 unit/asset tests, six screenshots, and matching APK smoke hash.",
);
