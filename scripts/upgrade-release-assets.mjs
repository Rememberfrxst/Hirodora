import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
const dest = "src/assets/environment";
const source = process.env.HIRODORA_CONCRETE_SOURCE || "/tmp/hirodora-concrete";
// p0ss / Georges Grondin photographic concrete with matched authored normals.
// Roughness and microcavity AO are adapted artist maps, not measured scans.
for (const [prefix, input] of [
  ["masonry", "concrete368"],
  ["concrete", "crete983"],
]) {
  await sharp(`${source}/${input}.png`)
    .resize(1024, 1024)
    .modulate({ saturation: 0.28 })
    .webp({ quality: 92 })
    .toFile(`${dest}/${prefix}-albedo.webp`);
  // The original relief is extremely steep. Normalize and restrain its slopes
  // before mipmapping to prevent crawling black grain at grazing camera angles.
  const normal = await sharp(`${source}/${input}_nm.png`)
    .resize(1024, 1024)
    .removeAlpha()
    .blur(0.65)
    .raw()
    .toBuffer();
  for (let i = 0; i < normal.length; i += 3) {
    const x = (normal[i] / 127.5 - 1) * 0.32;
    const y = (normal[i + 1] / 127.5 - 1) * 0.32;
    normal[i] = Math.round((x + 1) * 127.5);
    normal[i + 1] = Math.round((y + 1) * 127.5);
    normal[i + 2] = Math.round(
      (Math.sqrt(Math.max(0, 1 - x * x - y * y)) + 1) * 127.5,
    );
  }
  await sharp(normal, { raw: { width: 1024, height: 1024, channels: 3 } })
    .webp({ lossless: true })
    .toFile(`${dest}/${prefix}-normal.webp`);
  const grey = await sharp(`${source}/${input}.png`)
    .resize(1024, 1024)
    .greyscale()
    .raw()
    .toBuffer();
  const packed = Buffer.alloc(1024 * 1024 * 3);
  for (let i = 0; i < grey.length; i++) {
    packed[i * 3] = 222 + Math.round(grey[i] * 0.12);
    packed[i * 3 + 1] = 207 + Math.round(grey[i] * 0.15);
    packed[i * 3 + 2] = 0;
  }
  await sharp(packed, { raw: { width: 1024, height: 1024, channels: 3 } })
    .webp({ lossless: true })
    .toFile(`${dest}/${prefix}-orm.webp`);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
if (!process.argv.includes("--textures-only")) {
  const props = await io.read(`${dest}/cell-props.glb`);
  await props.transform(
    dedup(),
    weld(),
    prune({ keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await io.write(`${dest}/cell-props.glb`, props);
  for (const tier of ["hero", "mobile", "distant"]) {
    const file = `src/assets/guards/officer-${tier}.glb`;
    const officer = await io.read(file);
    for (const m of officer.getRoot().listMaterials()) {
      if (m.getName() === "Skin") {
        m.setBaseColorFactor([1, 0.97, 0.95, 1]);
        m.setRoughnessFactor(0.78);
        m.setNormalScale(0.55);
      }
      if (m.getName() === "Outfit") m.setBaseColorFactor([0.19, 0.29, 0.43, 1]);
      if (/Skin|Eyes|Hair|Outfit|vest|Pouches|Boot/.test(m.getName()))
        m.setMetallicFactor(0);
      if (m.getName() === "Eyes") m.setRoughnessFactor(0.28);
      if (m.getName() === "Tactical vest") m.setRoughnessFactor(0.88);
      if (m.getName() === "Embroidered corrections ID") {
        const badge = `<svg width="1024" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="512" rx="25" fill="#1d2a32"/><rect x="14" y="14" width="996" height="484" rx="20" fill="none" stroke="#b9a875" stroke-width="8" stroke-dasharray="5 5"/><path d="M100 90L245 50 390 90V215Q375 350 245 430Q115 350 100 215Z" fill="#b9a875"/><path d="M145 120L245 90 345 120V215Q330 315 245 375Q160 315 145 215Z" fill="#263b40"/><text x="245" y="268" text-anchor="middle" font-size="100" font-family="serif" fill="#cdbc87">47</text><text x="690" y="215" text-anchor="middle" font-size="67" font-weight="bold" font-family="sans-serif" fill="#d6c99e">CORRECTIONS</text><text x="690" y="300" text-anchor="middle" font-size="48" font-family="sans-serif" fill="#b7b79f">GULL ROCK</text><path d="M450 345H930" stroke="#ae9b69" stroke-width="5"/></svg>`;
        m.getBaseColorTexture()?.setImage(
          await sharp(Buffer.from(badge)).png().toBuffer(),
        );
      }
    }
    await io.write(file, officer);
  }
}
const manifest = JSON.parse(await readFile(`${dest}/manifest.json`, "utf8"));
if (!manifest.authoring.includes("upgrade-release-assets"))
  manifest.authoring += " + scripts/upgrade-release-assets.mjs (v0.6)";
manifest.sources.concrete = {
  source: "https://opengameart.org/content/seamless-concrete-tiles",
  download: "https://opengameart.org/sites/default/files/concrete_tiles.zip",
  author: "p0ss; original photographs by Georges Grondin",
  license: "CC-BY-3.0",
  licenseURL: "https://creativecommons.org/licenses/by/3.0/",
  files: [
    "concrete368.png",
    "concrete368_nm.png",
    "crete983.png",
    "crete983_nm.png",
  ],
  changes:
    "1024px WebP; restrained saturation; source normal slopes softened and renormalized for stable grazing-angle lighting; artist-derived roughness / microcavity AO in packed ORM. Photographic color and source normal maps replace the former masonry and steel-derived finishes.",
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
console.log(
  "Photographic concrete, revised furniture GLB and officer materials mastered.",
);
