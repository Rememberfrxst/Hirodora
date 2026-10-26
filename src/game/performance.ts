import type { GraphicsPreset } from "./engine";

export interface DevicePerformanceProfile {
  mobile: boolean;
  softwareRenderer: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/**
 * Pick a safe first-run setting. This is deliberately conservative: a player
 * can always opt into High/Ultra, but an overloaded first frame feels broken.
 */
export function recommendGraphicsPreset(
  profile: DevicePerformanceProfile,
): GraphicsPreset {
  if (profile.softwareRenderer) return "low";
  if (
    profile.mobile ||
    (profile.deviceMemory !== undefined && profile.deviceMemory <= 4) ||
    (profile.hardwareConcurrency !== undefined && profile.hardwareConcurrency <= 4)
  )
    return "medium";
  return "high";
}

export interface RenderScaleBounds {
  initial: number;
  min: number;
  max: number;
}

export function renderScaleBounds(
  preset: GraphicsPreset,
  pixelRatio: number,
  softwareRenderer: boolean,
): RenderScaleBounds {
  const safePixelRatio = Math.max(1, pixelRatio || 1);
  const scales: Record<GraphicsPreset, RenderScaleBounds> = {
    low: { initial: 0.75, min: 0.65, max: 0.85 },
    medium: { initial: 0.95, min: 0.7, max: 1 },
    high: { initial: Math.min(safePixelRatio, 1.35), min: 0.8, max: 1.35 },
    ultra: { initial: Math.min(safePixelRatio, 1.6), min: 0.9, max: 1.6 },
  };
  const bounds = scales[preset];
  if (!softwareRenderer) return bounds;
  return { initial: Math.min(bounds.initial, 0.65), min: 0.55, max: 0.65 };
}

/** One small quality adjustment after a sustained measured render cost. */
export function nextAdaptiveScale(
  current: number,
  bounds: RenderScaleBounds,
  averageRenderMs: number,
  targetFrameMs: number,
): number {
  if (averageRenderMs > targetFrameMs * 0.82 && current > bounds.min)
    return Math.max(bounds.min, Number((current - 0.1).toFixed(2)));
  // Recover resolution only after there is substantial GPU headroom.
  if (averageRenderMs < targetFrameMs * 0.48 && current < bounds.initial)
    return Math.min(bounds.initial, Number((current + 0.05).toFixed(2)));
  return current;
}
