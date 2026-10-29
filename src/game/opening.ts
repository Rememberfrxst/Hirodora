/** The opening chapter has its own saved progress; legacy campaign saves remain valid. */
export type OpeningProgress = {
  bed: number;
  bolts: number;
  toilet: number;
  boltSteps?: number[];
};
export const boltIndex = (id: string | null | undefined) =>
  /^toilet_bolt_[0-3]$/.test(id || "") ? Number(id!.slice(-1)) : null;
export const isPush = (action: HoldAction | null) =>
  action === "bed_push" || action === "toilet_move";
export function restoreBolts(progress: number, steps?: number[]) {
  return Array.from({ length: 4 }, (_, i) =>
    Math.max(
      0,
      Math.min(1, Number.isFinite(steps?.[i]) ? steps![i] : progress * 4 - i),
    ),
  );
}
export type HoldAction = "bed_push" | "toilet_bolts" | "toilet_move";
export function stepCaughtMeter(
  value: number,
  dt: number,
  action: HoldAction | null,
  strain = 0,
) {
  const rate = isPush(action)
    ? (action === "bed_push" ? 12 : 18) +
      42 * Math.max(0, Math.min(1, strain)) ** 2
    : -32;
  return Math.max(
    0,
    Math.min(100, value + Math.max(0, Math.min(dt, 0.1)) * rate),
  );
}
export const openingStart =
  "Take the key from the left-hand officer's belt through the bars.";
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
