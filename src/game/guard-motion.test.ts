import { test } from "node:test";
import assert from "node:assert/strict";
import { angleDelta, guardClip } from "./guard-motion";

test("officer visual states cover locomotion, perception, turns and non-lethal collapse", () => {
  assert.equal(guardClip("patrol", 0, 0), "Idle");
  assert.equal(guardClip("patrol", 1.3, 0), "Walk");
  assert.equal(guardClip("chase", 3.9, 0), "Run");
  assert.equal(guardClip("suspicious", 0, 0), "Investigate");
  assert.equal(guardClip("searching", 0, 0), "Search");
  assert.equal(guardClip("chase", 0, 0), "Alert");
  assert.equal(guardClip("patrol", 0, 1), "Turn left 45°");
  assert.equal(guardClip("patrol", 0, -1), "Turn right 45°");
  assert.equal(guardClip("patrol", 1.3, 1), "Walk");
  assert.equal(guardClip("knocked_out", 3.9, 1), "Collapse");
});
test("visual turning takes the short path across the +/- pi seam", () => {
  assert.ok(Math.abs(angleDelta(-Math.PI + 0.1, Math.PI - 0.1) - 0.2) < 1e-6);
  assert.ok(Math.abs(angleDelta(Math.PI - 0.1, -Math.PI + 0.1) + 0.2) < 1e-6);
});
