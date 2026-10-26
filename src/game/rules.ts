/**
 * Pure Game Rules & Mechanics for Low Tide: Prison Escape 3D
 * Decoupled logic designed for high-performance deterministic execution and unit testing.
 */

import { EndingType, ItemId } from './types';

export const NOISE_CONSTANTS = {
  CROUCH_WALK: 3,
  WALK: 12,
  SPRINT: 30,
  JUMP_LANDING: 25,
  BOLT_STEADY: 10,
  BOLT_RUSH: 42,
  DOOR_NORMAL: 10,
  DOOR_CREAKY: 26,
  DART_UNSILENCED: 100,
  DART_SILENCED: 20,
  DECAY_PER_SECOND: 24,
  MAX_NOISE: 100,
  SOUND_MASKING_RADIUS: 8.0,
  SOUND_MASKING_FACTOR: 0.5,
};

export const GUARD_CONSTANTS = {
  HEARING_RADIUS: 14.0,
  WALL_ATTENUATION: 0.5,
  SUSPICION_GAIN_RATE: 1.5,
  SUSPICION_DECAY_RATE: 5.0,
  PATROL_SPEED: 1.8,
  SEARCH_SPEED: 2.2,
  CHASE_SPEED: 4.4,
  CATCH_DISTANCE: 1.2,
  SEARCH_TIME: 8.0,
  LOST_TIME: 4.0,
};

/**
 * Calculates updated noise level after applying decay and sound masking
 */
export function calculateDecayedNoise(
  currentNoise: number,
  dt: number,
  decayRate: number = NOISE_CONSTANTS.DECAY_PER_SECOND
): number {
  return Math.max(0, currentNoise - decayRate * dt);
}

/**
 * Applies sound masking if player is near running machinery
 */
export function applySoundMasking(
  generatedNoise: number,
  playerPos: [number, number, number],
  machinePos: [number, number, number] | null,
  maskingRadius: number = NOISE_CONSTANTS.SOUND_MASKING_RADIUS
): number {
  if (!machinePos) return generatedNoise;
  const dx = playerPos[0] - machinePos[0];
  const dz = playerPos[2] - machinePos[2];
  const dist = Math.hypot(dx, dz);
  if (dist <= maskingRadius) {
    return generatedNoise * NOISE_CONSTANTS.SOUND_MASKING_FACTOR;
  }
  return generatedNoise;
}

/**
 * Calculates how much noise a guard hears at their distance
 */
export function calculateHeardNoise(
  playerNoise: number,
  guardPos: [number, number, number],
  playerPos: [number, number, number],
  wallObstructed: boolean = false,
  hearingMultiplier: number = 1.0
): number {
  const dx = playerPos[0] - guardPos[0];
  const dz = playerPos[2] - guardPos[2];
  const distance = Math.hypot(dx, dz);

  if (distance >= GUARD_CONSTANTS.HEARING_RADIUS || playerNoise <= 0) {
    return 0;
  }

  const attenuation = wallObstructed ? GUARD_CONSTANTS.WALL_ATTENUATION : 1.0;
  const distanceFactor = 1.0 - distance / GUARD_CONSTANTS.HEARING_RADIUS;
  return playerNoise * distanceFactor * attenuation * hearingMultiplier;
}

/**
 * Checks whether the guard has visual line of sight to the player
 */
export function isPlayerInGuardVision(
  guardPos: [number, number, number],
  guardRotY: number,
  visionAngleDeg: number,
  visionRange: number,
  playerPos: [number, number, number],
  isCrouching: boolean,
  isInHidingSpot: boolean
): boolean {
  if (isInHidingSpot) return false;

  const dx = playerPos[0] - guardPos[0];
  const dz = playerPos[2] - guardPos[2];
  const distance = Math.hypot(dx, dz);

  const effectiveRange = isCrouching ? visionRange * 0.55 : visionRange;
  if (distance > effectiveRange) return false;

  // Direction vector from guard to player
  const toPlayerAngle = Math.atan2(dx, dz);
  // Normalize difference with guard facing direction
  let angleDiff = Math.abs(toPlayerAngle - guardRotY);
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  angleDiff = Math.abs(angleDiff);

  const halfFovRad = ((visionAngleDeg * 0.5) * Math.PI) / 180;
  return angleDiff <= halfFovRad;
}

