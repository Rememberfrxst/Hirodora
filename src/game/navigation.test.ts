import test from "node:test";
import assert from "node:assert/strict";
import { findPath, isBlocked, movementVector } from "./navigation";

test("diagonal movement is no faster than forward movement", () => {
  assert.ok(Math.abs(Math.hypot(...movementVector(1, 1, 0.7, 3)) - 3) < 1e-8);
});
test("body radius stops both players and guards at solid walls", () => {
  const walls = [{ min: { x: 0, z: -4 }, max: { x: 1, z: 4 } }];
  assert.equal(isBlocked(-0.1, 0, walls), true);
  assert.equal(isBlocked(-0.5, 0, walls), false);
});
test("path search routes around a wall without cutting corners", () => {
  const walls = [{ min: { x: 0, z: -2 }, max: { x: 1, z: 2 } }];
  const path = findPath([-2, 0], [3, 0], walls);
  assert.ok(path.length > 5);
  assert.ok(path.every(([x, z]) => !isBlocked(x, z, walls)));
  assert.ok(path.some(([, z]) => Math.abs(z) > 2));
});
test("a sealed destination has no manufactured route through walls", () => {
  const walls = [{ min: { x: -0.8, z: -0.8 }, max: { x: 1, z: 1 } }];
  assert.deepEqual(findPath([-3, 0], [0, 0], walls), []);
});
