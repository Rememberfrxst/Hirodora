import test from "node:test";
import assert from "node:assert/strict";
import {
  ATRIUM,
  supportHeight,
  surfaceHeights,
  findSurfacePath,
  migratePosition,
  bodyBlocked,
  evidenceTarget,
  stairHeight,
  onWoodStairs,
} from "./atrium";
test("atrium upper galleries, lower hall, end bridge and continuous stairs have explicit support", () => {
  assert.equal(supportHeight(-25, 0, 0), 0);
  assert.equal(supportHeight(-25, 5, 0), undefined, "cannot walk on air");
  assert.equal(supportHeight(-25, 5, -3.2), -3.2);
  assert.equal(supportHeight(-4.5, 5, 0), 0);
  const s = ATRIUM.stairs[0];
  assert.ok(
    Math.abs(
      surfaceHeights((s.top + s.bottom) / 2, ATRIUM.centerZ).at(-1)! -
        stairHeight(0.5),
    ) < 1e-6,
  );
});
test("3D route descends the stairs and does not cut through the central opening", () => {
  const route = findSurfacePath([-7, 0, 0], [-20, -3.2, 5], []);
  assert.ok(route.length > 10);
  let p: [number, number, number] = [-7, 0, 0];
  for (const n of route) {
    assert.ok(Math.abs(p[1] - n[1]) <= 0.35);
    assert.ok(
      surfaceHeights(n[0], n[2]).some((y) => Math.abs(y - n[1]) < 0.001),
    );
    p = n;
  }
  assert.equal(p[1], -3.200000047683716);
});
test("collision respects height and old checkpoints migrate without losing northern puzzle positions", () => {
  const b = { min: { x: -6, y: 0, z: 0 }, max: { x: -5, y: 1.1, z: 1 } };
  assert.equal(bodyBlocked(-5.5, 0, 0.5, [b]), true);
  assert.equal(bodyBlocked(-5.5, -3.2, 0.5, [b]), false);
  assert.deepEqual(migratePosition([-6, 0, -6]), [-6, 0, -6]);
  assert.deepEqual(migratePosition([-11, 0, 9]), [-11, 0, 14]);
  assert.deepEqual(migratePosition([-30, 0, 3]), [-30, 0, 0.4]);
  assert.deepEqual(migratePosition([-30, -3.2, 5], 13), [-30, -3.2, 2.5]);
  assert.deepEqual(migratePosition([-11, 0, 16], 13), [-11, 0, 14]);
  assert.deepEqual(migratePosition([-11, 0, -6], 13), [-11, 0, -6]);
  assert.deepEqual(migratePosition([-9.7, -1.6, 5], 13), [
    -9.7,
    stairHeight(0.5),
    4,
  ]);
  assert.deepEqual(migratePosition([-30, -3.2, 24], 14), [-30, -3.2, 14]);
  assert.deepEqual(migratePosition([-30, -3.2, 19], 15), [-30, -3.2, 13]);
  assert.deepEqual(migratePosition([-9.7, -1.6, 7], 15), [
    -9.7,
    stairHeight(0.5),
    4,
  ]);
  assert.deepEqual(migratePosition([-30, -3.2, 7], 15), [-30, -3.2, 4]);
  assert.deepEqual(migratePosition([-11, 0, 17], 16), [-11, 0, 15]);
  assert.deepEqual(migratePosition([-11, 0, 17], 17), [-11, 0, 17]);
  assert.equal(supportHeight(-11, -8, -3.2), -3.2);
  assert.equal(supportHeight(-11, 19, -3.2), -3.2);
  assert.deepEqual(evidenceTarget([-11, -1.8, -2]), [-11, -3.2, -2]);
  assert.deepEqual(evidenceTarget([-11, 1.4, -2]), [-11, 0, -2]);
});
test("all imported treads remain climbable and wood footsteps exclude the floor underneath", () => {
  let y = -3.2;
  for (let t = 1; t >= 0; t -= 0.01) {
    const next = stairHeight(t);
    assert.ok(Math.abs(next - y) < 0.35);
    y = next;
  }
  const s = ATRIUM.stairs[0],
    x = (s.top + s.bottom) / 2;
  assert.equal(onWoodStairs([x, stairHeight(0.5), ATRIUM.centerZ]), true);
  assert.equal(onWoodStairs([x, -3.2, ATRIUM.centerZ]), false);
});
