import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const baseline = process.argv[2];
if (!baseline) throw Error("Supply the before capture.json path.");
const directory = "docs/screenshots/assets-v11";
const before = JSON.parse(await readFile(baseline, "utf8"));
const after = JSON.parse(await readFile(`${directory}/capture.json`, "utf8"));
assert.deepEqual(after.views, before.views, "identical cameras and viewports");
assert.equal(after.errors.length, 0);
const files = (await readdir(directory))
  .filter((f) => f.endsWith(".png"))
  .sort();
assert.equal(files.length, 6, "exactly six newly published screenshots");
const comparisons = [];
for (let i = 0; i < after.results.length; i++) {
  const b = before.results[i],
    a = after.results[i];
  assert.deepEqual(
    a.interactions,
    b.interactions,
    "same puzzle prerequisites and interaction IDs",
  );
  assert.equal(
    a.colliders.length,
    b.colliders.length,
    "no architecture/collision removed",
  );
  const changes = [];
  for (let j = 0; j < a.colliders.length; j++) {
    if (JSON.stringify(a.colliders[j]) === JSON.stringify(b.colliders[j]))
      continue;
    const previous = b.colliders[j],
      current = a.colliders[j];
    assert.ok(
      previous[0] < -3 &&
        previous[2] < -2 &&
        previous[1] >= -0.051 &&
        previous[4] < 2.5,
      "only cell furniture changes, not walls/doors",
    );
    changes.push({ index: j, before: previous, after: current });
  }
  assert.equal(
    changes.length,
    11,
    "six tables + five toilets fitted to the new meshes",
  );
  comparisons.push({
    name: a.name,
    position: a.position,
    target: a.target,
    mobile: a.mobile,
    before: { calls: b.calls, triangles: b.triangles },
    after: { calls: a.calls, triangles: a.triangles },
    intentionalFurnitureBounds: changes,
  });
}
const report = {
  baselineCommit: "cdf40f123a8c5fb10780452efb76395a2b7646bf",
  method:
    "Real game at identical staged cameras; High preset, 1280x800 desktop / 960x450 landscape. Six new after PNGs only; baseline PNGs inspected locally. Triangle counts include shadows, not FPS.",
  comparisons,
  screenshots: await Promise.all(
    files.map(async (file) => ({
      file,
      sha256: createHash("sha256")
        .update(await readFile(`${directory}/${file}`))
        .digest("hex"),
    })),
  ),
};
await mkdir("docs/verification/assets-v11", { recursive: true });
await writeFile(
  "docs/verification/assets-v11/comparison.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Matched all six cameras; only 11 intentional furniture collision volumes differ; interaction prerequisites unchanged.",
);
