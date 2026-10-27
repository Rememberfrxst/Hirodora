/**
 * Core 3D Game Engine for Hirodora: The Obsidian Penitentiary
 * First-person controller, realistic stealth perception, tactical guard AI, and mini-game hooks.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  ActiveMiniGame,
  EndingType,
  GameCheckpoint,
  GameState,
  GuardData,
  InventoryItem,
  ItemId,
  PlayerStats,
} from "./types";
import {
  applySoundMasking,
  calculateDecayedNoise,
  canCraftSilencer,
  craftSilencer,
  determineEnding,
  NOISE_CONSTANTS,
} from "./rules";
import { buildPrisonWorld, PrisonWorldData } from "./world";
import { sound } from "./audio";
import { decideGuard } from "./guard-ai";
import {
  sightEvidence,
  strongestNoise,
  segmentBlocked,
  type NoiseEvent,
} from "./perception";
import { PracticalLightPool } from "./lighting";
import { pathObstructed } from "./navigation";
import { angleDelta } from "./guard-motion";
import { PrisonerActor } from "./prisoner";
import { OpeningCinematic } from "./cinematic";
import { INTRO_DURATION } from "./intro";
import { loadSettings, type GameSettings } from "./settings";
import { movementVector, stepJump } from "./navigation";
import {
  bodyBlocked,
  supportHeight,
  evidenceTarget,
  findSurfacePath,
  migratePosition,
  LAYOUT_VERSION,
} from "./atrium";
import { WarriorActor } from "./warrior";
import { FirstPersonView } from "./viewmodel";
import {
  CELL_ROOMS,
  isExplorationCell,
  cellApproachTarget,
} from "./cell-block";
import { GuardAssetPool, GuardActor, type GuardQuality } from "./guard-actor";
import {
  nextAdaptiveScale,
  recommendGraphicsPreset,
  renderScaleBounds,
  type RenderScaleBounds,
} from "./performance";
import {
  advanceHold,
  openingObjective,
  openingStart,
  wrongKeyNotice,
  type HoldAction,
  type OpeningProgress,
} from "./opening";

export const ALL_ITEMS: Record<ItemId, InventoryItem> = {
  cell_key: {
    id: "cell_key",
    name: "Cell key",
    description: "A key taken from behind the busy guard. Try it on your door.",
    icon: "Key",
    category: "key",
  },
  screwdriver: {
    id: "screwdriver",
    name: "Screwdriver",
    description:
      "A driver hidden beneath the table. Fits the toilet mounting bolts.",
    icon: "Wrench",
    category: "tool",
  },
  small_key: {
    id: "small_key",
    name: "Small Brass Key",
    description:
      'A tiny key slipped through the meal slot. Marked: "Locker 46".',
    icon: "Key",
    category: "key",
  },
  note_from_unknown: {
    id: "note_from_unknown",
    name: "Smuggled Note",
    description:
      '"Cell 46. Bolts. Quietly. Low tide lasts 11 minutes. - A Friend"',
    icon: "FileText",
    category: "document",
  },
  spoon: {
    id: "spoon",
    name: "Reinforced Spoon",
    description: "Ground down edge, perfect for quietly turning hex bolts.",
    icon: "Utensils",
    category: "tool",
  },
  master_key_c: {
    id: "master_key_c",
    name: "Block-C Master Key",
    description:
      "Heavy iron key stamped with the Hirodora seal. Opens corridor security gates.",
    icon: "KeyRound",
    category: "key",
  },
  lockpick: {
    id: "lockpick",
    name: "Smuggler Lockpick Set",
    description:
      "Spring-steel pick and tension wrench. Required for picking high-security locks.",
    icon: "Wrench",
    category: "tool",
  },
  pipe: {
    id: "pipe",
    name: "Threaded Pipe",
    description: "Hollow steel conduit from the workshop bench.",
    icon: "Cylinder",
    category: "crafting",
  },
  steel_wool: {
    id: "steel_wool",
    name: "Steel Wool",
    description: "Dense metallic acoustic baffling fibers.",
    icon: "Layers",
    category: "crafting",
  },
  rubber_washer: {
    id: "rubber_washer",
    name: "Rubber O-Ring",
    description: "High-pressure seal washer to prevent gas leakage.",
    icon: "Circle",
    category: "crafting",
  },
  silencer: {
    id: "silencer",
    name: "Improvised Silencer",
    description:
      "Muffles the warden's dart pistol shot from a thunderous 100 noise down to a whisper 20.",
    icon: "ShieldAlert",
    category: "weapon",
  },
  stethoscope: {
    id: "stethoscope",
    name: "Acoustic Stethoscope",
    description: "Amplifies micro-clicks of vault dial tumblers.",
    icon: "Activity",
    category: "tool",
  },
  dart_pistol: {
    id: "dart_pistol",
    name: "Pneumatic Dart Pistol",
    description:
      "Non-lethal sedative pistol from Warden Voss's personal safe. 3 darts remaining.",
    icon: "Crosshair",
    category: "weapon",
  },
  warden_ledger: {
    id: "warden_ledger",
    name: "Smuggling Ledger",
    description:
      "Incriminating documentation proving Warden Voss's island smuggling cartel.",
    icon: "BookOpen",
    category: "document",
  },
  heavy_crowbar: {
    id: "heavy_crowbar",
    name: "Iron Pry Bar",
    description: "Heavy leverage bar used to pry obstacles.",
    icon: "Hammer",
    category: "tool",
  },
};

export type GraphicsPreset = "low" | "medium" | "high" | "ultra";

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private environmentTarget?: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  public worldData: PrisonWorldData;
  private frameId = 0;
  private events = new AbortController();
  private keys: Record<string, boolean> = {};
  private lastTime = performance.now();
  private hudTime = 0;
  private elapsed = 0;
  private ambienceTime = 0;
  private footTime = 0;
  public jumpHeight = 0;
  private jumpVelocity = 0;
  public touchSprint = false;
  private practicalLights?: PracticalLightPool;
  private noiseEvents: NoiseEvent[] = [];
  private noiseClock = 0;
  private noiseId = 0;
  private lastNoiseEmit = new Map<string, number>();
  private pathGoals = new Map<string, [number, number]>();
  private frameAverage = 24;
  private renderScale = 1;
  private renderBounds: RenderScaleBounds = { initial: 1, min: 0.7, max: 1 };
  private adaptiveScaleTime = 0;
  private drawCalls = 0;
  private triangles = 0;
  private scratchFrom = new THREE.Vector3();
  private scratchTo = new THREE.Vector3();
  private scratchHit = new THREE.Vector3();
  private visibilityRay = new THREE.Ray();
  private collisionSignature = -1;
  private collisionCache: THREE.Box3[] = [];
  private lastRender = 0;
  private displayedFrameMs = 33;
  private softwareRenderer = false;
  private resizeObserver?: ResizeObserver;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private lights: THREE.PointLight[] = [];
  private hintTime = -30;
  private touchMove: [number, number] = [0, 0];
  private drag: { id: number; x: number; y: number } | null = null;
  private pathTime = 0;
  private paths = new Map<string, [number, number, number][]>();
  private saveKey = "hirodora-checkpoint-v3";
  public openingProgress: OpeningProgress = { bed: 0, bolts: 0, toilet: 0 };
  public activeHold: HoldAction | null = null;
  private hardPush = false;
  public contextualAction: string | null = null;
  private transit: {
    from: number;
    to: number;
    elapsed: number;
    returning: boolean;
  } | null = null;
  private checkpoint: GameCheckpoint | null = null;
  private noticeUntil = 0;
  public onStateChange?: () => void;
  public gameState: GameState = "title";
  public guardsReady = false;
  public guardLoadError = "";
  public guardQuality: GuardQuality = "auto";
  public graphicsPreset: GraphicsPreset = "high";
  public guardActors = new Map<string, GuardActor>();
  private guardAssets = new GuardAssetPool();
  private bodyActor?: PrisonerActor;
  private warriorActor?: WarriorActor;
  public firstPerson = new FirstPersonView();
  public cinematic?: OpeningCinematic;
  public introCaption = "";
  private introPaused = false;
  private userRenderScale = 1;
  private disposed = false;
  private guardKey = new THREE.SpotLight(0xe5d5ba, 32, 10, 0.7, 0.75, 2);
  public endingType: EndingType | null = null;
  public gameOverReason = "";
  public playerPos: [number, number, number] = [-6, 0, -6];
  public playerRotY = 0;
  public cameraPitch = 0;
  public inventory: ItemId[] = [];
  public equippedItem: ItemId | null = null;
  public activeMiniGame: ActiveMiniGame = null;
  public activeInteractPrompt: string | null = null;
  public activeObjective = openingStart;
  public munshiHint: string | null = null;
  public gameFlags: Record<string, boolean> = { opening_v3: true };
  public overlayOpen = false;
  public mobile = matchMedia("(pointer: coarse)").matches;
  public orientationBlocked = false;
  public sensitivity = 0.0022;
  public reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  public stats: PlayerStats = this.freshStats();

  private freshStats(): PlayerStats {
    return {
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
      tideTimeRemaining: 240,
      act: 1,
      subtitle: null,
    };
  }

  constructor(private mountEl: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.mobile,
      powerPreference: "high-performance",
    });
    const gl = this.renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    this.softwareRenderer = /SwiftShader|llvmpipe|softpipe|Software/i.test(
      String(
        gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      ),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    const { clientWidth: w, clientHeight: h } = mountEl;
    this.renderer.setSize(w || innerWidth, h || innerHeight);
    this.camera = new THREE.PerspectiveCamera(
      68,
      (w || innerWidth) / (h || innerHeight),
      0.08,
      90,
    );
    mountEl.appendChild(this.renderer.domElement);
    this.worldData = buildPrisonWorld(this.scene);
    sound.occlusion = (position) => {
      const origin: [number, number, number] = [
        this.playerPos[0],
        this.playerPos[1] + (this.stats.isCrouching ? 0.95 : 1.55),
        this.playerPos[2],
      ];
      const target: [number, number, number] = [
        position[0],
        position[1] + 0.25,
        position[2],
      ];
      const opaque = this.gameFlags.passage_open
        ? this.worldData.visionColliders
        : [
            ...this.worldData.visionColliders,
            this.worldData.opening.passageBounds,
          ];
      const inside = (p: number[], b: THREE.Box3) =>
        p[0] >= b.min.x &&
        p[0] <= b.max.x &&
        p[1] >= b.min.y &&
        p[1] <= b.max.y &&
        p[2] >= b.min.z &&
        p[2] <= b.max.z;
      return opaque.filter(
        (b) =>
          !inside(target, b) &&
          !inside(origin, b) &&
          segmentBlocked(origin, target, b),
      ).length;
    };
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.12;
    room.dispose();
    pmrem.dispose();
    this.guardKey.position.set(-6, 3.08, 0);
    this.guardKey.target.position.set(-6, 0, 0);
    this.guardKey.shadow.mapSize.set(1024, 1024);
    this.guardKey.shadow.camera.near = 0.2;
    this.guardKey.shadow.camera.far = 10;
    this.guardKey.shadow.normalBias = 0.012;
    this.scene.add(this.guardKey, this.guardKey.target);
    this.setGuardQuality("auto");
    const device = navigator as Navigator & {
      deviceMemory?: number;
    };
    this.setGraphicsPreset(
      recommendGraphicsPreset({
        mobile: this.mobile,
        softwareRenderer: this.softwareRenderer,
        deviceMemory: device.deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      }),
    );
    this.scene.traverse((object) => {
      if (object instanceof THREE.PointLight) this.lights.push(object);
    });
    this.practicalLights = new PracticalLightPool(
      this.scene,
      this.lights,
      new THREE.Vector3(-6, 1.65, -6),
    );
    this.loadCheckpoint();
    this.applySettings(loadSettings());
    this.setupInputs();
    this.updateViewport();
    this.frameId = requestAnimationFrame(this.tick);
    void this.loadGuardAssets();
  }

  public async loadGuardAssets() {
    if (this.guardsReady || this.disposed) return;
    this.guardLoadError = "";
    this.emitChange();
    try {
      await this.worldData.loadEnvironment();
      await this.firstPerson.load(
        this.worldData.pickupMeshes.get("screwdriver_pickup")!,
        this.worldData.pickupMeshes.get("cell_key_pickup")!,
        this.worldData.pickupMeshes,
      );
      if (!this.warriorActor) {
        this.warriorActor = new WarriorActor(this.worldData.cell46NPC);
        await this.warriorActor.load();
      }
      await this.guardAssets.preload(
        Math.min(8, this.renderer.capabilities.getMaxAnisotropy()),
      );
      if (this.disposed || this.guardsReady) return;
      for (const guard of this.worldData.guards) {
        if (this.guardActors.has(guard.id)) continue;
        const actor = this.guardAssets.create(
          this.worldData.guardMeshes.get(guard.id)!,
          guard.type === "night_captain",
        );
        this.guardActors.set(guard.id, actor);
        actor.update(guard, 0, 0, this.camera, this.guardQuality, this.mobile);
      }
      this.bodyActor = new PrisonerActor(this.worldData.opening.body);
      await this.bodyActor.load();
      if (this.disposed) {
        this.bodyActor.dispose();
        return;
      }
      this.cinematic = new OpeningCinematic(
        this.worldData,
        this.camera,
        this.guardActors,
        this.bodyActor,
        this.reducedMotion,
      );
      this.guardsReady = true;
      this.syncWorld();
    } catch (error) {
      if (!this.disposed) {
        console.error("Officer asset preload failed", error);
        this.guardLoadError =
          "Game assets could not load. Check your connection or reload the complete offline edition.";
      }
    }
    if (!this.disposed) this.emitChange();
  }

  public setGuardQuality(quality: GuardQuality) {
    this.guardQuality = quality;
    this.setGraphicsPreset(this.graphicsPreset);
  }

  public setGraphicsPreset(preset: GraphicsPreset) {
    this.graphicsPreset = preset;
    const settings: Record<GraphicsPreset, [boolean, number]> = {
      low: [false, 0.98],
      medium: [false, 1.04],
      high: [true, 1.1],
      ultra: [true, 1.16],
    };
    const [shadows, exposure] = settings[preset];
    this.renderBounds = renderScaleBounds(
      preset,
      devicePixelRatio,
      this.softwareRenderer,
    );
    this.renderScale = this.renderBounds.initial;
    this.adaptiveScaleTime = 0;
    this.renderer.setPixelRatio(this.renderScale * this.userRenderScale);
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.guardKey.castShadow = shadows;
    this.worldData.windowLight.castShadow = shadows;
    const shadowSize = preset === "ultra" ? 2048 : 1024;
    if (this.guardKey.shadow.mapSize.x !== shadowSize) {
      this.guardKey.shadow.map?.dispose();
      this.guardKey.shadow.map = null;
    }
    this.guardKey.shadow.mapSize.set(
      preset === "ultra" ? 2048 : 1024,
      preset === "ultra" ? 2048 : 1024,
    );
    this.renderer.toneMappingExposure = exposure;
    if (this.guardsReady) this.renderFrame(0);
    this.emitChange();
  }

  public applySettings(settings: GameSettings) {
    this.userRenderScale = settings.screenScale;
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();
    this.sensitivity = settings.sensitivity / 10000;
    this.reducedMotion = settings.reducedMotion;
    if (this.cinematic) this.cinematic.reducedMotion = settings.reducedMotion;
    sound.setBusVolume("music", settings.music);
    sound.setEffectsVolume(settings.sfx);
    this.renderer.setPixelRatio(this.renderScale * this.userRenderScale);
    this.renderFrame(0);
    this.emitChange();
  }

  public getPerformanceStatus() {
    const target = this.mobile || this.softwareRenderer ? 33 : 16.7;
    const estimatedFps = Math.round(1000 / Math.max(1, this.displayedFrameMs));
    const status =
      this.frameAverage > target * 0.82
        ? "Optimizing"
        : this.frameAverage > target * 0.62
          ? "Balanced"
          : "Smooth";
    return {
      status,
      estimatedFps,
      renderScale: Math.round(this.renderScale * this.userRenderScale * 100),
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      softwareRenderer: this.softwareRenderer,
    };
  }

  private setupInputs() {
    const signal = this.events.signal;
    window.addEventListener(
      "hirodora:native-pause",
      () => {
        this.pauseGame();
        sound.suspend();
      },
      { signal },
    );
    window.addEventListener(
      "keydown",
      (e) => {
        if (this.orientationBlocked) return;
        const target = e.target as HTMLElement | null;
        if (target?.matches("input, textarea, select")) return;
        if (target?.closest("button") && ["Space", "Enter"].includes(e.code))
          return;
        if (["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code))
          e.preventDefault();
        if (e.repeat) return;
        this.keys[e.code] = true;
        if (e.code === "Escape" || e.code === "KeyP" || e.code === "Tab") {
          if (this.activeMiniGame) this.cancelMiniGame();
          else if (!this.overlayOpen)
            this.gameState === "playing" || this.gameState === "intro"
              ? this.pauseGame()
              : this.gameState === "paused"
                ? this.resumeGame()
                : undefined;
        }
        if (
          this.gameState !== "playing" ||
          this.overlayOpen ||
          this.activeMiniGame
        )
          return;
        if (e.code === "KeyE") this.beginInteract();
        if (e.code === "KeyR" && this.contextualAction === "bed_push")
          this.beginInteract(true);
        if (e.code === "KeyC") this.toggleCrouch();
        if (e.code === "Space") this.jump();
        if (e.code === "KeyH") this.triggerMunshiHint();
        if (e.code === "KeyU") {
          sound.toggleMute();
          this.emitChange();
        }
      },
      { signal },
    );
    window.addEventListener(
      "keyup",
      (e) => {
        this.keys[e.code] = false;
        if (e.code === "KeyE" || e.code === "KeyR") this.endInteract();
      },
      { signal },
    );
    window.addEventListener(
      "blur",
      () => {
        this.clearInput();
        if (this.gameState === "playing" || this.gameState === "intro")
          this.pauseGame();
      },
      { signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden &&
          (this.gameState === "playing" || this.gameState === "intro")
        )
          this.pauseGame();
      },
      { signal },
    );
    document.addEventListener(
      "pointerlockchange",
      () => {
        if (
          !document.pointerLockElement &&
          this.gameState === "playing" &&
          !this.activeMiniGame &&
          !this.overlayOpen &&
          !this.mobile
        )
          this.pauseGame();
      },
      { signal },
    );
    const canvas = this.renderer.domElement;
    canvas.addEventListener(
      "click",
      () => {
        if (
          this.gameState !== "playing" ||
          this.activeMiniGame ||
          this.overlayOpen ||
          this.mobile
        )
          return;
        sound.init();
        sound.resume();
        if (document.pointerLockElement !== canvas)
          canvas.requestPointerLock?.()?.catch(() => {});
        else if (this.equippedItem === "dart_pistol") this.fireDart();
      },
      { signal },
    );
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (
          this.gameState !== "playing" ||
          this.activeMiniGame ||
          this.overlayOpen ||
          document.pointerLockElement
        )
          return;
        this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (
          !this.drag ||
          this.drag.id !== e.pointerId ||
          this.overlayOpen ||
          this.gameState !== "playing"
        )
          return;
        this.look(
          (e.clientX - this.drag.x) * 1.8,
          (e.clientY - this.drag.y) * 1.8,
        );
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      },
      { signal },
    );
    for (const type of ["pointerup", "pointercancel"] as const)
      canvas.addEventListener(
        type,
        () => {
          this.drag = null;
        },
        { signal },
      );
    window.addEventListener(
      "mousemove",
      (e) => {
        if (
          document.pointerLockElement === canvas &&
          this.gameState === "playing" &&
          !this.overlayOpen &&
          !this.activeMiniGame
        )
          this.look(e.movementX, e.movementY);
      },
      { signal },
    );
    window.addEventListener("resize", this.updateViewport, { signal });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.updateViewport);
      this.resizeObserver.observe(this.mountEl);
    }
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        this.pauseGame();
        this.notice(
          "Graphics context lost. Reload to restore the renderer; your last checkpoint is saved.",
        );
      },
      { signal },
    );
  }

  private updateViewport = () => {
    if (this.disposed) return;
    const w = mountElWidth(this.mountEl),
      h = this.mountEl.clientHeight || innerHeight;
    if (w !== this.viewportWidth || h !== this.viewportHeight) {
      this.viewportWidth = w;
      this.viewportHeight = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.guardsReady) this.renderFrame(0);
    }
    const blocked = this.mobile && h > w;
    if (blocked !== this.orientationBlocked) {
      this.orientationBlocked = blocked;
      this.clearInput();
      if (
        blocked &&
        (this.gameState === "playing" || this.gameState === "intro")
      )
        this.pauseGame();
      this.emitChange();
    }
  };

  private look(dx: number, dy: number) {
    this.playerRotY -= dx * this.sensitivity;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - dy * this.sensitivity,
      -1.35,
      1.35,
    );
  }
  public clearInput() {
    sound.stopObjectActions();
    this.activeHold = null;
    this.hardPush = false;
    this.keys = {};
    this.touchMove = [0, 0];
    this.drag = null;
    this.touchSprint = false;
  }
  public setTouchMove(x: number, z: number) {
    if (this.orientationBlocked || this.gameState !== "playing") return;
    this.touchMove = [x, z];
  }
  public toggleSprint() {
    if (this.gameState !== "playing" || this.activeMiniGame || this.overlayOpen)
      return;
    this.touchSprint = !this.touchSprint;
    if (this.touchSprint) this.stats.isCrouching = false;
    this.emitChange();
  }
  public jump() {
    if (
      this.gameState !== "playing" ||
      this.activeMiniGame ||
      this.overlayOpen ||
      this.stats.isInHidingSpot ||
      this.jumpHeight > 0 ||
      !!this.activeHold ||
      !!this.transit
    )
      return;
    this.stats.isCrouching = false;
    this.jumpVelocity = 4.3;
    sound.playObject("cloth", 0, 0.4);
    this.emitChange();
  }
  public startGame() {
    if (!this.guardsReady || this.orientationBlocked) return;
    sound.init();
    sound.resetSceneAudio();
    sound.resume();
    if (this.checkpoint) this.restoreCheckpoint(this.checkpoint);
    this.syncWorld();
    if (this.gameFlags.intro_pending && this.cinematic) {
      this.gameState = "intro";
      this.introPaused = false;
      this.clearInput();
      this.cinematic.start();
      this.introCaption = "Cell 47 · 02:14 AM";
      this.emitChange();
      return;
    }
    this.gameState = "playing";
    this.clearInput();
    document.body.dataset.state = "playing";
    this.triggerSubtitle(
      "KABIR RAO · PRISONER 047",
      this.gameFlags.opening_v3
        ? "A prisoner down outside my door. The officer is busy checking him. That key behind him… this might be my chance."
        : "Voss framed me. Iyer needs the ledger. A sharpened spoon beneath the table… that’s where I start.",
      "monologue",
      7,
    );
  }
  public finishIntro() {
    if (this.gameState !== "intro" && !this.introPaused) return;
    this.cinematic?.hide();
    this.introPaused = false;
    this.gameState = "playing";
    this.restoreCheckpoint({
      id: "start",
      name: "Cell 47",
      playerPosition: [-6, 0, -5],
      playerRotationY: Math.PI,
      act: 1,
      inventory: [],
      flags: { opening_v3: true, intro_done: true },
    });
    this.gameState = "playing";
    document.body.dataset.state = "playing";
    sound.resetSceneAudio();
    sound.resume();
    this.saveCheckpoint();
    this.move(0);
    this.triggerSubtitle(
      "KABIR RAO · PRISONER 047",
      "He's checking the body. That key behind him… this might be my chance.",
      "monologue",
      5,
    );
    this.emitChange();
  }
  public updateIntro(dt: number) {
    if (this.gameState !== "intro" || !this.cinematic) return;
    const frame = this.cinematic.seek(this.cinematic.time + dt, true, dt);
    this.introCaption = frame.caption;
    if (frame.t >= INTRO_DURATION) this.finishIntro();
  }
  public pauseGame() {
    if (this.gameState === "intro") {
      this.introPaused = true;
      this.gameState = "paused";
      this.clearInput();
      sound.suspend();
      this.emitChange();
      return;
    }
    if (this.gameState !== "playing") return;
    if (this.gameFlags.opening_v3) this.saveCheckpoint();
    this.gameState = "paused";
    this.overlayOpen = false;
    this.clearInput();
    sound.suspend();
    document.exitPointerLock?.();
    this.emitChange();
  }
  public resumeGame() {
    if (this.orientationBlocked) return;
    this.gameState = this.introPaused ? "intro" : "playing";
    this.introPaused = false;
    this.clearInput();
    sound.resume();
    this.emitChange();
  }
  public returnToTitle() {
    this.cinematic?.hide();
    this.introPaused = false;
    this.gameState = "title";
    this.activeMiniGame = null;
    this.overlayOpen = false;
    this.clearInput();
    sound.suspend();
    document.exitPointerLock?.();
    this.emitChange();
  }
  public restartGame() {
    this.cinematic?.hide();
    this.introPaused = false;
    sound.resetSceneAudio();
    if (this.checkpoint) this.restoreCheckpoint(this.checkpoint);
    else
      this.restoreCheckpoint({
        id: "start",
        name: "Cell 47",
        playerPosition: [-6, 0, -6],
        playerRotationY: 0,
        act: 1,
        inventory: [],
        flags: { opening_v3: true },
      });
    if (this.gameFlags.intro_pending) this.startGame();
    else this.resumeGame();
  }
  public newGame() {
    this.cinematic?.hide();
    this.introPaused = false;
    this.checkpoint = null;
    try {
      localStorage.removeItem(this.saveKey);
    } catch {}
    this.stats = this.freshStats();
    this.restoreCheckpoint({
      id: "start",
      name: "Cell 47",
      playerPosition: [-6, 0, -6],
      playerRotationY: 0,
      act: 1,
      inventory: [],
      flags: { opening_v3: true, intro_pending: true },
    });
    this.saveCheckpoint();
    this.startGame();
  }
  public get hasSave() {
    return !!this.checkpoint;
  }
  public toggleCrouch() {
    if (
      this.gameState !== "playing" ||
      this.activeMiniGame ||
      this.stats.isInHidingSpot
    )
      return;
    this.stats.isCrouching = !this.stats.isCrouching;
    this.touchSprint = false;
    sound.playObject("cloth");
    this.emitChange();
  }
  public triggerSubtitle(
    speaker: string,
    text: string,
    tag: "monologue" | "radio" | "dialogue" | "lore" = "monologue",
    duration = 5,
  ) {
    this.stats.subtitle = { speaker, text, tag, timeRemaining: duration };
    this.emitChange();
  }
  private notice(message: string) {
    this.munshiHint = message;
    this.noticeUntil = this.elapsed + 6;
    this.emitChange();
  }
  public triggerMunshiHint() {
    if (this.elapsed - this.hintTime < 20) {
      this.notice(
        "Munshi needs a moment. Another hint will be available in 20 seconds.",
      );
      return;
    }
    this.hintTime = this.elapsed;
    this.stats.hintsUsed++;
    if (this.gameFlags.opening_v3) {
      this.notice(
        "Munshi: " + openingObjective(this.gameFlags, this.inventory),
      );
      return;
    }
    sound.playObject("radio");
    this.notice(
      !this.gameFlags.vent_unbolted
        ? "Munshi: Check beneath the table. Use the spoon on the vent beside the toilet."
        : !this.gameFlags.boulder_pacified
          ? "Munshi: Earn Boulder’s trust at the table. Then open his locker with your brass key."
          : !this.gameFlags.master_door_unlocked
            ? "Munshi: The locker opens Cell 46. Cross the corridor to the Block C gate."
            : !this.inventory.includes("stethoscope")
              ? "Munshi: The infirmary entrance is on the south side, west of the laundry. Take the stethoscope from its cabinet."
              : !this.gameFlags.safe_cracked
                ? "Munshi: Find the lockpick in the laundry. Craft a suppressor in maintenance. The vault is in Voss’s office, north of the corridor."
                : "Munshi: Pick the tidal gate. Boulder is trapped on your right; Iyer waits beyond.",
    );
  }

  private blockers() {
    let signature =
      (this.gameFlags.locker_open ? 1 : 0) |
      (this.gameFlags.master_door_unlocked ? 2 : 0) |
      (this.gameFlags.sea_gate_open ? 4 : 0) |
      (this.gameFlags.passage_open ? 8 : 0);
    CELL_ROOMS.filter(
      (c) => isExplorationCell(c.number) || c.number === 46,
    ).forEach((cell, i) => {
      if (this.gameFlags[`cell_${cell.number}_open`]) signature += 2 ** (i + 4);
    });
    if (signature === this.collisionSignature) return this.collisionCache;
    const blocks = [...this.worldData.colliders];
    if (!this.gameFlags.passage_open)
      blocks.push(this.worldData.opening.passageBounds);
    for (const [id, bounds] of this.worldData.doorColliders) {
      const cellNumber = Number(id.match(/^cell_(\d+)_door$/)?.[1]);
      const hinged =
        isExplorationCell(cellNumber) ||
        (cellNumber === 46 && !!this.gameFlags.opening_v3);
      if (!this.doorIsOpen(id) || hinged) blocks.push(bounds);
    }
    this.collisionSignature = signature;
    this.collisionCache = blocks;
    return blocks;
  }
  private doorIsOpen(id: string) {
    if (
      (id === "cell_48_door" || id === "cell_49_door") &&
      !this.gameFlags.opening_v3
    )
      return this.gameFlags[id.replace(/_door$/, "_open")] !== false;
    return id === "cell_46_door"
      ? !!(this.gameFlags.locker_open || this.gameFlags.cell_46_open)
      : id === "master_c_door"
        ? !!this.gameFlags.master_door_unlocked
        : id === "sea_gate_door"
          ? !!this.gameFlags.sea_gate_open
          : !!this.gameFlags[id.replace(/_door$/, "_open")];
  }
  private obstructed(
    a: [number, number, number],
    b: [number, number, number],
    reachKey = false,
    ignoreDoor?: string,
  ) {
    const origin = this.scratchFrom.set(a[0], a[1] + 1.45, a[2]),
      target = this.scratchTo.set(b[0], b[1] + 1.45, b[2]);
    const distance = origin.distanceTo(target),
      ray = this.visibilityRay.set(origin, target.sub(origin).normalize());
    return [
      ...this.blockers(),
      ...this.worldData.visionColliders.filter((b) => b.max.y <= 0),
    ].some((box) => {
      if (ignoreDoor && box === this.worldData.doorColliders.get(ignoreDoor))
        return false;
      // Only the reachable key may be picked through this specific barred face.
      // The full face remains authoritative for player/guard movement and capture.
      if (
        reachKey &&
        a[0] > -8.5 &&
        a[0] < -3.3 &&
        a[2] < -2 &&
        box.min.z >= -2.15 &&
        box.max.z <= -1.85
      )
        return false;
      const hit = ray.intersectBox(box, this.scratchHit);
      return hit !== null && hit.distanceTo(origin) < distance - 0.25;
    });
  }
  private findClosestInteractable() {
    if (this.stats.isInHidingSpot) return null;
    let closest: (typeof this.worldData.interactables)[number] | null = null,
      best = Infinity;
    for (const obj of this.worldData.interactables) {
      if (obj.disabled) continue;
      if (obj.id === "cell_key_pickup" && !this.worldData.guards[0].examining)
        continue;
      if (
        (obj.id === "passage47" && this.playerPos[0] < -8.8) ||
        (obj.id === "passage46" && this.playerPos[0] > -8.8)
      )
        continue;
      if (obj.id === "boulder_rescue_tunnel" && this.stats.act !== 3) continue;
      const dx = obj.position[0] - this.playerPos[0],
        dz = obj.position[2] - this.playerPos[2],
        distance = Math.hypot(dx, dz, obj.position[1] - 1 - this.playerPos[1]);
      const focused =
        this.gameFlags.opening_v3 &&
        [
          "cell_key_pickup",
          "cell47_lock",
          "bed_push",
          "screwdriver_pickup",
          "toilet_bolts",
          "toilet_move",
          "passage47",
          "passage46",
        ].includes(obj.id);
      const facing =
        this.activeHold === obj.id ||
        distance < 0.65 ||
        (-Math.sin(this.playerRotY) * dx - Math.cos(this.playerRotY) * dz) /
          distance >
          (focused ? 0.88 : 0.15);
      if (
        distance < obj.radius &&
        distance < best &&
        facing &&
        !this.obstructed(
          this.playerPos,
          [obj.position[0], obj.position[1] - 1, obj.position[2]],
          obj.id === "cell_key_pickup",
          obj.id.startsWith("cell_latch_")
            ? `cell_${obj.id.slice(11)}_door`
            : undefined,
        )
      ) {
        closest = obj;
        best = distance;
      }
    }
    return closest;
  }
  public equipItem(item: ItemId | null) {
    if (
      item &&
      (!this.inventory.includes(item) ||
        ALL_ITEMS[item].category === "document")
    )
      return;
    this.equippedItem = item;
    this.saveCheckpoint();
    this.emitChange();
  }
  public renderFrame(dt = 0.016) {
    const item =
      this.activeHold === "toilet_bolts" ? "screwdriver" : this.equippedItem;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.quaternion,
    );
    const origin = this.camera.position;
    const ray = new THREE.Ray(origin, direction);
    const hit = new THREE.Vector3();
    const near = this.blockers().some(
      (b) => ray.intersectBox(b, hit) !== null && hit.distanceTo(origin) < 0.7,
    );
    this.firstPerson.update(
      item,
      this.elapsed,
      dt,
      this.stats.isSprinting ||
        this.touchMove.some((v) => Math.abs(v) > 0.1) ||
        !!(
          this.keys.KeyW ||
          this.keys.KeyA ||
          this.keys.KeyS ||
          this.keys.KeyD
        ),
      this.reducedMotion,
      near,
      this.gameState === "playing" || this.gameState === "paused",
    );
    this.renderer.render(this.scene, this.camera);
    const calls = this.renderer.info.render.calls,
      triangles = this.renderer.info.render.triangles;
    this.firstPerson.render(this.renderer, this.camera.aspect);
    this.drawCalls =
      calls +
      (this.firstPerson.root.visible ? this.renderer.info.render.calls : 0);
    this.triangles =
      triangles +
      (this.firstPerson.root.visible ? this.renderer.info.render.triangles : 0);
  }
  public interact() {
    if (this.gameState !== "playing" || this.activeMiniGame || this.overlayOpen)
      return;
    if (this.stats.isInHidingSpot) {
      this.stats.isInHidingSpot = false;
      this.stats.hidingSpotName = null;
      sound.playObject("cloth");
      this.emitChange();
      return;
    }
    const obj = this.findClosestInteractable();
    if (!obj) return;
    if (this.gameFlags.opening_v3 && this.interactOpening(obj.id)) return;
    if (
      obj.actionRequiredItem &&
      !this.inventory.includes(obj.actionRequiredItem)
    ) {
      sound.playLockClick(false, obj.position);
      this.notice("Required: " + ALL_ITEMS[obj.actionRequiredItem].name);
      return;
    }
    const latch = obj.id.match(/^cell_latch_(\d+)$/);
    if (latch) {
      const number = Number(latch[1]),
        cell = CELL_ROOMS.find((c) => c.number === number)!;
      const key = `cell_${number}_open`,
        closing = this.doorIsOpen(`cell_${number}_door`);
      if (
        closing &&
        Math.abs(this.playerPos[1] - cell.floorY) < 0.8 &&
        this.playerPos[0] > cell.doorX - 0.35 &&
        this.playerPos[0] < cell.doorX + 2.75 &&
        Math.abs(this.playerPos[2] - cell.front) < 0.6
      ) {
        this.notice("Step clear of the doorway before closing the gate.");
        return;
      }
      this.gameFlags[key] = !closing;
      sound.playDoorOpen(obj.position, closing, obj.id);
      this.emitNoise(closing ? 16 : 12, "door", obj.position);
      this.syncWorld();
      this.saveCheckpoint();
      this.emitChange();
      return;
    }
    const pickup: Record<string, ItemId> = {
      spoon_pickup: "spoon",
      lockpick_pickup: "lockpick",
      pipe_pickup: "pipe",
      steel_wool_pickup: "steel_wool",
      rubber_washer_pickup: "rubber_washer",
      stethoscope_pickup: "stethoscope",
    };
    if (pickup[obj.id]) {
      const item = pickup[obj.id];
      if (!this.inventory.includes(item)) this.inventory.push(item);
      if (!this.equippedItem && ALL_ITEMS[item].category !== "document")
        this.equippedItem = item;
      obj.disabled = true;
      sound.playObject(
        item === "steel_wool" || item === "rubber_washer" ? "cloth" : "metal",
        0,
        1,
        obj.position,
      );
      this.notice(ALL_ITEMS[item].name + " added to your satchel.");
      if (item === "spoon")
        this.activeObjective =
          "Use the spoon on the service duct beside the toilet.";
    } else if (obj.id === "cell_46_locker") {
      if (!this.gameFlags.boulder_pacified) {
        this.notice("Boulder blocks the locker. Earn his trust first.");
        return;
      }
      this.inventory.push("master_key_c");
      this.gameFlags.locker_open = true;
      obj.disabled = true;
      this.activeObjective =
        "Leave Cell 46. Unlock the Block C gate to the east.";
      sound.playDoorOpen(obj.position, false, obj.id);
      this.emitNoise(26, "door");
    } else if (obj.id === "vent_bolts_interact")
      this.startMiniGame({ type: "vent_bolts", progress: 0, noiseSpike: 0 });
    else if (obj.id === "boulder_npc")
      this.startMiniGame({
        type: "arm_wrestling",
        playerProgress: 50,
        opponentPower: 12,
        surgeTelegraph: false,
      });
    else if (obj.id === "warden_safe_interact")
      this.startMiniGame({
        type: "safe_crack",
        currentDial: 0,
        targetCombination: [24, 68, 42],
        solvedDials: [false, false, false],
      });
    else if (obj.id === "sea_gate_interact") {
      if (!this.gameFlags.safe_cracked) {
        this.notice("Recover Voss’s ledger before leaving the prison.");
        return;
      }
      this.startMiniGame({
        type: "lockpick",
        doorId: "sea_gate_door",
        pinIndex: 0,
        totalPins: 3,
        sweetSpot: 35,
        currentAngle: 0,
        tension: 0,
      });
    } else if (obj.id === "crafting_bench") {
      if (!canCraftSilencer(this.inventory)) {
        this.notice(
          "Collect pipe, steel wool and a rubber washer from the rear workbench.",
        );
        return;
      }
      this.inventory = craftSilencer(this.inventory);
      this.gameFlags.silencer_crafted = true;
      obj.disabled = true;
      this.activeObjective =
        "Use the stethoscope on the vault in Voss’s office.";
      sound.playObject("metal");
    } else if (obj.id === "master_c_door_interact") {
      this.gameFlags.master_door_unlocked = true;
      this.stats.act = 2;
      obj.disabled = true;
      this.activeObjective =
        "Search the infirmary, laundry and maintenance rooms. Recover the ledger from Voss’s office.";
      sound.playDoorOpen(obj.position, false, obj.id);
    } else if (obj.actionType === "hide") {
      this.stats.isInHidingSpot = true;
      this.stats.hidingSpotName = obj.name;
      sound.playObject("cloth");
    } else if (obj.id === "kabir_wall_diary")
      this.triggerSubtitle(
        "KABIR’S INSCRIPTION",
        "Day 412. Voss framed me. Iyer knows the truth. The ledger is in the warden’s wall safe.",
        "lore",
      );
    else if (obj.id === "boulder_rescue_tunnel") {
      this.stats.boulderRescued = true;
      this.gameFlags.boulder_rescued = true;
      obj.disabled = true;
      this.triggerSubtitle(
        "BOULDER",
        "You came back for me. Come on, brother. The boat’s waiting.",
        "dialogue",
      );
      sound.playObject("wood");
    } else if (obj.id === "sea_tunnel_exit") {
      if (!this.gameFlags.sea_gate_open) return;
      this.triggerVictory();
    }
    this.syncWorld();
    if (
      this.gameState === "playing" &&
      !this.activeMiniGame &&
      !this.stats.isInHidingSpot
    )
      this.saveCheckpoint();
    this.emitChange();
  }

  public getItem(id: ItemId): InventoryItem {
    return id === "cell_key" && this.gameFlags.key_identified
      ? {
          ...ALL_ITEMS[id],
          name: "Cell 42 key",
          description:
            "The wrong key for Cell 47. Keep it: Cell 42 lies further along the block.",
        }
      : ALL_ITEMS[id];
  }
  public beginInteract(hard = false) {
    if (
      this.gameState !== "playing" ||
      this.overlayOpen ||
      this.activeMiniGame ||
      this.transit
    )
      return;
    const obj = this.findClosestInteractable();
    if (
      this.gameFlags.opening_v3 &&
      obj &&
      ["bed_push", "toilet_bolts", "toilet_move"].includes(obj.id)
    ) {
      if (
        obj.actionRequiredItem &&
        !this.inventory.includes(obj.actionRequiredItem)
      ) {
        this.notice("Required: " + this.getItem(obj.actionRequiredItem).name);
        return;
      }
      this.activeHold = obj.id as HoldAction;
      this.hardPush = hard;
      sound.objectAction({
        id: obj.id,
        kind:
          obj.id === "bed_push"
            ? "bed"
            : obj.id === "toilet_move"
              ? "toilet"
              : "bolts",
        phase: "start",
        position: this.holdAudioPosition(obj.id),
        intensity: hard ? 1 : 0.32,
      });
      this.emitChange();
    } else this.interact();
  }
  public endInteract() {
    if (!this.activeHold) return;
    sound.stopObjectActions();
    this.activeHold = null;
    this.hardPush = false;
    this.saveCheckpoint();
    this.emitChange();
  }
  private interactOpening(id: string) {
    if (id === "cell_key_pickup") {
      this.inventory.push("cell_key");
      this.equippedItem ??= "cell_key";
      sound.cue(
        "keys",
        this.worldData.interactables.find((o) => o.id === id)!.position,
      );
      this.notice("Cell key added to your satchel. Try your door.");
    } else if (id === "cell47_lock") {
      if (!this.inventory.includes("cell_key")) {
        this.notice("Find a key first.");
        return true;
      }
      this.gameFlags.key_identified = true;
      sound.playLockClick(
        false,
        this.worldData.interactables.find((o) => o.id === id)!.position,
      );
      this.notice(wrongKeyNotice);
      this.triggerSubtitle("KABIR", wrongKeyNotice, "monologue", 6);
    } else if (id === "screwdriver_pickup") {
      this.inventory.push("screwdriver");
      this.equippedItem ??= "screwdriver";
      sound.playObject(
        "metal",
        0,
        0.45,
        this.worldData.interactables.find((o) => o.id === id)!.position,
      );
      this.notice(
        "Screwdriver collected. The toilet is bolted to the shared wall.",
      );
    } else if (id === "passage47" || id === "passage46") {
      const returning = id === "passage46";
      this.clearInput();
      this.transit = {
        from: this.playerPos[0],
        to: returning ? -7.4 : -10.1,
        elapsed: 0,
        returning,
      };
      this.stats.isCrouching = true;
      sound.playObject("cloth");
    } else if (["bed_push", "toilet_bolts", "toilet_move"].includes(id)) {
      this.beginInteract();
      return true;
    } else return false;
    this.activeObjective = openingObjective(this.gameFlags, this.inventory);
    this.syncWorld();
    this.saveCheckpoint();
    this.emitChange();
    return true;
  }
  public continueChapter() {
    this.gameState = "playing";
    sound.resume();
    this.clearInput();
    this.syncWorld();
    this.emitChange();
  }
  private updateOpening(dt: number) {
    if (!this.gameFlags.opening_v3) return;
    if (this.transit) {
      const t = this.transit;
      t.elapsed += dt;
      const f = Math.min(1, t.elapsed / 1.4),
        smooth = f * f * (3 - 2 * f);
      this.playerPos = [THREE.MathUtils.lerp(t.from, t.to, smooth), 0, -9.7];
      this.playerRotY = t.returning ? -Math.PI / 2 : Math.PI / 2;
      if (f === 1) {
        this.transit = null;
        if (!t.returning && !this.gameFlags.cell46_reached) {
          this.gameFlags.cell46_reached = true;
          this.gameState = "chapter_complete";
          this.activeObjective = openingObjective(
            this.gameFlags,
            this.inventory,
          );
          this.saveCheckpoint();
          sound.suspend();
          document.exitPointerLock?.();
          this.emitChange();
        }
      }
      return;
    }
    const action = this.activeHold;
    if (!action) return;
    if (this.findClosestInteractable()?.id !== action) {
      this.endInteract();
      return;
    }
    const field =
      action === "bed_push"
        ? "bed"
        : action === "toilet_bolts"
          ? "bolts"
          : "toilet";
    this.openingProgress[field] = advanceHold(
      this.openingProgress[field],
      dt,
      action === "bed_push"
        ? this.hardPush
          ? 2.5
          : 9
        : action === "toilet_bolts"
          ? 7
          : 4,
    );
    this.stats.noiseLevel = Math.max(
      this.stats.noiseLevel,
      this.hardPush ? 85 : action === "toilet_move" ? 13 : 5,
    );
    this.emitNoise(
      this.hardPush ? 85 : action === "toilet_move" ? 13 : 5,
      action,
      this.worldData.interactables.find((o) => o.id === action)?.position ??
        this.playerPos,
    );
    sound.objectAction({
      id: action,
      kind:
        action === "bed_push"
          ? "bed"
          : action === "toilet_move"
            ? "toilet"
            : "bolts",
      phase: "update",
      position: this.holdAudioPosition(action),
      intensity: this.hardPush ? 1 : 0.32,
    });
    if (this.openingProgress[field] >= 1) {
      sound.objectAction({
        id: action,
        kind:
          action === "bed_push"
            ? "bed"
            : action === "toilet_move"
              ? "toilet"
              : "bolts",
        phase: "finish",
        position: this.holdAudioPosition(action),
        intensity: 0.3,
      });
      this.gameFlags[
        action === "bed_push"
          ? "bed_moved"
          : action === "toilet_bolts"
            ? "toilet_unbolted"
            : "passage_open"
      ] = true;
      this.activeHold = null;
      this.hardPush = false;
      this.activeObjective = openingObjective(this.gameFlags, this.inventory);
      this.notice(
        action === "bed_push"
          ? "Something was hidden beneath the table."
          : action === "toilet_bolts"
            ? "All four mounting bolts are loose. Move the toilet aside."
            : "A passage to Cell 46. Crouch and go through.",
      );
      this.saveCheckpoint();
    }
    this.syncWorld();
  }

  public startMiniGame(game: ActiveMiniGame) {
    this.activeMiniGame = game;
    this.clearInput();
    document.exitPointerLock?.();
    this.emitChange();
  }
  private holdAudioPosition(id: string): [number, number, number] {
    const root =
      id === "bed_push"
        ? this.worldData.opening.bed
        : this.worldData.opening.toilet;
    return [root.position.x, 0.15, root.position.z];
  }
  public get puzzleAudioPosition(): [number, number, number] {
    const g = this.activeMiniGame;
    const id =
      g?.type === "vent_bolts"
        ? "vent_bolts_interact"
        : g?.type === "safe_crack"
          ? "warden_safe_interact"
          : g?.type === "lockpick"
            ? "sea_gate_interact"
            : "boulder_npc";
    return [
      ...(this.worldData.interactables.find((o) => o.id === id)?.position ??
        this.playerPos),
    ];
  }
  public cancelMiniGame() {
    this.activeMiniGame = null;
    this.clearInput();
    this.emitChange();
  }
  public completeMiniGame(success: boolean) {
    const game = this.activeMiniGame;
    if (!game) return;
    const audioPosition = this.puzzleAudioPosition;
    this.activeMiniGame = null;
    if (!success) {
      this.notice("Try again. Watch for the rhythm and keep your noise low.");
      this.emitChange();
      return;
    }
    if (game.type === "vent_bolts") {
      this.gameFlags.vent_unbolted = true;
      this.playerPos = [-11.4, 0, -4.1];
      this.playerRotY = 0;
      this.activeObjective = "Earn Boulder’s trust at the arm-wrestling table.";
      sound.playVentPop(audioPosition);
    }
    if (game.type === "arm_wrestling") {
      this.gameFlags.boulder_pacified = true;
      this.activeObjective = "Open Locker 46 with your small brass key.";
      this.triggerSubtitle(
        "BOULDER",
        "All right, Kabir. The locker’s yours. Don’t leave me behind.",
        "dialogue",
      );
    }
    if (game.type === "safe_crack") {
      this.gameFlags.safe_cracked = true;
      this.inventory.push("warden_ledger", "dart_pistol");
      this.equippedItem = "dart_pistol";
      this.stats.act = 3;
      this.activeObjective =
        "Pick the sea gate. Reach Iyer before the tide rises.";
      this.triggerSubtitle(
        "IYER · RADIO",
        "I slipped you the key. Bring the ledger to the skiff. Four minutes, Kabir.",
        "radio",
      );
      sound.playObject("radio");
    }
    if (game.type === "lockpick") {
      this.gameFlags.sea_gate_open = true;
      this.activeObjective =
        "Rescue Boulder on the right, or head straight to Iyer’s skiff.";
      sound.playDoorOpen(audioPosition, false, "sea_gate_door");
    }
    this.syncWorld();
    this.saveCheckpoint();
    this.emitChange();
  }

  private syncWorld() {
    const opening = !!this.gameFlags.opening_v3;
    // Keep Cell 46 available for exploration, including previously closed saves.
    if (opening) this.gameFlags.cell_46_open = true;
    const p = this.openingProgress,
      o = this.worldData.opening;
    o.bed.position.z = -8.4 + p.bed * 1.4;
    o.toilet.position.set(
      opening ? -8.05 + p.toilet * 0.9 : -7.65,
      -0.05,
      opening ? -9.7 + p.toilet * 1.7 : -9.85,
    );
    // Park the wider scanned fixture diagonally away from the washstand, not
    // through it. The collider follows both the translation and the rotation.
    o.toilet.rotation.y = opening ? -Math.PI / 2 + p.toilet * Math.PI : Math.PI;
    o.bedBounds.min.z = -9.48215 + p.bed * 1.4;
    o.bedBounds.max.z = -7.31785 + p.bed * 1.4;
    const yaw = o.toilet.rotation.y,
      halfX =
        Math.abs(Math.cos(yaw)) * 0.27944 + Math.abs(Math.sin(yaw)) * 0.43588,
      halfZ =
        Math.abs(Math.sin(yaw)) * 0.27944 + Math.abs(Math.cos(yaw)) * 0.43588;
    o.toiletBounds.min.set(
      o.toilet.position.x - halfX,
      -0.05,
      o.toilet.position.z - halfZ,
    );
    o.toiletBounds.max.set(
      o.toilet.position.x + halfX,
      0.93,
      o.toilet.position.z + halfZ,
    );
    o.passageSeal.visible = !this.gameFlags.passage_open;
    o.legacyVent.visible = !opening && !this.gameFlags.vent_unbolted;
    (o.toilet.userData.bolts as THREE.Mesh[]).forEach((bolt, index) => {
      bolt.visible = opening && index >= Math.floor(p.bolts * 4);
    });
    o.body.visible = opening;
    if (this.gameState !== "intro") {
      o.body.position.set(-6.4, 0, -0.1);
      o.body.rotation.set(0, -Math.PI / 2, 0);
      this.bodyActor?.pose("Death", 1.8);
    }
    this.collisionSignature = -1;
    const disabled: Record<string, boolean> = {
      vent_bolts_interact: !!this.gameFlags.vent_unbolted,
      boulder_npc: !!this.gameFlags.boulder_pacified,
      cell_46_locker: !!this.gameFlags.locker_open,
      master_c_door_interact: !!this.gameFlags.master_door_unlocked,
      warden_safe_interact: !!this.gameFlags.safe_cracked,
      sea_gate_interact: !!this.gameFlags.sea_gate_open,
      crafting_bench: !!this.gameFlags.silencer_crafted,
      boulder_rescue_tunnel: !!this.gameFlags.boulder_rescued,
    };
    const pickups: Record<string, ItemId> = {
      cell_key_pickup: "cell_key",
      screwdriver_pickup: "screwdriver",
      spoon_pickup: "spoon",
      lockpick_pickup: "lockpick",
      pipe_pickup: "pipe",
      steel_wool_pickup: "steel_wool",
      rubber_washer_pickup: "rubber_washer",
      stethoscope_pickup: "stethoscope",
    };
    for (const obj of this.worldData.interactables)
      obj.disabled =
        disabled[obj.id] ??
        (pickups[obj.id]
          ? this.inventory.includes(pickups[obj.id]) ||
            (!!this.gameFlags.silencer_crafted &&
              ["pipe", "steel_wool", "rubber_washer"].includes(pickups[obj.id]))
          : false);
    for (const obj of this.worldData.interactables) {
      const latch = obj.id.match(/^cell_latch_(\d+)$/);
      if (latch) {
        const number = Number(latch[1]);
        obj.disabled = number === 46;
        obj.prompt = `${this.doorIsOpen(`cell_${number}_door`) ? "Close" : "Open"} Cell ${number} gate`;
      }
      if (
        [
          "cell_key_pickup",
          "cell47_lock",
          "bed_push",
          "screwdriver_pickup",
          "toilet_bolts",
          "toilet_move",
          "passage47",
          "passage46",
        ].includes(obj.id)
      ) {
        obj.disabled ||= !opening;
        if (obj.id === "bed_push") {
          obj.disabled ||=
            !this.gameFlags.key_identified || !!this.gameFlags.bed_moved;
          obj.position[2] = -8.1 + p.bed * 1.4;
        }
        if (obj.id === "screwdriver_pickup")
          obj.disabled ||= !this.gameFlags.bed_moved;
        if (obj.id === "toilet_bolts")
          obj.disabled ||=
            !this.inventory.includes("screwdriver") ||
            !!this.gameFlags.toilet_unbolted;
        if (obj.id === "toilet_move")
          obj.disabled ||=
            !this.gameFlags.toilet_unbolted || !!this.gameFlags.passage_open;
        if (obj.id === "passage47" || obj.id === "passage46")
          obj.disabled ||= !this.gameFlags.passage_open;
      }
      if (
        opening &&
        [
          "spoon_pickup",
          "vent_bolts_interact",
          "boulder_npc",
          "cell_46_locker",
        ].includes(obj.id)
      )
        obj.disabled = true;
    }
    for (const [id, group] of this.worldData.doors) {
      const open = this.doorIsOpen(id),
        number = Number(id.match(/^cell_(\d+)_door$/)?.[1]);
      if (isExplorationCell(number) || (number === 46 && opening)) {
        const cell = CELL_ROOMS.find((c) => c.number === number)!;
        group.position.y = cell.floorY;
        group.rotation.y = open
          ? cell.side === "north"
            ? Math.PI / 2
            : -Math.PI / 2
          : 0;
        this.worldData.doorColliders
          .get(id)!
          .setFromObject(group)
          .expandByScalar(0.03);
      } else {
        group.position.y = (group.userData.floorY ?? 0) + (open ? 5.3 : 0);
        if (id === "cell_46_door") {
          group.rotation.y = 0;
          this.worldData.doorColliders
            .get(id)!
            .copy(group.userData.closedBounds);
        }
      }
      if (id === "cell_47_door" && this.gameState !== "intro")
        group.rotation.y = 0;
    }
    for (const [id, mesh] of this.worldData.pickupMeshes) {
      mesh.visible = !this.worldData.interactables.find((obj) => obj.id === id)
        ?.disabled;
    }
    const boulder = this.worldData.rescuedBoulder;
    boulder.visible = this.stats.act === 3;
    boulder.position.set(
      ...((this.gameFlags.boulder_rescued
        ? [26.8, 0.1, 1.4]
        : [20.5, 0.22, 1.6]) as [number, number, number]),
    );
    boulder.rotation.z = this.gameFlags.boulder_rescued ? 0 : Math.PI / 2;
  }
  private saveCheckpoint() {
    this.checkpoint = {
      id: "checkpoint",
      layoutVersion: LAYOUT_VERSION,
      equippedItem: this.equippedItem,
      openingProgress: { ...this.openingProgress },
      name: this.activeObjective,
      playerPosition: [...this.playerPos],
      playerRotationY: this.playerRotY,
      act: this.stats.act,
      inventory: [...this.inventory],
      flags: { ...this.gameFlags },
      stats: {
        ...this.stats,
        subtitle: null,
        isInHidingSpot: false,
        hidingSpotName: null,
      },
    };
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.checkpoint));
    } catch {
      /* Private browsing may disallow persistence. */
    }
  }
  private loadCheckpoint() {
    try {
      const cp = JSON.parse(
        localStorage.getItem(this.saveKey) ||
          localStorage.getItem("hirodora-checkpoint-v2") ||
          "null",
      );
      if (
        cp &&
        Array.isArray(cp.playerPosition) &&
        cp.playerPosition.length === 3 &&
        cp.playerPosition.every(Number.isFinite) &&
        Array.isArray(cp.inventory) &&
        cp.inventory.every((id: string) => id in ALL_ITEMS) &&
        [1, 2, 3].includes(cp.act) &&
        cp.flags &&
        typeof cp.playerRotationY === "number"
      )
        this.checkpoint = cp;
    } catch {}
  }
  public restoreCheckpoint(cp: GameCheckpoint) {
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
    this.noiseEvents = [];
    this.lastNoiseEmit.clear();
    this.pathGoals.clear();
    const caught = this.stats.timesCaught;
    this.stats = {
      ...this.freshStats(),
      ...cp.stats,
      timesCaught: Math.max(caught, cp.stats?.timesCaught ?? 0),
      noiseLevel: 0,
      isInHidingSpot: false,
      hidingSpotName: null,
    };
    this.stats.act = cp.act;
    this.playerPos = migratePosition(cp.playerPosition, cp.layoutVersion);
    this.playerRotY = cp.playerRotationY;
    this.cameraPitch = 0;
    this.inventory = [...cp.inventory];
    this.gameFlags = { ...cp.flags };
    const progress = cp.openingProgress;
    this.openingProgress = {
      bed: Math.max(
        0,
        Math.min(1, Number(progress?.bed) || (cp.flags.bed_moved ? 1 : 0)),
      ),
      bolts: Math.max(
        0,
        Math.min(
          1,
          Number(progress?.bolts) || (cp.flags.toilet_unbolted ? 1 : 0),
        ),
      ),
      toilet: Math.max(
        0,
        Math.min(
          1,
          Number(progress?.toilet) || (cp.flags.passage_open ? 1 : 0),
        ),
      ),
    };
    this.transit = null;
    this.activeObjective =
      cp.name === "Cell 47"
        ? this.gameFlags.opening_v3
          ? openingObjective(this.gameFlags, this.inventory)
          : "Find the sharpened spoon beneath your table."
        : cp.name;
    this.equippedItem =
      cp.equippedItem !== undefined
        ? cp.equippedItem && this.inventory.includes(cp.equippedItem)
          ? cp.equippedItem
          : null
        : this.inventory.includes("dart_pistol")
          ? "dart_pistol"
          : null;
    this.activeMiniGame = null;
    this.munshiHint = null;
    for (const g of this.worldData.guards) {
      g.lastKnownPosition = undefined;
      g.lastHeardPosition = undefined;
      g.investigationTarget = undefined;
      g.lookTarget = undefined;
      g.unseenTime = 0;
      g.scanTime = 0;
      g.scanOriginYaw = undefined;
      g.lastNoiseId = undefined;
      g.state = "patrol";
      g.suspicion = 0;
      g.currentWaypoint = 1;
      g.position = [...g.patrolRoute[0]];
      g.cinematicAim = false;
      g.examining = !!this.gameFlags.opening_v3 && g.id === "guard_dunne";
      if (g.examining) {
        g.position = [-5.7, 0, -0.7];
        g.rotationY = 0;
      }
      const mesh = this.worldData.guardMeshes.get(g.id)!;
      mesh.rotation.x = 0;
      mesh.position.set(...g.position);
      this.guardActors.get(g.id)?.reset();
    }
    this.paths.clear();
    this.syncWorld();
    this.clearInput();
    this.emitChange();
  }
  public fireDart() {
    if (
      this.gameState !== "playing" ||
      this.activeMiniGame ||
      this.overlayOpen ||
      this.equippedItem !== "dart_pistol"
    )
      return;
    if (this.stats.dartAmmo <= 0) {
      sound.playLockClick(false);
      this.notice("No darts remaining. Use cover and stay quiet.");
      return;
    }
    this.stats.dartAmmo--;
    const silenced = this.inventory.includes("silencer");
    sound.playDartShot(silenced);
    this.stats.noiseLevel = silenced ? 20 : 100;
    this.emitNoise(silenced ? 20 : 100, "dart");
    if (!silenced) this.stats.alarmsTriggered++;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(), this.camera);
    const hits = this.worldData.guards
      .filter(
        (g) =>
          g.state !== "knocked_out" &&
          !this.obstructed(this.playerPos, g.position),
      )
      .map((g) => ({
        g,
        hit: ray.intersectObject(
          this.guardActors.get(g.id)?.hitTarget ||
            this.worldData.guardMeshes.get(g.id)!,
          true,
        )[0],
      }))
      .filter((h) => h.hit && h.hit.distance < 18)
      .sort((a, b) => a.hit.distance - b.hit.distance);
    if (hits[0]) {
      const guard = hits[0].g;
      guard.state = "knocked_out";
      guard.stateTimer = 90;
      guard.suspicion = 0;
      // The visual rig plays a grounded collapse; AI cooldown/collision stay unchanged.
      sound.playObject("cloth");
    }
    this.emitChange();
  }
  public triggerVictory() {
    this.endingType = determineEnding(
      this.stats.alarmsTriggered,
      this.stats.boulderRescued,
    );
    this.gameState = "victory";
    sound.playVictoryFanfare();
    this.clearInput();
    document.exitPointerLock?.();
    try {
      localStorage.removeItem(this.saveKey);
    } catch {}
    this.checkpoint = null;
    this.emitChange();
  }
  public triggerGameOver(reason: string) {
    if (this.gameState !== "playing") return;
    this.gameOverReason = reason;
    this.stats.timesCaught++;
    this.gameState = "gameover";
    this.clearInput();
    sound.playDefeatSting();
    document.exitPointerLock?.();
    this.emitChange();
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if (this.orientationBlocked) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }
    if (this.gameState === "playing" && !this.overlayOpen) {
      this.elapsed += dt;
      if (!this.activeMiniGame) {
        this.updateOpening(dt);
        this.move(dt);
      } else
        this.stats.noiseLevel = calculateDecayedNoise(
          this.stats.noiseLevel,
          dt,
        );
      this.updateGuards(dt);
      this.updateEnvironment(dt);
      if (this.munshiHint && this.elapsed > this.noticeUntil)
        this.munshiHint = null;
    } else if (this.gameState === "intro" && !this.overlayOpen) {
      this.updateIntro(dt);
    } else if (this.gameState === "title") {
      this.camera.position.set(-6, 1.65, -6);
      this.camera.lookAt(-6, 1.4, -1);
      const body = this.worldData.opening.body;
      body.visible = true;
      body.position.set(-5.85, 0, -5.25);
      body.rotation.set(0, 3.6, 0);
      this.bodyActor?.pose("Idle", now / 1000);
      for (const guard of this.worldData.guards)
        this.guardActors
          .get(guard.id)
          ?.update(
            { ...guard, examining: false },
            0,
            dt,
            this.camera,
            this.guardQuality,
            this.mobile,
          );
    }
    const simulationActive = this.gameState === "playing" && !this.overlayOpen;
    if (
      (simulationActive ||
        this.gameState === "title" ||
        this.gameState === "intro") &&
      now - this.lastRender > (this.mobile || this.softwareRenderer ? 33 : 16)
    ) {
      const renderInterval = now - this.lastRender;
      if (this.lastRender && renderInterval < 1000)
        this.displayedFrameMs =
          this.displayedFrameMs * 0.9 + renderInterval * 0.1;
      this.lastRender = now;
      this.practicalLights?.update(this.camera.position, dt);
      this.adaptiveScaleTime -= dt;
      if (this.adaptiveScaleTime <= 0) {
        this.adaptiveScaleTime = 1.25;
        const targetFrame = this.mobile || this.softwareRenderer ? 33 : 16.7;
        const nextScale = nextAdaptiveScale(
          this.renderScale,
          this.renderBounds,
          this.frameAverage,
          targetFrame,
        );
        if (nextScale !== this.renderScale) {
          this.renderScale = nextScale;
          this.renderer.setPixelRatio(this.renderScale * this.userRenderScale);
        }
      }
      const renderStart = performance.now();
      this.renderFrame(dt);
      this.frameAverage =
        this.frameAverage * 0.95 + (performance.now() - renderStart) * 0.05;
    }
    if (
      (simulationActive || this.gameState === "intro") &&
      now - this.hudTime > 120
    ) {
      this.hudTime = now;
      this.emitChange();
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
  private move(dt: number) {
    this.warriorActor?.update(this.elapsed, this.reducedMotion);
    const [mx, mz] = [
      (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0) + this.touchMove[0],
      (this.keys.KeyS ? 1 : 0) - (this.keys.KeyW ? 1 : 0) + this.touchMove[1],
    ];
    let moving =
      Math.hypot(mx, mz) > 0.08 &&
      !this.stats.isInHidingSpot &&
      !this.activeHold &&
      !this.transit;
    this.stats.isSprinting =
      (!!this.keys.ShiftLeft || !!this.keys.ShiftRight || this.touchSprint) &&
      !this.stats.isCrouching &&
      !this.stats.isInHidingSpot;
    const hop = stepJump(this.jumpHeight, this.jumpVelocity, dt);
    this.jumpHeight = hop.height;
    this.jumpVelocity = hop.velocity;
    if (hop.landed) {
      this.stats.noiseLevel = Math.max(
        this.stats.noiseLevel,
        NOISE_CONSTANTS.JUMP_LANDING,
      );
      sound.playObject(this.playerPos[0] > 15 ? "water" : "boot", 0, 0.9);
      this.emitNoise(NOISE_CONSTANTS.JUMP_LANDING, "landing");
    }
    if (moving) {
      const beforeX = this.playerPos[0],
        beforeZ = this.playerPos[2];
      const speed = this.stats.isCrouching
        ? 1.6
        : this.stats.isSprinting
          ? 5
          : 3;
      const [dx, dz] = movementVector(mx, mz, this.playerRotY, speed * dt);
      const blocks = this.blockers();
      for (const [ax, az] of [
        [dx, 0],
        [0, dz],
      ]) {
        const x = this.playerPos[0] + ax,
          z = this.playerPos[2] + az;
        const y = supportHeight(x, z, this.playerPos[1]);
        if (y !== undefined && !bodyBlocked(x, y, z, blocks))
          this.playerPos = [x, y, z];
      }
      const travelled = Math.hypot(
        this.playerPos[0] - beforeX,
        this.playerPos[2] - beforeZ,
      );
      moving = travelled > 0.0001;
      const targetNoise = applySoundMasking(
        this.stats.isCrouching ? 3 : this.stats.isSprinting ? 30 : 12,
        this.playerPos,
        this.worldData.soundMaskingMachinePos,
      );
      this.stats.noiseLevel = Math.max(
        moving && this.jumpHeight === 0 ? targetNoise : 0,
        calculateDecayedNoise(this.stats.noiseLevel, dt),
      );
      if (this.jumpHeight === 0) this.footTime += travelled;
      if (
        this.footTime >=
        (this.stats.isCrouching ? 1.05 : this.stats.isSprinting ? 1.4 : 1.35)
      ) {
        this.footTime = 0;
        this.emitNoise(
          this.stats.isCrouching ? 3 : this.stats.isSprinting ? 30 : 12,
          "footstep",
        );
        sound.playFootstep(
          this.stats.isCrouching,
          this.stats.isSprinting,
          sound.surfaceAt(this.playerPos),
        );
      }
    } else
      this.stats.noiseLevel = calculateDecayedNoise(this.stats.noiseLevel, dt);
    this.stats.peakNoise = Math.max(
      this.stats.peakNoise,
      this.stats.noiseLevel,
    );
    const height =
      this.stats.isCrouching || this.stats.isInHidingSpot ? 1 : 1.68;
    const bob =
      moving && !this.reducedMotion
        ? Math.sin(this.elapsed * (this.stats.isSprinting ? 14 : 9)) * 0.022
        : 0;
    this.camera.position.set(
      this.playerPos[0],
      this.playerPos[1] + height + bob + this.jumpHeight,
      this.playerPos[2],
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.cameraPitch, this.playerRotY, 0, "YXZ");
    this.camera.updateMatrixWorld();
    const closest = this.findClosestInteractable();
    this.contextualAction = closest?.id ?? null;
    sound.updateListener(
      [this.playerPos[0], this.camera.position.y - 1.65, this.playerPos[2]],
      this.playerRotY,
    );
    this.activeInteractPrompt = this.stats.isInHidingSpot
      ? "Leave cover"
      : (closest?.prompt ?? null);
  }
  public emitNoise(
    loudness: number,
    kind = "impact",
    position: [number, number, number] = this.playerPos,
  ) {
    const level = applySoundMasking(
      loudness * (this.stats.isInHidingSpot ? 0.15 : 1),
      position,
      this.worldData.soundMaskingMachinePos,
    );
    this.stats.noiseLevel = Math.max(this.stats.noiseLevel, level);
    this.stats.peakNoise = Math.max(this.stats.peakNoise, level);
    if (this.noiseClock - (this.lastNoiseEmit.get(kind) ?? -100) < 0.3) return;
    this.lastNoiseEmit.set(kind, this.noiseClock);
    this.noiseEvents.push({
      id: ++this.noiseId,
      position: [...position],
      loudness: level,
      age: 0,
      kind,
    });
    if (this.noiseEvents.length > 48) this.noiseEvents.shift();
  }
  private updateGuards(dt: number) {
    this.noiseClock += dt;
    this.noiseEvents = this.noiseEvents.filter(
      (event) => (event.age += dt) < 1.6,
    );
    this.pathTime -= dt;
    const replan = this.pathTime <= 0;
    if (replan) this.pathTime = 0.65;
    const blocks = this.blockers();
    const opaque = this.gameFlags.passage_open
      ? this.worldData.visionColliders
      : [
          ...this.worldData.visionColliders,
          this.worldData.opening.passageBounds,
        ];
    for (const guard of this.worldData.guards) {
      const mesh = this.worldData.guardMeshes.get(guard.id)!;
      const examiner =
        !!this.gameFlags.opening_v3 && guard.id === "guard_dunne";
      const approach = (point: [number, number, number] | undefined) =>
        cellApproachTarget(
          point && evidenceTarget(point),
          guard.position,
          (number) => this.doorIsOpen(`cell_${number}_door`),
        );
      const oldTarget = approach(guard.investigationTarget);
      const vision = sightEvidence(
        guard,
        this.playerPos,
        this.stats.isCrouching,
        this.stats.isInHidingSpot,
        this.stats.isSprinting,
        opaque,
      );
      const heard = strongestNoise(guard, this.noiseEvents, opaque);
      const wall = this.obstructed(guard.position, this.playerPos);
      const prev = guard.state;
      const decision = decideGuard(
        guard,
        {
          vision,
          player: this.playerPos,
          noise: heard,
          captureClear:
            !wall &&
            !this.stats.isInHidingSpot &&
            Math.abs(guard.position[1] - this.playerPos[1]) < 0.65,
          atTarget:
            !!oldTarget &&
            Math.hypot(
              oldTarget[0] - guard.position[0],
              oldTarget[2] - guard.position[2],
              oldTarget[1] - guard.position[1],
            ) < 0.4,
          dutyPoint: examiner ? [-5.7, 0, -0.7] : undefined,
        },
        dt,
      );
      Object.assign(guard, decision.next);
      if (guard.state === "chase" && prev !== "chase") {
        this.stats.alarmsTriggered++;
        this.triggerSubtitle(
          guard.name.toUpperCase() + " · RADIO",
          sound.guardVoice("chase", guard.position),
          "radio",
        );
      } else if (
        prev === "patrol" &&
        (guard.state === "suspicious" || guard.state === "searching")
      ) {
        this.triggerSubtitle(
          guard.name.toUpperCase(),
          sound.guardVoice("investigate", guard.position),
          "dialogue",
          5,
        );
      }
      if (decision.caughtPlayer) {
        this.triggerGameOver(
          "Intercepted by " + guard.name + ". Your checkpoint is safe.",
        );
        break;
      }
      const target = approach(decision.target);
      const beforeX = guard.position[0],
        beforeZ = guard.position[2];
      let desiredYaw = decision.scanYaw;
      if (
        guard.state !== "knocked_out" &&
        target &&
        Math.hypot(
          target[0] - beforeX,
          target[2] - beforeZ,
          target[1] - guard.position[1],
        ) > 0.3
      ) {
        let destination: [number, number] = [target[0], target[2]];
        const localBlocks = blocks.filter(
          (b) =>
            b.max.y > guard.position[1] + 0.12 &&
            b.min.y < guard.position[1] + 1.7,
        );
        if (
          pathObstructed([beforeX, beforeZ], destination, localBlocks) ||
          Math.abs(guard.position[1] - target[1]) > 0.3 ||
          supportHeight(
            (beforeX + target[0]) / 2,
            (beforeZ + target[2]) / 2,
            guard.position[1],
          ) === undefined
        ) {
          const old = this.pathGoals.get(guard.id),
            changed =
              !old ||
              Math.hypot(old[0] - destination[0], old[1] - destination[1]) >
                0.7 ||
              prev !== guard.state;
          if (replan || changed) {
            this.pathGoals.set(guard.id, [...destination]);
            this.paths.set(
              guard.id,
              findSurfacePath(guard.position, target, blocks),
            );
          }
          const path = this.paths.get(guard.id) ?? [];
          while (
            path.length &&
            Math.hypot(
              path[0][0] - beforeX,
              path[0][2] - beforeZ,
              path[0][1] - guard.position[1],
            ) < 0.3
          )
            path.shift();
          if (path[0]) destination = [path[0][0], path[0][2]];
          else destination = [beforeX, beforeZ];
        } else {
          this.paths.delete(guard.id);
          this.pathGoals.delete(guard.id);
        }
        const dx = destination[0] - beforeX,
          dz = destination[1] - beforeZ,
          length = Math.hypot(dx, dz);
        if (length > 0.05) {
          desiredYaw = Math.atan2(dx, dz);
          const step = Math.min(length, decision.speed * dt),
            nx = beforeX + (dx / length) * step,
            nz = beforeZ + (dz / length) * step;
          for (const [ax, az] of [
            [nx - beforeX, 0],
            [0, nz - beforeZ],
          ]) {
            const x = guard.position[0] + ax,
              z = guard.position[2] + az;
            const y = supportHeight(x, z, guard.position[1]);
            if (y !== undefined && !bodyBlocked(x, y, z, blocks, 0.22))
              guard.position = [x, y, z];
          }
        }
      } else if (
        desiredYaw === undefined &&
        guard.lookTarget &&
        guard.state !== "patrol"
      ) {
        desiredYaw = Math.atan2(
          guard.lookTarget[0] - beforeX,
          guard.lookTarget[2] - beforeZ,
        );
      }
      if (desiredYaw !== undefined)
        guard.rotationY +=
          angleDelta(desiredYaw, guard.rotationY) * Math.min(1, dt * 6);
      const travelled = Math.hypot(
          guard.position[0] - beforeX,
          guard.position[2] - beforeZ,
        ),
        speed = dt > 0 ? travelled / dt : 0;
      guard.examining =
        examiner &&
        guard.state === "patrol" &&
        speed < 0.05 &&
        Math.hypot(guard.position[0] + 5.7, guard.position[2] + 0.7) < 0.4;
      if (guard.examining) guard.rotationY = 0;
      this.guardActors
        .get(guard.id)
        ?.update(guard, speed, dt, this.camera, this.guardQuality, this.mobile);
      mesh.userData.stride = (mesh.userData.stride ?? 0) + travelled;
      if (
        travelled > 0 &&
        mesh.userData.stride >= (guard.state === "chase" ? 1.2 : 0.67)
      ) {
        sound.guardFootstep(
          guard.position,
          guard.state === "chase",
          (sound.occlusion?.(guard.position) ?? 0) > 0,
        );
        mesh.userData.stride = 0;
      }
    }
  }
  private updateEnvironment(dt: number) {
    if (this.stats.subtitle && (this.stats.subtitle.timeRemaining -= dt) <= 0)
      this.stats.subtitle = null;
    if (this.stats.act === 3) {
      this.stats.tideTimeRemaining = Math.max(
        0,
        this.stats.tideTimeRemaining - dt,
      );
      this.worldData.waterMesh.position.y =
        -0.04 + (240 - this.stats.tideTimeRemaining) * 0.002;
      if (!this.stats.tideTimeRemaining)
        this.triggerGameOver(
          "The tide closed the tunnel. Retry from your last checkpoint.",
        );
    }
    this.ambienceTime -= dt;
    if (this.ambienceTime <= 0) {
      this.ambienceTime = 5 + Math.random() * 4;
      if (this.playerPos[0] > 15)
        sound.playObject("water", Math.sin(this.elapsed), 0.2);
    }
    sound.setAmbience(
      Math.hypot(this.playerPos[0] + 1, this.playerPos[2] - 9.7) < 7
        ? "laundry"
        : this.playerPos[0] > 15
          ? "tide"
          : "cell",
      Math.max(...this.worldData.guards.map((g) => g.suspicion)) / 100,
    );
    this.worldData.searchlight.target.position.x =
      21 + Math.sin(this.elapsed * 0.7) * 4;
  }
  public emitChange() {
    this.onStateChange?.();
  }
  public dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.events.abort();
    cancelAnimationFrame(this.frameId);
    this.clearInput();
    sound.dispose();
    this.guardActors.forEach((actor) => actor.dispose());
    this.bodyActor?.dispose();
    this.warriorActor?.dispose();
    this.firstPerson.dispose();
    this.cinematic?.dispose();
    this.guardActors.clear();
    this.guardAssets.dispose();
    this.guardKey.shadow.dispose();
    this.worldData.windowLight.shadow.dispose();
    this.practicalLights?.dispose();
    this.worldData.disposeEnvironment();
    this.environmentTarget?.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        for (const mat of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(mat);
          for (const value of Object.values(mat))
            if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
function mountElWidth(element: HTMLElement) {
  return element.clientWidth || innerWidth;
}
