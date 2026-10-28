import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import recordings from "../assets/audio/manifest.json";
import compat from "../assets/audio/compat-manifest.json";
test("every licensed recording has a valid hashed MP3 derivative for Safari without Ogg support", async () => {
  assert.equal(compat.records.length, recordings.length);
  assert.equal(compat.records.length, 70);
  for (const r of compat.records) {
    assert.ok(recordings.some((s) => s.file === r.source && s.license));
    const bytes = await readFile(
      new URL("../assets/audio/" + r.file, import.meta.url),
    );
    assert.equal(bytes.length, r.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), r.sha256);
    assert.ok(bytes.subarray(0, 3).toString() === "ID3" || bytes[0] === 0xff);
  }
  const urls = await readFile(
    new URL("../assets/audio/urls.ts", import.meta.url),
    "utf8",
  );
  assert.equal((urls.match(/\.mp3/g) || []).length, 70);
  assert.ok(!urls.includes(".ogg"));
});
