export const INTRO_DURATION = 17;
export const SHOT_TIME = 4.4;
export const introStages = [
  "door",
  "escape",
  "shot",
  "approach",
  "close",
  "inspect",
  "ready",
] as const;
export type IntroStage = (typeof introStages)[number];
const fraction = (t: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (t - a) / (b - a)));
export function introFrame(seconds: number) {
  const t = Math.max(0, Math.min(INTRO_DURATION, seconds));
  const run = fraction(t, 1.6, 4.4),
    fall = fraction(t, 4.4, 6.2),
    walk = fraction(t, 6.2, 8),
    close = fraction(t, 8, 9),
    approach = fraction(t, 9, 10.3);
  const stage: IntroStage =
    t < 1.6
      ? "door"
      : t < 4.4
        ? "escape"
        : t < 6.2
          ? "shot"
          : t < 8
            ? "approach"
            : t < 9
              ? "close"
              : t < 17
                ? "inspect"
                : "ready";
  return {
    t,
    stage,
    doorAngle: -1.45 * fraction(t, 0.2, 1.5) * (1 - close) || 0,
    doorOpen: fraction(t, 0.2, 1.5) * (1 - close),
    prisoner: [-5.25 - 1.15 * fraction(run, 0.65, 1), 0, -4.4 + 4.3 * run] as [
      number,
      number,
      number,
    ],
    prisonerYaw:
      t < 4.4
        ? -0.7 * fraction(run, 0.65, 1)
        : (-Math.PI / 2) * (1 - Math.pow(1 - fall, 2)),
    prisonerClip: t < 1.6 ? "Idle" : t < 4.4 ? "Run" : "Death",
    prisonerTime: t < 1.6 ? t : t < 4.4 ? t - 1.6 : Math.min(1.8, t - 4.4),
    guard: [
      -4 - 1.3 * walk - 0.4 * approach,
      0,
      0.2 - 1.35 * walk + 0.45 * approach,
    ] as [number, number, number],
    guardYaw: t < 6.2 ? -Math.PI / 2 : t < 8 ? -2.37 : t < 9 ? Math.PI : 0,
    guardSpeed: t >= 6.2 && t < 8 ? 1.2 : t >= 9 && t < 10.3 ? 0.4 : 0,
    caption:
      t < 1.6
        ? "Cell 47 · 02:14 AM"
        : t < 4.4
          ? "OFFICER DUNNE: Stop right there!"
          : t < 8
            ? ""
            : t < 10.3
              ? "The gate locks behind him."
              : "The officer checks the prisoner. A key lies behind him.",
  };
}
