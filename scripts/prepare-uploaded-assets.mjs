// Usage: node scripts/prepare-uploaded-assets.mjs WALL_ZIP TABLE_GLB TOILET_GLB DRIVER_GLB
// Source files are user uploads; only optimized, attributed runtime derivatives ship.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { Document, NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  metalRough,
  mergeDocuments,
  dedup,
  prune,
  meshopt,
  textureCompress,
  unpartition,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const [zip, table, toilet, driver] = process.argv.slice(2);
if (!driver) throw Error("Supply the wall ZIP and three original GLBs.");
const dest = "src/assets/environment",
  temp = await mkdtemp(join(tmpdir(), "hirodora-uploads-"));
execFileSync("unzip", ["-q", zip, "-d", temp]);
const maps = join(temp, "textures");
await sharp(join(maps, "rock_wall_16_diff_2k.jpg"))
  .webp({ quality: 90 })
  .toFile(`${dest}/rock16-albedo.webp`);
// Read EXR LINEAR data directly, without a display/view/gamma transform. Source
// filtering leaves some short vectors in mortar: normalize before quantization.
const linear = execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-i",
    join(maps, "rock_wall_16_nor_gl_2k.exr"),
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgb48le",
    "-f",
    "rawvideo",
    "pipe:1",
  ],
  { maxBuffer: 30e6 },
);
const normals = Buffer.alloc(2048 * 2048 * 3);
for (let i = 0; i < normals.length; i += 3) {
  let x = linear.readUInt16LE(i * 2) / 32767.5 - 1,
    y = linear.readUInt16LE((i + 1) * 2) / 32767.5 - 1,
    z = linear.readUInt16LE((i + 2) * 2) / 32767.5 - 1;
  const length = Math.hypot(x, y, z);
  if (length < 0.01) {
    x = 0;
    y = 0;
    z = 1;
  } else {
    x /= length;
    y /= length;
    z /= length;
  }
  normals[i] = Math.round((x * 0.5 + 0.5) * 255);
  normals[i + 1] = Math.round((y * 0.5 + 0.5) * 255);
  normals[i + 2] = Math.round((z * 0.5 + 0.5) * 255);
}
await sharp(normals, { raw: { width: 2048, height: 2048, channels: 3 } })
  .webp({ lossless: true })
  .toFile(`${dest}/rock16-normal.webp`);
const packed = await sharp(join(maps, "rock_wall_16_arm_2k.jpg"))
  .removeAlpha()
  .raw()
  .toBuffer();
// Preserve supplied AO + roughness; stone is dielectric even if JPEG packing bleeds.
for (let i = 2; i < packed.length; i += 3) packed[i] = 0;
await sharp(packed, { raw: { width: 2048, height: 2048, channels: 3 } })
  .webp({ lossless: true })
  .toFile(`${dest}/rock16-orm.webp`);

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const combined = new Document(),
  scene = combined.createScene("Uploaded cell furnishings");
const sources = [];
for (const [name, file, height, rotation] of [
  ["Table", table, 0.82, [0, 0, 0, 1]],
  ["Toilet", toilet, 0.98, [0, -Math.SQRT1_2, 0, Math.SQRT1_2]],
  // Rest the tool on its side, not standing upright or suspended above the floor.
  ["Screwdriver", driver, null, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]],
]) {
  const bytes = await readFile(file),
    doc = await io.readBinary(bytes),
    asset = doc.getRoot().getAsset().extras;
  if (!String(asset?.license).includes("CC-BY-4.0"))
    throw Error(`Unexpected license for ${name}`);
  if (name === "Table") await doc.transform(metalRough());
  const originalScene = doc.getRoot().listScenes()[0];
  const orientation = doc
    .createNode(`${name}_orientation`)
    .setRotation(rotation);
  for (const child of originalScene.listChildren()) orientation.addChild(child);
  originalScene.addChild(orientation);
  const bounds = getBounds(originalScene),
    size = bounds.max.map((x, i) => x - bounds.min[i]);
  const scale = height ? height / size[1] : 0.31 / Math.max(...size);
  const wrapper = doc
    .createNode(name)
    .setExtras({
      ...asset,
      changes:
        "Scaled to metres, floor-aligned, optimized textures and meshopt compression; table converted to metallic/roughness PBR.",
    });
  wrapper.setScale([scale, scale, scale]);
  wrapper.setTranslation([
    (-(bounds.max[0] + bounds.min[0]) * scale) / 2,
    -bounds.min[1] * scale,
    (-(bounds.max[2] + bounds.min[2]) * scale) / 2,
  ]);
  wrapper.addChild(orientation);
  originalScene.addChild(wrapper);
  const mapping = mergeDocuments(combined, doc);
  scene.addChild(mapping.get(wrapper));
  mapping.get(originalScene).dispose();
  sources.push({
    name,
    ...asset,
    originalSHA256: createHash("sha256").update(bytes).digest("hex"),
    metres: size.map((x) => x * scale),
    changes: wrapper.getExtras().changes,
  });
}
await combined.transform(
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [1024, 1024],
    quality: 90,
  }),
  dedup(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
  unpartition(),
);
combined.getRoot().getAsset().extras = {
  sources,
  license: "CC-BY-4.0; see UPLOADED-ASSET-LICENSES.txt",
};
await io.write(`${dest}/uploaded-props.glb`, combined);
// Do not load the superseded bunk/toilet meshes, their cloth, or their textures.
const retained = await io.read(`${dest}/cell-props.glb`);
for (const name of ["Bunk", "Toilet"]) {
  const root = retained
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === name);
  root?.dispose();
}
await retained.transform(prune(), unpartition());
await io.write(`${dest}/retained-fixtures.glb`, retained);
const manifest = JSON.parse(await readFile(`${dest}/manifest.json`, "utf8"));
manifest.uploadedAssets = {
  pipeline: "scripts/prepare-uploaded-assets.mjs",
  wall: {
    title: "Rock Wall 16",
    source: "https://polyhaven.com/a/rock_wall_16",
    license: "CC0-1.0",
    licenseURL: "https://polyhaven.com/license",
    originalSHA256: createHash("sha256")
      .update(await readFile(zip))
      .digest("hex"),
    changes:
      "Original 2K diffuse, OpenGL normal and ARM maps; EXR normal converted linearly, ARM metal channel forced to zero, WebP encoding. No preview sphere or runtime displacement.",
  },
  models: sources,
};
for (const name of [
  "uploaded-props.glb",
  "retained-fixtures.glb",
  "rock16-albedo.webp",
  "rock16-normal.webp",
  "rock16-orm.webp",
]) {
  const bytes = await readFile(`${dest}/${name}`),
    entry = {
      name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  manifest.assets = manifest.assets.filter((x) => x.name !== name);
  manifest.assets.push(entry);
}
await writeFile(
  `${dest}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(sources, null, 2));
