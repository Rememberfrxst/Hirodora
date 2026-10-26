import test from "node:test";
import assert from "node:assert/strict";
import { decideGuard, GUARD_AI, type GuardSenses } from "./guard-ai";
import {
  sightEvidence,
  strongestNoise,
  segmentBlocked,
  type NoiseEvent,
} from "./perception";
import type { GuardData } from "./types";

const guard = (): GuardData => ({
  id: "test",
  name: "Officer",
  type: "patrol_dunne",
  position: [0, 0, 0],
  rotationY: 0,
  patrolRoute: [
    [0, 0, 8],
    [5, 0, 8],
  ],
  currentWaypoint: 0,
  state: "patrol",
  suspicion: 0,
  stateTimer: 0,
  visionAngle: 80,
  visionRange: 12,
  hearingMultiplier: 1,
});
const senses = (more: Partial<GuardSenses> = {}): GuardSenses => ({
  vision: 0,
  player: [0, 0, 4],
  atTarget: false,
  captureClear: true,
  ...more,
});
const step = (g: GuardData, s: GuardSenses, dt: number) =>
  Object.assign(g, decideGuard(g, s, dt).next);
const wall = { min: { x: -2, y: 0, z: 1.8 }, max: { x: 2, y: 3, z: 2.2 } };

test("sight builds at 35/sec: suspicion at 35, confirmation at 65; pure decisions", () => {
  const g = guard(),
    original = structuredClone(g);
  const d = decideGuard(g, senses({ vision: 1 }), 1);
  assert.deepEqual(g, original);
  assert.equal(d.next.suspicion, 35);
  assert.equal(d.next.state, "suspicious");
  Object.assign(g, d.next);
  step(g, senses({ vision: 1 }), 1);
  assert.equal(g.state, "chase");
  assert.equal(g.suspicion, 70);
});
test("confirmation time is independent of simulation frame rate", () => {
  for (const hz of [20, 30, 60, 120]) {
    const g = guard();
    for (let i = 0; i < hz * 2; i++) step(g, senses({ vision: 1 }), 1 / hz);
    assert.equal(g.state, "chase");
    assert.ok(Math.abs(g.suspicion - 70) < 1e-8);
  }
});
test("chase pursues only last seen point, loses sight at five seconds, reacquires immediately", () => {
  const g = {
    ...guard(),
    state: "chase" as const,
    suspicion: 80,
    lastKnownPosition: [0, 0, 4] as [number, number, number],
  };
  for (let i = 0; i < 4; i++) step(g, senses({ player: [20, 0, -10] }), 1);
  assert.equal(g.state, "chase");
  assert.deepEqual(g.investigationTarget, [0, 0, 4]);
  step(g, senses({ player: [20, 0, -10] }), 1);
  assert.equal(g.state, "searching");
  step(g, senses({ vision: 0.1, player: [1, 0, 3] }), 0.1);
  assert.equal(g.state, "chase");
  assert.deepEqual(g.lastKnownPosition, [1, 0, 3]);
});
test("search scans a fixed origin, times out and returns to patrol without hidden tracking", () => {
  const g: GuardData = {
    ...guard(),
    state: "searching",
    suspicion: 50,
    stateTimer: 12,
    investigationTarget: [0, 0, 4],
    lastKnownPosition: [0, 0, 4],
    rotationY: 0.5,
  };
  let yaw: number | undefined;
  for (let i = 0; i < 2; i++) {
    const d = decideGuard(g, senses({ atTarget: true }), 1);
    Object.assign(g, d.next);
    yaw = d.scanYaw;
  }
  assert.ok(yaw !== undefined && Math.abs(yaw - 0.5) <= 0.8);
  assert.equal(g.scanOriginYaw, 0.5);
  step(g, senses({ atTarget: true }), 1);
  assert.equal(g.state, "patrol");
  assert.equal(g.lastKnownPosition, undefined);
  const stuck: GuardData = {
    ...guard(),
    state: "searching",
    stateTimer: 12,
    suspicion: 60,
    investigationTarget: [2, 0, 8],
  };
  for (let i = 0; i < 13; i++) step(stuck, senses(), 1);
  assert.equal(stuck.state, "patrol");
  assert.ok(stuck.suspicion <= 20);
});
test("local hearing investigates the source, not the player; sound alone cannot confirm a chase", () => {
  const g = guard(),
    noise = {
      id: 1,
      position: [3, 0, 5] as [number, number, number],
      strength: 1,
    };
  step(g, senses({ noise, player: [-20, 0, -8], atTarget: true }), 1);
  assert.equal(g.state, "suspicious");
  assert.deepEqual(g.investigationTarget, noise.position);
  assert.equal(g.scanTime, 0); // Old duty/route arrival is not arrival at the new sound.
  for (let i = 0; i < 4; i++)
    step(g, senses({ noise: { ...noise, id: 2 + i } }), 1);
  assert.equal(g.suspicion, 100);
  assert.notEqual(g.state, "chase");
  assert.equal(g.lastKnownPosition, undefined);
});
test("hearing retains a source while suspicion builds over multiple real-sized frames", () => {
  const g = guard(),
    noise = {
      id: 1,
      position: [3, 0, 5] as [number, number, number],
      strength: 1,
    };
  for (let i = 0; i < 30; i++)
    step(g, senses({ noise, dutyPoint: [0, 0, 0] }), 1 / 30);
  assert.equal(g.state, "suspicious");
  assert.deepEqual(g.investigationTarget, noise.position);
  assert.deepEqual(g.lastHeardPosition, noise.position);
});

