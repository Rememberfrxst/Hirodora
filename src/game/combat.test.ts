import test from "node:test";
import assert from "node:assert/strict";
import {
  COMBAT,
  stepMelee,
  checkpointHealth,
  clampHealth,
  type MeleeState,
} from "./combat";
test("melee has a visible windup, a single contact instant and cooldown", () => {
  let s: MeleeState = { cooldown: 0 };
  let hits = 0;
  for (let i = 0; i < 100; i++) {
    const n = stepMelee(s, true, true, 0.01);
    s = n;
    if (n.hit) {
      hits++;
      assert.ok(i >= 35);
    }
  }
  assert.equal(hits, 1);
  assert.ok(s.cooldown > 0);
});
test("escaping, solid cover and knock-out can cancel damage without delayed phantom hits", () => {
  let s: MeleeState = { elapsed: 0.3, cooldown: 0 };
  s = stepMelee(s, false, false, 0.1);
  assert.equal((s as any).hit, false);
  assert.equal(stepMelee(s, true, true, 0.1).hit, false);
  assert.equal(
    stepMelee({ elapsed: 0.3, cooldown: 0 }, true, true, 0.1, false).elapsed,
    undefined,
  );
});
test("200 HP takes eight 25-damage hits; checkpoints migrate safely and never heal during play", () => {
  assert.equal(COMBAT.maxHealth, 200);
  let hp = 200;
  for (let i = 0; i < 8; i++) hp = clampHealth(hp - COMBAT.damage);
  assert.equal(hp, 0);
  assert.equal(clampHealth(-50), 0);
  assert.equal(checkpointHealth(undefined), 200);
  assert.equal(checkpointHealth(NaN), 200);
  assert.equal(checkpointHealth(150), 150);
  assert.equal(checkpointHealth(0), 200);
});
