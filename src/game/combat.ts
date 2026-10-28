export const COMBAT = {
  maxHealth: 200,
  damage: 25,
  windup: 0.35,
  duration: 0.9,
  cooldown: 0.75,
  grace: 0.65,
  standOff: 0.9,
} as const;
export interface MeleeState {
  elapsed?: number;
  cooldown: number;
}
export function clampHealth(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(COMBAT.maxHealth, value))
    : COMBAT.maxHealth;
}
export function checkpointHealth(value: unknown) {
  return clampHealth(value) || COMBAT.maxHealth;
}
/** Authoritative strike clock. A miss never turns into damage after the contact
 * instant; visuals sample the same clock and never decide when a hit lands. */
export function stepMelee(
  state: MeleeState,
  canStart: boolean,
  canHit: boolean,
  seconds: number,
  enabled = true,
) {
  const dt = Math.max(0, Math.min(1, seconds));
  if (!enabled) return { elapsed: undefined, cooldown: 0, hit: false };
  const cooldown = Math.max(0, state.cooldown - dt);
  if (state.elapsed === undefined)
    return {
      elapsed: canStart && cooldown === 0 ? 0 : undefined,
      cooldown,
      hit: false,
    };
  const next = state.elapsed + dt,
    hit = state.elapsed < COMBAT.windup && next >= COMBAT.windup && canHit;
  return next >= COMBAT.duration
    ? { elapsed: undefined, cooldown: COMBAT.cooldown, hit }
    : { elapsed: next, cooldown, hit };
}
