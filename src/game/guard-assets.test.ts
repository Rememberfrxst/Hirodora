import { test } from "node:test";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

for (const tier of ["hero", "mobile", "distant"])
  test(`${tier} GLB has complete embedded PBR, valid skin weights and matching skeleton`, async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
    const doc = await io.read(
      new URL(`../assets/guards/officer-${tier}.glb`, import.meta.url).pathname,
    );
    const root = doc.getRoot();
    assert.ok(root.listSkins().length > 0);
    const joints = root.listSkins()[0].listJoints();
    assert.equal(joints.length, 69);
    for (const name of [
      "Hips",
      "Spine2",
      "Head",
      "LeftEye",
      "RightEye",
      "LeftHandIndex1",
      "RightFoot",
    ])
      assert.ok(
        joints.some((b) => b.getName() === name),
        name,
      );
    for (const texture of root.listTextures()) {
      assert.ok(texture.getImage()!.byteLength > 0, texture.getName());
      assert.equal(texture.getURI(), "", "No runtime external texture URLs");
    }
    for (const mat of root.listMaterials()) {
      assert.ok(mat.getMetallicRoughnessTexture(), mat.getName() + " ORM");
      assert.ok(mat.getOcclusionTexture(), mat.getName() + " AO");
    }
    assert.ok(
      root
        .listMaterials()
        .some((m) => m.getName() === "Skin" && m.getBaseColorTexture()),
    );
    assert.ok(
      root
        .listMaterials()
        .some((m) => m.getName() === "Outfit" && m.getNormalTexture()),
    );
    for (const mesh of root.listMeshes())
      for (const prim of mesh.listPrimitives()) {
        const weights = prim.getAttribute("WEIGHTS_0")!,
          indices = prim.getAttribute("JOINTS_0")!;
        assert.ok(
          weights && indices,
          "Every visible part, including equipment, is skinned",
        );
        for (let i = 0; i < weights.getCount(); i++) {
          const w = weights.getElement(i, []);
          assert.ok(
            Math.abs(w.reduce((n, x) => n + x, 0) - 1) < 0.015,
            "normalized skin weights",
          );
          assert.ok(
            indices.getElement(i, []).every((j) => j < joints.length),
            "valid bone index",
          );
        }
      }
    if (tier === "hero") {
      assert.deepEqual(
        root.listAnimations().map((a) => a.getName()),
        [
          "Idle",
          "Walk",
          "Run",
          "Turn left 45°",
          "Turn right 45°",
          "Investigate",
          "Search",
          "Alert",
          "Collapse",
        ],
      );
      for (const anim of root.listAnimations())
        assert.ok(anim.listChannels().length > 50);
    } else
      assert.equal(
        root.listAnimations().length,
        0,
        "Lower LODs reuse hero clips",
      );
  });
