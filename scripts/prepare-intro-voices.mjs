import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const inputs = [
  [
    "cellmate-wakeup",
    "/workspace/attachments/6b01c93a-37b8-43eb-8b7a-7dcbfcbc031f/ElevenLabs_2026-10-28T19_07_05_Hank Harvey - Gruff, Rugged and Wise_pvc_sp100_s50_sb75_v4.mp3",
    "Cellmate",
    "Hey, bro, wake up!",
    0.35,
    "Hank Harvey",
  ],
  [
    "cellmate-door",
    "/workspace/attachments/a0daae61-786f-4ad4-b9ed-89081612b271/ElevenLabs_2026-10-28T19_08_48_Hank Harvey - Gruff, Rugged and Wise_pvc_sp100_s50_sb75_v4.mp3",
    "Cellmate",
    "The door is open.",
    2.8,
    "Hank Harvey",
  ],
  [
    "player-escape",
    "/workspace/attachments/7210e7dc-04cb-4615-8ca1-75ec6c15ec98/ElevenLabs_2026-10-28T19_11_50_Mark - Natural Conversations_pvc_sp100_s44_sb75_v4.mp3",
    "Kabir Rao",
    "We gotta take this chance and escape!",
    4.8,
    "Mark — Natural Conversations",
  ],
  [
    "guard-stay-down",
    "/workspace/attachments/36b2a89a-e68d-4a17-86f6-6bca89a373b7/ElevenLabs_2026-10-28T19_24_08_Moe Mathews _pvc_sp100_s50_sb75_v4.mp3",
    "Prison Guard",
    "Stay down!",
    10.4,
    "Moe Mathews",
  ],
  [
    "guard-dead",
    "/workspace/attachments/54611631-1158-4c8c-b8af-11c41dce073d/ElevenLabs_2026-10-28T19_24_57_Moe Mathews _pvc_sp100_s50_sb75_v4.mp3",
    "Prison Guard",
    "Oh, he's dead!",
    18.2,
    "Moe Mathews",
  ],
];
const dir = "src/assets/audio/intro";
await mkdir(dir, { recursive: true });
const sources = [];
for (const [id, path, speaker, text, start, voice] of inputs) {
  const file = `${id}.mp3`;
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    path,
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
    `${dir}/${file}`,
  ]);
  const original = await readFile(path),
    bytes = await readFile(`${dir}/${file}`);
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
        `${dir}/${file}`,
      ],
      { encoding: "utf8" },
    ).trim(),
  );
  sources.push({
    id,
    file: `intro/${file}`,
    originalFile: path.split("/").pop(),
    speaker,
    text,
    start,
    duration,
    voice,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sourceSHA256: createHash("sha256").update(original).digest("hex"),
  });
}
await writeFile(
  "src/assets/audio/intro-voice-manifest.json",
  JSON.stringify(
    {
      provenance:
        "Five ElevenLabs MP3 recordings supplied by the project owner in this chat; transcribed locally with Whisper tiny.en to map dialogue to scene events.",
      license:
        "User-supplied ElevenLabs output. No CC0 or public-domain status is asserted. Redistribution and commercial use depend on the originating account permissions and ElevenLabs terms.",
      changes:
        "High-pass at 65 Hz, -17 LUFS normalization, mono 44.1 kHz MP3. Original voices and wording retained; no voice cloning, pitch shift or new synthesis.",
      sources,
    },
    null,
    2,
  ) + "\n",
);
