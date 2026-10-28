import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const records = [];
// Same licensed photographic PBR sources; one shared 1K set cuts mobile texture
// upload/mip memory to a quarter of the 2K desktop set without losing map roles.
for (const name of ["albedo", "normal", "orm"]) {
  await sharp(`src/assets/environment/rock16-${name}.webp`)
    .resize(1024, 1024)
    .webp(name === "albedo" ? { quality: 88 } : { lossless: true })
    .toFile(`src/assets/environment/rock16-mobile-${name}.webp`);
  const source = `rock16-${name}.webp`, file = `rock16-mobile-${name}.webp`;
  const original = await readFile(`src/assets/environment/${source}`), runtime = await readFile(`src/assets/environment/${file}`);
  records.push({role:name, source, file, sourceSHA256:createHash('sha256').update(original).digest('hex'), sha256:createHash('sha256').update(runtime).digest('hex'), originalBytes:original.length, bytes:runtime.length, width:1024, height:1024});
}
await writeFile('src/assets/environment/mobile-materials.json',JSON.stringify({source:'https://polyhaven.com/a/rock_wall_16',author:'Amal Kumar / Poly Haven',license:'CC0-1.0',changes:'Resized existing licensed 2K PBR maps to 1K; albedo remains sRGB, normal and ORM remain linear; same texture sources shared across all prison surfaces.',records},null,2)+'\n');
