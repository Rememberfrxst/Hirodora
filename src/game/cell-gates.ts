import * as THREE from "three";
import type { CellRoom } from "./cell-block";
import { CELL_GATE_WIDTH } from "./cell-block";

export const CELL_SLIDE_SECONDS = 0.7;
export interface CellSlider {
  closedX: number;
  closedZ: number;
  floorY: number;
  width: number;
  travel: number;
  fraction: number;
  target?: number;
}
/** Park the leaf over a fixed side panel, wholly inside its own cell frontage. */
export function cellSlideTravel(cell: CellRoom) {
  const distance = CELL_GATE_WIDTH + 0.1;
  return cell.doorX - cell.left >= cell.right - cell.doorX - CELL_GATE_WIDTH
    ? -distance
    : distance;
}
export function configureCellSlider(gate: THREE.Group, cell: CellRoom) {
  gate.userData.slider = {
    closedX: gate.position.x,
    closedZ: gate.position.z,
    floorY: cell.floorY,
    width: CELL_GATE_WIDTH,
    travel: cellSlideTravel(cell),
    fraction: 0,
  } satisfies CellSlider;
}
export function positionCellSlider(gate: THREE.Group, fraction: number) {
  const s = gate.userData.slider as CellSlider;
  s.fraction = THREE.MathUtils.clamp(fraction, 0, 1);
  gate.position.set(s.closedX + s.travel * s.fraction, s.floorY, s.closedZ);
  gate.rotation.set(0, 0, 0);
}
/** Normal changes animate; checkpoint restoration and initial state snap safely. */
export function targetCellSlider(
  gate: THREE.Group,
  open: boolean,
  snap = false,
) {
  const s = gate.userData.slider as CellSlider;
  const initial = s.target === undefined;
  s.target = open ? 1 : 0;
  if (snap || initial) positionCellSlider(gate, s.target);
}
export function nextCellSlide(gate: THREE.Group, dt: number) {
  const s = gate.userData.slider as CellSlider;
  const delta = (s.target ?? s.fraction) - s.fraction;
  return (
    s.fraction +
    Math.sign(delta) *
      Math.min(Math.abs(delta), Math.max(0, dt) / CELL_SLIDE_SECONDS)
  );
}
