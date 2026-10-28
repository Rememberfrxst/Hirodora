import { CELL_ROOMS, CELL_BLOCK } from "./cell-block";
import type { Vec3 } from "./perception";
export const CROSS_BRIDGE = {
  x: CELL_ROOMS.find((c) => c.number === 41)!.centerX,
  north: 1,
  south: CELL_BLOCK.southFront - 3,
  centerZ: (1 + CELL_BLOCK.southFront - 3) / 2,
  width: 1.64,
  length: 6.2,
  railOffset: 0.8,
} as const;
export function onCrossBridge(x: number, z: number) {
  return (
    Math.abs(x - CROSS_BRIDGE.x) <= CROSS_BRIDGE.width / 2 &&
    z >= CROSS_BRIDGE.north - 0.1 &&
    z <= CROSS_BRIDGE.south + 0.1
  );
}
export function crossBridgeFootstep([x, y, z]: Vec3) {
  return Math.abs(y) < 0.15 && onCrossBridge(x, z);
}
