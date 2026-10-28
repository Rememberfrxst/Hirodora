import test from "node:test";
import assert from "node:assert/strict";
import {
  ATRIUM,
  MAX_STEP,
  LAYOUT_VERSION,
  supportHeight,
  surfaceHeights,
  findSurfacePath,
  migratePosition,
  bodyBlocked,
  evidenceTarget,
  stairHeight,
  onWoodStairs,
  stairPoint,
  upperFloorAt,
  STAIR_OPENINGS,
} from "./atrium";
import { CELL_ROOMS } from "./cell-block";
test("stairs begin opposite Cell 048 and 036 with actual upper-floor openings and taller lower cells", () => {
  assert.equal(ATRIUM.depth, -3.8);
  for (const s of ATRIUM.stairs) {
    assert.equal(s.x, CELL_ROOMS.find((c) => c.number === s.cell)!.centerX);
    const p = stairPoint(s, 0.4);
    assert.equal(upperFloorAt(p[0], p[2]), false);
    assert.ok(surfaceHeights(p[0], p[2]).includes(p[1]));
    assert.equal(
      supportHeight(s.x, s.topZ - Math.sign(s.bottomZ - s.topZ) * 0.4, 0),
      0,
    );
  }
  assert.equal(supportHeight(-25, 5, 0), undefined);
  assert.equal(supportHeight(-25, 5, ATRIUM.depth), ATRIUM.depth);
  assert.equal(STAIR_OPENINGS.length, 2);
});
test("three-layer navigation preserves the upper gallery above stair bottoms and descends either flight", () => {
  for (const s of ATRIUM.stairs) {
    const start: [number, number, number] = [
      s.x,
      0,
      s.topZ - Math.sign(s.bottomZ - s.topZ) * 0.45,
    ];
    const end: [number, number, number] = [
      s.x,
      ATRIUM.depth,
      s.bottomZ + Math.sign(s.bottomZ - s.topZ) * 0.5,
    ];
    const route = findSurfacePath(start, end, []);
    assert.ok(route.length > 10);
    let p = start;
    for (const n of route) {
      assert.ok(Math.abs(p[1] - n[1]) <= MAX_STEP + 1e-6);
      assert.ok(
        surfaceHeights(n[0], n[2]).some((y) => Math.abs(y - n[1]) < 1e-6),
      );
      p = n;
    }
    assert.ok(Math.abs(p[1] - ATRIUM.depth) < 1e-6);
    const low = stairPoint(s, 0.94);
    assert.ok(
      surfaceHeights(low[0], low[2]).includes(0),
      "upper slab remains above the bottom of the stairs",
    );
  }
});
test("checkpoints migrate lower height and old stairs without changing original puzzle cells", () => {
  assert.deepEqual(migratePosition([-6, 0, -6]), [-6, 0, -6]);
  assert.deepEqual(migratePosition([-30, -3.2, 7], 17), [-30, -3.8, 7]);
  assert.deepEqual(migratePosition([-30, -3.2, 5], 13), [-30, -3.8, 2.5]);
  assert.deepEqual(migratePosition([-11, 0, 17], 16), [-11, 0, 15]);
  const oldT = (-9.7 - -6.1) / (-13.3 - -6.1);
  const migrated = migratePosition([-9.7, -1.6, 4], 17),
    expected = stairPoint(ATRIUM.stairs[0], oldT);
  expected.forEach((v, i) => assert.ok(Math.abs(v - migrated[i]) < 1e-6));
  assert.deepEqual(migratePosition([-39, 0, 4], 17), [-39, 0, 4]);
  assert.deepEqual(
    migratePosition([-30, -3.8, 7], LAYOUT_VERSION),
    [-30, -3.8, 7],
  );
  const b = { min: { x: -6, y: 0, z: 0 }, max: { x: -5, y: 1.1, z: 1 } };
  assert.equal(bodyBlocked(-5.5, 0, 0.5, [b]), true);
  assert.equal(bodyBlocked(-5.5, ATRIUM.depth, 0.5, [b]), false);
  assert.deepEqual(evidenceTarget([-11, -1.8, -2]), [-11, ATRIUM.depth, -2]);
});
test("every fitted tread remains climbable, and footsteps distinguish stairs from their underpass", () => {
  let y: number = ATRIUM.depth;
  for (let t = 1; t >= 0; t -= 0.002) {
    const next = stairHeight(t);
    assert.ok(Math.abs(next - y) <= MAX_STEP);
    y = next;
  }
  for (const s of ATRIUM.stairs) {
    const p = stairPoint(s, 0.5);
    assert.equal(onWoodStairs(p), true);
    assert.equal(onWoodStairs([p[0], ATRIUM.depth, p[2]]), false);
  }
});
