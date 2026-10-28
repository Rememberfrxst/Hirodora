import { CELL_BLOCK, NAV_BOUNDS } from "./cell-block";
import type { Bounds, Vec3 } from "./perception";
import cargoAssets from "../assets/environment/cargo-manifest.json";

export const ATRIUM = {
  north: 1,
  south: CELL_BLOCK.southFront - 3,
  centerZ: (CELL_BLOCK.northFront + CELL_BLOCK.southFront) / 2,
  depth: -3.2,
  bridge: 3,
  stairWidth: 1.8,
  stairs: [
    { top: CELL_BLOCK.east - 3, bottom: CELL_BLOCK.east - 10.2 },
    { top: CELL_BLOCK.west + 3, bottom: CELL_BLOCK.west + 10.2 },
  ],
} as const;
export const LAYOUT_VERSION = 17;
/** Canonical asset runs from the lower end (u=0) to the top (u=1). */
export function stairHeight(t: number) {
  const u = Math.max(0, Math.min(1, 1 - t));
  return (
    ATRIUM.depth +
    (cargoAssets.treads.find((step) => u <= step.end)?.height ?? 3.2)
  );
}
export function onWoodStairs([x, y, z]: Vec3) {
  return (
    Math.abs(z - ATRIUM.centerZ) < ATRIUM.stairWidth / 2 &&
    ATRIUM.stairs.some((s) => {
      const t = (x - s.top) / (s.bottom - s.top);
      return t >= 0 && t <= 1 && Math.abs(y - stairHeight(t)) < 0.15;
    })
  );
}
export function inAtrium(x: number, z: number) {
  return (
    x > CELL_BLOCK.west &&
    x < CELL_BLOCK.east &&
    z > ATRIUM.north &&
    z < ATRIUM.south
  );
}
export function surfaceHeights(x: number, z: number): number[] {
  if (
    x < NAV_BOUNDS.minX ||
    x > NAV_BOUNDS.maxX ||
    z < NAV_BOUNDS.minZ ||
    z > NAV_BOUNDS.maxZ
  )
    return [];
  const inBlock = x > CELL_BLOCK.west && x < CELL_BLOCK.east;
  if (!inAtrium(x, z)) return inBlock ? [0, ATRIUM.depth] : [0];
  const heights: number[] = [ATRIUM.depth];
  if (x >= CELL_BLOCK.east - 3 || x <= CELL_BLOCK.west + 3) heights.push(0);
  for (const stair of ATRIUM.stairs) {
    const t = (x - stair.top) / (stair.bottom - stair.top);
    if (
      Math.abs(z - ATRIUM.centerZ) <= ATRIUM.stairWidth / 2 &&
      t >= 0 &&
      t <= 1
    ) {
      const y = stairHeight(t);
      // Do not let a character walk into the solid underside of a staircase.
      if (y - ATRIUM.depth < 1.9) heights.length = 0;
      heights.push(y);
    }
  }
  return heights;
}
export function supportHeight(x: number, z: number, previousY: number) {
  return surfaceHeights(x, z).find((y) => Math.abs(y - previousY) <= 0.35);
}
/** Door/tool sounds originate above the floor; navigation targets their support. */
export function evidenceTarget(point: Vec3): Vec3 {
  const floors = surfaceHeights(point[0], point[2])
    .filter((y) => y <= point[1] + 0.1)
    .sort((a, b) => b - a);
  return [point[0], floors[0] ?? point[1], point[2]];
}
export function bodyBlocked(
  x: number,
  y: number,
  z: number,
  obstacles: Bounds[],
  radius = 0.27,
) {
  return obstacles.some(
    (b) =>
      b.max.y > y + 0.12 &&
      b.min.y < y + 1.7 &&
      x + radius > b.min.x &&
      x - radius < b.max.x &&
      z + radius > b.min.z &&
      z - radius < b.max.z,
  );
}
export function migratePosition(position: Vec3, version?: number): Vec3 {
  const [x, y, z] = position;
  if (
    (version ?? 0) >= LAYOUT_VERSION ||
    x >= CELL_BLOCK.east ||
    x <= CELL_BLOCK.west
  )
    return [...position];
  let migratedZ = z;
  const onStairs = y < -0.1 && y > ATRIUM.depth + 0.1;
  if ((version ?? 0) < 14) {
    if (version === 13 && onStairs && Math.abs(z - 5) <= ATRIUM.stairWidth / 2)
      migratedZ = z + 4;
    else {
      if ((version ?? 0) < 13) {
        if (z >= 5) migratedZ += 7;
        else if (
          z > 1 &&
          z < 9 &&
          x < CELL_BLOCK.east - 3 &&
          x > CELL_BLOCK.west + 3
        )
          return [x, 0, 0.4];
      }
      if (migratedZ >= 9) migratedZ += 8;
    }
  }
  // Compress the old 16m opening to 12m, keeping cell interiors and stair heights.
  if ((version ?? 0) < 15) {
    if (onStairs && Math.abs(migratedZ - 9) <= ATRIUM.stairWidth / 2)
      migratedZ -= 2;
    else if (migratedZ >= 17) migratedZ -= 4;
    else if (migratedZ > 1) migratedZ = 1 + (migratedZ - 1) * 0.75;
  }
  // v16: 18m -> 14m corridor. The north puzzle rooms remain untouched.
  if ((version ?? 0) < 16) {
    if (onStairs && Math.abs(migratedZ - 7) <= ATRIUM.stairWidth / 2)
      migratedZ -= 2;
    else if (migratedZ >= 13) migratedZ -= 4;
    else if (migratedZ > 1) migratedZ = 1 + (migratedZ - 1) * (2 / 3);
  }
  if (onStairs && Math.abs(migratedZ - 5) <= ATRIUM.stairWidth / 2)
    migratedZ -= 1;
  else if (migratedZ >= 9) migratedZ -= 2;
  else if (migratedZ > 1) migratedZ = 1 + (migratedZ - 1) * 0.75;
  if (onStairs) {
    for (const stair of ATRIUM.stairs) {
      const t = (x - stair.top) / (stair.bottom - stair.top);
      if (
        t >= 0 &&
        t <= 1 &&
        Math.abs(migratedZ - ATRIUM.centerZ) <= ATRIUM.stairWidth / 2
      )
        return [x, stairHeight(t), migratedZ];
    }
  }
  if (
    y >= -0.1 &&
    inAtrium(x, migratedZ) &&
    x < CELL_BLOCK.east - 3 &&
    x > CELL_BLOCK.west + 3
  )
    return [x, 0, 0.4];
  return [x, y, migratedZ];
}

