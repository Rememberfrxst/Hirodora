import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { NodeIO, type Node } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { gripStyle, poseGrip } from "./grip";

test("black glove retains real joints; anatomical grips preserve wrist and do not accumulate deformation", async () => {
  await MeshoptDecoder.ready;
  const d = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .read(
      new URL("../assets/guards/first-person-arm.glb", import.meta.url)
        .pathname,
    );
  assert.ok(
    d
      .getRoot()
      .listMaterials()
      .some(
        (m) =>
          m.getName() === "Black leather glove" &&
          m
            .getBaseColorFactor()
            .slice(0, 3)
            .every((c) => c < 0.04),
      ),
  );
  assert.ok(
    d
      .getRoot()
      .listMaterials()
      .every((m) => !m.getBaseColorTexture()),
    "no skin color texture under the glove",
  );
  const arm = new THREE.Group();
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
    if (/^RightHand/.test(b.name)) rest.set(b.name, b.quaternion.clone());
  });
  const hand = arm.getObjectByName("RightHand")!;
  const point = (name: string) =>
    hand.worldToLocal(
      arm.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()),
    );
  poseGrip(arm, rest, "power");
  const power = point("RightHandIndex4");
  assert.ok(
    power.x < -0.03 && power.y < 0.115,
    "fingers wrap toward palm, not sideways across neighbors",
  );
  poseGrip(arm, rest, "pinch");
  assert.ok(
    point("RightHandIndex4").distanceTo(point("RightHandThumb4")) < 0.02,
    "key is held between index and thumb",
  );
  for (let i = 0; i < 30; i++) {
    poseGrip(arm, rest, "pistol");
    poseGrip(arm, rest, "pinch");
    poseGrip(arm, rest, "power");
  }
  assert.ok(point("RightHandIndex4").distanceTo(power) < 1e-9);
  assert.ok(
    hand.quaternion.angleTo(rest.get("RightHand")!) < 1e-7,
    "no bent wrist from grip changes",
  );
  arm.traverse((o) => assert.ok(o.quaternion.toArray().every(Number.isFinite)));
  assert.equal(gripStyle("screwdriver"), "power");
  assert.equal(gripStyle("cell_key"), "pinch");
  assert.equal(gripStyle("dart_pistol"), "pistol");
});
