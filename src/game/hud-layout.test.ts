import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLayout,
  presetLayout,
  placementStyle,
  pocketBottom,
} from "./hud-layout";

test("mobile pockets dock below compact joystick and lift above large or mirrored controls", () => {
  assert.equal(pocketBottom(presetLayout(), 450), 4);
  assert.equal(pocketBottom(presetLayout(), 390), 4);
  assert.ok(pocketBottom(presetLayout("left"), 360) > 80);
  assert.ok(pocketBottom(presetLayout("large"), 360) > 80);
});

test("damaged or unavailable stored HUD restores a valid default", () => {
  assert.deepEqual(parseLayout("{broken"), presetLayout());
  assert.deepEqual(parseLayout('{"version":9}'), presetLayout());
  const l = presetLayout();
  l.controls.jump = { x: -12, y: 900, size: 2000 };
  const restored = parseLayout(JSON.stringify(l));
  assert.deepEqual(restored.controls.jump, { x: 0, y: 100, size: 100 });
  assert.match(placementStyle(restored.controls.jump).left, /clamp/);
});
test("left handed preset mirrors the action cluster and movement zone", () => {
  const left = presetLayout("left"),
    right = presetLayout();
  for (const id of Object.keys(
    right.controls,
  ) as (keyof typeof right.controls)[]) {
    assert.equal(left.controls[id].x, 100 - right.controls[id].x);
    assert.ok(left.controls[id].size >= 44);
  }
});
