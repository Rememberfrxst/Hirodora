export type AudioPosition = [number, number, number];
export type ObjectActionKind = "bed" | "toilet" | "bolts";
export interface ObjectAudioEvent {
  id: string;
  kind: ObjectActionKind;
  phase: "start" | "update" | "stop" | "finish";
  position: AudioPosition;
  intensity: number;
}
export const actionFoley = {
  bed: {
    // "bed" remains the checkpoint/action ID for backwards compatibility.
    loop: "table-slide",
    attack: "impactWood_light_",
    release: "impactWood_light_",
    gain: 0.55,
  },
  toilet: {
    loop: "toilet-scrape",
    attack: "impactPlate_light_",
    release: "impactPlate_light_",
    gain: 0.55,
  },
  bolts: {
    loop: "bolt-ratchet",
    attack: "screwdriver",
    release: "heavy-bolt",
    gain: 0.35,
  },
} as const;
export const soundPriority = (bus: string) =>
  bus === "dialogue" ? 100 : bus === "sfx" ? 40 : bus === "ui" ? 20 : 15;
export function clampAudioIntensity(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
