/**
 * Types and interfaces for Low Tide: Prison Escape 3D
 * Architected following Unity/C# Component & State-Machine patterns
 */

export type GameState =
  | "title"
  | "intro"
  | "playing"
  | "paused"
  | "gameover"
  | "victory"
  | "chapter_complete";

export type EndingType = "ghost" | "loud" | "brotherhood";

export type GuardState =
  "patrol" | "suspicious" | "searching" | "chase" | "knocked_out";

export type GuardType = "patrol_dunne" | "sentry" | "night_captain";

export interface GuardData {
  id: string;
  name: string;
  type: GuardType;
  position: [number, number, number];
  rotationY: number;
  patrolRoute: [number, number, number][];
  currentWaypoint: number;
  state: GuardState;
  suspicion: number; // 0 - 100
  visionAngle: number; // degrees cone
  visionRange: number; // meters
  hearingMultiplier: number;
  stateTimer: number;
  investigationTarget?: [number, number, number];
  examining?: boolean;
  cinematicAim?: boolean;
  lastKnownPosition?: [number, number, number];
  lastHeardPosition?: [number, number, number];
  lookTarget?: [number, number, number];
  unseenTime?: number;
  scanTime?: number;
  scanOriginYaw?: number;
  lastNoiseId?: number;
  attackElapsed?: number;
  attackCooldown?: number;
  crouchInspect?: boolean;
  health?: number;
  dead?: boolean;
  deathElapsed?: number;
  attackIndex?: number;
  attackKind?: 0 | 1 | 2;
  region?: "secret" | "military";
  armed?: boolean;
  shotWindup?: number;
  shotCooldown?: number;
  gaitPhase?: number;
  beltDuty?: boolean;
}

export type ItemId =
  | "pistol_10mm"
  | "cell_key"
  | "screwdriver"
  | "small_key"
  | "note_from_unknown"
  | "spoon"
  | "master_key_c"
  | "lockpick"
  | "steel_wool"
  | "rubber_washer"
  | "pipe"
  | "silencer"
  | "stethoscope"
  | "dart_pistol"
  | "warden_ledger"
  | "heavy_crowbar";

export interface InventoryItem {
  id: ItemId;
  name: string;
  description: string;
  icon: string;
  category: "tool" | "key" | "crafting" | "document" | "weapon";
}

export type ActiveMiniGame =
  | null
  | { type: "vent_bolts"; progress: number; noiseSpike: number }
  | {
      type: "arm_wrestling";
      playerProgress: number;
      opponentPower: number;
      surgeTelegraph: boolean;
    }
  | {
      type: "lockpick";
      doorId: string;
      pinIndex: number;
      totalPins: number;
      sweetSpot: number;
      currentAngle: number;
      tension: number;
    }
  | {
      type: "safe_crack";
      currentDial: number;
      targetCombination: [number, number, number];
      solvedDials: boolean[];
    };

export interface NarrativeSubtitle {
  speaker: string;
  text: string;
  tag: "monologue" | "radio" | "dialogue" | "lore";
  timeRemaining: number;
}

export interface PlayerStats {
  health: number; // 0–200; guard contact no longer causes instant game over.
  noiseLevel: number; // 0 - 100
  peakNoise: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isInHidingSpot: boolean;
  hidingSpotName: string | null;
  dartAmmo: number;
  pistolAmmo: number;
  alarmsTriggered: number;
  timesCaught: number;
  hintsUsed: number;
  boulderRescued: boolean;
  tideTimeRemaining: number; // seconds remaining in Act 3 Tide Run
  act: 1 | 2 | 3;
  subtitle: NarrativeSubtitle | null;
}

export interface InteractiveObject {
  id: string;
  name: string;
  prompt: string;
  actionRequiredItem?: ItemId;
  actionType: "pickup" | "interact" | "hide" | "minigame" | "door" | "craft";
  position: [number, number, number];
  radius: number;
  disabled?: boolean;
}

export interface GameCheckpoint {
  region?: "secret" | "military";
  guardCombat?: {
    id: string;
    health: number;
    position: [number, number, number];
    rotationY: number;
  }[];
  layoutVersion?: number;
  equippedItem?: ItemId | null;
  openingProgress?: { bed: number; bolts: number; toilet: number; boltSteps?: number[] };
  stats?: PlayerStats;
  id: string;
  name: string;
  playerPosition: [number, number, number];
  playerRotationY: number;
  act: 1 | 2 | 3;
  inventory: ItemId[];
  flags: Record<string, boolean>;
}
