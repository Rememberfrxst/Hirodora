import test from "node:test";
import assert from "node:assert/strict";
import {
  CELL_BLOCK,
  CELL_ROOMS,
  isExplorationCell,
  cellApproachTarget,
} from "./cell-block";
import { findPath, pathObstructed } from "./navigation";
test("guard approach uses the expanded corridor and respects open gates on either row", () => {
  assert.deepEqual(
    cellApproachTarget([-66, 0, -8], [-62, 0, 1], () => false),
    [-66, 0, -1.5],
  );
  assert.deepEqual(
    cellApproachTarget([-22, 0, 10], [-22, 0, 1], () => false),
    [-22, 0, 4.5],
  );
  const point: [number, number, number] = [-11, 0, -8];
  assert.equal(
    cellApproachTarget(point, [-11, 0, 1], (n) => n === 46),
    point,
  );
  assert.equal(
    cellApproachTarget(point, [-11, 0, -6], () => false),
    point,
  );
});
test("24 distinct cells have 12 on each side of a seven-metre corridor", () => {
  assert.equal(CELL_ROOMS.length, 24);
  assert.equal(new Set(CELL_ROOMS.map((c) => c.number)).size, 24);
  assert.equal(CELL_BLOCK.southFront - CELL_BLOCK.northFront, 7);
  for (const side of ["north", "south"]) {
    const cells = CELL_ROOMS.filter((c) => c.side === side).sort(
      (a, b) => a.left - b.left,
    );
    assert.equal(cells.length, 12);
    for (let i = 1; i < cells.length; i++)
      assert.equal(
        cells[i - 1].right,
        cells[i].left,
        "continuous shared partitions, no overlapping cells",
      );
    for (const c of cells) {
      assert.ok(c.doorX > c.left);
      assert.ok(c.doorX + 1.4 < c.right);
    }
  }
});
test("opening cell boundaries, original gates and story locks stay compatible", () => {
  const c47 = CELL_ROOMS.find((c) => c.number === 47)!,
    c46 = CELL_ROOMS.find((c) => c.number === 46)!;
  assert.deepEqual(
    [c47.left, c47.right, c47.front, c47.doorX],
    [-8.8, -3.1, -2, -6],
  );
  assert.deepEqual(
    [c46.left, c46.right, c46.front, c46.doorX],
    [-14, -8.8, -2, -11],
  );
  assert.equal(isExplorationCell(42), false);
  assert.equal(isExplorationCell(47), false);
  assert.equal(isExplorationCell(36), true);
  assert.equal(isExplorationCell(59), true);
});
test("navigation covers the far west and opposite row without wall shortcuts", () => {
  const walls = [
    { min: { x: -69.5, z: -12 }, max: { x: -69, z: 15 } },
    { min: { x: -70, z: 4.8 }, max: { x: -65, z: 5.2 } },
  ];
  const a: [number, number] = [-68, 1.5],
    b: [number, number] = [-63, 10];
  const path = findPath(a, b, walls);
  assert.ok(path.length > 0);
  let p = a;
  for (const next of path) {
    assert.equal(pathObstructed(p, next, walls, 0.22), false);
    p = next;
  }
});