// Compatibility export; authoritative decisions live in the dedicated AI layer.
export { updateGuardSuspicionAndState } from "./guard-ai";

/**
 * Check if player has the ingredients to craft a silencer
 */
export function canCraftSilencer(inventory: ItemId[]): boolean {
  return (
    inventory.includes('pipe') &&
    inventory.includes('steel_wool') &&
    inventory.includes('rubber_washer')
  );
}

/**
 * Perform crafting operation
 */
export function craftSilencer(inventory: ItemId[]): ItemId[] {
  if (!canCraftSilencer(inventory)) return inventory;
  const filtered = inventory.filter(
    (item) => item !== 'pipe' && item !== 'steel_wool' && item !== 'rubber_washer'
  );
  filtered.push('silencer');
  return filtered;
}

/**
 * Strength Contest (Arm Wrestling with Boulder) mechanics
 */
export function stepArmWrestling(
  currentProgress: number, // 0 - 100 (50 is neutral, 100 is player win, 0 is defeat)
  playerTaps: number,
  time: number,
  dt: number,
  difficultyMultiplier: number = 1.0
): {
  newProgress: number;
  isSurging: boolean;
  isTelegraphing: boolean;
  status: 'active' | 'win' | 'lose';
} {
  // Boulder surge cycle occurs roughly every 4.5 seconds
  const cycleTime = time % 4.5;
  const isTelegraphing = cycleTime >= 3.0 && cycleTime < 3.7;
  const isSurging = cycleTime >= 3.7 && cycleTime < 4.5;

  const opponentTug = isSurging ? 28 * difficultyMultiplier : 11 * difficultyMultiplier;
  const playerForce = playerTaps * 7.5;

  let progress = currentProgress + playerForce - opponentTug * dt;
  progress = Math.max(0, Math.min(100, progress));

  let status: 'active' | 'win' | 'lose' = 'active';
  if (progress >= 100) status = 'win';
  else if (progress <= 0) status = 'lose';

  return {
    newProgress: progress,
    isSurging,
    isTelegraphing,
    status,
  };
}

/**
 * Lockpicking mechanics
 */
export function checkLockpickPin(
  currentAngle: number,
  sweetSpot: number,
  tolerance: number = 6.0
): {
  isSweetSpot: boolean;
  distance: number;
  vibrationIntensity: number;
} {
  const diff = Math.abs(currentAngle - sweetSpot);
  const isSweetSpot = diff <= tolerance;
  const vibrationIntensity = Math.max(0, 1 - diff / (tolerance * 3.5));
  return {
    isSweetSpot,
    distance: diff,
    vibrationIntensity,
  };
}

/**
 * Safe Cracking mechanics
 */
export function checkSafeDial(
  currentDialAngle: number,
  targetNumber: number,
  tolerance: number = 2
): {
  isAligned: boolean;
  distanceToTarget: number;
  audioClickVolume: number;
} {
  const currentNumber = Math.round((currentDialAngle % 360) / 3.6) % 100;
  const diff = Math.abs(currentNumber - targetNumber);
  const distance = Math.min(diff, 100 - diff);
  const isAligned = distance <= tolerance;
  const audioClickVolume = distance <= 5 ? 1.0 - distance / 6 : 0.15;

  return {
    isAligned,
    distanceToTarget: distance,
    audioClickVolume,
  };
}

/**
 * Determine ending based on stealth record and optional objectives
 */
export function determineEnding(
  alarmsTriggered: number,
  boulderRescued: boolean
): EndingType {
  if (alarmsTriggered === 0 && boulderRescued) {
    return 'brotherhood';
  }
  if (alarmsTriggered === 0) {
    return 'ghost';
  }
  return 'loud';
}
