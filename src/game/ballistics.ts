export const BALLISTICS = {
  guardHP: 200,
  bodyDamage: 100,
  headDamage: 200,
  range: 40,
  cooldown: 0.3,
  ammo: 24,
} as const;
export function bulletDamage(health: number | undefined, head: boolean) {
  const before =
    typeof health === "number" && Number.isFinite(health)
      ? Math.max(0, Math.min(200, health))
      : BALLISTICS.guardHP;
  const after = Math.max(
    0,
    before - (head ? BALLISTICS.headDamage : BALLISTICS.bodyDamage),
  );
  return { health: after, dead: after === 0, damage: before - after };
}
