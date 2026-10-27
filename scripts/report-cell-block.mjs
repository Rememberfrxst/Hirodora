import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const [fullPath, targetedPath] = process.argv.slice(2);
if (!targetedPath)
  throw Error("Supply full-run and final-targeted Playwright JSON reports.");
const full = JSON.parse(await readFile(fullPath, "utf8")),
  targeted = JSON.parse(await readFile(targetedPath, "utf8"));
function cases(suites) {
  return suites.flatMap((s) => [
    ...(s.specs || []).flatMap((spec) =>
      spec.tests.map((t) => ({
        file: spec.file,
        title: spec.title,
        status: t.results.at(-1)?.status,
      })),
    ),
    ...cases(s.suites || []),
  ]);
}
const finalCases = new Map();
for (const result of [...cases(full.suites), ...cases(targeted.suites)])
  finalCases.set(result.file + ":" + result.title, result);
assert.equal(finalCases.size, 33);
assert.ok(
  [...finalCases.values()].every((t) => t.status === "passed"),
  "all scenarios must pass after the final targeted rerun",
);
assert.equal(targeted.stats.unexpected, 0);
const apk = JSON.parse(await readFile("downloads/android-latest.json", "utf8"));
const smoke = JSON.parse(
  await readFile("docs/verification/block-v12/apk-assets-smoke.json", "utf8"),
);
assert.equal(apk.sha256, smoke.apkSHA256);
assert.equal(smoke.pageErrors.length, 0);
assert.equal(smoke.missing.length, 0);
const directory = "docs/screenshots/block-v12";
const pngs = (await readdir(directory))
  .filter((f) => f.endsWith(".png"))
  .sort();
assert.equal(pngs.length, 6);
const report = {
  version: "0.12.0",
  baselineCommit: "37a6b3e5907a2d516c4dacaaccee2baea20d1920",
  unitAndAssetChecks: { passed: 57, failed: 0 },
  typeScript: "passed",
  productionBuild: "passed",
  browserVerification: {
    uniqueScenarios: finalCases.size,
    allPassingAfterFixes: true,
    fullRun: full.stats,
    finalTargetedRun: targeted.stats,
    resolution:
      "The full run passed 32/33. The mobile cancel test still selected the removed center button; its locator was updated to the actual contextual action. The final targeted run rechecks that scenario, guard approach/gates, HUD/menu, stealth and the current production/offline payloads. No unresolved failure remains.",
    scenarios: [...finalCases.values()],
  },
  android: {
    ...apk,
    versionCode: 1200,
    assembleRelease: "passed",
    lintRelease: "0 errors, 10 existing warnings",
    signatureV2: "verified; existing certificate retained",
    packagedGameSmoke:
      "passed; actual APK payload, 86 local assets, zero runtime network requests/errors",
  },
  screenshots: await Promise.all(
    pngs.map(async (file) => ({
      file,
      sha256: createHash("sha256")
        .update(await readFile(`${directory}/${file}`))
        .digest("hex"),
    })),
  ),
  unfinished: {
    warrior:
      "Upload exceeds the executor's 32 MiB file-transfer limit; supply a smaller ZIP/GLB or a direct download URL plus license.",
    police:
      "Uploaded static GLB has 122708 triangles, 0 skins, 0 clips and no embedded source/license; redistribution terms and skeletal integration remain pending.",
    icons:
      "Desktop-only PNG paths unavailable. Reference-matched vector arrow and bulb are used; not the original PNG bytes.",
    hardware:
      "Physical Android performance/GPU/WebView and extended playtesting remain unverified.",
  },
};
await mkdir("docs/verification/block-v12", { recursive: true });
await writeFile(
  "docs/verification/block-v12/release.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Verified ${finalCases.size} unique browser scenarios after fixes, final APK hash, and exactly six screenshots.`,
);
