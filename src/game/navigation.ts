export type Point = [number, number];
export type Obstacle = {
  min: { x: number; z: number };
  max: { x: number; z: number };
};

export function isBlocked(
  x: number,
  z: number,
  obstacles: Obstacle[],
  radius = 0.28,
) {
  return obstacles.some(
    (b) =>
      x + radius > b.min.x &&
      x - radius < b.max.x &&
      z + radius > b.min.z &&
      z - radius < b.max.z,
  );
}

/** Bounded grid search with no diagonal corner cutting. Replan only when needed. */
export function findPath(
  start: Point,
  goal: Point,
  obstacles: Obstacle[],
): Point[] {
  const step = 0.5,
    origin: Point = [-15, -10.5],
    columns = 90,
    rows = 43;
  const cell = ([x, z]: Point): Point => [
    Math.round((x - origin[0]) / step),
    Math.round((z - origin[1]) / step),
  ];
  const world = ([x, z]: Point): Point => [
    origin[0] + x * step,
    origin[1] + z * step,
  ];
  const [sx, sz] = cell(start),
    [gx, gz] = cell(goal);
  const key = (x: number, z: number) => z * columns + x;
  const queue: Point[] = [[sx, sz]],
    parents = new Map<number, Point | null>([[key(sx, sz), null]]);
  let found: Point | undefined;
  for (let index = 0; index < queue.length && index < columns * rows; index++) {
    const [x, z] = queue[index];
    if (x === gx && z === gz) {
      found = [x, z];
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (
        nx < 0 ||
        nx >= columns ||
        nz < 0 ||
        nz >= rows ||
        parents.has(key(nx, nz))
      )
        continue;
      const [wx, wz] = world([nx, nz]);
      if (isBlocked(wx, wz, obstacles)) continue;
      parents.set(key(nx, nz), [x, z]);
      queue.push([nx, nz]);
    }
  }
  if (!found) return [];
  const path: Point[] = [];
  for (
    let node: Point | null = found;
    node;
    node = parents.get(key(node[0], node[1])) ?? null
  )
    path.unshift(world(node));
  return path.slice(1);
}

export function movementVector(
  x: number,
  z: number,
  angle: number,
  distance: number,
): Point {
  const length = Math.max(1, Math.hypot(x, z));
  return [
    ((x * Math.cos(angle) + z * Math.sin(angle)) / length) * distance,
    ((-x * Math.sin(angle) + z * Math.cos(angle)) / length) * distance,
  ];
}
