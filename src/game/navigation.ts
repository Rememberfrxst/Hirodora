export type Point = [number, number];
export type Obstacle = {
  min: { x: number; z: number };
  max: { x: number; z: number };
};

/** Low hop: horizontal wall clearance never changes, so jumping cannot bypass gates. */
export function stepJump(height: number, velocity: number, dt: number) {
  const nextVelocity = velocity - 14 * dt;
  const nextHeight = Math.max(0, height + nextVelocity * dt);
  return {
    height: nextHeight,
    velocity: nextHeight === 0 ? 0 : nextVelocity,
    landed: height > 0 && nextHeight === 0,
  };
}

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

/** Navigation sees low furniture as well as walls, with body-radius clearance. */
export function pathObstructed(
  a: Point,
  b: Point,
  obstacles: Obstacle[],
  radius = 0.22,
) {
  return obstacles.some((box) => {
    let lo = 0.001,
      hi = 0.999;
    for (const [i, axis] of (["x", "z"] as const).entries()) {
      const delta = b[i] - a[i],
        min = box.min[axis] - radius,
        max = box.max[axis] + radius;
      if (Math.abs(delta) < 1e-8) {
        if (a[i] < min || a[i] > max) return false;
        continue;
      }
      let t0 = (min - a[i]) / delta,
        t1 = (max - a[i]) / delta;
      if (t0 > t1) [t0, t1] = [t1, t0];
      lo = Math.max(lo, t0);
      hi = Math.min(hi, t1);
      if (lo > hi) return false;
    }
    return true;
  });
}

/** Bounded grid search with no diagonal corner cutting. Replan only when needed. */
export function findPath(
  start: Point,
  goal: Point,
  obstacles: Obstacle[],
): Point[] {
  const step = 0.5,
    origin: Point = [-36, -10.5],
    columns = 132,
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
