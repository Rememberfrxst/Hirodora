import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDecayedNoise,
  applySoundMasking,
  calculateHeardNoise,
  isPlayerInGuardVision,
  updateGuardSuspicionAndState,
  canCraftSilencer,
  craftSilencer,
  stepArmWrestling,
  checkLockpickPin,
  checkSafeDial,
  determineEnding,
  NOISE_CONSTANTS,
  GUARD_CONSTANTS,
} from './rules';
import { GuardData, ItemId } from './types';

test('Noise decay reduces noise over time toward zero', () => {
  const initial = 50;
  const decayed = calculateDecayedNoise(initial, 1.0, 24);
  assert.equal(decayed, 26);

  const decayedToZero = calculateDecayedNoise(10, 1.0, 24);
  assert.equal(decayedToZero, 0);
});

test('Sound masking halves player noise when within machine radius', () => {
  const playerPos: [number, number, number] = [2, 0, 2];
  const machinePos: [number, number, number] = [3, 0, 3];
  const masked = applySoundMasking(40, playerPos, machinePos, 8.0);
  assert.equal(masked, 20);

  const farMachinePos: [number, number, number] = [20, 0, 20];
  const unmasked = applySoundMasking(40, playerPos, farMachinePos, 8.0);
  assert.equal(unmasked, 40);
});

test('Guard heard noise attenuates with distance and wall obstruction', () => {
  const guardPos: [number, number, number] = [0, 0, 0];
  const closePlayerPos: [number, number, number] = [0, 0, 7]; // 7m out of 14m radius = 0.5 factor
  const noise = 40;

  const heardUnobstructed = calculateHeardNoise(noise, guardPos, closePlayerPos, false);
  assert.ok(Math.abs(heardUnobstructed - 20) < 0.1);

  const heardObstructed = calculateHeardNoise(noise, guardPos, closePlayerPos, true);
  assert.ok(Math.abs(heardObstructed - 10) < 0.1); // Wall halves it

  const farPlayerPos: [number, number, number] = [0, 0, 20]; // Outside 14m
  const heardFar = calculateHeardNoise(noise, guardPos, farPlayerPos, false);
  assert.equal(heardFar, 0);
});

test('Guard vision cone detects player standing vs hidden/crouching', () => {
  const guardPos: [number, number, number] = [0, 0, 0];
  const guardRotY = 0; // Facing along +Z
  const visionAngle = 80;
  const visionRange = 12;

  // Directly ahead at 8m
  const aheadPlayerPos: [number, number, number] = [0, 0, 8];
  assert.equal(
    isPlayerInGuardVision(guardPos, guardRotY, visionAngle, visionRange, aheadPlayerPos, false, false),
    true
  );

  // Hidden in locker
  assert.equal(
    isPlayerInGuardVision(guardPos, guardRotY, visionAngle, visionRange, aheadPlayerPos, false, true),
    false
  );

  // Crouching at 8m (crouch effective range is 12 * 0.55 = 6.6m, so 8m is out of sight!)
  assert.equal(
    isPlayerInGuardVision(guardPos, guardRotY, visionAngle, visionRange, aheadPlayerPos, true, false),
    false
  );

  // Behind the guard
  const behindPlayerPos: [number, number, number] = [0, 0, -5];
  assert.equal(
    isPlayerInGuardVision(guardPos, guardRotY, visionAngle, visionRange, behindPlayerPos, false, false),
    false
  );
});

test('Guard state transitions from patrol to suspicious and chase on sight', () => {
  const mockGuard: GuardData = {
    id: 'guard_1',
    name: 'Officer Dunne',
    type: 'patrol_dunne',
    position: [0, 0, 0],
    rotationY: 0,
    patrolRoute: [[0, 0, 0], [0, 0, 10]],
    currentWaypoint: 0,
    state: 'patrol',
    suspicion: 20,
    visionAngle: 80,
    visionRange: 12,
    hearingMultiplier: 1.0,
    stateTimer: 0,
  };

  const playerPos: [number, number, number] = [0, 0, 5];

  // When guard sees player, suspicion spikes rapidly
  const update1 = updateGuardSuspicionAndState(mockGuard, 0, true, playerPos, 0.5);
  assert.ok(update1.nextSuspicion > mockGuard.suspicion);
  assert.equal(update1.nextState, 'chase');
});

test('Silencer crafting combines pipe, steel wool, and rubber washer', () => {
  const itemsBefore: ItemId[] = ['pipe', 'steel_wool', 'rubber_washer', 'spoon'];
  assert.equal(canCraftSilencer(itemsBefore), true);

  const itemsAfter = craftSilencer(itemsBefore);
  assert.ok(itemsAfter.includes('silencer'));
  assert.ok(itemsAfter.includes('spoon'));
  assert.ok(!itemsAfter.includes('pipe'));
  assert.ok(!itemsAfter.includes('steel_wool'));
  assert.ok(!itemsAfter.includes('rubber_washer'));
});

test('Arm wrestling step updates progress based on player taps and surge cycles', () => {
  // Steady phase (time = 1.0s, no surge)
  const step1 = stepArmWrestling(50, 2, 1.0, 0.1);
  assert.ok(step1.newProgress > 50); // Player force 15 > opponent tug 1.1
  assert.equal(step1.isSurging, false);

  // Surge phase (time = 4.0s)
  const stepSurge = stepArmWrestling(50, 0, 4.0, 0.1);
  assert.ok(stepSurge.isSurging);
  assert.ok(stepSurge.newProgress < 50);
});

test('Lockpicking detects sweet spot within tolerance', () => {
  const sweetSpot = 45;
  const close = checkLockpickPin(47, sweetSpot, 5.0);
  assert.equal(close.isSweetSpot, true);

  const far = checkLockpickPin(70, sweetSpot, 5.0);
  assert.equal(far.isSweetSpot, false);
});

test('Safe cracking detects aligned tumbler number', () => {
  // Target number 30. (30 * 3.6 = 108 degrees)
  const result = checkSafeDial(108, 30, 2);
  assert.equal(result.isAligned, true);
  assert.equal(result.distanceToTarget, 0);

  const resultFar = checkSafeDial(0, 30, 2);
  assert.equal(resultFar.isAligned, false);
});

test('Ending evaluation rewards ghost stealth and optional brotherhood rescue', () => {
  assert.equal(determineEnding(0, true), 'brotherhood');
  assert.equal(determineEnding(0, false), 'ghost');
  assert.equal(determineEnding(1, true), 'loud');
  assert.equal(determineEnding(3, false), 'loud');
});
