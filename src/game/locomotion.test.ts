import test from "node:test";
import assert from "node:assert/strict";
import { advanceStride, strideLength, OPENING_DUTY } from "./locomotion";
import { introFrame, SHOT_TIME, WAKE_DURATION } from "./intro";
test("locomotion contact audio and pose share distance phase across frame rates", () => {
  for (const run of [false, true]) {
    const length = strideLength(run);
    let phase = 0,
      contacts = 0;
    for (let i = 0; i < 120; i++) {
      const n = advanceStride(phase, length / 120, run);
      phase = n.phase;
      contacts += n.contacts;
    }
    assert.equal(contacts, 2);
    assert.ok(phase < 1e-7 || phase > 1 - 1e-7);
    assert.equal(advanceStride(0.2, 0, run).contacts, 0);
  }
  introFrame(99).guard.forEach((v, i) =>
    assert.ok(Math.abs(v - OPENING_DUTY[i]) < 1e-8),
  );
  assert.ok(introFrame(1).guard[0] > -5 && introFrame(1).guard[2] > 3);
  assert.ok(introFrame(SHOT_TIME - 0.1).prisonerSteps > 1);
  assert.ok(introFrame(WAKE_DURATION + 3).prisonerDistance > 0);
});
