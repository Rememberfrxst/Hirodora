import type { GuardState } from "./types";

export type GuardClip =
  | "Strike"
  | "Cross"
  | "Hook"
  | "Boxing"
  | "Kneel"
  | "Aim"
  | "Examine"
  | "Idle"
  | "Walk"
  | "Run"
  | "Turn left 45°"
  | "Turn right 45°"
  | "Investigate"
  | "Search"
  | "Alert"
  | "Collapse";
export const angleDelta = (to: number, from: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
/** Presentation only: never changes the authoritative AI state or position. */
export function guardClip(
  state: GuardState,
  speed: number,
  turn: number,
): GuardClip {
  if (state === "knocked_out") return "Collapse";
  if (speed > 2.2) return "Run";
  // In-place turn clips must not replace the stride while the AI is translating.
  if (speed <= 0.08 && Math.abs(turn) > 0.65)
    return turn > 0 ? "Turn left 45°" : "Turn right 45°";
  if (speed > 0.08) return "Walk";
  if (state === "chase") return "Alert";
  if (state === "suspicious") return "Investigate";
  if (state === "searching") return "Search";
  return "Idle";
}
