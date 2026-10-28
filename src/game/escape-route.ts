import type { GuardData } from "./types";
export type EscapeRegion = "secret" | "military";
export type RoutePoint = [number, number, number];
export const ROUTE = {
  secret: { minX: 100, maxX: 136, minZ: 0, maxZ: 35 },
  military: { minX: 180, maxX: 290, minZ: -35, maxZ: 35 },
} as const;
export const ENEMY_GUN = {
  damage: 50,
  range: 32,
  windup: 0.8,
  cooldown: 1.6,
} as const;
/** A telegraphed shot requires sight both when aimed and at its contact instant.
 * Losing sight cancels it: no queued wall hits, death hits or hidden-player hits. */
export function stepEnemyGun(
  windup: number | undefined,
  cooldown: number,
  clear: boolean,
  dt: number,
) {
  const delta = Math.max(0, Math.min(0.1, dt)),
    nextCooldown = Math.max(0, cooldown - delta);
  if (!clear) return { windup: undefined, cooldown: nextCooldown, fire: false };
  if (windup === undefined)
    return {
      windup: nextCooldown === 0 ? 0 : undefined,
      cooldown: nextCooldown,
      fire: false,
    };
  const next = windup + delta;
  return next >= ENEMY_GUN.windup
    ? { windup: undefined, cooldown: ENEMY_GUN.cooldown, fire: true }
    : { windup: next, cooldown: nextCooldown, fire: false };
}
export function routeSupport(
  region: EscapeRegion,
  x: number,
  z: number,
  fromY: number,
) {
  const b = ROUTE[region];
  if (
    x < b.minX + 0.3 ||
    x > b.maxX - 0.3 ||
    z < b.minZ + 0.3 ||
    z > b.maxZ - 0.3
  )
    return undefined;
  if (region === "military")
    return x > 285 || (x > 277 && Math.abs(z) > 3.3) ? undefined : 0;
  // Only the real maintenance tunnel has below-floor support.
  if (fromY < -2)
    return x > 128.3 && x < 135.7 && z > 9 && z < 34.7 ? -4 : undefined;
  return z < 11.7 ? 0 : undefined;
}
export function routeGuards(region: EscapeRegion): GuardData[] {
  const routes: RoutePoint[][] =
    region === "secret"
      ? Array.from({ length: 6 }, (_, i) => {
          const x = 106 + Math.floor(i / 2) * 12,
            z = i % 2 ? 8 : 4;
          return [
            [x, 0, z],
            [x + 4, 0, z],
            [x + 4, 0, z + (i % 2 ? -2 : 2)],
            [x, 0, z],
          ];
        })
      : Array.from({ length: 10 }, (_, i) => {
          const x = 192 + Math.floor(i / 2) * 16,
            z = i % 2 ? 17 : -17;
          return [
            [x, 0, z],
            [x + 8, 0, z],
            [x + 8, 0, z * 0.35],
            [x, 0, z * 0.35],
          ];
        });
  return routes.map((patrolRoute, i) => ({
    id: `${region}_officer_${i}`,
    name:
      region === "secret"
        ? `Security Officer ${i + 1}`
        : `Island Sentry ${i + 1}`,
    region,
    armed: true,
    type: i === routes.length - 1 ? "night_captain" : "sentry",
    position: [...patrolRoute[0]],
    rotationY: Math.PI / 2,
    patrolRoute,
    currentWaypoint: 1,
    state: "patrol",
    suspicion: 0,
    visionAngle: 100,
    visionRange: 30,
    hearingMultiplier: 1.2,
    stateTimer: 0,
    health: 200,
  }));
}
