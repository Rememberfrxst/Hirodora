import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
test("supplied Warrior is a credited textured mesh and held arm retains real finger anatomy", async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const directory = new URL("../assets/guards/", import.meta.url);
  const bytes = await readFile(new URL("redeemed-warrior.glb", directory));
  const manifest = JSON.parse(
    await readFile(
      new URL("redeemed-warrior-manifest.json", directory),
      "utf8",
    ),
  );
  assert.equal(
    manifest.runtimeSHA256,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.equal(manifest.license, "CC BY 4.0");
  assert.ok(manifest.triangles > 90000 && manifest.triangles < 120000);
  const d = await io.readBinary(bytes);
  assert.ok(
    d
      .getRoot()
      .listMaterials()
      .every((m) => m.getBaseColorTexture()?.getImage()?.length),
  );
  const arm = await io.read(
    new URL("first-person-arm.glb", directory).pathname,
  );
  const joints = arm
    .getRoot()
    .listSkins()[0]
    .listJoints()
    .map((j) => j.getName());
  for (const name of [
    "RightForeArm",
    "RightHand",
    "RightHandThumb1",
    "RightHandIndex3",
    "RightHandPinky3",
  ])
    assert.ok(joints.includes(name));
  assert.ok(
    arm.getRoot().listMeshes()[0].listPrimitives()[0].getIndices()!.getCount() >
      300,
  );
});
