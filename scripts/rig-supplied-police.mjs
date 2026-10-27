/** Transfer the existing licensed humanoid skin/animation to the supplied MPFB mesh.
 * Offline only. Publishing the supplied derivative requires its source/license.
 * Usage: node scripts/rig-supplied-police.mjs source.glb output-directory
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  mergeDocuments,
  cloneDocument,
  dedup,
  prune,
  unpartition,
  weld,
  simplify,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import { Matrix4, Vector3 } from "three";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await Promise.all([
  MeshoptDecoder.ready,
  MeshoptEncoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const template = await io.read("src/assets/guards/officer-hero.glb");
const source = await io.read(process.argv[2]);
const skin = template.getRoot().listSkins()[0];
const palette = skin
  .listJoints()
  .map((j, i) =>
    new Matrix4()
      .fromArray(j.getWorldMatrix())
      .multiply(
        new Matrix4().fromArray(
          skin.getInverseBindMatrices().getElement(i, []),
        ),
      ),
  );
const buffer = template.getRoot().listBuffers()[0];
const buckets = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
const width = 0.045,
  point = new Vector3();
for (const n of template.getRoot().listNodes()) {
  if (!n.getMesh() || n.getSkin() !== skin) continue;
  const matrix = new Matrix4().fromArray(n.getWorldMatrix());
  for (const p of n.getMesh().listPrimitives()) {
    const pos = p.getAttribute("POSITION"),
      joints = p.getAttribute("JOINTS_0"),
      weights = p.getAttribute("WEIGHTS_0");
    if (!weights) continue;
    for (let i = 0; i < pos.getCount(); i++) {
      const raw = new Vector3().fromArray(pos.getElement(i, [])),
        js = joints.getElement(i, []),
        ws = weights.getElement(i, []);
      point.set(0, 0, 0);
      for (let k = 0; k < 4; k++)
        if (ws[k])
          point.addScaledVector(
            raw.clone().applyMatrix4(palette[js[k]]),
            ws[k],
          );
      const k = key(
        Math.floor(point.x / width),
        Math.floor(point.y / width),
        Math.floor(point.z / width),
      );
      const list = buckets.get(k) || [];
      list.push({
        position: point.clone(),
        joints: joints.getElement(i, []),
        weights: weights.getElement(i, []),
      });
      buckets.set(k, list);
    }
  }
}
// Retain the exact skeleton/animation channels, discard the old visual meshes.
for (const n of template.getRoot().listNodes())
  if (n.getMesh()) {
    n.setMesh(null);
    n.setSkin(null);
    n.setWeights([]);
  }
skin.setInverseBindMatrices(
  template
    .createAccessor("UnquantizedBind")
    .setBuffer(buffer)
    .setType("MAT4")
    .setArray(
      new Float32Array(
        skin
          .listJoints()
          .flatMap((j) =>
            new Matrix4().fromArray(j.getWorldMatrix()).invert().toArray(),
          ),
      ),
    ),
);
const map = mergeDocuments(template, source);
const scene = template.getRoot().getDefaultScene();
let vertices = 0;
for (const original of source.getRoot().listNodes()) {
  if (!original.getMesh()) continue;
  const n = map.get(original),
    matrix = new Matrix4().fromArray(original.getWorldMatrix());
  n.setMatrix(new Matrix4().toArray());
  scene.addChild(n);
  n.setSkin(skin);
  for (const p of n.getMesh().listPrimitives()) {
    const pos = p.getAttribute("POSITION"),
      normals = p.getAttribute("NORMAL");
    const positions = new Float32Array(pos.getCount() * 3),
      norm = new Float32Array(pos.getCount() * 3);
    const ji = new Uint16Array(pos.getCount() * 4),
      we = new Float32Array(pos.getCount() * 4);
    for (let i = 0; i < pos.getCount(); i++) {
      point.fromArray(pos.getElement(i, [])).applyMatrix4(matrix);
      point.toArray(positions, i * 3);
      const cell = [
        Math.floor(point.x / width),
        Math.floor(point.y / width),
        Math.floor(point.z / width),
      ];
      let candidates = [];
      for (let ring = 1; ring <= 4 && candidates.length < 4; ring++) {
        candidates = [];
        for (let x = -ring; x <= ring; x++)
          for (let y = -ring; y <= ring; y++)
            for (let z = -ring; z <= ring; z++)
              for (const v of buckets.get(
                key(cell[0] + x, cell[1] + y, cell[2] + z),
              ) || [])
                candidates.push({ v, d: v.position.distanceToSquared(point) });
      }
      candidates.sort((a, b) => a.d - b.d);
      const blends = new Map();
      for (const { v, d } of candidates.slice(0, 4))
        for (let k = 0; k < 4; k++)
          blends.set(
            v.joints[k],
            (blends.get(v.joints[k]) || 0) + v.weights[k] / Math.max(d, 1e-7),
          );
      const values = [...blends].sort((a, b) => b[1] - a[1]).slice(0, 4),
        total = values.reduce((s, v) => s + v[1], 0);
      if (!total) throw Error("No skin transfer sample at " + point.toArray());
      values.forEach(([j, w], k) => {
        ji[i * 4 + k] = j;
        we[i * 4 + k] = w / total;
      });
      if (normals)
        point
          .fromArray(normals.getElement(i, []))
          .transformDirection(matrix)
          .toArray(norm, i * 3);
    }
    pos.setArray(positions).setNormalized(false);
    if (normals) normals.setArray(norm).setNormalized(false);
    p.setAttribute(
      "JOINTS_0",
      template.createAccessor().setBuffer(buffer).setType("VEC4").setArray(ji),
    );
    p.setAttribute(
      "WEIGHTS_0",
      template.createAccessor().setBuffer(buffer).setType("VEC4").setArray(we),
    );
    vertices += pos.getCount();
  }
}
for (const m of template.getRoot().listMaterials()) {
  m.setMetallicFactor(0);
  m.setRoughnessFactor(/eye/i.test(m.getName()) ? 0.32 : 0.78);
}
await template.transform(dedup(), prune(), unpartition());
await mkdir(process.argv[3], { recursive: true });
for (const [tier, ratio, resize] of [
  ["hero", 1, 2048],
  ["mobile", 0.5, 1024],
  ["distant", 0.16, 512],
]) {
  const d = cloneDocument(template);
  if (tier !== "hero")
    for (const a of d.getRoot().listAnimations()) a.dispose();
  await d.transform(
    weld(),
    ...(ratio < 1
      ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 })]
      : []),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [resize, resize],
      quality: 88,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await io.write(`${process.argv[3]}/officer-${tier}.glb`, d);
}
console.log(
  "Transferred",
  vertices,
  "vertices onto",
  skin.listJoints().length,
  "joints and existing clips.",
);
