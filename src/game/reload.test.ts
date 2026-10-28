import test from "node:test";
import assert from "node:assert/strict";
import { stepReload, magazineAmmo } from "./reload";
import { BALLISTICS } from "./ballistics";
import { isAppleMobile, audioNeedsResume } from "./platform";
test("six-shot magazines migrate old saves safely; reload timing is bounded and reserve is unlimited", () => {
  assert.equal(BALLISTICS.ammo, 6);
  assert.equal(magazineAmmo(24), 6);
  assert.equal(magazineAmmo(-3), 0);
  assert.equal(magazineAmmo(undefined), 6);
  assert.equal(magazineAmmo(2), 2);
  let t: number = BALLISTICS.reloadSeconds;
  for (let i = 0; i < 36; i++) t = stepReload(t, 0.05);
  assert.ok(t < 1e-9);
  assert.equal(stepReload(0, 0.05), 0);
  assert.equal(stepReload(1, -1), 1);
});
test("iPhone and desktop-mode iPad get mobile controls; interrupted Safari audio can resume", () => {
  assert.equal(
    isAppleMobile({
      userAgent: "Mozilla iPhone OS 17_0",
      platform: "iPhone",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isAppleMobile({
      userAgent: "Mozilla Macintosh",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isAppleMobile({
      userAgent: "Mozilla Macintosh",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    false,
  );
  assert.equal(audioNeedsResume("interrupted"), true);
  assert.equal(audioNeedsResume("suspended"), true);
  assert.equal(audioNeedsResume("running"), false);
});
