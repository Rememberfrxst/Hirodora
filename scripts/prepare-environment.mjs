// Offline conversion of pinned, redistributable source maps. No runtime fetches.
import sharp from "sharp";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
const godot = process.env.HIRODORA_GODOT_SOURCE || "/tmp/hirodora-godot-assets";
const tps = process.env.HIRODORA_TPS_SOURCE || "/tmp/hirodora-tps-assets";
const dest = "src/assets/environment";
for (const [repo, revision] of [
  [godot, "b761b4cd5718a7118f2c95eb55f181d0a5f004f1"],
  [tps, "a82f15448e9b015440d3bbdf5e10801b260c4e9f"],
]) {
  if (
    execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim() !== revision
  )
    throw Error(`Unpinned environment source: ${repo}`);
}
await mkdir(dest, { recursive: true });
const src = `${godot}/3d/material_testers/test_materials`;
const maps = `${tps}/level/textures/structure`;
async function convert(file, name, options = {}) {
  let img = sharp(file).resize(512, 512);
  if (options.grey) img = img.modulate({ saturation: 0.12, brightness: 1.08 });
  await img
    .webp({ quality: options.normal ? 95 : 84 })
    .toFile(`${dest}/${name}.webp`);
}
await convert(`${src}/texture_bricks.jpg`, "masonry-albedo", { grey: true });
await convert(`${src}/texture_bricks_normal.jpg`, "masonry-normal", {
  normal: true,
});
const ao = await sharp(`${src}/texture_bricks_ao.jpg`)
  .resize(512, 512)
  .greyscale()
  .raw()
  .toBuffer();
const orm = Buffer.alloc(512 * 512 * 3);
for (let i = 0; i < ao.length; i++) {
  orm[i * 3] = ao[i];
  orm[i * 3 + 1] = Math.min(250, 210 + Math.round((255 - ao[i]) * 0.13));
  orm[i * 3 + 2] = 0;
}
await sharp(orm, { raw: { width: 512, height: 512, channels: 3 } })
  .webp({ lossless: true })
  .toFile(`${dest}/masonry-orm.webp`);
for (const [name, source] of [
  ["metal", "tile_painted_gun_metal"],
  ["concrete", "tile_steel"],
]) {
  for (const suffix of ["albedo", "normal", "orm"])
    await convert(`${maps}/${source}_${suffix}.png`, `${name}-${suffix}`, {
      normal: suffix === "normal",
    });
}
// Adapt the worn steel authoring texture to a matte painted mineral finish:
// retain its authored AO, but remove metallic response and raise roughness.
const mineral = await sharp(`${maps}/tile_steel_orm.png`)
  .resize(512, 512)
  .removeAlpha()
  .raw()
  .toBuffer();
for (let i = 0; i < mineral.length; i += 3) {
  mineral[i + 1] = Math.round(215 + mineral[i + 1] * 0.12);
  mineral[i + 2] = 0;
}
await sharp(mineral, { raw: { width: 512, height: 512, channels: 3 } })
  .webp({ lossless: true })
  .toFile(`${dest}/concrete-orm.webp`);
await sharp(`${src}/wool_albedo.png`)
  .resize(256, 256)
  .greyscale()
  .modulate({ brightness: 2.0 })
  .webp({ quality: 88 })
  .toFile(`${dest}/wool-albedo.webp`);
await convert(`${src}/wool_normal.png`, "wool-normal", { normal: true });
await sharp(`${dest}/water-stain.svg`)
  .webp({ quality: 90 })
  .toFile(`${dest}/water-stain.webp`);
await sharp(`${dest}/exterior.svg`)
  .webp({ quality: 88 })
  .toFile(`${dest}/exterior.webp`);
await copyFile(`${godot}/LICENSE.md`, `${dest}/GODOT-MIT-LICENSE.txt`);
await copyFile(`${tps}/LICENSE.md`, `${dest}/TPS-ASSET-LICENSE.txt`);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const doc = await io.read(`${dest}/cell-props.glb`);
await doc.transform(
  dedup(),
  weld(),
  prune({ keepAttributes: true }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write(`${dest}/cell-props.glb`, doc);
const outputs = [
  "cell-props.glb",
  "masonry-albedo.webp",
  "masonry-normal.webp",
  "masonry-orm.webp",
  "metal-albedo.webp",
  "metal-normal.webp",
  "metal-orm.webp",
  "concrete-albedo.webp",
  "concrete-normal.webp",
  "concrete-orm.webp",
  "wool-albedo.webp",
  "wool-normal.webp",
  "water-stain.webp",
  "exterior.webp",
];
const manifest = {
  authoring: "scripts/author-cell-assets.py + scripts/prepare-environment.mjs",
  sources: {
    godot: "b761b4cd5718a7118f2c95eb55f181d0a5f004f1",
    tps: "a82f15448e9b015440d3bbdf5e10801b260c4e9f",
  },
  assets: await Promise.all(
    outputs.map(async (name) => {
      const bytes = await readFile(`${dest}/${name}`);
      return {
        name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  ),
};
await writeFile(
  `${dest}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Environment maps converted and GLB compressed.");
