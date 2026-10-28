import { BALLISTICS } from "./ballistics";
/** Infinite reserve, finite magazine. Only the simulation clock completes reloads. */
export function stepReload(remaining: number, dt: number) {
  return Math.max(0, remaining - Math.max(0, Math.min(0.1, dt)));
}
export function magazineAmmo(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(0, Math.min(BALLISTICS.ammo, value))
    : BALLISTICS.ammo;
}
