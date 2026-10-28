import voices from "../assets/audio/intro-voice-manifest.json";
export const WAKE_DURATION = 7.6;
export const INTRO_DURATION = 17 + WAKE_DURATION;
export const SHOT_TIME = 4.4 + WAKE_DURATION;
export const introStages = [
  "wake",
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
  const u = Math.max(0, t - WAKE_DURATION);
  const run = fraction(u, 1.6, 4.4),
    fall = fraction(u, 4.4, 6.2),
    walk = fraction(u, 6.2, 8),
    close = fraction(u, 8, 9),
    approach = fraction(u, 9, 10.3);
  const cue = voices.sources.find(
    (c) => t >= c.start && t < c.start + c.duration,
  );
  const wakeMove = fraction(t, 6.6, WAKE_DURATION + 1.6);
  const stage: IntroStage =
    t < WAKE_DURATION
      ? "wake"
      : u < 1.6
        ? "door"
        : u < 4.4
          ? "escape"
          : u < 6.2
            ? "shot"
            : u < 8
              ? "approach"
              : u < 9
                ? "close"
                : u < 17
                  ? "inspect"
                  : "ready";
  return {
    t,
    stage,
    wakeAmount: 1 - fraction(t, 0.15, 3.2),
    wakeGesture:
      t < 3 ? Math.max(0, Math.sin(Math.PI * fraction(t, 0.2, 2.7))) : 0,
    doorAngle: -1.45 * fraction(t, 2.5, 3.9) * (1 - close) || 0,
    doorOpen: fraction(t, 2.5, 3.9) * (1 - close),
    prisoner:
      u < 1.6
        ? ([-6.05 + 0.8 * wakeMove, 0, -5 + 0.6 * wakeMove] as [
            number,
            number,
            number,
          ])
        // Clear the wicket (-6..-4.6) before turning toward the corridor.
        : ([-5.25 - 1.15 * fraction(run, 0.65, 1), 0, -4.4 + 4.3 * run] as [
            number,
            number,
            number,
          ]),
    prisonerYaw:
      u < 1.6
        ? Math.PI * (1 - wakeMove)
        : u < 4.4
          ? -0.7 * fraction(run, 0.65, 1)
          : (-Math.PI / 2) * (1 - Math.pow(1 - fall, 2)),
    prisonerClip:
      u < 1.6 ? (t > 6.6 ? "Walk" : "Idle") : u < 4.4 ? "Run" : "Death",
    prisonerTime:
      u < 1.6
        ? t > 6.6
          ? (t - 6.6) * 0.4
          : t
        : u < 4.4
          ? u - 1.6
          : Math.min(1.8, u - 4.4),
    guard: [
      -4 - 1.3 * walk - 0.4 * approach,
      0,
      0.2 - 1.35 * walk + 0.45 * approach,
    ] as [number, number, number],
    guardYaw: u < 6.2 ? -Math.PI / 2 : u < 8 ? -2.37 : u < 9 ? Math.PI : 0,
    guardSpeed: u >= 6.2 && u < 8 ? 1.2 : u >= 9 && u < 10.3 ? 0.4 : 0,
    caption: cue
      ? `${cue.speaker}: ${cue.text}`
      : u < 1.6
        ? "Cell 47 · 02:14 AM"
        : u < 8
          ? ""
          : u < 10.3
            ? "The gate locks behind him."
            : "The officer checks the prisoner. A key lies behind him.",
  };
}
