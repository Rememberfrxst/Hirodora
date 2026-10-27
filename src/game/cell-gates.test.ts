import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CELL_ROOMS, CELL_GATE_WIDTH } from "./cell-block";
import {
  cellSlideTravel,
  configureCellSlider,
  targetCellSlider,
  nextCellSlide,
  positionCellSlider,
} from "./cell-gates";

test("all 48 small sliding leaves park within their own full-width cell frontage", () => {
  assert.equal(CELL_GATE_WIDTH, 1.4);
  for (const cell of CELL_ROOMS) {
    const parked = cell.doorX + cellSlideTravel(cell);
    assert.ok(parked > cell.left + 0.1);
    assert.ok(parked + CELL_GATE_WIDTH < cell.right - 0.1);
    assert.ok(Math.abs(parked - cell.doorX) > CELL_GATE_WIDTH);
  }
});
test("sliding motion is bounded, remains horizontal and can snap restored checkpoints", () => {
  const cell = CELL_ROOMS.find((c) => c.number === 22)!;
  const gate = new THREE.Group();
  gate.position.set(cell.doorX, cell.floorY, cell.front);
  configureCellSlider(gate, cell);
  targetCellSlider(gate, false);
  targetCellSlider(gate, true);
  positionCellSlider(gate, nextCellSlide(gate, 0.35));
  assert.equal(gate.userData.slider.fraction, 0.5);
  assert.equal(gate.position.y, -3.2);
  assert.equal(gate.position.z, cell.front);
  assert.equal(gate.rotation.y, 0);
  targetCellSlider(gate, false, true);
  assert.equal(gate.position.x, cell.doorX);
  targetCellSlider(gate, true, true);
  assert.equal(nextCellSlide(gate, 100), 1);
});
