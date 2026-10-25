/**
 * Core 3D Game Engine for Hirodora: The Obsidian Penitentiary
 * First-person controller, realistic stealth perception, tactical guard AI, and mini-game hooks.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ActiveMiniGame,
  EndingType,
  GameCheckpoint,
  GameState,
  GuardData,
  InventoryItem,
  ItemId,
  PlayerStats,
} from './types';
import {
  applySoundMasking,
  calculateDecayedNoise,
  calculateHeardNoise,
  canCraftSilencer,
  craftSilencer,
  determineEnding,
  isPlayerInGuardVision,
  NOISE_CONSTANTS,
  updateGuardSuspicionAndState,
} from './rules';
import { buildPrisonWorld, PrisonWorldData } from './world';
import { sound } from './audio';

export const ALL_ITEMS: Record<ItemId, InventoryItem> = {
  small_key: {
    id: 'small_key',
    name: 'Small Brass Key',
    description: 'A tiny key slipped through the meal slot. Marked: "Locker 46".',
    icon: 'Key',
    category: 'key',
  },
  note_from_unknown: {
    id: 'note_from_unknown',
    name: 'Smuggled Note',
    description: '"Cell 46. Bolts. Quietly. Low tide lasts 11 minutes. - A Friend"',
    icon: 'FileText',
    category: 'document',
  },
  spoon: {
    id: 'spoon',
    name: 'Reinforced Spoon',
    description: 'Ground down edge, perfect for quietly turning hex bolts.',
    icon: 'Utensils',
    category: 'tool',
  },
  master_key_c: {
    id: 'master_key_c',
    name: 'Block-C Master Key',
    description: 'Heavy iron key stamped with the Hirodora seal. Opens corridor security gates.',
    icon: 'KeyRound',
    category: 'key',
  },
  lockpick: {
    id: 'lockpick',
    name: 'Smuggler Lockpick Set',
    description: 'Spring-steel pick and tension wrench. Required for picking high-security locks.',
    icon: 'Wrench',
    category: 'tool',
  },
  pipe: {
    id: 'pipe',
    name: 'Threaded Pipe',
    description: 'Hollow steel conduit from the workshop bench.',
    icon: 'Cylinder',
    category: 'crafting',
  },
  steel_wool: {
    id: 'steel_wool',
    name: 'Steel Wool',
    description: 'Dense metallic acoustic baffling fibers.',
    icon: 'Layers',
    category: 'crafting',
  },
  rubber_washer: {
    id: 'rubber_washer',
    name: 'Rubber O-Ring',
    description: 'High-pressure seal washer to prevent gas leakage.',
    icon: 'Circle',
    category: 'crafting',
  },
  silencer: {
    id: 'silencer',
    name: 'Improvised Silencer',
    description: 'Muffles the warden\'s dart pistol shot from a thunderous 100 noise down to a whisper 20.',
    icon: 'ShieldAlert',
    category: 'weapon',
  },
  stethoscope: {
    id: 'stethoscope',
    name: 'Acoustic Stethoscope',
    description: 'Amplifies micro-clicks of vault dial tumblers.',
    icon: 'Activity',
    category: 'tool',
  },
  dart_pistol: {
    id: 'dart_pistol',
    name: 'Pneumatic Dart Pistol',
    description: 'Non-lethal sedative pistol from Warden Voss\'s personal safe. 3 darts remaining.',
    icon: 'Crosshair',
    category: 'weapon',
  },
  warden_ledger: {
    id: 'warden_ledger',
    name: 'Smuggling Ledger',
    description: 'Incriminating documentation proving Warden Voss\'s island smuggling cartel.',
    icon: 'BookOpen',
    category: 'document',
  },
  heavy_crowbar: {
    id: 'heavy_crowbar',
    name: 'Iron Pry Bar',
    description: 'Heavy leverage bar used to pry obstacles.',
    icon: 'Hammer',
    category: 'tool',
  },
};

export class GameEngine {
  private mountEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private worldData: PrisonWorldData;
  private frameId: number = 0;
  private isSoftwareGl: boolean = false;

  // Game state
  public gameState: GameState = 'title';
  public endingType: EndingType | null = null;
  public gameOverReason: string = '';

  // Player state
  public playerPos: [number, number, number] = [-6.0, 0, -6.0]; // Inside Cell 47
  public playerRotY: number = 0;
  public cameraPitch: number = 0;
  public stats: PlayerStats = {
    noiseLevel: 0,
    peakNoise: 0,
    isCrouching: false,
    isSprinting: false,
    isInHidingSpot: false,
    hidingSpotName: null,
    dartAmmo: 3,
    alarmsTriggered: 0,
    timesCaught: 0,
    hintsUsed: 0,
    boulderRescued: false,
    tideTimeRemaining: 240, // 4-minute tidal countdown
    act: 1,
    subtitle: null,
  };

  public triggerSubtitle(speaker: string, text: string, tag: 'monologue' | 'radio' | 'dialogue' | 'lore' = 'monologue', duration: number = 5) {
    this.stats.subtitle = {
      speaker,
      text,
      tag,
      timeRemaining: duration,
    };
    this.emitChange();
  }

  public inventory: ItemId[] = ['small_key', 'note_from_unknown'];
  public equippedItem: ItemId | null = null;
  public activeMiniGame: ActiveMiniGame = null;
  public activeInteractPrompt: string | null = null;
  public activeObjective: string = 'Find the sharpened spoon under your bunk and quietly dismantle the toilet vent bolts.';
  public munshiHint: string | null = null;

  // Input states
  private keys: Record<string, boolean> = {};
  private mouseLocked: boolean = false;
  private pointerDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastClockTime: number = 0;
  private lastHudEmitTime: number = 0;
  private cameraBobPhase: number = 0;
  private waterDripTimer: number = 4.0;

  // React listener callback
  public onStateChange?: () => void;

  // Checkpoints
  private lastCheckpoint: GameCheckpoint = {
    id: 'act1_start',
    name: 'Cell 47 - Hirodora Awakening',
    playerPosition: [-6.0, 0, -6.0],
    playerRotationY: 0,
    act: 1,
    inventory: ['small_key', 'note_from_unknown'],
    flags: {},
  };
  public gameFlags: Record<string, boolean> = {};

  constructor(mountElement: HTMLElement) {
    this.mountEl = mountElement;

    // Detect software WebGL guard as required in threejs skill
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.mountEl.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.mountEl.appendChild(this.renderer.domElement);

    // Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 100);
    this.camera.position.set(-6.0, 1.7, -6.0);

    // Generate Procedural Studio Environment Reflection Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Build World Geometry
    this.worldData = buildPrisonWorld(this.scene);

    // Bind event listeners
    this.setupInputs();

    // Start render loop
    this.lastClockTime = performance.now();
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyE') {
        this.handleInteractKey();
      } else if (e.code === 'KeyC') {
        this.toggleCrouch();
      } else if (e.code === 'KeyH') {
        this.triggerMunshiHint();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.gameState === 'playing') {
          this.pauseGame();
        } else if (this.gameState === 'paused') {
          this.resumeGame();
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        if (this.gameState === 'title') {
          this.startGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.pointerDown = false;
    });

    // Pointer Lock & Mouse Look
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.gameState === 'playing' && !this.mouseLocked) {
        sound.init();
        sound.resume();
        canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.gameState !== 'playing' || this.activeMiniGame !== null) return;

      if (this.mouseLocked) {
        const sensitivity = 0.0022;
        this.playerRotY -= e.movementX * sensitivity;
        this.cameraPitch = Math.max(-1.4, Math.min(1.4, this.cameraPitch - e.movementY * sensitivity));
      } else if (this.pointerDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.playerRotY -= dx * 0.005;
        this.cameraPitch = Math.max(-1.4, Math.min(1.4, this.cameraPitch - dy * 0.005));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      this.pointerDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (e.button === 0 && this.equippedItem === 'dart_pistol') {
        this.fireDart();
      }
    });

    window.addEventListener('mouseup', () => {
      this.pointerDown = false;
    });

    window.addEventListener('resize', () => {
      if (!this.mountEl) return;
      const w = this.mountEl.clientWidth || window.innerWidth;
      const h = this.mountEl.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  public startGame() {
    sound.init();
    sound.resume();
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.keys = {};
    this.triggerSubtitle(
      'Kabir (Solitary Soliloquy)',
      'The ocean tide is pulling back... Exactly 11 minutes before Devil\'s Reef swallows the tunnel. I need to find the sharpened spoon under my bunk and unscrew the toilet vent.',
      'monologue',
      7
    );
    this.emitChange();
  }

  public pauseGame() {
    this.gameState = 'paused';
    document.body.dataset.state = 'paused';
    document.exitPointerLock?.();
    this.emitChange();
  }

  public resumeGame() {
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.emitChange();
  }

  public restartGame() {
    this.restoreCheckpoint(this.lastCheckpoint);
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.emitChange();
  }

  public triggerMunshiHint() {
    if (this.gameState !== 'playing') return;
    this.stats.hintsUsed++;

    if (!this.gameFlags['vent_unbolted']) {
      this.munshiHint = "Munshi: 'Check beneath your welded bunk frame. The sharpened spoon can loosen those 4 rear vent bolts quietly.'";
    } else if (!this.gameFlags['boulder_pacified']) {
      this.munshiHint = "Munshi: 'Boulder is wary of spies. Win his arm wrestling contest to earn his silence.'";
    } else if (!this.gameFlags['master_door_unlocked']) {
      this.munshiHint = "Munshi: 'Your small key opens Locker 46. Grab the Master Key, then time Officer Dunne's flashlight turn.'";
    } else if (!this.gameFlags['silencer_crafted']) {
      this.munshiHint = "Munshi: 'Assemble the silencer at the workshop vice before firing any weapon in Hirodora.'";
    } else if (!this.gameFlags['safe_cracked']) {
      this.munshiHint = "Munshi: 'Equip the stethoscope against Voss's vault. Listen for the deep mechanical clicks.'";
    } else {
      this.munshiHint = "Munshi: 'The tidal surge is breaking into the tunnel! Pick the sea gate lock before the water reaches chest level!'";
    }

    this.emitChange();
    setTimeout(() => {
      this.munshiHint = null;
      this.emitChange();
    }, 6000);
  }

  public toggleCrouch() {
    if (this.stats.isInHidingSpot) return;
    this.stats.isCrouching = !this.stats.isCrouching;
    this.emitChange();
  }

  public fireDart() {
    if (this.stats.dartAmmo <= 0) return;
    this.stats.dartAmmo--;

    const isSilenced = this.inventory.includes('silencer');
    sound.playDartShot(isSilenced);

    // If unsilenced, immediate 100 noise spike -> alarm!
    if (!isSilenced) {
      this.stats.noiseLevel = 100;
      this.stats.alarmsTriggered++;
    } else {
      this.stats.noiseLevel = Math.min(100, this.stats.noiseLevel + NOISE_CONSTANTS.DART_SILENCED);
    }

    // Raycast hitscan to knock out guard in crosshairs
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    this.worldData.guards.forEach((guard) => {
      const mesh = this.worldData.guardMeshes.get(guard.id);
      if (!mesh || guard.state === 'knocked_out') return;

      const intersects = raycaster.intersectObject(mesh, true);
      if (intersects.length > 0 && intersects[0].distance < 18) {
        guard.state = 'knocked_out';
        guard.suspicion = 0;
        guard.stateTimer = 90.0;
        // Tip guard mesh over to simulate tranquilizer knockdown
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = 0.2;
      }
    });

    this.emitChange();
  }

  private handleInteractKey() {
    if (this.stats.isInHidingSpot) {
      // Exit hiding spot
      this.stats.isInHidingSpot = false;
      this.stats.hidingSpotName = null;
      this.emitChange();
      return;
    }

    const closest = this.findClosestInteractable();
    if (!closest) return;

    if (closest.actionType === 'pickup') {
      if (closest.id === 'spoon_pickup') {
        this.inventory.push('spoon');
        this.removeInteractable('spoon_pickup');
        this.activeObjective = 'Use the steel spoon to unscrew the 4 toilet vent bolts quietly.';
        this.triggerSubtitle('Kabir', 'Got the sharpened spoon from beneath the bed. Now to unscrew the 4 toilet vent bolts quietly.', 'monologue', 5);
        sound.playBoltTurn(false);
      } else if (closest.id === 'food_slot_note') {
        this.munshiHint = 'Smuggled note: "Cell 46. Bolts. Quietly. Low tide window is 11 minutes."';
        this.triggerSubtitle('Smuggled Note', '"Cell 46 holds the corridor key. Work the bolts quietly. Low tide gives you 11 minutes. - A Friend"', 'lore', 5.5);
      } else if (closest.id === 'cell_46_locker') {
        if (!this.inventory.includes('master_key_c')) {
          this.inventory.push('master_key_c');
          this.activeObjective = 'Block-C Master Key acquired. Watch Officer Dunne\'s flashlight before unlocking the gate.';
          this.triggerSubtitle('Kabir', 'Block-C master key acquired! Officer Dunne is patrolling the corridor outside with his flashlight.', 'monologue', 5);
          sound.playDoorOpen();
        }
      } else if (closest.id === 'lockpick_pickup') {
        this.inventory.push('lockpick');
        this.removeInteractable('lockpick_pickup');
        sound.playLockClick(true);
      } else if (closest.id === 'pipe_pickup') {
        this.inventory.push('pipe');
        this.removeInteractable('pipe_pickup');
      } else if (closest.id === 'steel_wool_pickup') {
        this.inventory.push('steel_wool');
        this.removeInteractable('steel_wool_pickup');
      } else if (closest.id === 'rubber_washer_pickup') {
        this.inventory.push('rubber_washer');
        this.removeInteractable('rubber_washer_pickup');
      } else if (closest.id === 'stethoscope_pickup') {
        this.inventory.push('stethoscope');
        this.removeInteractable('stethoscope_pickup');
        this.triggerSubtitle('Kabir', 'Acoustic Stethoscope acquired. Now I can hear the micro-clicks in Warden Voss\'s wall vault safe.', 'monologue', 5);
      }
    } else if (closest.actionType === 'interact') {
      if (closest.id === 'kabir_wall_diary') {
        this.triggerSubtitle(
          'Carved Wall Inscription',
          '"Day 412: Warden Voss framed me for his black-market sea cartel. Low tide opens the drowned gate... Freedom or a watery grave."',
          'lore',
          6.5
        );
      }
    } else if (closest.actionType === 'hide') {
      this.stats.isInHidingSpot = true;
      this.stats.hidingSpotName = closest.name;
    } else if (closest.actionType === 'minigame') {
      if (closest.id === 'vent_bolts_interact') {
        this.startMiniGame({ type: 'vent_bolts', progress: 0, noiseSpike: 0 });
      } else if (closest.id === 'boulder_npc') {
        this.triggerSubtitle('Boulder', 'You want the master key? Prove your arm isn\'t made of wet cardboard first, Kabir!', 'dialogue', 4);
        this.startMiniGame({
          type: 'arm_wrestling',
          playerProgress: 50,
          opponentPower: 12,
          surgeTelegraph: false,
        });
      } else if (closest.id === 'warden_safe_interact') {
        this.startMiniGame({
          type: 'safe_crack',
          currentDial: 0,
          targetCombination: [24, 68, 42],
          solvedDials: [false, false, false],
        });
      } else if (closest.id === 'sea_gate_interact') {
        this.startMiniGame({
          type: 'lockpick',
          doorId: 'sea_gate_door',
          pinIndex: 0,
          totalPins: 3,
          sweetSpot: 48,
          currentAngle: 0,
          tension: 0,
        });
      }
    } else if (closest.actionType === 'craft') {
      if (canCraftSilencer(this.inventory)) {
        this.inventory = craftSilencer(this.inventory);
        this.gameFlags['silencer_crafted'] = true;
        this.activeObjective = 'Silencer crafted! Infiltrate Warden Voss\'s obsidian vault without alerting the Night Captain.';
        this.triggerSubtitle('Kabir', 'Improvised silencer crafted. Dart shots will now be muffled to an acoustic whisper.', 'monologue', 5);
        sound.playBoltTurn(false);
      }
    } else if (closest.actionType === 'door') {
      if (closest.id === 'master_c_door_interact' && this.inventory.includes('master_key_c')) {
        const doorGroup = this.worldData.doors.get('master_c_door');
        if (doorGroup) {
          doorGroup.rotation.y = Math.PI / 2;
        }
        this.gameFlags['master_door_unlocked'] = true;
        this.stats.act = 2;
        this.activeObjective = 'Infiltrate Workshop & Laundry. Gather silencer parts and the stethoscope from Infirmary.';
        this.triggerSubtitle('Kabir', 'Corridor gate is open. Stay in the shadows... Dunne\'s flashlight covers this whole hall.', 'monologue', 5);
        sound.playDoorOpen();
      }
    } else if (closest.id === 'boulder_rescue_tunnel') {
      this.stats.boulderRescued = true;
      this.removeInteractable('boulder_rescue_tunnel');
      this.activeObjective = 'Boulder is free! Sprint to the extraction boat together!';
      this.triggerSubtitle('Boulder', 'You came back for me! You\'re a real brother, Kabir. Let\'s get to the skiff!', 'dialogue', 5.5);
      sound.playVentPop();
    } else if (closest.id === 'sea_tunnel_exit') {
      this.triggerVictory();
    }

    this.emitChange();
  }

  public startMiniGame(minigame: ActiveMiniGame) {
    this.activeMiniGame = minigame;
    document.exitPointerLock?.();
    this.emitChange();
  }

  public completeMiniGame(success: boolean) {
    if (!this.activeMiniGame) return;

    if (this.activeMiniGame.type === 'vent_bolts' && success) {
      this.gameFlags['vent_unbolted'] = true;
      this.playerPos = [-11.0, 0, -6.0]; // Crawl through vent into Cell 46!
      this.activeObjective = 'You emerged into Cell 46. Speak to Boulder without alerting the tactical guards.';
      this.triggerSubtitle('Kabir', 'The rusted bolts gave way! Slipped through the exhaust duct into Cell 46.', 'monologue', 5);
      sound.playVentPop();
    } else if (this.activeMiniGame.type === 'arm_wrestling' && success) {
      this.gameFlags['boulder_pacified'] = true;
      this.activeObjective = 'Boulder respects your strength. Use the small brass key to unlock Locker 46.';
      this.triggerSubtitle('Boulder', 'Damn, Kabir! You\'ve got an iron grip! Take the key from Locker 46. When you reach the sea gate, don\'t leave me behind.', 'dialogue', 6);
    } else if (this.activeMiniGame.type === 'safe_crack' && success) {
      this.gameFlags['safe_cracked'] = true;
      this.inventory.push('warden_ledger', 'dart_pistol');
      this.equippedItem = 'dart_pistol';
      this.stats.act = 3;
      this.activeObjective = 'Smuggling Ledger & Dart Pistol acquired! Break through the flooded Smuggler Tunnel!';
      this.triggerSubtitle('Kabir', 'Vault safe opened! Voss\'s contraband ledger and dart pistol are secured. Down into the sea tunnel!', 'monologue', 6);
      sound.playLockClick(true);
    } else if (this.activeMiniGame.type === 'lockpick' && success) {
      const door = this.worldData.doors.get('sea_gate_door');
      if (door) door.position.y = 3.6;
      this.gameFlags['sea_gate_open'] = true;
      this.activeObjective = 'Sea gate breached! Sprint through the tidal tunnel to Officer Iyer\'s extraction skiff!';
      sound.playDoorOpen();
    }

    this.activeMiniGame = null;
    this.emitChange();
  }

  public triggerVictory() {
    this.endingType = determineEnding(this.stats.alarmsTriggered, this.stats.boulderRescued);
    this.gameState = 'victory';
    document.body.dataset.state = 'gameover';
    sound.playVictoryFanfare();
    document.exitPointerLock?.();
    this.emitChange();
  }

  public triggerGameOver(reason: string) {
    this.gameOverReason = reason;
    this.stats.timesCaught++;
    this.gameState = 'gameover';
    document.body.dataset.state = 'gameover';
    sound.playDefeatSting();
    document.exitPointerLock?.();
    this.emitChange();
  }

  public restoreCheckpoint(cp: GameCheckpoint) {
    this.playerPos = [...cp.playerPosition];
    this.playerRotY = cp.playerRotationY;
    this.stats.act = cp.act;
    this.inventory = [...cp.inventory];
    this.gameFlags = { ...cp.flags };
    this.stats.noiseLevel = 0;
    this.activeMiniGame = null;

    // Reset guards
    this.worldData.guards.forEach((g) => {
      g.state = 'patrol';
      g.suspicion = 0;
      g.position = [...g.patrolRoute[0]];
      const mesh = this.worldData.guardMeshes.get(g.id);
      if (mesh) {
        mesh.position.set(...g.position);
        mesh.rotation.x = 0;
        mesh.rotation.y = g.rotationY;
      }
    });
  }

  private findClosestInteractable() {
    let closest: (typeof this.worldData.interactables)[0] | null = null;
    let minDist = Infinity;

    for (const obj of this.worldData.interactables) {
      if (obj.disabled) continue;
      const dx = this.playerPos[0] - obj.position[0];
      const dz = this.playerPos[2] - obj.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist <= obj.radius && dist < minDist) {
        minDist = dist;
        closest = obj;
      }
    }
    return closest;
  }

  private removeInteractable(id: string) {
    const idx = this.worldData.interactables.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.worldData.interactables.splice(idx, 1);
    }
  }

  /**
   * Main Simulation Loop
   */
  private tick() {
    const now = performance.now();
    const rawDt = (now - this.lastClockTime) / 1000;
    this.lastClockTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (this.gameState === 'playing' && this.activeMiniGame === null) {
      this.updatePlayerMovement(dt);
      this.updateGuards(dt);
      this.updateEnvironment(dt);

      // Ambient cell water drip
      this.waterDripTimer -= dt;
      if (this.waterDripTimer <= 0) {
        this.waterDripTimer = 5.0 + Math.random() * 6.0;
        sound.playWaterDrip();
      }
    } else if (this.gameState === 'title') {
      // Atmospheric cinematic title camera pan around Cell 47
      const panTime = now * 0.00025;
      this.camera.position.x = -6.0 + Math.sin(panTime) * 1.8;
      this.camera.position.z = -5.8 + Math.cos(panTime) * 1.6;
      this.camera.position.y = 1.75 + Math.sin(panTime * 1.5) * 0.12;
      this.camera.lookAt(-5.8, 1.1, -8.6);
    }

    // Slowly drift airborne atmospheric dust particles
    if (this.worldData.dustParticles) {
      const positions = this.worldData.dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= dt * 0.04;
        if (positions[i] < 0.2) positions[i] = 4.0;
      }
      this.worldData.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);

    // Throttle React HUD emission to ~10Hz
    if (now - this.lastHudEmitTime > 100) {
      this.lastHudEmitTime = now;
      this.emitChange();
    }

    this.frameId = requestAnimationFrame(this.tick);
  }

  private updatePlayerMovement(dt: number) {
    if (this.stats.isInHidingSpot) {
      this.stats.noiseLevel = calculateDecayedNoise(this.stats.noiseLevel, dt);
      return;
    }

    const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    const moveZ = (this.keys['KeyS'] ? 1 : 0) - (this.keys['KeyW'] ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    this.stats.isSprinting = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];

    let speed = 3.2;
    let baseNoise = NOISE_CONSTANTS.WALK;

    if (this.stats.isCrouching) {
      speed = 1.6;
      baseNoise = NOISE_CONSTANTS.CROUCH_WALK;
    } else if (this.stats.isSprinting) {
      speed = 5.2;
      baseNoise = NOISE_CONSTANTS.SPRINT;
    }

    if (isMoving) {
      // Sound masking near laundry dryer
      const generatedNoise = applySoundMasking(
        baseNoise,
        this.playerPos,
        this.worldData.soundMaskingMachinePos
      );

      this.stats.noiseLevel = Math.min(100, this.stats.noiseLevel + generatedNoise * dt * 4);
      sound.playFootstep(this.stats.isCrouching, this.stats.isSprinting);

      // Camera bob
      this.cameraBobPhase += dt * (this.stats.isSprinting ? 14 : 9);

      // Movement vector relative to camera facing
      const angle = this.playerRotY;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      const dx = (moveX * cos + moveZ * sin) * speed * dt;
      const dz = (-moveX * sin + moveZ * cos) * speed * dt;

      // Desired position
      const targetX = this.playerPos[0] + dx;
      const targetZ = this.playerPos[2] + dz;

      // Collision checks with push-back
      const playerRadius = 0.35;
      let collidesX = false;
      let collidesZ = false;

      const playerBoxX = new THREE.Box3(
        new THREE.Vector3(targetX - playerRadius, 0.1, this.playerPos[2] - playerRadius),
        new THREE.Vector3(targetX + playerRadius, 1.8, this.playerPos[2] + playerRadius)
      );

      const playerBoxZ = new THREE.Box3(
        new THREE.Vector3(this.playerPos[0] - playerRadius, 0.1, targetZ - playerRadius),
        new THREE.Vector3(this.playerPos[0] + playerRadius, 1.8, targetZ + playerRadius)
      );

      for (const col of this.worldData.colliders) {
        if (col.intersectsBox(playerBoxX)) collidesX = true;
        if (col.intersectsBox(playerBoxZ)) collidesZ = true;
      }

      if (!collidesX) this.playerPos[0] = targetX;
      if (!collidesZ) this.playerPos[2] = targetZ;
    } else {
      this.cameraBobPhase = 0;
      this.stats.noiseLevel = calculateDecayedNoise(this.stats.noiseLevel, dt);
    }

    // Camera height & pitch
    const eyeHeight = this.stats.isCrouching ? 0.95 : 1.7;
    const bob = isMoving ? Math.sin(this.cameraBobPhase) * (this.stats.isSprinting ? 0.05 : 0.025) : 0;

    this.camera.position.set(this.playerPos[0], eyeHeight + bob, this.playerPos[2]);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerRotY;
    this.camera.rotation.x = this.cameraPitch;

    // Check closest interactable prompt
    const closest = this.findClosestInteractable();
    this.activeInteractPrompt = closest ? closest.prompt : null;
  }

  private updateGuards(dt: number) {
    this.worldData.guards.forEach((guard) => {
      const mesh = this.worldData.guardMeshes.get(guard.id);
      if (!mesh) return;

      if (guard.state === 'knocked_out') return;

      // Calculate heard noise
      const heardNoise = calculateHeardNoise(
        this.stats.noiseLevel,
        guard.position,
        this.playerPos,
        false,
        guard.hearingMultiplier
      );

      // Vision check
      const canSee = isPlayerInGuardVision(
        guard.position,
        guard.rotationY,
        guard.visionAngle,
        guard.visionRange,
        this.playerPos,
        this.stats.isCrouching,
        this.stats.isInHidingSpot
      );

      // Update state
      const update = updateGuardSuspicionAndState(
        guard,
        heardNoise,
        canSee,
        this.playerPos,
        dt
      );

      guard.state = update.nextState;
      guard.suspicion = update.nextSuspicion;
      guard.stateTimer = update.nextStateTimer;

      if (update.caughtPlayer) {
        this.triggerGameOver(`Spotted and neutralized by ${guard.name}!`);
        return;
      }

      // Movement along patrol route or chase
      if (guard.state === 'patrol') {
        const targetWp = guard.patrolRoute[guard.currentWaypoint];
        const gdx = targetWp[0] - guard.position[0];
        const gdz = targetWp[2] - guard.position[2];
        const distToWp = Math.hypot(gdx, gdz);

        if (distToWp < 0.4) {
          guard.currentWaypoint = (guard.currentWaypoint + 1) % guard.patrolRoute.length;
        } else {
          guard.rotationY = Math.atan2(gdx, gdz);
          const moveDist = 1.8 * dt;
          guard.position[0] += Math.sin(guard.rotationY) * moveDist;
          guard.position[2] += Math.cos(guard.rotationY) * moveDist;
        }
      } else if (guard.state === 'chase') {
        const pdx = this.playerPos[0] - guard.position[0];
        const pdz = this.playerPos[2] - guard.position[2];
        guard.rotationY = Math.atan2(pdx, pdz);
        const chaseSpeed = 4.2 * dt;
        guard.position[0] += Math.sin(guard.rotationY) * chaseSpeed;
        guard.position[2] += Math.cos(guard.rotationY) * chaseSpeed;
      }

      // Sync mesh
      mesh.position.set(...guard.position);
      mesh.rotation.y = guard.rotationY;

      // Realistic Human Walking & Patrol Animation
      const isMoving = guard.state === 'patrol' || guard.state === 'chase';
      const strideSpeed = guard.state === 'chase' ? 12.0 : 6.0;
      mesh.userData.walkPhase = (mesh.userData.walkPhase || 0) + (isMoving ? dt * strideSpeed : dt * 1.5);
      const phase = mesh.userData.walkPhase;

      if (mesh.userData.leftLeg && mesh.userData.rightLeg) {
        if (isMoving) {
          // Human leg alternating stride with knee flexion
          mesh.userData.leftLeg.rotation.x = Math.sin(phase) * 0.44;
          mesh.userData.rightLeg.rotation.x = -Math.sin(phase) * 0.44;

          // Natural human vertical pelvic bobbing
          mesh.position.y = guard.position[1] + Math.abs(Math.sin(phase)) * 0.035;

          // Natural human counter-arm swing
          if (mesh.userData.leftArm) {
            mesh.userData.leftArm.rotation.x = -Math.sin(phase) * 0.38;
          }
          if (mesh.userData.rightArm) {
            mesh.userData.rightArm.rotation.x = 0.12 + Math.sin(phase * 0.5) * 0.04;
          }
        } else {
          mesh.userData.leftLeg.rotation.x = 0;
          mesh.userData.rightLeg.rotation.x = 0;
          mesh.position.y = guard.position[1];
        }
      }

      // Natural human head scanning while patrolling
      if (mesh.userData.head) {
        const headScan = guard.state === 'chase' ? 0 : Math.sin(phase * 0.35) * 0.28;
        mesh.userData.head.rotation.y = headScan;
      }

      // Radio shout when guard initiates chase
      if (guard.state === 'chase' && !guard.userData.hasAlertedRadio) {
        this.triggerSubtitle('Officer Dunne (Radio)', 'CENTRAL! Inmate broke containment in Sector IV! Shoot on sight!', 'radio', 4.5);
        guard.userData.hasAlertedRadio = true;
      }
    });
  }

  private updateEnvironment(dt: number) {
    // Update active narrative subtitle countdown
    if (this.stats.subtitle) {
      this.stats.subtitle.timeRemaining -= dt;
      if (this.stats.subtitle.timeRemaining <= 0) {
        this.stats.subtitle = null;
      }
    }

    if (this.stats.act === 3) {
      this.stats.tideTimeRemaining = Math.max(0, this.stats.tideTimeRemaining - dt);
      this.worldData.waterMesh.position.y = -0.4 + (240 - this.stats.tideTimeRemaining) * 0.003;

      if (this.stats.tideTimeRemaining <= 0) {
        this.triggerGameOver('High tide flooded the smuggler tunnel before you could reach the skiff!');
      }
    }

    const time = performance.now() * 0.001;
    this.worldData.searchlight.target.position.x = 18.0 + Math.sin(time * 0.8) * 6;
  }

  private emitChange() {
    this.onStateChange?.();
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}
