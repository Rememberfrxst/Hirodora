export interface GameSettings {
  music: number;
  sfx: number;
  screenScale: number;
  fov: number;
  sensitivity: number;
  reducedMotion: boolean;
}
export const defaultSettings: GameSettings = {
  music: 0.5,
  sfx: 1,
  screenScale: 1,
  fov: 70,
  sensitivity: 22,
  reducedMotion: false,
};
const limits = {
  music: [0, 1],
  sfx: [0, 1],
  screenScale: [0.5, 1.25],
  fov: [55, 90],
  sensitivity: [5, 50],
};
export function parseSettings(raw: string | null): GameSettings {
  const result = { ...defaultSettings };
  try {
    const value = JSON.parse(raw || "null");
    for (const key of Object.keys(limits) as (keyof typeof limits)[])
      if (Number.isFinite(value?.[key]))
        result[key] = Math.max(
          limits[key][0],
          Math.min(limits[key][1], value[key]),
        );
    if (typeof value?.reducedMotion === "boolean")
      result.reducedMotion = value.reducedMotion;
  } catch {}
  return result;
}
export function loadSettings(): GameSettings {
  try {
    return parseSettings(localStorage.getItem("hirodora-settings-v1"));
  } catch {
    return { ...defaultSettings };
  }
}
export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem("hirodora-settings-v1", JSON.stringify(settings));
  } catch {}
}
