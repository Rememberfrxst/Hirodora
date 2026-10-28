import { test } from "node:test";
import assert from "node:assert/strict";
import { introFrame, INTRO_DURATION, SHOT_TIME, WAKE_DURATION } from "./intro";
import { parseSettings, defaultSettings } from "./settings";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import voices from "../assets/audio/intro-voice-manifest.json";
import { CELL_ROOMS, CELL_GATE_WIDTH } from "./cell-block";

test("intro orders open, escape, shot, approach, lock and inspection before release", () => {
  assert.equal(introFrame(-20).doorAngle, 0);
  assert.equal(introFrame(1).stage, "wake");
  assert.match(introFrame(1).caption, /wake up/i);
  assert.equal(introFrame(WAKE_DURATION + 3).prisonerClip, "Run");
  assert.equal(introFrame(SHOT_TIME).prisonerClip, "Death");
  assert.equal(introFrame(WAKE_DURATION + 8.5).stage, "close");
  assert.equal(introFrame(WAKE_DURATION + 10.5).doorAngle, 0);
  assert.equal(introFrame(WAKE_DURATION + 16).stage, "inspect");
  assert.equal(introFrame(INTRO_DURATION).stage, "ready");
  assert.ok(Math.abs(introFrame(999).prisoner[0] + 6.4) < 1e-6);
  assert.ok(Math.abs(introFrame(999).prisoner[2] + 0.1) < 1e-6);
  const cell = CELL_ROOMS.find((c) => c.number === 47)!;
  // Include torso clearance on both sides of the actual gate plane.
  for (let t = WAKE_DURATION + 1.6; t < SHOT_TIME; t += 0.01) {
    const [x, , z] = introFrame(t).prisoner;
    if (Math.abs(z - cell.front) < 0.28) {
      assert.ok(x > cell.doorX + 0.28);
      assert.ok(x < cell.doorX + CELL_GATE_WIDTH - 0.28);
    }
  }
});
test("five supplied dialogue clips have stable bytes, ordered non-overlapping cues and matching captions", async () => {
  assert.equal(voices.sources.length, 5);
  let end = 0;
  for (const cue of voices.sources) {
    const bytes = await readFile(
      new URL("../assets/audio/" + cue.file, import.meta.url),
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), cue.sha256);
    assert.equal(bytes.length, cue.bytes);
    assert.ok(cue.start >= end);
    assert.ok(introFrame(cue.start + 0.1).caption.includes(cue.text));
    end = cue.start + cue.duration;
  }
  assert.ok(end < INTRO_DURATION);
  assert.ok(
    voices.sources.find((c) => c.id === "guard-stay-down")!.start < SHOT_TIME,
  );
  assert.ok(
    voices.sources.find((c) => c.id === "guard-dead")!.start > SHOT_TIME + 1.8,
  );
});
test("settings validate saved ranges and recover from corrupted storage", () => {
  assert.deepEqual(parseSettings("bad"), defaultSettings);
  const s = parseSettings(
    '{"fov":300,"screenScale":-5,"sfx":0,"sensitivity":"wrong"}',
  );
  assert.equal(s.fov, 90);
  assert.equal(s.screenScale, 0.5);
  assert.equal(s.sfx, 0);
  assert.equal(s.sensitivity, 22);
});
test("prisoner is a complete clothed skinned GLB with local textures and skeletal death motion", async () => {
  await MeshoptDecoder.ready;
  const doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .read(new URL("../assets/guards/prisoner.glb", import.meta.url).pathname);
  const root = doc.getRoot();
  assert.equal(root.listSkins()[0].listJoints().length, 69);
  assert.deepEqual(
    root.listAnimations().map((a) => a.getName()),
    ["Idle", "Walk", "Run", "Death"],
  );
  assert.ok(
    root
      .listMaterials()
      .some((m) => m.getName() === "Outfit" && m.getBaseColorTexture()),
  );
  for (const t of root.listTextures()) {
    assert.equal(t.getURI(), "");
    assert.ok(t.getImage()!.length);
  }
});
