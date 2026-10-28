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
  weapon: ControlPlacement;
}
export const controlNames: Record<ControlId, string> = {
  move: "Move",
  sprint: "Sprint",
  jump: "Jump",
  crouch: "Crouch",
  interact: "Interact",
  fire: "Fire",
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
  return { version: 1, preset, controls, weapon: { x: 6, y: 8, size: 160 } };
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
    if (
      value.weapon &&
      [value.weapon.x, value.weapon.y, value.weapon.size].every(Number.isFinite)
    ) {
      result.weapon = {
        x: Math.max(0, Math.min(100, value.weapon.x)),
        y: Math.max(0, Math.min(100, value.weapon.y)),
        size: Math.max(140, Math.min(210, value.weapon.size)),
      };
    }
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
/** Percent coordinates match the editor and account for iPhone safe areas. */
export function weaponPlacementStyle(p: ControlPlacement) {
  return {
    left: `clamp(calc(env(safe-area-inset-left) + 8px), calc(${p.x}% - ${p.size / 2}px), calc(100% - env(safe-area-inset-right) - ${p.size + 8}px))`,
    top: `clamp(calc(env(safe-area-inset-top) + 8px), calc(${p.y}% - 55px), calc(100% - env(safe-area-inset-bottom) - 118px))`,
    width: p.size,
  };
}
/** Dock pockets at the bottom left when possible; lift above the left controls
 * for large/mirrored/custom layouts so item taps cannot become movement input. */
export function pocketBottom(layout: HudLayout, height: number) {
  const usable = Math.max(1, height - 16);
  const left = Object.values(layout.controls)
    .filter((c) => c.x < 48)
    .map((c) => {
      const half = c.size / 2;
      const center =
        8 +
        Math.max(half + 4, Math.min(usable - half - 4, (c.y / 100) * usable));
      return { top: center - half, bottom: center + half };
    });
  if (left.every((c) => c.bottom + 3 <= height - 48)) return 4;
  return Math.max(4, height - Math.min(...left.map((c) => c.top)) + 8);
}
