import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const directory = await mkdtemp(join(tmpdir(), "hirodora-public-download-"));
const web = JSON.parse(await readFile("downloads/latest.json", "utf8"));
const android = JSON.parse(
  await readFile("downloads/android-latest.json", "utf8"),
);
const results = [];
for (const [file, sha256] of [
  [web.archive, web.sha256],
  [android.file, android.sha256],
]) {
  const url = `https://raw.githubusercontent.com/Rememberfrxst/Hirodora/main/downloads/${file}`;
  const destination = join(directory, file);
  const status = execFileSync(
    "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--output",
      destination,
      "--write-out",
      "%{http_code}",
      url,
    ],
    { encoding: "utf8" },
  ).trim();
  const data = await readFile(destination);
  const actual = createHash("sha256").update(data).digest("hex");
  if (status !== "200" || actual !== sha256)
    throw Error(`Public download mismatch: ${file}`);
  if (file.endsWith(".zip"))
    execFileSync("unzip", ["-t", destination], { stdio: "pipe" });
  results.push({
    url,
    status: Number(status),
    bytes: data.length,
    sha256: actual,
    integrity: "passed",
  });
}
const report = {
  version: web.version,
  mainCommit: execFileSync("git", ["ls-remote", "origin", "refs/heads/main"], {
    encoding: "utf8",
  }).split(/\s/)[0],
  downloads: results,
};
const reportDir = process.env.VERIFY_DIR || "docs/verification/atrium-v14";
await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, "public-downloads.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Public main ZIP and APK returned HTTP 200; complete bytes, SHA-256 and ZIP integrity match the verified release.",
);
