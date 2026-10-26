import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
const dir = await mkdtemp(tmpdir() + "/hirodora-shot-");
execFileSync("curl", [
  "-fsSL",
  "https://opengameart.org/sites/default/files/sounds.zip",
  "-o",
  dir + "/sounds.zip",
]);
execFileSync("unzip", [
  "-q",
  dir + "/sounds.zip",
  "sounds/cz.wav",
  "sounds/creativecommons.txt",
  "-d",
  dir,
]);
// The page says CC0; elect the stricter CC-BY 3.0 terms embedded in the archive.
const license = await readFile(dir + "/sounds/creativecommons.txt", "utf8");
if (
  !license.includes("Vincent Sevedge") ||
  !license.includes("Attribution 3.0")
)
  throw Error("Review changed audio license");
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-i",
  dir + "/sounds/cz.wav",
  "-t",
  "1.62",
  "-af",
  "silenceremove=start_periods=1:start_threshold=-25dB,highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,afade=t=out:st=1.2:d=0.4",
  "-ac",
  "1",
  "-ar",
  "48000",
  "-c:a",
  "libvorbis",
  "-q:a",
  "6",
  "src/assets/audio/guard-gunshot.ogg",
]);
const file = await readFile("src/assets/audio/guard-gunshot.ogg");
const manifest = JSON.parse(
  await readFile("src/assets/audio/manifest.json", "utf8"),
);
const entry = {
  file: "guard-gunshot.ogg",
  source: "https://opengameart.org/content/gunshot-sounds",
  download: "https://opengameart.org/sites/default/files/sounds.zip",
  author: "Vincent (Vince) Sevedge / Tabasco",
  license: "CC-BY-3.0",
  licenseURL: "https://creativecommons.org/licenses/by/3.0/",
  sha256: createHash("sha256").update(file).digest("hex"),
  bytes: file.length,
  usage: "Opening cinematic pistol shot",
  changes:
    "First CZ-52 recording excerpt; leading silence trimmed, mono 48kHz, high-pass, -18 LUFS/-2 dBTP, fade, Vorbis. Archive CC-BY 3.0 terms elected despite CC0 page label.",
};
const at = manifest.findIndex((a) => a.file === entry.file);
if (at < 0) manifest.push(entry);
else manifest[at] = entry;
await writeFile(
  "src/assets/audio/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "src/assets/audio/GUNSHOT-LICENSE.txt",
  license +
    "\nSource: " +
    entry.source +
    "\nAdaptation: " +
    entry.changes +
    "\n",
);
