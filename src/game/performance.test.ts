import assert from "node:assert/strict";
import test from "node:test";
import {
  nextAdaptiveScale,
  recommendGraphicsPreset,
  renderScaleBounds,
} from "./performance";

test("safe first-run preset protects mobile, low-memory and software devices", () => {
  assert.equal(recommendGraphicsPreset({ mobile: true, softwareRenderer: false }), "medium");
  assert.equal(recommendGraphicsPreset({ mobile: false, softwareRenderer: false, deviceMemory: 4 }), "medium");
  assert.equal(recommendGraphicsPreset({ mobile: false, softwareRenderer: true }), "low");
  assert.equal(recommendGraphicsPreset({ mobile: false, softwareRenderer: false, hardwareConcurrency: 8 }), "high");
});

test("adaptive scale falls quickly under pressure and recovers carefully", () => {
  const bounds = renderScaleBounds("high", 2, false);
  assert.equal(nextAdaptiveScale(1.35, bounds, 20, 16), 1.25);
  assert.equal(nextAdaptiveScale(0.8, bounds, 6, 16), 0.85);
  assert.equal(nextAdaptiveScale(1.35, bounds, 8, 16), 1.35);
});
