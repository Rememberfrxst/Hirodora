// Reproducible acquisition of recordings. No credentials or download service at runtime.
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
} from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const destination = "src/assets/audio";
const work = "/tmp/hirodora-audio-source";
await mkdir(destination, { recursive: true });
await mkdir(work, { recursive: true });
const archive = work + "/impact.zip";
execFileSync("curl", [
  "-fsSL",
  "--max-time",
  "60",
  "-o",
  archive,
  "https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip",
]);
execFileSync("unzip", ["-o", "-q", archive, "-d", work + "/kenney"]);
const manifest = [];
async function register(file, source, author, usage, changes) {
  const bytes = await readFile(destination + "/" + file);
  manifest.push({
    file,
    source,
    author,
    license: "CC0-1.0",
    licenseURL: "https://creativecommons.org/publicdomain/zero/1.0/",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    usage,
    changes,
  });
}
for (const file of await readdir(work + "/kenney/Audio")) {
  if (
    !/^(footstep_(concrete|wood)_00[0-3]|impact(Metal|Wood|Glass|Plate|Plastic|Soft|Tin|Generic)_(light|heavy)_00[0-1])\.ogg$/.test(
      file,
    )
  )
    continue;
  await copyFile(work + "/kenney/Audio/" + file, destination + "/" + file);
  await register(
    file,
    "https://kenney.nl/assets/impact-sounds",
    "Kenney",
    file.replace(".ogg", ""),
    "Original OGG recording, unmodified",
  );
}
const recordings = [
  ["tile", "Nox_Sound", 555868, "steps"],
  ["metal", "audioninja001", 455058, "steps"],
  ["gravel", "soundmary", 117627, "steps"],
  ["dirt", "SecureSubset", 813621, "steps"],
  ["water", "xkeril", 611278, "steps"],
  ["ventilation", "jamesdrake89", 671456, "loop"],
  ["drips", "xkeril", 628404, "loop"],
  ["guard-stop", "balloonhead", 364952, "voice"],
  ["guard-hey", "TechWalker", 419920, "voice"],
  ["bed-drag", "sfneumar", 735684, "foley"],
  ["screwdriver", "piwilliwillski", 579554, "foley"],
  ["ceramic-drag", "3D_Blanco", 848463, "foley"],
  ["plastic", "jomse", 525105, "foley"],
  ["keys", "heidicolorado", 827504, "foley"],
  ["paper", "Spaghetto87", 731484, "foley"],
  ["fabric", "reconsider59", 427211, "foley"],
  ["hinge", "Ottomaani138", 232700, "foley"],
];
for (const [name, author, id, kind] of recordings) {
  const source = `https://freesound.org/people/${author}/sounds/${id}/`;
  const page = execFileSync(
    "curl",
    ["-fsSL", "--retry", "3", "--retry-delay", "3", "--max-time", "30", source],
    { encoding: "utf8" },
  );
  if (!/creativecommons.org\/publicdomain\/zero\/1.0/.test(page))
    throw Error("CC0 license verification failed: " + source);
  const url = page.match(/data-static-file-url="([^"]+)"/)?.[1];
  if (!url?.startsWith("https://cdn.freesound.org/"))
    throw Error("Unrecognized audio endpoint: " + source);
  const input = `${work}/${name}.mp3`,
    normalized = `${work}/${name}.wav`;
  execFileSync("curl", ["-fsSL", "--max-time", "60", "-o", input, url]);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    input,
    "-t",
    kind === "steps" ? "30" : kind === "loop" ? "14" : "10",
    "-ac",
    "1",
    "-ar",
    "32000",
    "-af",
    "loudnorm=I=-20:TP=-3:LRA=8",
    normalized,
  ]);
  if (kind === "steps") {
    const log = spawnSync(
      "ffmpeg",
      [
        "-i",
        normalized,
        "-af",
        "silencedetect=n=-32dB:d=0.12",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    ).stderr;
    const starts = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) =>
      Math.max(0, Number(m[1]) - 0.025),
    );
    const times = starts
      .filter((n, i) => i === 0 || n - starts[i - 1] > 0.22)
      .slice(0, 4);
    if (times.length < 3)
      throw Error("Recording needs manual footstep segmentation: " + source);
    for (let i = 0; i < times.length; i++) {
      const file = `${name}-${i}.ogg`;
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-ss",
        String(times[i]),
        "-i",
        normalized,
        "-t",
        "0.5",
        "-af",
        "afade=t=out:st=0.4:d=0.1",
        "-c:a",
        "libvorbis",
        "-q:a",
        "3",
        destination + "/" + file,
      ]);
      await register(
        file,
        source,
        author,
        name + " footwear contact",
        `HQ preview; mono 32kHz, normalized, cut at ${times[i]}s, 0.5s, fade out, Vorbis q3`,
      );
    }
  } else {
    const file = name + ".ogg";
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      normalized,
      "-af",
      "afade=t=in:d=0.02,afade=t=out:st=" +
        (kind === "loop" ? "11" : name === "guard-stop" ? "8" : "2.8") +
        ":d=0.15",
      "-t",
      kind === "loop" ? "12" : name === "guard-stop" ? "8.3" : "3",
      "-c:a",
      "libvorbis",
      "-q:a",
      "3",
      destination + "/" + file,
    ]);
    await register(
      file,
      source,
      author,
      kind,
      "HQ preview; mono 32kHz, loudness normalized, fades, Vorbis q3",
    );
  }
}
await copyFile(
  work + "/kenney/License.txt",
  destination + "/KENNEY-LICENSE.txt",
);
await writeFile(
  destination + "/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  destination + "/urls.ts",
  manifest.map((m, i) => `import a${i} from './${m.file}';`).join("\n") +
    "\nexport const audioURLs: Record<string, string> = {\n" +
    manifest
      .map((m, i) => `  '${m.file.replace(".ogg", "")}': a${i},`)
      .join("\n") +
    "\n};\n",
);
console.log(
  manifest.length +
    " licensed recordings: " +
    manifest.reduce((n, m) => n + m.bytes, 0) +
    " bytes",
);
