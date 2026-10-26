import type { GuardData } from "./types";
import type { HeardEvidence, Vec3 } from "./perception";
export const GUARD_AI = {
  suspicious: 35,
  chase: 65,
  visionRate: 35,
  hearingRate: 20,
  decay: 6,
  loseAfter: 5,
  investigationTime: 7,
  searchTime: 12,
  scanTime: 3,
} as const;
export interface GuardSenses {
  vision: number;
  player: Vec3;
  noise?: HeardEvidence;
  atTarget: boolean;
  captureClear: boolean;
  dutyPoint?: Vec3;
}
export interface GuardDecision {
  next: Partial<GuardData>;
  target?: Vec3;
  speed: number;
  scanYaw?: number;
  caughtPlayer: boolean;
}
const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const copy = (p: Vec3 | undefined) => (p ? ([...p] as Vec3) : undefined);

/** Authoritative perception memory and decisions. No renderer, bones or camera. */
export function decideGuard(
  g: GuardData,
  s: GuardSenses,
  seconds: number,
): GuardDecision {
  const dt = Math.max(0, Math.min(1, seconds));
  let state = g.state,
    suspicion = g.suspicion,
    timer = g.stateTimer,
    unseen = g.unseenTime ?? 0,
    scan = g.scanTime ?? 0;
  let last = copy(g.lastKnownPosition),
    lastHeard = copy(g.lastHeardPosition),
    target = copy(g.investigationTarget),
    lastNoise = g.lastNoiseId,
    waypoint = g.currentWaypoint;
  const seen = s.vision > 0,
    heard = !!s.noise;
  if (state === "knocked_out") {
    timer = Math.max(0, timer - dt);
    if (timer > 0)
      return {
        next: { suspicion: 0, stateTimer: timer, lookTarget: undefined },
        speed: 0,
        caughtPlayer: false,
      };
    state = "searching";
    suspicion = 35;
    timer = GUARD_AI.searchTime;
    scan = 0;
    unseen = 0;
    target = last ?? copy(g.position);
  }
  if (seen) {
    last = copy(s.player);
    target = copy(s.player);
    unseen = 0;
    suspicion = Math.min(100, suspicion + GUARD_AI.visionRate * s.vision * dt);
  } else {
    unseen += dt;
    if (!heard) suspicion = Math.max(0, suspicion - GUARD_AI.decay * dt);
  }
  const freshNoise = heard && s.noise!.id > (lastNoise ?? -1);
  if (heard) {
    suspicion = Math.min(
      100,
      suspicion + GUARD_AI.hearingRate * s.noise!.strength * dt,
    );
    if (freshNoise) {
      lastNoise = s.noise!.id;
      lastHeard = copy(s.noise!.position);
      if (s.noise!.strength >= 0.7)
        suspicion = Math.min(100, suspicion + 18 * s.noise!.strength);
      // A sound gives a source location, never the hidden player's current position.
      if (!seen && state !== "chase") {
        target = copy(s.noise!.position);
        scan = 0;
      }
    }
  }
  if (
    state !== "chase" &&
    seen &&
    (suspicion >= GUARD_AI.chase || state === "searching")
  ) {
    state = "chase";
    suspicion = Math.max(65, suspicion);
    timer = GUARD_AI.loseAfter;
    scan = 0;
  } else if (state === "patrol" && suspicion >= GUARD_AI.suspicious) {
    state = "suspicious";
    if (!seen) target = copy(lastHeard);
    timer = GUARD_AI.investigationTime;
    scan = 0;
  }
  const arrived =
    s.atTarget &&
    !!target &&
    !!g.investigationTarget &&
    distance(target, g.investigationTarget) < 0.6;
  if (state === "chase") {
    target = copy(last);
    timer = Math.max(0, GUARD_AI.loseAfter - unseen);
    if (!seen && unseen >= GUARD_AI.loseAfter) {
      state = "searching";
      timer = GUARD_AI.searchTime;
      scan = 0;
    }
  } else if (state === "suspicious") {
    timer -= dt;
    if (arrived || timer <= 0) {
      state = "searching";
      timer = GUARD_AI.searchTime;
      scan = 0;
    }
  } else if (state === "searching") {
    timer -= dt;
    if (freshNoise && s.noise!.strength > 0.45) timer = GUARD_AI.searchTime;
    if (arrived) scan += dt;
    if (!seen && !heard && (timer <= 0 || scan >= GUARD_AI.scanTime)) {
      state = "patrol";
      suspicion = Math.min(20, suspicion);
      target = undefined;
      last = undefined;
      lastHeard = undefined;
      scan = 0;
    }
  }
  let speed =
    state === "chase"
      ? 3.9
      : state === "suspicious"
        ? 0.85
        : state === "searching"
          ? 1.15
          : 1.3;
  if (state === "patrol") {
    target = copy(s.dutyPoint ?? g.patrolRoute[waypoint]);
    if (target && distance(g.position, target) < 0.35) {
      if (s.dutyPoint) target = undefined;
      else {
        waypoint = (waypoint + 1) % g.patrolRoute.length;
        target = copy(g.patrolRoute[waypoint]);
      }
    }
  }
  if (target && distance(g.position, target) < 0.3) speed = 0;
  const scanOrigin =
    state === "searching"
      ? g.state === "searching"
        ? (g.scanOriginYaw ?? g.rotationY)
        : g.rotationY
      : undefined;
  const scanYaw =
    state === "searching" && arrived
      ? scanOrigin! + Math.sin(scan * 1.7) * 0.8
      : undefined;
  return {
    next: {
      state,
      suspicion,
      stateTimer: timer,
      unseenTime: unseen,
      scanTime: scan,
      scanOriginYaw: scanOrigin,
      lastKnownPosition: last,
      lastHeardPosition: lastHeard,
      investigationTarget: target,
      lastNoiseId: lastNoise,
      currentWaypoint: waypoint,
      lookTarget: copy(seen ? s.player : target),
    },
    target,
    speed,
    scanYaw,
    caughtPlayer:
      state === "chase" &&
      seen &&
      s.captureClear &&
      distance(g.position, s.player) <= 1.2,
  };
}

/** Legacy pure-rule API; runtime supplies spatial evidence directly to decideGuard. */
export function updateGuardSuspicionAndState(
  g: GuardData,
  heard: number,
  seen: boolean,
  player: Vec3,
  dt: number,
) {
  const d = decideGuard(
    g,
    {
      vision: seen ? 1 : 0,
      player,
      noise:
        heard > 2
          ? { id: 0, position: player, strength: Math.min(1, heard / 25) }
          : undefined,
      atTarget: false,
      captureClear: seen,
    },
    dt,
  );
  return {
    nextState: d.next.state ?? g.state,
    nextSuspicion: d.next.suspicion ?? g.suspicion,
    nextStateTimer: d.next.stateTimer ?? g.stateTimer,
    investigationTarget: d.next.investigationTarget,
    caughtPlayer: d.caughtPlayer,
  };
}
