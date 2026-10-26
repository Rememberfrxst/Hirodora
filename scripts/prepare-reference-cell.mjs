import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const folder = "src/assets/environment",
  baseline = "cd3b1eed71362c424552e513ad6e887b6de149e9";
const original = (name) =>
  execFileSync("git", ["show", `${baseline}:${folder}/${name}`], {
    maxBuffer: 8 * 1024 * 1024,
  });
// Retain licensed photographic aggregate; add authored physical block joints.
const joints = Buffer.from(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><g stroke="#44483f" stroke-width="5" fill="none"><path d="M0 0H1024M0 256H1024M0 512H1024M0 768H1024M0 1024H1024M0 0V256M512 0V256M256 256V512M768 256V512M0 512V768M512 512V768M256 768V1024M768 768V1024"/></g><g stroke="#c1c1af" stroke-opacity=".55" stroke-width="1" fill="none"><path d="M0 4H1024M0 260H1024M0 516H1024M0 772H1024"/></g></svg>`,
);
await sharp(original("masonry-albedo.webp"))
  .modulate({ brightness: 0.82, saturation: 0.55 })
  .composite([{ input: joints }])
  .webp({ quality: 92 })
  .toFile(`${folder}/masonry-albedo.webp`);
const normal = await sharp(original("masonry-normal.webp"))
  .removeAlpha()
  .raw()
  .toBuffer();
for (let y = 0; y < 1024; y++)
  for (let x = 0; x < 1024; x++) {
    const row = Math.floor(y / 256),
      period = (x - (row % 2 ? 256 : 0) + 1024) % 512,
      dy = y % 256;
    if (dy < 5 || period < 5) {
      const i = (y * 1024 + x) * 3;
      normal[i] = period < 2 ? 85 : period < 5 ? 170 : 128;
      normal[i + 1] = dy < 2 ? 85 : dy < 5 ? 170 : 128;
      normal[i + 2] = 235;
    }
  }
await sharp(normal, { raw: { width: 1024, height: 1024, channels: 3 } })
  .webp({ lossless: true })
  .toFile(`${folder}/masonry-normal.webp`);
// Ceiling uses smooth photographed concrete, not the block mortar pattern.
await sharp(original("masonry-albedo.webp"))
  .modulate({ brightness: 0.82, saturation: 0.4 })
  .webp({ quality: 90 })
  .toFile(`${folder}/ceiling-albedo.webp`);
await sharp(original("concrete-albedo.webp"))
  .modulate({ brightness: 0.83, saturation: 0.35 })
  .webp({ quality: 92 })
  .toFile(`${folder}/concrete-albedo.webp`);
const manifest = JSON.parse(await readFile(`${folder}/manifest.json`, "utf8"));
manifest.referenceAdaptation = {
  baseline,
  source:
    "Existing p0ss / Georges Grondin photographs, CC-BY 3.0; CONCRETE-LICENSE.txt",
  changes:
    "Cool grey block masonry with authored recessed joint lines and normal slopes; unjointed photographic ceiling; reduced floor saturation. These are artist adaptations, not a new scanned asset.",
};
for (const asset of manifest.assets) {
  const data = await readFile(`${folder}/${asset.name}`);
  asset.bytes = data.length;
  asset.sha256 = createHash("sha256").update(data).digest("hex");
}
const ceiling = await readFile(`${folder}/ceiling-albedo.webp`);
const ceilingEntry = {
  name: "ceiling-albedo.webp",
  bytes: ceiling.length,
  sha256: createHash("sha256").update(ceiling).digest("hex"),
};
const at = manifest.assets.findIndex((a) => a.name === "ceiling-albedo.webp");
if (at < 0) manifest.assets.push(ceilingEntry);
else manifest.assets[at] = ceilingEntry;
await writeFile(
  `${folder}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
