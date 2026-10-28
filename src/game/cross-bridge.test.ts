import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { CROSS_BRIDGE, crossBridgeFootstep } from "./cross-bridge";
import { CELL_ROOMS } from "./cell-block";
import { supportHeight, surfaceHeights, findSurfacePath } from "./atrium";
import manifest from "../assets/environment/bridge-manifest.json";

test("Cell 041/054 crossing has continuous support on top and clear passage below", () => {
  const x = CROSS_BRIDGE.x;
  assert.equal(x, CELL_ROOMS.find((c) => c.number === 54)!.centerX);
  for (let z = 0; z <= 8; z += 0.1) {
    assert.equal(supportHeight(x, z, 0), 0);
    assert.equal(supportHeight(x, z, -3.2), -3.2);
  }
  assert.deepEqual(surfaceHeights(x + 2, 4), [-3.2]);
  const route = findSurfacePath([x, 0, 0], [x, 0, 8], []);
  assert.ok(route.length > 10);
  assert.ok(route.every((p) => Math.abs(p[0] - x) < 0.1 && p[1] === 0));
  assert.equal(crossBridgeFootstep([x, 0, 4]), true);
  assert.equal(crossBridgeFootstep([x, -3.2, 4]), false);
  assert.equal(crossBridgeFootstep([x + 2, 0, 4]), false);
});

test("uploaded CC BY bridge retains real UV/PBR geometry, fitted deck and documented hashes", async () => {
  await MeshoptDecoder.ready;
  const bytes = await readFile(
    new URL("../assets/environment/metal-bridge.glb", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.runtimeSHA256,
  );
  assert.match(manifest.license, /CC-BY-4.0/);
  assert.match(manifest.source, /5933ffc71ca5427da825715660fa16d8/);
  const doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .readBinary(bytes);
  const bounds = getBounds(doc.getRoot().getDefaultScene()!);
  assert.ok(Math.abs(bounds.max[2] - bounds.min[2] - 6.2) < 0.002);
  assert.ok(Math.abs(bounds.max[1] - 1.1) < 0.002);
  let triangles = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      triangles += p.getIndices()!.getCount() / 3;
      assert.ok(p.getAttribute("TEXCOORD_0"));
      assert.ok(p.getMaterial()!.getBaseColorTexture());
      assert.ok(p.getMaterial()!.getNormalTexture());
      assert.ok(p.getMaterial()!.getMetallicRoughnessTexture());
    }
  assert.equal(triangles, 2580);
  assert.ok(bytes.length < 2_100_000);
});