/** Two floor grids joined by stair portals. Heights stay attached to every waypoint. */
export function findSurfacePath(
  start: Vec3,
  goal: Vec3,
  obstacles: Bounds[],
): Vec3[] {
  const step = 0.5,
    minX = NAV_BOUNDS.minX,
    minZ = NAV_BOUNDS.minZ;
  const columns = Math.round((NAV_BOUNDS.maxX - minX) / step) + 1;
  const rows = Math.round((NAV_BOUNDS.maxZ - minZ) / step) + 1,
    size = columns * rows;
  const heights = new Float32Array(size * 2).fill(NaN);
  const blocked = new Uint8Array(size * 2);
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < columns; x++) {
      const wx = minX + x * step,
        wz = minZ + z * step,
        hs = surfaceHeights(wx, wz);
      for (const y of hs) {
        const layer = y === ATRIUM.depth ? 1 : 0,
          id = layer * size + z * columns + x;
        heights[id] = y;
      }
    }
  // Rasterize obstacles once; never scan every wall at every BFS visit.
  for (const b of obstacles) {
    const x0 = Math.max(0, Math.ceil((b.min.x - 0.27 - minX) / step)),
      x1 = Math.min(columns - 1, Math.floor((b.max.x + 0.27 - minX) / step));
    const z0 = Math.max(0, Math.ceil((b.min.z - 0.27 - minZ) / step)),
      z1 = Math.min(rows - 1, Math.floor((b.max.z + 0.27 - minZ) / step));
    for (let layer = 0; layer < 2; layer++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const id = layer * size + z * columns + x,
            y = heights[id];
          if (b.max.y > y + 0.12 && b.min.y < y + 1.7) blocked[id] = 1;
        }
  }
  const locate = (p: Vec3) => {
    const x = Math.round((p[0] - minX) / step),
      z = Math.round((p[2] - minZ) / step);
    let best = -1,
      d = Infinity;
    for (let l = 0; l < 2; l++) {
      const id = l * size + z * columns + x;
      const delta = Math.abs(heights[id] - p[1]);
      if (delta < d && !blocked[id]) {
        d = delta;
        best = id;
      }
    }
    return d < 0.4 ? best : -1;
  };
  const from = locate(start),
    to = locate(goal);
  if (from < 0 || to < 0) return [];
  const parents = new Int32Array(size * 2).fill(-2),
    queue = [from];
  parents[from] = -1;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === to) break;
    const base = id % size,
      x = base % columns,
      z = Math.floor(base / columns),
      layer = Math.floor(id / size);
    for (const [dx, dz, dl] of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1 - layer * 2],
      [1, 0, 1 - layer * 2],
      [-1, 0, 1 - layer * 2],
      [0, 1, 1 - layer * 2],
      [0, -1, 1 - layer * 2],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        nl = layer + dl;
      if (nx < 0 || nx >= columns || nz < 0 || nz >= rows) continue;
      const next = nl * size + nz * columns + nx;
      if (
        parents[next] !== -2 ||
        blocked[next] ||
        !Number.isFinite(heights[next]) ||
        Math.abs(heights[next] - heights[id]) > 0.35
      )
        continue;
      parents[next] = id;
      queue.push(next);
    }
  }
  if (parents[to] === -2) return [];
  const path: Vec3[] = [];
  for (let id = to; id !== from; id = parents[id]) {
    const b = id % size;
    path.push([
      minX + (b % columns) * step,
      heights[id],
      minZ + Math.floor(b / columns) * step,
    ]);
  }
  return path.reverse();
}
