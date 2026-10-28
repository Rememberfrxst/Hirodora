import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { NodeIO, type Node } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { gripStyle, poseGrip } from "./grip";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import anatomy from "../assets/guards/hand-manifest.json";
async function readArm() {
  await MeshoptDecoder.ready;
  const bytes = await readFile(
    new URL("../assets/guards/first-person-arm.glb", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    anatomy.runtimeSHA256,
  );
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .readBinary(bytes);
}
test("supplied CC BY hands retain real skin/PBR, two independent rigs and documented source hashes", async () => {
  const d = await readArm();
  assert.match(anatomy.license, /CC-BY-4.0/);
  assert.match(anatomy.source, /cbefd9fe847541dd8192e3281adf1bce/);
  assert.ok(anatomy.bytes < 2_000_000 && anatomy.triangles > 5000);
  assert.equal(d.getRoot().listSkins().length, 2);
  for (const side of ["Right", "Left"]) {
    const node = d
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === side + "ArmMesh")!;
    assert.ok(node.getSkin());
    const joints = node
      .getSkin()!
      .listJoints()
      .map((n) => n.getName());
    for (const joint of ["ForeArm", "Hand", "HandIndex3", "HandThumb3"])
      assert.ok(joints.includes(side + joint));
    assert.ok(
      joints.every((n) => n.startsWith(side)),
      "left/right weights cannot deform the other arm",
    );
  }
  assert.ok(
    d
      .getRoot()
      .listMaterials()
      .every(
        (m) =>
          m.getBaseColorTexture() &&
          m.getNormalTexture() &&
          m.getMetallicRoughnessTexture(),
      ),
  );
  for (const mesh of d.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      assert.ok(p.getAttribute("POSITION")!.getArray()!.every(Number.isFinite));
      assert.ok(p.getAttribute("TEXCOORD_0"));
      assert.ok(p.getAttribute("JOINTS_0"));
    }
});
test("uploaded right hand reaches key pads/10mm trigger without wrist twisting or cumulative deformation", async () => {
  const d = await readArm(),
    arm = new THREE.Group();
  const build = (n: Node) => {
    const o = new THREE.Object3D();
    o.name = n.getName();
    o.position.fromArray(n.getTranslation());
    o.quaternion.fromArray(n.getRotation());
    o.scale.fromArray(n.getScale());
    n.listChildren().forEach((c) => o.add(build(c)));
    return o;
  };
  d.getRoot()
    .getDefaultScene()!
    .listChildren()
    .forEach((n) => arm.add(build(n)));
  const rest = new Map<string, THREE.Quaternion>();
  arm.traverse((b) => {
    if (/^(Right|Left)Hand/.test(b.name))
      rest.set(b.name, b.quaternion.clone());
  });
  const hand = arm.getObjectByName("RightHand")!;
  const point = (name: string) =>
    hand.worldToLocal(
      arm.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()),
    );
  poseGrip(arm, rest, "power");
  const power = point("RightHandIndex4");
  poseGrip(arm, rest, "pinch");
  assert.ok(
    point("RightHandIndex4").distanceTo(
      new THREE.Vector3(-0.045, 0.145, 0.045),
    ) < 0.003,
  );
  assert.ok(
    point("RightHandThumb4").distanceTo(
      new THREE.Vector3(-0.035, 0.123, 0.045),
    ) < 0.003,
  );
  poseGrip(arm, rest, "pistol10");
  assert.ok(
    point("RightHandIndex3").distanceTo(
      new THREE.Vector3(-0.028, 0.14, 0.048),
    ) < 0.006,
    JSON.stringify({
      point: point("RightHandIndex3").toArray(),
      base: point("RightHandIndex1").toArray(),
      l1: arm.getObjectByName("RightHandIndex2")!.position.length(),
      l2: arm.getObjectByName("RightHandIndex3")!.position.length(),
    }),
  );
  for (let i = 0; i < 30; i++) {
    poseGrip(arm, rest, "pistol10");
    poseGrip(arm, rest, "pinch");
    poseGrip(arm, rest, "power");
  }
  assert.ok(point("RightHandIndex4").distanceTo(power) < 1e-8);
  assert.ok(hand.quaternion.angleTo(rest.get("RightHand")!) < 1e-7);
  arm.traverse((o) => assert.ok(o.quaternion.toArray().every(Number.isFinite)));
  assert.equal(gripStyle("pistol_10mm"), "pistol10");
  assert.equal(gripStyle("dart_pistol"), "pistol");
  assert.equal(gripStyle("cell_key"), "pinch");
  assert.equal(gripStyle("screwdriver"), "power");
});
