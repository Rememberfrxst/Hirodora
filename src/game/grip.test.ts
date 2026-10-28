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

test("authored glove has physically thicker skin around unchanged anatomical joints", async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const bytes = await readFile(
    new URL("../assets/guards/first-person-arm.glb", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    anatomy.runtimeSHA256,
  );
  const output = await io.readBinary(bytes),
    source = await io.read(
      new URL("../assets/guards/prisoner.glb", import.meta.url).pathname,
    );
  const radius = (doc: typeof source, name: string) => {
    const node = doc
        .getRoot()
        .listNodes()
        .find((n) => n.getSkin())!,
      skin = node.getSkin()!;
    const joint = skin.listJoints().findIndex((n) => n.getName() === name),
      matrix = new THREE.Matrix4().fromArray(
        skin.getInverseBindMatrices()!.getElement(joint, []),
      );
    let sum = 0,
      count = 0;
    // Both output primitives share attributes: count each POSITION accessor once.
    const seen = new Set();
    for (const p of node.getMesh()!.listPrimitives()) {
      const positions = p.getAttribute("POSITION")!,
        joints = p.getAttribute("JOINTS_0")!,
        weights = p.getAttribute("WEIGHTS_0")!;
      if (seen.has(positions)) continue;
      seen.add(positions);
      for (let i = 0; i < positions.getCount(); i++) {
        const js = joints.getElement(i, []),
          ws = weights.getElement(i, []);
        // Finger skin intentionally blends neighbouring phalanges; it has
        // only one >98.5%-weighted vertex but eleven above 90%.
        if (
          !js.some(
            (j, k) =>
              j === joint && ws[k] > (name.includes("Index") ? 0.9 : 0.985),
          )
        )
          continue;
        const point = new THREE.Vector3()
          .fromArray(positions.getElement(i, []))
          .applyMatrix4(matrix);
        sum += Math.hypot(point.x, point.z);
        count++;
      }
    }
    assert.ok(count > 10, name);
    return sum / count;
  };
  for (const name of ["RightForeArm", "RightHand", "RightHandIndex2"]) {
    const ratio = radius(output, name) / radius(source, name);
    assert.ok(ratio > 1.08 && ratio < 1.23, `${name} radial size ${ratio}`);
  }
  const a = source.getRoot().listSkins()[0].listJoints(),
    b = output.getRoot().listSkins()[0].listJoints();
  for (const joint of b) {
    const original = a.find((n) => n.getName() === joint.getName())!;
    assert.deepEqual(joint.getTranslation(), original.getTranslation());
    assert.deepEqual(joint.getRotation(), original.getRotation());
  }
});

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
  const clearance = point("RightHandIndex4").distanceTo(
    point("RightHandThumb4"),
  );
  assert.ok(
    clearance > 0.02 && clearance < 0.033,
    "key fits between thicker glove pads without interpenetration",
  );
  poseGrip(arm, rest, "pistol10");
  assert.ok(
    point("RightHandIndex3").distanceTo(
      new THREE.Vector3(-0.028, 0.14, 0.048),
    ) < 0.006,
    `uploaded 10mm trigger sits against the curled index joint: ${point("RightHandIndex3").toArray()}`,
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
  assert.equal(gripStyle("pistol_10mm"), "pistol10");
});
