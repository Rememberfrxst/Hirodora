export const HUD_KEY = "hirodora-hud-v1";
export const controlIds = [
  "move",
  "sprint",
  "jump",
  "crouch",
  "interact",
  "fire",
] as const;
export type ControlId = (typeof controlIds)[number];
export type HudPreset = "compact" | "left" | "large";
export interface ControlPlacement {
  x: number;
  y: number;
  size: number;
}
export interface HudLayout {
  version: 1;
  preset: HudPreset;
  controls: Record<ControlId, ControlPlacement>;
}
export const controlNames: Record<ControlId, string> = {
  move: "Move",
  sprint: "Sprint",
  jump: "Jump",
  crouch: "Crouch",
  interact: "Interact",
  fire: "Dart",
};
export function presetLayout(preset: HudPreset = "compact"): HudLayout {
  const large = preset === "large";
  const controls: HudLayout["controls"] = {
    move: { x: 11, y: 72, size: large ? 128 : 106 },
    sprint: { x: 84, y: 61, size: large ? 74 : 58 },
    jump: { x: 94, y: 61, size: large ? 74 : 58 },
    crouch: { x: 84, y: 83, size: large ? 74 : 58 },
    interact: { x: 94, y: 83, size: large ? 80 : 64 },
    fire: { x: 73, y: 83, size: large ? 68 : 54 },
  };
  if (large) {
    controls.sprint.x = controls.crouch.x = 80;
    controls.sprint.y = controls.jump.y = 57;
    controls.fire.x = 66;
  }
  if (preset === "left")
    for (const c of Object.values(controls)) c.x = 100 - c.x;
  return { version: 1, preset, controls };
}
export function parseLayout(raw: string | null): HudLayout {
  try {
    const value = JSON.parse(raw || "null");
    if (
      value?.version !== 1 ||
      !["compact", "left", "large"].includes(value.preset)
    )
      return presetLayout();
    const result = presetLayout(value.preset);
    for (const id of controlIds) {
      const p = value.controls?.[id];
      if (p && [p.x, p.y, p.size].every(Number.isFinite))
        result.controls[id] = {
          x: Math.max(0, Math.min(100, p.x)),
          y: Math.max(0, Math.min(100, p.y)),
          size: Math.max(
            id === "move" ? 80 : 44,
            Math.min(id === "move" ? 160 : 100, p.size),
          ),
        };
    }
    return result;
  } catch {
    return presetLayout();
  }
}
export function loadLayout(): HudLayout {
  try {
    return parseLayout(localStorage.getItem(HUD_KEY));
  } catch {
    return presetLayout();
  }
}
export function storeLayout(layout: HudLayout): boolean {
  try {
    localStorage.setItem(HUD_KEY, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
}
/** The usable layer excludes Android display cutouts. Clamping also follows rotation. */
export function placementStyle(p: ControlPlacement) {
  return {
    left: `clamp(${p.size / 2 + 4}px, ${p.x}%, calc(100% - ${p.size / 2 + 4}px))`,
    top: `clamp(${p.size / 2 + 4}px, ${p.y}%, calc(100% - ${p.size / 2 + 4}px))`,
    width: p.size,
    height: p.size,
    transform: "translate(-50%, -50%)",
  };
}
