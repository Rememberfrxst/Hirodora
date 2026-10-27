import test from "node:test";
import assert from "node:assert/strict";
import {
  CELL_BLOCK,
  CELL_ROOMS,
  isExplorationCell,
  cellApproachTarget,
  CELL_GATE_WIDTH,
} from "./cell-block";
import { findPath, pathObstructed } from "./navigation";
test("guard approach uses the expanded corridor and respects open gates on either row", () => {
  assert.deepEqual(
    cellApproachTarget([-66, 0, -8], [-62, 0, 1], () => false),
    [-66, 0, -1.5],
  );
  assert.deepEqual(
    cellApproachTarget([-22, 0, 25], [-22, 0, 1], () => false),
    [-22, 0, 19.5],
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
  assert.deepEqual(
    cellApproachTarget([-22, -3.2, -8], [-22, 0, -6], () => false),
    [-22, -3.2, -1.5],
    "being inside the upper room does not put a guard inside the lower cell",
  );
});
test("48 distinct large cells have 12 per side per floor around a 22m atrium", () => {
  assert.equal(CELL_ROOMS.length, 48);
  assert.equal(new Set(CELL_ROOMS.map((c) => c.number)).size, 48);
  assert.equal(CELL_BLOCK.southFront - CELL_BLOCK.northFront, 22);
  for (const level of ["upper", "lower"])
    for (const side of ["north", "south"]) {
      const cells = CELL_ROOMS.filter((c) => c.side === side).sort(
        (a, b) => a.left - b.left,
      );
      const row = cells.filter((c) => c.level === level);
      assert.equal(row.length, 12);
      for (let i = 1; i < row.length; i++)
        assert.equal(
          row[i - 1].right,
          row[i].left,
          "continuous shared partitions, no overlapping cells",
        );
      for (const c of row) {
        assert.ok(c.doorX > c.left);
        assert.ok(c.doorX + CELL_GATE_WIDTH < c.right);
        assert.ok(Math.abs(c.rear - c.front) === 9.5);
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
    [-14, -8.8, -2, -11.4],
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
