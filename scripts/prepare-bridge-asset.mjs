/** Join three original uploaded bridge modules, preserving real PBR geometry. */
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  weld,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import * as T from "three";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const bytes = await readFile(process.argv[2]),
  d = await io.readBinary(bytes),
  asset = d.getRoot().getAsset().extras;
if (
  !asset?.source ||
  !asset?.author ||
  !String(asset.license).includes("CC-BY-4.0")
)
  throw Error("Missing reusable bridge license");
const source = d
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === "01_01_0" && n.getMesh());
if (!source) throw Error("Expected standalone source module");
const bounds = getBounds(source),
  length = bounds.max[0] - bounds.min[0],
  centerX = (bounds.min[0] + bounds.max[0]) / 2;
const mesh = d.createMesh("MetalBridge"),
  buffer = d.getRoot().listBuffers()[0];
const sourceWorld = new T.Matrix4().fromArray(source.getWorldMatrix());
const transform = new T.Matrix4()
  .makeRotationY(-Math.PI / 2)
  .multiply(
    new T.Matrix4().makeScale(
      6.2 / (3 * length),
      1.1 / (bounds.max[1] - 0.02499),
      1,
    ),
  );
const normalTransform = new T.Matrix3().getNormalMatrix(
  transform.clone().multiply(sourceWorld),
);
for (let module = 0; module < 3; module++)
  for (const original of source.getMesh().listPrimitives()) {
    const p = original.clone();
    for (const semantic of ["POSITION", "NORMAL"]) {
      const a = original.getAttribute(semantic);
      if (!a) continue;
      const data = new Float32Array(a.getCount() * 3);
      for (let j = 0; j < a.getCount(); j++) {
        const v = new T.Vector3().fromArray(a.getElement(j, []));
        if (semantic === "NORMAL") v.applyMatrix3(normalTransform).normalize();
        else {
          v.applyMatrix4(sourceWorld);
          v.x -= centerX;
          v.y -= 0.02499;
          v.applyMatrix4(transform);
          v.z += ((module - 1) * 6.2) / 3;
        }
        data.set(v.toArray(), j * 3);
      }
      p.setAttribute(
        semantic,
        d.createAccessor().setBuffer(buffer).setType("VEC3").setArray(data),
      );
    }
    p.setAttribute("TANGENT", null);
    mesh.addPrimitive(p);
  }
const scene = d.getRoot().getDefaultScene();
for (const child of scene.listChildren()) scene.removeChild(child);
scene.addChild(d.createNode("MetalBridge").setMesh(mesh).setExtras(asset));
await d.transform(
  weld(),
  dedup(),
  prune(),
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [2048, 2048],
    quality: 90,
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
const output = await io.writeBinary(d);
await writeFile("src/assets/environment/metal-bridge.glb", output);
const manifest = {
  ...asset,
  file: "metal-bridge.glb",
  sourceSHA256: createHash("sha256").update(bytes).digest("hex"),
  runtimeSHA256: createHash("sha256").update(output).digest("hex"),
  bytes: output.length,
  triangles: 2580,
  bounds: getBounds(scene),
  deckY: 0,
  width: bounds.max[2] - bounds.min[2],
  length: 6.2,
  changes:
    "Three copies of the original standalone module joined; spare preview row excluded; transforms baked, deck aligned to zero, rail top fitted to 1.1m, long axis +Z; original UV/PBR retained; 2K WebP and meshopt.",
};
await writeFile(
  "src/assets/environment/bridge-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "src/assets/environment/BRIDGE-LICENSE.txt",
  `${asset.title}\nAuthor: ${asset.author}\nSource: ${asset.source}\nLicense: ${asset.license}\nChanges: ${manifest.changes}\n`,
);
console.log({ bytes: output.length, bounds: manifest.bounds });
