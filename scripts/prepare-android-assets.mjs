import sharp from "sharp";
import { mkdir, copyFile, cp, rm } from "node:fs/promises";
const source = process.argv[2] || "src/assets/branding/hirodora-icon.png";
await mkdir("src/assets/branding", { recursive: true });
if (source !== "src/assets/branding/hirodora-icon.png")
  await copyFile(source, "src/assets/branding/hirodora-icon.png");
await sharp(source)
  .resize(256, 256)
  .webp({ quality: 92 })
  .toFile("src/assets/branding/hirodora-icon.webp");
for (const [density, pixels] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  await sharp(source)
    .resize(pixels, pixels)
    .png()
    .toFile(`${dir}/ic_launcher.png`);
}
for (const size of [180, 192, 512])
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
// This directory is exclusively generated output; remove stale Vite hashes.
await rm("android/app/src/main/assets/game", { recursive: true, force: true });
await mkdir("android/app/src/main/assets/game", { recursive: true });
await cp("dist", "android/app/src/main/assets/game", { recursive: true });
console.log("Android launcher icons and offline game assets prepared.");