test("one event cannot replay its onset boost; new evidence resets an active search", () => {
  const g = guard(),
    noise = {
      id: 2,
      position: [2, 0, 4] as [number, number, number],
      strength: 1,
    };
  step(g, senses({ noise }), 0.1);
  assert.equal(g.suspicion, 20);
  step(g, senses({ noise }), 0.1);
  assert.equal(g.suspicion, 22);
  Object.assign(g, { state: "searching", stateTimer: 1 });
  step(g, senses({ noise: { ...noise, id: 3 } }), 0.1);
  assert.equal(g.stateTimer, GUARD_AI.searchTime);
});
test("capture requires confirmed sight and an unblocked physical route; knock-out recovery searches", () => {
  const g: GuardData = { ...guard(), state: "chase", suspicion: 90 };
  assert.equal(
    decideGuard(
      g,
      senses({ vision: 1, player: [0, 0, 0.8], captureClear: false }),
      0.1,
    ).caughtPlayer,
    false,
  );
  assert.equal(
    decideGuard(g, senses({ vision: 1, player: [0, 0, 0.8] }), 0.1)
      .caughtPlayer,
    true,
  );
  g.state = "knocked_out";
  g.stateTimer = 2;
  step(g, senses({ vision: 1 }), 1);
  assert.equal(g.state, "knocked_out");
  assert.equal(g.suspicion, 0);
  step(g, senses(), 1);
  assert.equal(g.state, "searching");
});
test("3D sight respects solid walls, low cover, FOV, crouch and hiding", () => {
  const g = guard();
  assert.equal(sightEvidence(g, [0, 0, 4], false, false, false, [wall]), 0);
  assert.equal(sightEvidence(g, [0, 0, -4], false, false, false, []), 0);
  assert.equal(sightEvidence(g, [0, 0, 4], false, true, false, []), 0);
  const cover = { min: { x: -2, y: 0, z: 2 }, max: { x: 2, y: 1.4, z: 3 } };
  assert.ok(sightEvidence(g, [0, 0, 4], false, false, false, [cover]) > 0);
  assert.equal(sightEvidence(g, [0, 0, 4], true, false, false, [cover]), 0);
  assert.ok(
    sightEvidence(g, [0, 0, 4], true, false, false, []) <
      sightEvidence(g, [0, 0, 4], false, false, false, []),
  );
  assert.equal(sightEvidence(g, [0, 0, 8], true, false, false, []), 0);
  assert.ok(
    sightEvidence(g, [0, 0, 4], false, false, true, []) >
      sightEvidence(g, [0, 0, 4], false, false, false, []),
  );
  assert.equal(segmentBlocked([0, 1, 0], [0, 1, 5], wall), true);
  assert.equal(segmentBlocked([0, 4, 0], [0, 4, 5], wall), false);
});
test("hearing attenuates distance and walls, expires, preserves source and ignores far events", () => {
  const event: NoiseEvent = {
      id: 3,
      position: [0, 0, 4],
      loudness: 35,
      age: 0,
      kind: "drag",
    },
    g = guard();
  const clear = strongestNoise(g, [event], [])!,
    blocked = strongestNoise(g, [event], [wall])!;
  assert.ok(blocked.strength < clear.strength);
  assert.deepEqual(clear.position, event.position);
  assert.notEqual(clear.position, event.position);
  assert.equal(strongestNoise(g, [{ ...event, age: 1.7 }], []), undefined);
  assert.equal(
    strongestNoise(g, [{ ...event, position: [0, 0, 15] }], []),
    undefined,
  );
});
