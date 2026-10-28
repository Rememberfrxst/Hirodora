/** Derive the first-person arm from the existing CC0 humanoid, with real fingers/UVs. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, meshopt, dequantize } from "@gltf-transform/functions";
import * as THREE from "three";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const d = await io.read("src/assets/guards/prisoner.glb");
await d.transform(dequantize());
const n = d
    .getRoot()
    .listNodes()
    .find((n) => n.getSkin()),
  names = n
    .getSkin()
    .listJoints()
    .map((j) => j.getName());
const mesh = n.getMesh();
const meshWorld = new THREE.Matrix4().fromArray(n.getWorldMatrix()),
  meshInverse = meshWorld.clone().invert();
const inverseBinds = n.getSkin().getInverseBindMatrices();
const jointFrames = n
  .getSkin()
  .listJoints()
  .map((j, i) => {
    const inverse = new THREE.Matrix4().fromArray(
      inverseBinds.getElement(i, []),
    );
    return { name: j.getName(), inverse, world: inverse.clone().invert() };
  });
let maxDelta = 0;
const glove = d
  .createMaterial("Black leather glove")
  .setBaseColorFactor([0.025, 0.029, 0.028, 1])
  .setMetallicFactor(0.02)
  .setRoughnessFactor(0.72);
const sleeve = d
  .createMaterial("Charcoal sleeve")
  .setBaseColorFactor([0.018, 0.022, 0.021, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.94);
for (const p of [...mesh.listPrimitives()]) {
  if (p.getMaterial().getName() !== "Skin") {
    mesh.removePrimitive(p);
    continue;
  }
  for (const target of p.listTargets()) p.removeTarget(target);
  const joints = p.getAttribute("JOINTS_0"),
    weights = p.getAttribute("WEIGHTS_0");
  // Enlarge the skin around each anatomical bone axis, not the skeleton or
  // finger lengths. Weighted radial deltas keep webs/wrist transitions smooth.
  const originalPositions = p.getAttribute("POSITION"),
    positions = new Float32Array(originalPositions.getCount() * 3);
  for (let i = 0; i < originalPositions.getCount(); i++) {
    const v = new THREE.Vector3()
        .fromArray(originalPositions.getElement(i, []))
        .applyMatrix4(meshWorld),
      delta = new THREE.Vector3();
    const js = joints.getElement(i, []),
      ws = weights.getElement(i, []);
    for (let k = 0; k < 4; k++) {
      const f = jointFrames[js[k]],
        radial =
          f.name === "RightForeArm"
            ? 1.2
            : f.name === "RightHand"
              ? 1.15
              : /^RightHand/.test(f.name)
                ? 1.12
                : 1;
      if (radial === 1 || !ws[k]) continue;
      const expanded = v.clone().applyMatrix4(f.inverse);
      expanded.x *= radial;
      expanded.z *= radial;
      expanded.applyMatrix4(f.world);
      delta.addScaledVector(expanded.sub(v), ws[k]);
    }
    maxDelta = Math.max(maxDelta, delta.length());
    positions.set(v.add(delta).applyMatrix4(meshInverse).toArray(), i * 3);
  }
  if (maxDelta > 0.025)
    throw Error("Unexpected anatomy expansion; inspect bind frames");
  const geometry = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  geometry.setIndex(Array.from(p.getIndices().getArray()));
  geometry.computeVertexNormals();
  const buffer = d.getRoot().listBuffers()[0];
  p.setAttribute(
    "POSITION",
    d.createAccessor().setType("VEC3").setBuffer(buffer).setArray(positions),
  );
  p.setAttribute(
    "NORMAL",
    d
      .createAccessor()
      .setType("VEC3")
      .setBuffer(buffer)
      .setArray(new Float32Array(geometry.getAttribute("normal").array)),
  );
  p.setAttribute("TANGENT", null);
  geometry.dispose();
  const keep = (i) =>
    joints
      .getElement(i, [])
      .reduce(
        (sum, j, k) =>
          sum +
          (/^Right(ForeArm|Hand)/.test(names[j])
            ? weights.getElement(i, [])[k]
            : 0),
        0,
      ) > 0.98;
  const indices = p.getIndices().getArray(),
    filtered = [],
    covered = [];
  const handWeight = (i) =>
    joints
      .getElement(i, [])
      .reduce(
        (sum, j, k) =>
          sum +
          (/^RightHand/.test(names[j]) ? weights.getElement(i, [])[k] : 0),
        0,
      );
  for (let i = 0; i < indices.length; i += 3)
    if (keep(indices[i]) && keep(indices[i + 1]) && keep(indices[i + 2])) {
      const triangle = indices.slice(i, i + 3);
      (triangle.reduce((sum, v) => sum + handWeight(v), 0) / 3 > 0.12
        ? covered
        : filtered
      ).push(...triangle);
    }
  p.setIndices(
    d
      .createAccessor("ArmTriangles")
      .setType("SCALAR")
      .setBuffer(d.getRoot().listBuffers()[0])
      .setArray(new Uint32Array(filtered)),
  );
  for (const semantic of p.listSemantics())
    if (semantic === "COLOR_0") p.setAttribute(semantic, null);
  p.setMaterial(sleeve);
  const hand = d
    .createPrimitive()
    .setMaterial(glove)
    .setIndices(
      d
        .createAccessor("GloveTriangles")
        .setType("SCALAR")
        .setBuffer(d.getRoot().listBuffers()[0])
        .setArray(new Uint32Array(covered)),
    );
  for (const semantic of p.listSemantics())
    hand.setAttribute(semantic, p.getAttribute(semantic));
  mesh.addPrimitive(hand);
}
for (const animation of d.getRoot().listAnimations()) animation.dispose();
mesh.setWeights([]);
n.setWeights([]);
await d.transform(
  prune(),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write("src/assets/guards/first-person-arm.glb", d);
await writeFile(
  "src/assets/guards/hand-manifest.json",
  JSON.stringify(
    {
      source:
        "Existing MakeHuman CC0-derived prisoner.glb; licensing in docs/GUARD-ASSETS.md",
      sourceSHA256: createHash("sha256")
        .update(await readFile("src/assets/guards/prisoner.glb"))
        .digest("hex"),
      runtimeSHA256: createHash("sha256")
        .update(await readFile("src/assets/guards/first-person-arm.glb"))
        .digest("hex"),
      radialScale: { forearm: 1.2, palm: 1.15, fingers: 1.12 },
      maxVertexDelta: maxDelta,
      changes:
        "Weighted anatomical radial expansion in bind space; joint locations, skin weights and finger lengths retained; recomputed normals; black glove/charcoal sleeve; meshopt.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Authored rigged black glove / charcoal sleeve from existing licensed CC0 anatomy.",
);
