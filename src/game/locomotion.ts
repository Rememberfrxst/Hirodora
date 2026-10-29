/** One distance clock drives both pose and contact audio, never a wall timer. */
export const strideLength = (run: boolean) =>
  (run ? 2.35 : 1.42) * (2.04 / 1.8);
export function advanceStride(phase: number, distance: number, run: boolean) {
  const next = phase + Math.max(0, distance) / strideLength(run);
  return {
    phase: next % 1,
    contacts: Math.max(
      0,
      Math.floor(next * 2 + 1e-8) - Math.floor(phase * 2 + 1e-8),
    ),
  };
}
// +X is screen-left when looking out of Cell 47 toward +Z.
export const OPENING_DUTY: [number, number, number] = [-3.9, 0, -0.85];
