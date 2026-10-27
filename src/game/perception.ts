import type { GuardData } from "./types";
export type Vec3 = [number, number, number];
export interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}
export interface NoiseEvent {
  id: number;
  position: Vec3;
  loudness: number;
  age: number;
  kind: string;
}
export interface HeardEvidence {
  id: number;
  position: Vec3;
  strength: number;
}

/** Slab test shared by sight/hearing, independent of Three.js or animation. */
export function segmentBlocked(a: Vec3, b: Vec3, box: Bounds) {
  let lo = 0.001,
    hi = 0.999;
  for (const [i, axis] of (["x", "y", "z"] as const).entries()) {
    const delta = b[i] - a[i],
      min = box.min[axis],
      max = box.max[axis];
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
}
export function sightEvidence(
  guard: GuardData,
  player: Vec3,
  crouched: boolean,
  hidden: boolean,
  sprinting: boolean,
  obstacles: Bounds[],
) {
  if (hidden) return 0;
  const dx = player[0] - guard.position[0],
    dz = player[2] - guard.position[2],
    distance = Math.hypot(dx, dz, player[1] - guard.position[1]);
  const range = guard.visionRange * (crouched ? 0.55 : 1);
  if (distance > range) return 0;
  const angle = Math.atan2(dx, dz) - guard.rotationY;
  if (
    Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) >
    (guard.visionAngle * Math.PI) / 360
  )
    return 0;
  const eye: Vec3 = [
    guard.position[0],
    guard.position[1] + 1.58,
    guard.position[2],
  ];
  const samples = [crouched ? 0.9 : 1.55, crouched ? 0.55 : 0.95];
  const visible =
    samples.filter(
      (height) =>
        !obstacles.some((box) =>
          segmentBlocked(eye, [player[0], player[1] + height, player[2]], box),
        ),
    ).length / samples.length;
  return Math.min(
    1,
    visible *
      (0.6 + 0.4 * (1 - distance / range)) *
      (crouched ? 0.55 : 1) *
      (sprinting ? 1.2 : 1),
  );
}
export function strongestNoise(
  guard: GuardData,
  events: NoiseEvent[],
  obstacles: Bounds[],
): HeardEvidence | undefined {
  let best: HeardEvidence | undefined;
  const ear: Vec3 = [
    guard.position[0],
    guard.position[1] + 1.5,
    guard.position[2],
  ];
  for (const event of events) {
    if (event.age > 1.6) continue;
    const d = Math.hypot(
      event.position[0] - ear[0],
      event.position[2] - ear[2],
      event.position[1] + 0.8 - ear[1],
    );
    if (d >= 14) continue;
    const source: Vec3 = [
      event.position[0],
      event.position[1] + 0.8,
      event.position[2],
    ];
    const walls = obstacles.filter((box) =>
      segmentBlocked(ear, source, box),
    ).length;
    const heard =
      event.loudness *
      (1 - d / 14) *
      Math.pow(0.45, Math.min(3, walls)) *
      guard.hearingMultiplier *
      Math.max(0, 1 - event.age / 1.6);
    const strength = Math.max(0, Math.min(1, (heard - 2) / 25));
    if (strength > 0.04 && (!best || strength > best.strength))
      best = { id: event.id, position: [...event.position], strength };
  }
  return best;
}
