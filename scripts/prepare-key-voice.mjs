import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const source = process.argv[2];
if (!source) throw Error("Supply the original Max MP3.");
const file = "intro/guard-key-missing.mp3",
  dest = "src/assets/audio/" + file;
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-i",
  source,
  "-map_metadata",
  "-1",
  "-af",
  "highpass=f=65,loudnorm=I=-17:TP=-1.5:LRA=8",
  "-ac",
  "1",
  "-ar",
  "44100",
  "-c:a",
  "libmp3lame",
  "-q:a",
  "3",
  "-y",
  dest,
]);
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  original = await readFile(source),
  bytes = await readFile(dest);
const duration = Number(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      dest,
    ],
    { encoding: "utf8" },
  ).trim(),
);
const path = "src/assets/audio/intro-voice-manifest.json",
  m = JSON.parse(await readFile(path, "utf8"));
m.reactions = [
  {
    id: "guard-key-missing",
    file,
    originalFile: source.split("/").pop(),
    speaker: "Prison Guard",
    text: "Where is key?",
    voice: "Max — Informal and Instructive",
    duration,
    bytes: bytes.length,
    sha256: hash(bytes),
    sourceSHA256: hash(original),
    trigger: "Once, immediately after taking the guard belt key",
    transcription: "Local Whisper tiny.en; original wording retained.",
  },
];
await writeFile(path, JSON.stringify(m, null, 2) + "\n");
