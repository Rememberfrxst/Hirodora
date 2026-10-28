/** User-uploaded CC BY assets, baked to game metres with real tread metadata. */
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  weld,
  simplify,
  join,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import * as THREE from "three";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await Promise.all([
  MeshoptEncoder.ready,
  MeshoptDecoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const inputs = process.argv.slice(2);
if (inputs.length !== 3)
  throw Error("Supply stairs, box and strapped-pallet source GLBs.");
const names = ["WoodStairs", "WoodBox", "CargoPallet"],
  files = ["wood-stairs.glb", "wood-box.glb", "cargo-pallet.glb"],
  sources = [];
let treadProfile = [];
for (let i = 0; i < 3; i++) {
  const bytes = await readFile(inputs[i]),
    doc = await io.readBinary(bytes),
    asset = doc.getRoot().getAsset().extras;
  if (
    !String(asset?.license).includes("CC-BY-4.0") ||
    !asset?.source ||
    !asset?.author
  )
    throw Error("Missing redistribution/attribution metadata");
  const sourceMeshes = [];
  for (const n of doc.getRoot().listNodes())
    if (n.getMesh())
      sourceMeshes.push({
        mesh: n.getMesh(),
        matrix: new THREE.Matrix4().fromArray(n.getWorldMatrix()),
      });
  const bounds = new THREE.Box3(),
    rows = new Map();
  for (const { mesh, matrix } of sourceMeshes)
    for (const p of mesh.listPrimitives()) {
      const a = p.getAttribute("POSITION"),
        idx =
          p.getIndices()?.getArray() ||
          Array.from({ length: a.getCount() }, (_, j) => j);
      const positions = Array.from({ length: a.getCount() }, (_, j) =>
        new THREE.Vector3().fromArray(a.getElement(j, [])).applyMatrix4(matrix),
      );
      positions.forEach((v) => bounds.expandByPoint(v));
      if (i === 0)
        for (let k = 0; k < idx.length; k += 3) {
          const v = [
              positions[idx[k]],
              positions[idx[k + 1]],
              positions[idx[k + 2]],
            ],
            normal = v[1]
              .clone()
              .sub(v[0])
              .cross(v[2].clone().sub(v[0]))
              .normalize();
          const minZ = Math.min(...v.map((v) => v.z)),
            maxZ = Math.max(...v.map((v) => v.z)),
            minX = Math.min(...v.map((v) => v.x)),
            maxX = Math.max(...v.map((v) => v.x));
          if (normal.y < 0.95 || maxZ - minZ < 1.4 || maxX - minX < 0.25)
            continue;
          const y = v.reduce((s, v) => s + v.y, 0) / 3,
            key = y.toFixed(4),
            r = rows.get(key) || { y, minX: Infinity, maxX: -Infinity };
          r.minX = Math.min(r.minX, minX);
          r.maxX = Math.max(r.maxX, maxX);
          rows.set(key, r);
        }
    }
  const treads = [...rows.values()].sort((a, b) => a.minX - b.minX),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  const first = treads[0],
    last = treads.at(-1);
  const stairX = (x) => ((x - first.minX) / (last.maxX - first.minX)) * 7.2;
  const stairY = (y) => 0.18 + ((y - first.y) / (last.y - first.y)) * 3.02;
  if (i === 0) {
    if (treads.length !== 11) throw Error("Unexpected source stair topology");
    treadProfile = treads.map((t, k) => ({
      end: k === 10 ? 1 : stairX((t.maxX + treads[k + 1].minX) / 2) / 7.2,
      height: stairY(t.y),
    }));
  }
  const buffer = doc.getRoot().listBuffers()[0],
    combined = doc.createMesh(names[i]);
  for (const { mesh, matrix } of sourceMeshes)
    for (const original of mesh.listPrimitives()) {
      const p = original.clone(),
        a = original.getAttribute("POSITION"),
        data = new Float32Array(a.getCount() * 3);
      for (let j = 0; j < a.getCount(); j++) {
        const v = new THREE.Vector3()
          .fromArray(a.getElement(j, []))
          .applyMatrix4(matrix);
        if (i === 0) {
          const u = THREE.MathUtils.clamp(
              (v.x - first.minX) / (last.maxX - first.minX),
              0,
              1,
            ),
            base = first.y + u * (last.y - first.y);
          const y =
            v.y > base + 0.3
              ? 0.18 + u * 3.02 + (v.y - base) * 0.95
              : stairY(v.y);
          v.set(stairX(v.x), y, ((v.z - center.z) * 1.8) / size.z);
        } else {
          v.x -= center.x;
          v.z -= center.z;
          v.y -= bounds.min.y;
          if (i === 2) {
            v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            v.multiplyScalar(2.4 / size.z);
          }
        }
        data.set(v.toArray(), j * 3);
      }
      const geo = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(data, 3),
      );
      if (p.getIndices()) geo.setIndex(Array.from(p.getIndices().getArray()));
      geo.computeVertexNormals();
      p.setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setBuffer(buffer).setArray(data),
      );
      p.setAttribute(
        "NORMAL",
        doc
          .createAccessor()
          .setType("VEC3")
          .setBuffer(buffer)
          .setArray(new Float32Array(geo.getAttribute("normal").array)),
      );
      p.setAttribute("TANGENT", null);
      combined.addPrimitive(p);
      geo.dispose();
    }
  const scene = doc.getRoot().getDefaultScene();
  for (const child of scene.listChildren()) scene.removeChild(child);
  scene.addChild(
    doc
      .createNode(names[i])
      .setMesh(combined)
      .setExtras({ ...asset, sourceAsset: names[i] }),
  );
  if (i === 2)
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.002 }),
    );
  await doc.transform(
    join(),
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: i === 0 ? [2048, 2048] : [1024, 1024],
      quality: 90,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  const file = `src/assets/environment/${files[i]}`;
  await io.write(file, doc);
  const runtime = await readFile(file);
  sources.push({
    ...asset,
    name: names[i],
    file: files[i],
    sourceSHA256: createHash("sha256").update(bytes).digest("hex"),
    runtimeSHA256: createHash("sha256").update(runtime).digest("hex"),
    bounds: getBounds(doc.getRoot().getDefaultScene()),
    bytes: runtime.length,
    triangles: doc
      .getRoot()
      .listMeshes()
      .reduce(
        (s, m) =>
          s +
          m
            .listPrimitives()
            .reduce((s, p) => s + p.getIndices().getCount() / 3, 0),
        0,
      ),
    changes:
      i === 0
        ? "World transforms baked; tread run fitted to 7.2m, top tread 3.2m, clear width 1.8m; railing height adapted separately; real tread profile retained for navigation; normals recomputed; 2K WebP and meshopt"
        : i === 1
          ? "World transforms baked, floor/centre aligned; normals recomputed; source PBR maps retained as 1K WebP; meshopt compression"
          : "World transforms baked, floor/centre aligned; pallet turned and fitted to 2.4m long axis, mesh simplified; source PBR maps retained as 1K WebP; meshopt compression",
  });
  console.log(names[i], runtime.length, sources.at(-1).triangles);
}
await writeFile(
  "src/assets/environment/cargo-manifest.json",
  JSON.stringify({ sources, treads: treadProfile }, null, 2) + "\n",
);
await writeFile(
  "src/assets/environment/CARGO-LICENSES.txt",
  sources
    .map(
      (s) =>
        `${s.title}\nAuthor: ${s.author}\nSource: ${s.source}\nLicense: ${s.license}\nChanges: ${s.changes}\n`,
    )
    .join("\n"),
);
