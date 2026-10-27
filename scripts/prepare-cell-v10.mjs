import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
const dest = "src/assets/environment",
  work = await mkdtemp(join(tmpdir(), "hirodora-concrete-v10-"));
execFileSync("curl", [
  "-fsSL",
  "--max-time",
  "45",
  "-o",
  join(work, "source.zip"),
  "https://opengameart.org/sites/default/files/concrete_tiles.zip",
]);
execFileSync("unzip", ["-q", join(work, "source.zip"), "-d", work]);
// Preserve source photographic features, using separate source surfaces for wall,
// floor and ceiling. Color grading is an adaptation, not a newly scanned texture.
for (const [prefix, input] of [
  ["masonry", "concrete368"],
  ["concrete", "crete983"],
]) {
  const original = sharp(join(work, `${input}.png`))
    .resize(1024, 1024)
    .removeAlpha();
  await original
    .clone()
    .modulate({
      saturation: 0.18,
      brightness: prefix === "masonry" ? 1.09 : 0.94,
    })
    .linear(prefix === "masonry" ? 0.62 : 0.86, prefix === "masonry" ? 65 : 18)
    .webp({ quality: 94 })
    .toFile(`${dest}/${prefix}-albedo.webp`);
  const grey = await original.clone().greyscale().raw().toBuffer();
  const packed = Buffer.alloc(1024 * 1024 * 3);
  for (let i = 0; i < grey.length; i++) {
    packed[i * 3] = Math.round(230 + grey[i] * 0.08);
    packed[i * 3 + 1] = Math.round(
      (prefix === "masonry" ? 190 : 210) + grey[i] * 0.14,
    );
    packed[i * 3 + 2] = 0;
  }
  await sharp(packed, { raw: { width: 1024, height: 1024, channels: 3 } })
    .webp({ lossless: true })
    .toFile(`${dest}/${prefix}-orm.webp`);
  // Reuse the source normals, with less exaggerated relief on painted concrete.
  const normal = await sharp(join(work, `${input}_nm.png`))
    .resize(1024, 1024)
    .removeAlpha()
    .blur(0.8)
    .raw()
    .toBuffer();
  for (let i = 0; i < normal.length; i += 3) {
    const x = (normal[i] / 127.5 - 1) * 0.22,
      y = (normal[i + 1] / 127.5 - 1) * 0.22;
    normal[i] = Math.round((x + 1) * 127.5);
    normal[i + 1] = Math.round((y + 1) * 127.5);
    normal[i + 2] = Math.round(
      (Math.sqrt(Math.max(0, 1 - x * x - y * y)) + 1) * 127.5,
    );
  }
  await sharp(normal, { raw: { width: 1024, height: 1024, channels: 3 } })
    .webp({ lossless: true })
    .toFile(`${dest}/${prefix}-normal.webp`);
}
await sharp(join(work, "concrete368.png"))
  .resize(1024, 1024)
  .modulate({ saturation: 0.08, brightness: 0.94 })
  .linear(0.45, 90)
  .webp({ quality: 93 })
  .toFile(`${dest}/ceiling-albedo.webp`);
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
const manifest = JSON.parse(await readFile(`${dest}/manifest.json`, "utf8"));
manifest.authoring =
  "scripts/author-cell-assets.py + scripts/prepare-cell-v10.mjs (v0.10); retained licensed metal/wool maps from earlier pipeline";
if (manifest.referenceAdaptation)
  manifest.referenceAdaptation.historical = true;
manifest.cellV10 = {
  source:
    "Project-authored Blender meshes; existing licensed concrete photographs and wool/metal maps",
  changes:
    "Welded rectangular steel bunk with unanchored skid feet, actual baked cloth drape, remodeled hollow ceramic bowl/rim/trap, serviceable capped flushometer, mounting lugs, sink drain perforations. Photo concrete grading and restrained normal/ORM adaptations; no new scanned-asset claim.",
};
for (const asset of manifest.assets) {
  const bytes = await readFile(`${dest}/${asset.name}`);
  asset.bytes = bytes.length;
  asset.sha256 = createHash("sha256").update(bytes).digest("hex");
}
await writeFile(
  `${dest}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Optimized GLB and prepared licensed photographic cell surfaces.");
