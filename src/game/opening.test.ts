import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceHold, openingObjective, stepCaughtMeter } from "./opening";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
test("opening reveals the key identity only after trying the door and keeps the tool sequence", () => {
  assert.match(openingObjective({}, []), /key behind/);
  assert.equal(
    openingObjective({}, ["cell_key"]),
    "Try the key on your cell door.",
  );
  assert.match(
    openingObjective({ key_identified: true }, ["cell_key"]),
    /Push your table/,
  );
  assert.match(
    openingObjective({ bed_moved: true }, ["cell_key"]),
    /screwdriver/,
  );
  assert.match(openingObjective({}, ["screwdriver"]), /Unbolt/);
  assert.match(
    openingObjective({ toilet_unbolted: true }, []),
    /Move the toilet/,
  );
  assert.match(openingObjective({ passage_open: true }, []), /Penetrate/);
  assert.match(
    openingObjective({ cell46_reached: true }, []),
    /Cell 46 reached/,
  );
});
test("hold progress is bounded, incremental and frame-rate independent at supported timesteps", () => {
  assert.equal(advanceHold(0.9, -1, 9), 0.9);
  assert.equal(advanceHold(0.999, 0.05, 9), 1);
  let slow = 0,
    fast = 0;
  for (let i = 0; i < 270; i++) slow = advanceHold(slow, 1 / 30, 9);
  for (let i = 0; i < 540; i++) fast = advanceHold(fast, 1 / 60, 9);
  assert.ok(Math.abs(slow - fast) < 1e-10);
});
test("caught meter rises with contact, cools when released, and is independent of saved work", () => {
  for (const action of ["bed_push", "toilet_move", "toilet_bolts"] as const) {
    let risk = 0,
      progress = 0;
    for (let i = 0; i < 200; i++) risk = stepCaughtMeter(risk, 0.05, action);
    assert.equal(risk, 100);
    for (let i = 0; i < 80; i++) risk = stepCaughtMeter(risk, 0.05, null);
    assert.equal(risk, 0);
    assert.ok(
      stepCaughtMeter(20, 0.05, action, true) >
        stepCaughtMeter(20, 0.05, action, false),
    );
    let a = 0,
      b = 0;
    for (let i = 0; i < 60; i++) a = stepCaughtMeter(a, 1 / 60, action);
    for (let i = 0; i < 30; i++) b = stepCaughtMeter(b, 1 / 30, action);
    assert.ok(Math.abs(a - b) < 1e-9);
    progress = advanceHold(progress, 0.05, 9);
    assert.ok(progress > 0);
    assert.equal(stepCaughtMeter(1, -2, null), 1);
  }
});
test("all audio recordings have verified local bytes, redistribution licenses and attribution", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../assets/audio/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(manifest.length >= 50);
  for (const asset of manifest) {
    const buffer = await readFile(
      new URL("../assets/audio/" + asset.file, import.meta.url),
    );
    assert.ok(["CC0-1.0", "CC-BY-3.0"].includes(asset.license));
    assert.ok(asset.licenseURL);
    assert.match(asset.source, /^https:\/\//);
    assert.ok(asset.author);
    assert.equal(buffer.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      asset.sha256,
    );
  }
});
