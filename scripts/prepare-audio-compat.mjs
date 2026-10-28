/** Universal Web Audio decode: older iOS Safari cannot decode our Ogg Vorbis. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const dir = "src/assets/audio",
  source = await readFile(`${dir}/urls.ts`, "utf8");
const files = [
  ...source.matchAll(/from ['"]\.\/(?:compat\/)?([^'"]+)\.(?:ogg|mp3)['"]/g),
].map((m) => m[1]);
if (files.length < 60)
  throw Error("Expected the complete local recording library");
await mkdir(`${dir}/compat`, { recursive: true });
const records = [];
for (const name of files) {
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    `${dir}/${name}.ogg`,
    "-map_metadata",
    "-1",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "3",
    "-ar",
    "44100",
    "-y",
    `${dir}/compat/${name}.mp3`,
  ]);
  const bytes = await readFile(`${dir}/compat/${name}.mp3`);
  records.push({
    source: `${name}.ogg`,
    file: `compat/${name}.mp3`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const urls = source.replace(
  /from (['"])\.\/(?:compat\/)?([^'"]+)\.(?:ogg|mp3)\1/g,
  (_, q, name) => `from ${q}./compat/${name}.mp3${q}`,
);
await writeFile(`${dir}/urls.ts`, urls);
await writeFile(
  `${dir}/compat-manifest.json`,
  JSON.stringify(
    {
      reason:
        "MP3 derivatives allow Web Audio decode on iOS Safari versions without Ogg Vorbis support. Same licensed source recordings and attribution as manifest.json; transcoding only, no voice generation.",
      records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Transcoded ${records.length} licensed recordings for Safari-compatible Web Audio.`,
);
