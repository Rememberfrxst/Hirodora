import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  actionFoley,
  clampAudioIntensity,
  soundPriority,
} from "./object-audio";
test("held-action foley uses distinct licensed material recordings, without replacing guard speech", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../assets/audio/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(new Set(Object.values(actionFoley).map((p) => p.loop)).size, 3);
  for (const p of Object.values(actionFoley))
    assert.ok(
      manifest.some(
        (s: any) => s.file === p.loop + ".ogg" && s.license === "CC0-1.0",
      ),
    );
  for (const name of [
    "bed-creak-0",
    "gate-close",
    "cell-lock",
    "lock-turn",
    "heavy-bolt",
  ])
    assert.ok(manifest.some((s: any) => s.file === name + ".ogg"));
  // Empty Vorbis files can contain valid headers and a matching hash. Require
  // actual encoded samples, not just bytes, for every newly acquired recording.
  for (const asset of manifest.filter((s: any) => s.download)) {
    const bytes = await readFile(
      new URL("../assets/audio/" + asset.file, import.meta.url),
    );
    let samples = 0n;
    for (
      let offset = bytes.indexOf("OggS");
      offset >= 0;
      offset = bytes.indexOf("OggS", offset + 4)
    ) {
      if (offset + 14 > bytes.length) break;
      const granule = bytes.readBigUInt64LE(offset + 6);
      if (granule !== 0xffffffffffffffffn && granule > samples)
        samples = granule;
    }
    assert.ok(
      samples >= 2560n,
      asset.file + " must contain at least 80 ms of audio",
    );
  }
});
test("voice priority protects intelligibility and intensity cannot become invalid gain", () => {
  assert.ok(soundPriority("dialogue") > soundPriority("sfx"));
  assert.ok(soundPriority("sfx") > soundPriority("footsteps"));
  assert.equal(clampAudioIntensity(Infinity), 0);
  assert.equal(clampAudioIntensity(-5), 0);
  assert.equal(clampAudioIntensity(10), 1);
  assert.equal(clampAudioIntensity(0.32), 0.32);
});
test("new close-up captures preserve all gameplay dimensions and interaction prerequisites", async () => {
  const before = JSON.parse(
    await readFile(
      new URL(
        "../../docs/screenshots/cell-v10/before/capture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const after = JSON.parse(
    await readFile(
      new URL(
        "../../docs/screenshots/cell-v10/after/capture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.deepEqual(after.views, before.views);
  assert.deepEqual(after.gameplay, before.gameplay);
});
