/** Adapt the two user-uploaded CC BY models to one consistent metre convention. */
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
if (process.argv.length !== 4) throw Error("Supply gun_10mm.glb and can.glb");
const directory = "src/assets/ballistics";
await mkdir(directory, { recursive: true });
const sources = [];
for (const [i, path] of process.argv.slice(2).entries()) {
  const original = await readFile(path),
    doc = await io.readBinary(original);
  const asset = doc.getRoot().getAsset().extras;
  if (
    !asset?.author ||
    !asset?.source ||
    !String(asset?.license).includes("CC-BY-4.0")
  )
    throw Error("Missing reusable source license");
  const scene = doc.getRoot().getDefaultScene(),
    bounds = getBounds(scene);
  const scale =
    i === 0
      ? 0.24 / (bounds.max[2] - bounds.min[2])
      : 0.125 / (bounds.max[1] - bounds.min[1]);
  const nodes = doc
    .getRoot()
    .listNodes()
    .filter((n) => n.getMesh());
  const root = doc.createNode(i === 0 ? "Pistol10mm" : "SodaCan");
  for (const node of nodes) {
    const world = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(world);
    const mesh = doc.createMesh(node.getMesh().getName());
    for (const source of node.getMesh().listPrimitives()) {
      const primitive = source.clone();
      for (const semantic of ["POSITION", "NORMAL"]) {
        const attribute = source.getAttribute(semantic);
        if (!attribute) continue;
        const values = new Float32Array(attribute.getCount() * 3);
        for (let j = 0; j < attribute.getCount(); j++) {
          const v = new THREE.Vector3().fromArray(attribute.getElement(j, []));
          if (semantic === "NORMAL") v.applyMatrix3(normalMatrix).normalize();
          else {
            v.applyMatrix4(world);
            v.x -= (bounds.min[0] + bounds.max[0]) / 2;
            if (i === 1) v.y -= bounds.min[1];
            v.multiplyScalar(scale);
          }
          values.set(v.toArray(), j * 3);
        }
        primitive.setAttribute(
          semantic,
          doc
            .createAccessor()
            .setBuffer(doc.getRoot().listBuffers()[0])
            .setType("VEC3")
            .setArray(values),
        );
      }
      primitive.setAttribute("TANGENT", null);
      mesh.addPrimitive(primitive);
    }
    root.addChild(doc.createNode(node.getName()).setMesh(mesh));
  }
  for (const child of scene.listChildren()) scene.removeChild(child);
  scene.addChild(root);
  for (const animation of doc.getRoot().listAnimations()) animation.dispose();
  await doc.transform(
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
  const file = i === 0 ? "pistol-10mm.glb" : "soda-can.glb";
  const bytes = await io.writeBinary(doc);
  await writeFile(`${directory}/${file}`, bytes);
  sources.push({
    ...asset,
    file,
    bytes: bytes.length,
    sourceSHA256: createHash("sha256").update(original).digest("hex"),
    runtimeSHA256: createHash("sha256").update(bytes).digest("hex"),
    bounds: getBounds(scene),
    changes:
      "World transforms baked into real metre geometry; source UV/PBR retained; normals transformed; embedded WebP and meshopt. Gun +Z is muzzle, can +Y is its long axis.",
  });
}
await writeFile(
  `${directory}/manifest.json`,
  JSON.stringify(
    { sources, muzzle: [0, 0.044, 0.151], canHeight: 0.125 },
    null,
    2,
  ) + "\n",
);
await writeFile(
  `${directory}/LICENSES.txt`,
  sources
    .map(
      (s) =>
        `${s.title}\nAuthor: ${s.author}\nSource: ${s.source}\nLicense: ${s.license}\nChanges: ${s.changes}\n`,
    )
    .join("\n") +
    "\nCoca-Cola names/label remain trademarks of their respective owner. No endorsement is implied.\n",
);
console.log(
  sources.map((s) => ({ file: s.file, bytes: s.bytes, bounds: s.bounds })),
);
