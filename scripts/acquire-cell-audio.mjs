// Additive licensed foley acquisition; never regenerates the existing voice masters.
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
const work = await mkdtemp(join(tmpdir(), "hirodora-v10-foley-")),
  dest = "src/assets/audio";
await mkdir(dest, { recursive: true });
const manifest = JSON.parse(await readFile(`${dest}/manifest.json`, "utf8"));
const clips = [
  ["table-slide", "ralph.whitehead", 565727, 0, 3.2, true, "highpass=f=80,lowpass=f=5500"],
  // File, author, Freesound ID, start seconds, length, looping, adaptation filters.
  [
    "bed-creak-0",
    "richwise",
    871185,
    0,
    2.4,
    false,
    "highpass=f=85,lowpass=f=5500",
  ],
  ["bed-slide", "sfneumar", 735684, 0, 3, true, "highpass=f=75,lowpass=f=6000"],
  [
    "bed-creak-1",
    "richwise",
    871185,
    2.7,
    2.4,
    false,
    "highpass=f=90,lowpass=f=5000",
  ],
  [
    "toilet-scrape",
    "Gerent",
    558728,
    0,
    3.7,
    true,
    "asetrate=42336,aresample=32000,highpass=f=65,lowpass=f=3300",
  ],
  [
    "gate-close",
    "brianbaltar",
    528259,
    0,
    4,
    false,
    "highpass=f=65,lowpass=f=9000",
  ],
  [
    "cell-lock",
    "bruno.auzet",
    661642,
    0,
    3.5,
    false,
    "highpass=f=80,lowpass=f=9000",
  ],
  [
    "lock-turn",
    "colinpoh",
    146348,
    0,
    3.7,
    false,
    "highpass=f=85,lowpass=f=8500",
  ],
  [
    "bolt-ratchet",
    "tannernet",
    698699,
    4.0,
    1.8,
    true,
    "highpass=f=140,lowpass=f=6500",
  ],
  ["heavy-bolt", "kyles", 407297, 0, 3, false, "highpass=f=70,lowpass=f=7000"],
];
const selected = process.argv.find((x) => x.startsWith("--only="))?.slice(7);
for (const [name, author, id, start, length, loop, filters] of clips) {
  if (selected && selected !== name) continue;
  const source = `https://freesound.org/people/${author}/sounds/${id}/`;
  const page = execFileSync(
    "curl",
    ["-fsSL", "--retry", "2", "--max-time", "30", source],
    { encoding: "utf8", maxBuffer: 4e6 },
  );
  if (!/creativecommons.org\/publicdomain\/zero\/1.0/.test(page))
    throw Error(`CC0 not verified: ${source}`);
  const download = page.match(/data-static-file-url="([^"]+)"/)?.[1];
  if (!download?.startsWith("https://cdn.freesound.org/"))
    throw Error(`Unknown endpoint: ${source}`);
  const input = join(work, `${name}.mp3`);
  execFileSync("curl", [
    "-fsSL",
    "--retry",
    "2",
    "--max-time",
    "45",
    "-o",
    input,
    download,
  ]);
  const pcm = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      String(start),
      "-i",
      input,
      "-t",
      String(length),
      "-ac",
      "1",
      "-ar",
      "32000",
      "-af",
      `${filters},silenceremove=start_periods=1:start_threshold=-42dB:start_duration=0.015,loudnorm=I=-23:TP=-3:LRA=9`,
      "-f",
      "f32le",
      "-ar",
      "32000",
      "pipe:1",
    ],
    { maxBuffer: 5e6 },
  );
  let output = pcm;
  if (pcm.length < 32000 * 4 * 0.08)
    throw Error(`No usable decoded audio after trim: ${name}`);
  if (loop) {
    const count = pcm.length / 4,
      fade = Math.min(2560, Math.floor(count / 5)),
      n = count - fade;
    output = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
      const value =
        i < fade
          ? pcm.readFloatLE(i * 4) * Math.sin(((i / fade) * Math.PI) / 2) +
            pcm.readFloatLE((count - fade + i) * 4) *
              Math.cos(((i / fade) * Math.PI) / 2)
          : pcm.readFloatLE(i * 4);
      output.writeFloatLE(value, i * 4);
    }
  }
  const file = `${name}.ogg`;
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-f",
      "f32le",
      "-ar",
      "32000",
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-af",
      loop
        ? "alimiter=limit=0.85:level=false"
        : "afade=t=in:d=0.008,afade=t=out:st=" +
          Math.max(0.01, output.length / 128000 - 0.08) +
          ":d=0.08",
      "-c:a",
      "libvorbis",
      "-q:a",
      "4",
      `${dest}/${file}`,
    ],
    { input: output },
  );
  const bytes = await readFile(`${dest}/${file}`);
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
        `${dest}/${file}`,
      ],
      { encoding: "utf8" },
    ),
  );
  if (!Number.isFinite(duration) || duration < 0.08)
    throw Error(`Invalid encoded audio: ${file}`);
  const entry = {
    file,
    source,
    download,
    author,
    license: "CC0-1.0",
    licenseURL: "https://creativecommons.org/publicdomain/zero/1.0/",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    usage: name,
    changes: `HQ preview excerpt ${start}–${start + length}s; mono 32 kHz; ${filters}; -23 LUFS target / -3 dBTP; ${loop ? "80 ms wrap crossfade for seamless movement loop" : "trimmed onset / short fade"}; Vorbis q4.${name === "toilet-scrape" ? " Ceramic grinding is adapted foley, not a recording of this exact toilet." : ""}`,
  };
  const index = manifest.findIndex((s) => s.file === file);
  if (index < 0) manifest.push(entry);
  else manifest[index] = entry;
  console.log(`Verified ${name}: ${author} CC0, ${bytes.length} bytes`);
}
await writeFile(
  `${dest}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
const imports = manifest.map((s, i) => `import a${i} from './${s.file}';`);
await writeFile(
  `${dest}/urls.ts`,
  imports.join("\n") +
    "\nexport const audioURLs: Record<string,string> = {\n" +
    manifest
      .map((s, i) => `  '${s.file.replace(/\.ogg$/, "")}': a${i},`)
      .join("\n") +
    "\n};\n",
);
