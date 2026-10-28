/** The opening chapter has its own saved progress; legacy campaign saves remain valid. */
export type OpeningProgress = { bed: number; bolts: number; toilet: number };
export type HoldAction = "bed_push" | "toilet_bolts" | "toilet_move";
export function stepCaughtMeter(
  value: number,
  dt: number,
  action: HoldAction | null,
  hard = false,
) {
  const rate = action
    ? hard
      ? 72
      : action === "bed_push"
        ? 22
        : action === "toilet_move"
          ? 30
          : 18
    : -32;
  return Math.max(
    0,
    Math.min(100, value + Math.max(0, Math.min(dt, 0.1)) * rate),
  );
}
export const openingStart =
  "Take the key behind the busy guard through the bars.";
export const wrongKeyNotice = "This key is for Cell 42. It won't open Cell 47.";
export function openingObjective(
  flags: Record<string, boolean>,
  items: string[],
) {
  if (flags.cell46_reached)
    return "Cell 46 reached. Your next escape route awaits.";
  if (flags.passage_open) return "Aim at the opening. Penetrate into Cell 46.";
  if (flags.toilet_unbolted)
    return "Move the toilet aside to reveal the passage.";
  if (items.includes("screwdriver"))
    return "Unbolt the toilet on the shared wall.";
  if (flags.bed_moved) return "Collect the screwdriver beneath the table.";
  if (flags.key_identified)
    return "Find another way out. Push your table quietly.";
  if (items.includes("cell_key")) return "Try the key on your cell door.";
  return openingStart;
}
export function advanceHold(value: number, dt: number, seconds: number) {
  return Math.min(
    1,
    Math.max(0, value) + Math.max(0, Math.min(dt, 0.1)) / seconds,
  );
}
