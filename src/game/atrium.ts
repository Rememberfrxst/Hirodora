import {
  CELL_BLOCK,
  CELL_ROOMS,
  NAV_BOUNDS,
  LOWER_FLOOR_Y,
} from "./cell-block";
import type { Bounds, Vec3 } from "./perception";
import cargoAssets from "../assets/environment/cargo-manifest.json";
import { onCrossBridge } from "./cross-bridge";

export const ATRIUM = {
  north: 1,
  south: CELL_BLOCK.southFront - 3,
  centerZ: (CELL_BLOCK.northFront + CELL_BLOCK.southFront) / 2,
  depth: LOWER_FLOOR_Y,
  bridge: 3,
  stairWidth: 1.8,
  stairs: [
    {
      cell: 48,
      x: CELL_ROOMS.find((c) => c.number === 48)!.centerX,
      topZ: 8.4,
      bottomZ: 0.2,
    },
    {
      cell: 36,
      x: CELL_ROOMS.find((c) => c.number === 36)!.centerX,
      topZ: -0.4,
      bottomZ: 7.8,
    },
  ],
} as const;
export const LAYOUT_VERSION = 18;
export const MAX_STEP = 0.42; // the 3.8m fitted source has a maximum 0.395m riser
export type AtriumStair = (typeof ATRIUM.stairs)[number];
export function stairParameter(s: AtriumStair, x: number, z: number) {
  return Math.abs(x - s.x) <= ATRIUM.stairWidth / 2
    ? (z - s.topZ) / (s.bottomZ - s.topZ)
    : -1;
}
export function stairPoint(s: AtriumStair, t: number): Vec3 {
  return [s.x, stairHeight(t), s.topZ + (s.bottomZ - s.topZ) * t];
}
export const STAIR_OPENINGS = ATRIUM.stairs.map((s) => ({
  minX: s.x - ATRIUM.stairWidth / 2 - 0.07,
  maxX: s.x + ATRIUM.stairWidth / 2 + 0.07,
  minZ: Math.min(s.topZ, s.topZ + (s.bottomZ - s.topZ) * 0.6),
  maxZ: Math.max(s.topZ, s.topZ + (s.bottomZ - s.topZ) * 0.6),
}));
export function upperFloorAt(x: number, z: number) {
  const base =
    !inAtrium(x, z) || x >= CELL_BLOCK.east - 3 || x <= CELL_BLOCK.west + 3;
  return (
    base &&
    !STAIR_OPENINGS.some(
      (h) => x > h.minX && x < h.maxX && z > h.minZ && z < h.maxZ,
    )
  );
}
/** Canonical asset runs from the lower end (u=0) to the top (u=1). */
export function stairHeight(t: number) {
  const u = Math.max(0, Math.min(1, 1 - t));
  return (
    ATRIUM.depth +
    (cargoAssets.treads.find((step) => u <= step.end)?.height ?? 3.2) *
      (-ATRIUM.depth / 3.2)
  );
}
export function onWoodStairs([x, y, z]: Vec3) {
  return ATRIUM.stairs.some((s) => {
    const t = stairParameter(s, x, z);
    return t >= 0 && t <= 1 && Math.abs(y - stairHeight(t)) < 0.15;
  });
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
  const heights: number[] = inBlock ? [ATRIUM.depth] : [];
  if (upperFloorAt(x, z)) heights.push(0);
  if (onCrossBridge(x, z)) heights.push(0);
  for (const stair of ATRIUM.stairs) {
    const t = stairParameter(stair, x, z);
    if (t >= 0 && t <= 1) {
      const y = stairHeight(t);
      // Do not let a character walk into the solid underside of a staircase.
      if (y - ATRIUM.depth < 1.9) {
        const bottom = heights.indexOf(ATRIUM.depth);
        if (bottom >= 0) heights.splice(bottom, 1);
      }
      if (!heights.some((h) => Math.abs(h - y) < 0.001)) heights.push(y);
    }
  }
  return heights;
}
export function supportHeight(x: number, z: number, previousY: number) {
  return surfaceHeights(x, z).find((y) => Math.abs(y - previousY) <= MAX_STEP);
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
const OLD_STAIRS = [
  { top: CELL_BLOCK.east - 3, bottom: CELL_BLOCK.east - 10.2 },
  { top: CELL_BLOCK.west + 3, bottom: CELL_BLOCK.west + 10.2 },
];
export function migratePosition(position: Vec3, version?: number): Vec3 {
  if ((version ?? 0) >= LAYOUT_VERSION) return [...position];
  const p = legacyPosition(position, version),
    [x, y, z] = p;
  if (y < -3.0) return [x, Math.abs(y + 3.2) < 0.1 ? ATRIUM.depth : y - 0.6, z];
  if (y < -0.1 && Math.abs(z - 4) <= 0.95) {
    const i = OLD_STAIRS.findIndex(
      (s) =>
        x >= Math.min(s.top, s.bottom) - 0.2 &&
        x <= Math.max(s.top, s.bottom) + 0.2,
    );
    if (i >= 0)
      return stairPoint(
        ATRIUM.stairs[i],
        Math.max(
          0,
          Math.min(
            1,
            (x - OLD_STAIRS[i].top) /
              (OLD_STAIRS[i].bottom - OLD_STAIRS[i].top),
          ),
        ),
      );
  }
  const hole = STAIR_OPENINGS.findIndex(
    (h) =>
      x > h.minX - 0.3 &&
      x < h.maxX + 0.3 &&
      z > h.minZ - 0.3 &&
      z < h.maxZ + 0.3,
  );
  if (hole >= 0) {
    const s = ATRIUM.stairs[hole];
    return [s.x, 0, s.topZ - Math.sign(s.bottomZ - s.topZ) * 0.45];
  }
  return p;
}
function legacyPosition(position: Vec3, version?: number): Vec3 {
  const ATRIUM = {
    depth: -3.2,
    centerZ: 4,
    stairWidth: 1.8,
    stairs: OLD_STAIRS,
  };
  const stairHeight = (t: number) =>
    -3.2 + (cargoAssets.treads.find((s) => 1 - t <= s.end)?.height ?? 3.2);
  const [x, y, z] = position;
  if ((version ?? 0) >= 17 || x >= CELL_BLOCK.east || x <= CELL_BLOCK.west)
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

/** Three layers preserve an upper gallery above the lower end of a staircase. */
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
  const heights = new Float32Array(size * 3).fill(NaN);
  const blocked = new Uint8Array(size * 3);
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < columns; x++) {
      const wx = minX + x * step,
        wz = minZ + z * step,
        hs = surfaceHeights(wx, wz);
      for (const y of hs) {
        const layer = y === ATRIUM.depth ? 1 : y === 0 ? 0 : 2,
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
    for (let layer = 0; layer < 3; layer++)
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
    for (let l = 0; l < 3; l++) {
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
  const parents = new Int32Array(size * 3).fill(-2),
    queue = [from];
  parents[from] = -1;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === to) break;
    const base = id % size,
      x = base % columns,
      z = Math.floor(base / columns),
      layer = Math.floor(id / size);
    for (const nl of [0, 1, 2])
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [0, 0],
      ]) {
        if (nl === layer && dx === 0 && dz === 0) continue;
        const nx = x + dx,
          nz = z + dz;
        if (nx < 0 || nx >= columns || nz < 0 || nz >= rows) continue;
        const next = nl * size + nz * columns + nx;
        if (
          parents[next] !== -2 ||
          blocked[next] ||
          !Number.isFinite(heights[next]) ||
          Math.abs(heights[next] - heights[id]) > MAX_STEP
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
