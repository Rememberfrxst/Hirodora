/** Private audition of the uploaded clip; publication awaits its source license. */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const [input, out = "/workspace/hirodora-pistol-audio-preview"] =
  process.argv.slice(2);
if (!input) throw Error("Supply the uploaded MP3 path");
await mkdir(out, { recursive: true });
const filter =
  "atrim=start=0.095:end=0.49,asetpts=PTS-STARTPTS,highpass=f=55,afade=t=in:d=0.002,afade=t=out:st=0.37:d=0.025,alimiter=limit=0.84:level=false";
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-i",
  input,
  "-af",
  filter,
  "-ac",
  "1",
  "-ar",
  "44100",
  "-c:a",
  "libvorbis",
  "-q:a",
  "6",
  `${out}/pistol-shot.ogg`,
]);
const bytes = await readFile(`${out}/pistol-shot.ogg`);
await writeFile(
  `${out}/edit.json`,
  JSON.stringify(
    {
      sourceFile: input.split("/").at(-1),
      sourceSHA256: createHash("sha256")
        .update(await readFile(input))
        .digest("hex"),
      activeSourceSeconds: [0.107347, 0.425079],
      cropSeconds: [0.095, 0.49],
      duration: 0.395,
      filter,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      publication:
        "held: official license hostname mixkit.co denied by environment proxy (CONNECT HTTP 403); not included in shipped builds",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Private gunshot audition prepared: 0.395s, no leading/trailing silent gap. Source license still needed before publication.",
);
