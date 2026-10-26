import { test } from "node:test";
import assert from "node:assert/strict";
import { introFrame, INTRO_DURATION, SHOT_TIME } from "./intro";
import { parseSettings, defaultSettings } from "./settings";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

test("intro orders open, escape, shot, approach, lock and inspection before release", () => {
  assert.equal(introFrame(-20).doorAngle, 0);
  assert.equal(introFrame(3).prisonerClip, "Run");
  assert.equal(introFrame(SHOT_TIME).prisonerClip, "Death");
  assert.equal(introFrame(8.5).stage, "close");
  assert.equal(introFrame(10.5).doorAngle, 0);
  assert.equal(introFrame(16).stage, "inspect");
  assert.equal(introFrame(INTRO_DURATION).stage, "ready");
  assert.ok(Math.abs(introFrame(999).prisoner[0] + 6.4) < 1e-6);
  assert.ok(Math.abs(introFrame(999).prisoner[2] + 0.1) < 1e-6);
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
