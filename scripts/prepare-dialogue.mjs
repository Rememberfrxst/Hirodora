import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
// Original CC0 recordings pinned to the previous release; no generational re-encoding.
const revision = "afdc6d5c8491469a20b0049bb2894396cbaa80d3";
const dir = "src/assets/audio";
const manifest = JSON.parse(await readFile(`${dir}/manifest.json`, "utf8"));
await mkdir("/tmp/hirodora-dialogue", { recursive: true });
for (const name of ["guard-stop", "guard-hey"]) {
  const original = `/tmp/hirodora-dialogue/${name}.ogg`;
  execFileSync("curl", [
    "-fsSL",
    "--retry",
    "2",
    `https://raw.githubusercontent.com/Rememberfrxst/Hirodora/${revision}/${dir}/${name}.ogg`,
    "-o",
    original,
  ]);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    original,
    "-af",
    "highpass=f=85,afftdn=nf=-28,rubberband=pitch=0.88,equalizer=f=180:t=q:w=0.8:g=2,equalizer=f=2600:t=q:w=0.7:g=3,acompressor=threshold=0.12:ratio=2.5:attack=8:release=100,loudnorm=I=-16:TP=-2:LRA=7",
    "-ar",
    "48000",
    "-ac",
    "1",
    "-c:a",
    "libvorbis",
    "-q:a",
    "6",
    `${dir}/${name}.ogg`,
  ]);
  const asset = manifest.find((a) => a.file === `${name}.ogg`);
  const bytes = await readFile(`${dir}/${name}.ogg`);
  asset.bytes = bytes.length;
  asset.sha256 = createHash("sha256").update(bytes).digest("hex");
  asset.changes =
    asset.changes.replace(/; v0\.6 master:.*/, "") +
    "; v0.6 master: 48kHz mono Vorbis q6, 0.88 pitch with duration preserved, noise reduction, 85Hz high-pass, vocal presence EQ, compression, -16 LUFS / -2dB true peak";
}
await writeFile(
  `${dir}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
