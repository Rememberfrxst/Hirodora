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
  calculateHeardNoise,
  canCraftSilencer,
  craftSilencer,
  determineEnding,
  isPlayerInGuardVision,
  NOISE_CONSTANTS,
  updateGuardSuspicionAndState,
} from "./rules";
import { buildPrisonWorld, PrisonWorldData } from "./world";
import { sound } from "./audio";
import { findPath, isBlocked, movementVector, stepJump } from "./navigation";
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
      "A flat-head driver hidden beneath the bunk. Fits the toilet mounting bolts.",
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
  private lightBudgetTime = 0;
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
  private paths = new Map<string, [number, number][]>();
  private saveKey = "hirodora-checkpoint-v3";
  public openingProgress: OpeningProgress = { bed: 0, bolts: 0, toilet: 0 };
  public activeHold: HoldAction | null = null;
  private hardPush = false;
  private actionSoundTime = 0;
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
  private bodyActor?: GuardActor;
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
      const origin = new THREE.Vector3(
        this.playerPos[0],
        1.4,
        this.playerPos[2],
      );
      const target = new THREE.Vector3(position[0], 1.4, position[2]);
      const distance = origin.distanceTo(target),
        ray = new THREE.Ray(origin, target.sub(origin).normalize());
      return this.blockers().filter((box) => {
        const hit = ray.intersectBox(box, new THREE.Vector3());
        return hit && hit.distanceTo(origin) < distance - 0.25;
      }).length;
    };
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.12;
    room.dispose();
    pmrem.dispose();
    this.guardKey.position.set(-5, 3.1, 0);
    this.guardKey.target.position.set(-5, 0, 0);
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
    this.loadCheckpoint();
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
      await this.guardAssets.preload(
        Math.min(8, this.renderer.capabilities.getMaxAnisotropy()),
      );
      if (this.disposed || this.guardsReady) return;
      for (const guard of this.worldData.guards) {
        const actor = this.guardAssets.create(
          this.worldData.guardMeshes.get(guard.id)!,
          guard.type === "night_captain",
        );
        this.guardActors.set(guard.id, actor);
        actor.update(guard, 0, 0, this.camera, this.guardQuality, this.mobile);
      }
      this.bodyActor = this.guardAssets.create(
        this.worldData.opening.body,
        false,
      );
      const body = this.worldData.opening.body;
      body.rotation.y = Math.PI / 2;
      body.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const replace = (m: THREE.Material) => {
          if (
            /Tactical vest|Utility belt|Buckle|Pouches|Embroidered|Radio|Brushed steel/.test(
              m.name,
            )
          ) {
            const hidden = m.clone();
            hidden.visible = false;
            return hidden;
          }
          if (
            !/Outfit|vest|Pouches/.test(m.name) ||
            !(m instanceof THREE.MeshStandardMaterial)
          )
            return m;
          const copy = m.clone();
          copy.color.set(0xa66a36);
          copy.metalness = 0;
          copy.roughness = 0.95;
          return copy;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(replace)
          : replace(o.material);
      });
      const corpse = {
        ...this.worldData.guards[0],
        examining: false,
        position: [-6.4, 0, -0.1],
        state: "knocked_out",
        rotationY: Math.PI / 2,
      } as GuardData;
      const camera = this.camera.clone();
      camera.position.set(-6.4, 2, 3);
      camera.lookAt(-6.4, 0, 0);
      camera.updateMatrixWorld();
      this.bodyActor.update(corpse, 0, 3, camera, "mobile", true);
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
    this.renderer.setPixelRatio(this.renderScale);
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      renderScale: Math.round(this.renderScale * 100),
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
        if (e.code === "Escape" || e.code === "KeyP") {
          if (this.activeMiniGame) this.cancelMiniGame();
          else if (!this.overlayOpen)
            this.gameState === "playing"
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
        if (this.gameState === "playing") this.pauseGame();
      },
      { signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden && this.gameState === "playing") this.pauseGame();
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
    }
    const blocked = this.mobile && h > w;
    if (blocked !== this.orientationBlocked) {
      this.orientationBlocked = blocked;
      this.clearInput();
      if (blocked && this.gameState === "playing") this.pauseGame();
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
    this.gameState = "playing";
    this.clearInput();
    document.body.dataset.state = "playing";
    this.triggerSubtitle(
      "KABIR RAO · PRISONER 047",
      this.gameFlags.opening_v3
        ? "A prisoner down outside my door. The officer is busy checking him. That key behind him… this might be my chance."
        : "Voss framed me. Iyer needs the ledger. A sharpened spoon beneath the bunk… that’s where I start.",
      "monologue",
      7,
    );
  }
  public pauseGame() {
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
    this.gameState = "playing";
    this.clearInput();
    sound.resume();
    this.emitChange();
  }
  public returnToTitle() {
    this.gameState = "title";
    this.activeMiniGame = null;
    this.overlayOpen = false;
    this.clearInput();
    sound.suspend();
    document.exitPointerLock?.();
    this.emitChange();
  }
  public restartGame() {
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
    this.resumeGame();
  }
  public newGame() {
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
      flags: { opening_v3: true },
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
        ? "Munshi: Check beneath the bunk. Use the spoon on the vent beside the toilet."
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
    const signature =
      (this.gameFlags.locker_open ? 1 : 0) |
      (this.gameFlags.master_door_unlocked ? 2 : 0) |
      (this.gameFlags.sea_gate_open ? 4 : 0) |
      (this.gameFlags.passage_open ? 8 : 0);
    if (signature === this.collisionSignature) return this.collisionCache;
    const blocks = [...this.worldData.colliders];
    if (!this.gameFlags.passage_open)
      blocks.push(this.worldData.opening.passageBounds);
    for (const [id, bounds] of this.worldData.doorColliders) {
      const open =
        id === "cell_46_door"
          ? this.gameFlags.locker_open
          : id === "master_c_door"
            ? this.gameFlags.master_door_unlocked
            : id === "sea_gate_door"
              ? this.gameFlags.sea_gate_open
              : false;
      if (!open) blocks.push(bounds);
    }
    this.collisionSignature = signature;
    this.collisionCache = blocks;
    return blocks;
  }
  private obstructed(
    a: [number, number, number],
    b: [number, number, number],
    reachKey = false,
  ) {
    const origin = this.scratchFrom.set(a[0], 1.45, a[2]),
      target = this.scratchTo.set(b[0], 1.45, b[2]);
    const distance = origin.distanceTo(target),
      ray = this.visibilityRay.set(origin, target.sub(origin).normalize());
    return this.blockers().some((box) => {
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
        distance = Math.hypot(dx, dz);
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
          obj.position,
          obj.id === "cell_key_pickup",
        )
      ) {
        closest = obj;
        best = distance;
      }
    }
    return closest;
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
      sound.playLockClick(false);
      this.notice("Required: " + ALL_ITEMS[obj.actionRequiredItem].name);
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
      obj.disabled = true;
      sound.playObject(
        item === "steel_wool" || item === "rubber_washer" ? "cloth" : "metal",
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
      sound.playDoorOpen();
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
      sound.playDoorOpen();
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
      this.actionSoundTime = 0;
      this.emitChange();
    } else this.interact();
  }
  public endInteract() {
    if (!this.activeHold) return;
    this.activeHold = null;
    this.hardPush = false;
    this.saveCheckpoint();
    this.emitChange();
  }
  private interactOpening(id: string) {
    if (id === "cell_key_pickup") {
      this.inventory.push("cell_key");
      sound.cue("keys");
      this.notice("Cell key added to your satchel. Try your door.");
    } else if (id === "cell47_lock") {
      if (!this.inventory.includes("cell_key")) {
        this.notice("Find a key first.");
        return true;
      }
      this.gameFlags.key_identified = true;
      sound.playLockClick(false);
      this.notice(wrongKeyNotice);
      this.triggerSubtitle("KABIR", wrongKeyNotice, "monologue", 6);
    } else if (id === "screwdriver_pickup") {
      this.inventory.push("screwdriver");
      sound.playObject("metal");
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
    this.actionSoundTime -= dt;
    if (this.actionSoundTime <= 0) {
      this.actionSoundTime = action === "toilet_bolts" ? 1 : 1.8;
      sound.cue(
        action === "bed_push"
          ? "bed-drag"
          : action === "toilet_move"
            ? "ceramic-drag"
            : "screwdriver",
        undefined,
        this.hardPush ? 1 : 0.18,
      );
    }
    if (this.openingProgress[field] >= 1) {
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
          ? "Something was hidden beneath the bed."
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
  public cancelMiniGame() {
    this.activeMiniGame = null;
    this.clearInput();
    this.emitChange();
  }
  public completeMiniGame(success: boolean) {
    const game = this.activeMiniGame;
    if (!game) return;
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
      sound.playVentPop();
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
      sound.playDoorOpen();
    }
    this.syncWorld();
    this.saveCheckpoint();
    this.emitChange();
  }

  private syncWorld() {
    const opening = !!this.gameFlags.opening_v3;
    const p = this.openingProgress,
      o = this.worldData.opening;
    o.bed.position.z = -8.4 + p.bed * 1.4;
    o.toilet.position.set(
      opening ? -8.05 : -7.65,
      -0.05,
      opening ? -9.7 + p.toilet * 1.7 : -9.85,
    );
    o.toilet.rotation.y = opening ? Math.PI / 2 : Math.PI;
    o.bedBounds.min.z = -9.6 + p.bed * 1.4;
    o.bedBounds.max.z = -7.2 + p.bed * 1.4;
    o.toiletBounds.min.z = -10.1 + p.toilet * 1.7;
    o.toiletBounds.max.z = -9.3 + p.toilet * 1.7;
    if (!opening) {
      o.toiletBounds.min.set(-8.05, 0, -10.4);
      o.toiletBounds.max.set(-7.25, 1.2, -9.3);
    } else {
      o.toiletBounds.min.x = -8.6;
      o.toiletBounds.max.x = -7.5;
    }
    o.passageSeal.visible = !this.gameFlags.passage_open;
    o.legacyVent.visible = !opening && !this.gameFlags.vent_unbolted;
    (o.toilet.userData.bolts as THREE.Mesh[]).forEach((bolt, index) => {
      bolt.visible = opening && index >= Math.floor(p.bolts * 4);
    });
    o.body.visible = opening;
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
      const open =
        id === "cell_46_door"
          ? this.gameFlags.locker_open
          : id === "master_c_door"
            ? this.gameFlags.master_door_unlocked
            : id === "sea_gate_door"
              ? this.gameFlags.sea_gate_open
              : false;
      group.position.y = open ? 3.7 : 0;
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
    this.playerPos = [...cp.playerPosition];
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
          : "Find the sharpened spoon beneath your bunk."
        : cp.name;
    this.equippedItem = this.inventory.includes("dart_pistol")
      ? "dart_pistol"
      : null;
    this.activeMiniGame = null;
    this.munshiHint = null;
    for (const g of this.worldData.guards) {
      g.state = "patrol";
      g.suspicion = 0;
      g.currentWaypoint = 1;
      g.position = [...g.patrolRoute[0]];
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
    if (
      this.gameState === "playing" &&
      !this.activeMiniGame &&
      !this.overlayOpen
    ) {
      this.elapsed += dt;
      this.updateOpening(dt);
      this.move(dt);
      this.updateGuards(dt);
      this.updateEnvironment(dt);
      if (this.munshiHint && this.elapsed > this.noticeUntil)
        this.munshiHint = null;
    } else if (this.gameState === "title") {
      const t = this.reducedMotion ? 0 : now * 0.00008;
      this.camera.position.set(-6.7 + Math.sin(t) * 0.3, 1.7, -4.3);
      this.camera.lookAt(-4.4, 1.2, -8.7);
      for (const guard of this.worldData.guards)
        this.guardActors
          .get(guard.id)
          ?.update(guard, 0, dt, this.camera, this.guardQuality, this.mobile);
    }
    const simulationActive =
      this.gameState === "playing" && !this.activeMiniGame && !this.overlayOpen;
    if (
      (simulationActive || this.gameState === "title") &&
      now - this.lastRender > (this.mobile || this.softwareRenderer ? 33 : 16)
    ) {
      const renderInterval = now - this.lastRender;
      if (this.lastRender && renderInterval < 1000)
        this.displayedFrameMs =
          this.displayedFrameMs * 0.9 + renderInterval * 0.1;
      this.lastRender = now;
      this.lightBudgetTime -= dt;
      if (this.lightBudgetTime <= 0) {
        this.lightBudgetTime = 0.4;
        const nearest = [...this.lights].sort(
          (a, b) =>
            a.position.distanceToSquared(this.camera.position) -
            b.position.distanceToSquared(this.camera.position),
        );
        // The shadow key belongs to an actual ceiling fixture, not to a moving NPC.
        this.guardKey.position.copy(nearest[0].position).y -= 0.12;
        this.guardKey.target.position.set(
          nearest[0].position.x,
          0,
          nearest[0].position.z,
        );
        this.lights.forEach((light) => {
          light.visible = nearest.indexOf(light) < 4;
        });
      }
      const renderStart = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.frameAverage =
        this.frameAverage * 0.95 + (performance.now() - renderStart) * 0.05;
      this.drawCalls = this.renderer.info.render.calls;
      this.triangles = this.renderer.info.render.triangles;
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
          this.renderer.setPixelRatio(this.renderScale);
        }
      }
    }
    if (simulationActive && now - this.hudTime > 120) {
      this.hudTime = now;
      this.emitChange();
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
  private move(dt: number) {
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
      if (!isBlocked(this.playerPos[0] + dx, this.playerPos[2], blocks, 0.27))
        this.playerPos[0] += dx;
      if (!isBlocked(this.playerPos[0], this.playerPos[2] + dz, blocks, 0.27))
        this.playerPos[2] += dz;
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
      height + bob + this.jumpHeight,
      this.playerPos[2],
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.cameraPitch, this.playerRotY, 0, "YXZ");
    this.camera.updateMatrixWorld();
    const closest = this.findClosestInteractable();
    this.contextualAction = closest?.id ?? null;
    sound.updateListener(this.playerPos, this.playerRotY);
    this.activeInteractPrompt = this.stats.isInHidingSpot
      ? "Leave cover"
      : (closest?.prompt ?? null);
  }
  private updateGuards(dt: number) {
    this.pathTime -= dt;
    const replan = this.pathTime <= 0;
    if (replan) this.pathTime = 0.65;
    const blocks = this.blockers();
    for (const guard of this.worldData.guards) {
      const mesh = this.worldData.guardMeshes.get(guard.id)!;
      const examiner = this.gameFlags.opening_v3 && guard.id === "guard_dunne";
      if (guard.state === "knocked_out") {
        guard.stateTimer -= dt;
        if (guard.stateTimer <= 0) {
          guard.state = "searching";
          guard.stateTimer = 8;
          mesh.rotation.x = 0;
          mesh.position.y = 0;
        }
        this.guardActors
          .get(guard.id)
          ?.update(guard, 0, dt, this.camera, this.guardQuality, this.mobile);
        continue;
      }
      const wall = this.obstructed(guard.position, this.playerPos);
      const canSee =
        !wall &&
        isPlayerInGuardVision(
          guard.position,
          guard.rotationY,
          guard.visionAngle,
          guard.visionRange,
          this.playerPos,
          this.stats.isCrouching,
          this.stats.isInHidingSpot,
        );
      const heard = this.stats.isInHidingSpot
        ? 0
        : calculateHeardNoise(
            this.stats.noiseLevel,
            guard.position,
            this.playerPos,
            wall,
            guard.hearingMultiplier,
          );
      const prev = guard.state;
      const update = updateGuardSuspicionAndState(
        guard,
        heard,
        canSee,
        this.playerPos,
        dt,
      );
      Object.assign(guard, {
        state: update.nextState,
        suspicion: update.nextSuspicion,
        stateTimer: update.nextStateTimer,
        investigationTarget: update.investigationTarget,
      });
      if (guard.state === "chase" && prev !== "chase") {
        this.stats.alarmsTriggered++;
        sound.playGuardAlert();
        this.triggerSubtitle(
          guard.name.toUpperCase() + " · RADIO",
          sound.guardVoice("chase", guard.position),
          "radio",
        );
      }
      if (
        (guard.state === "suspicious" || guard.state === "searching") &&
        prev === "patrol"
      ) {
        this.triggerSubtitle(
          guard.name.toUpperCase(),
          sound.guardVoice("investigate", guard.position),
          "dialogue",
          5,
        );
      }
      if (update.caughtPlayer && !wall && !this.stats.isInHidingSpot) {
        this.triggerGameOver(
          "Intercepted by " + guard.name + ". Your checkpoint is safe.",
        );
        break;
      }
      let target =
        guard.state === "patrol"
          ? examiner
            ? ([-5.7, 0, -0.7] as [number, number, number])
            : guard.patrolRoute[guard.currentWaypoint]
          : guard.investigationTarget;
      if (
        examiner &&
        guard.state !== "patrol" &&
        target &&
        target[2] < -2 &&
        target[0] > -8.8 &&
        target[0] < -3.1
      ) {
        target = [THREE.MathUtils.clamp(target[0], -7.5, -4.2), 0, -1.5];
      }
      if (
        target &&
        Math.hypot(
          target[0] - guard.position[0],
          target[2] - guard.position[2],
        ) < 0.35
      ) {
        if (guard.state === "patrol" && !examiner)
          guard.currentWaypoint =
            (guard.currentWaypoint + 1) % guard.patrolRoute.length;
        target = undefined;
      }
      let moved = false;
      const beforeX = guard.position[0],
        beforeZ = guard.position[2];
      if (target) {
        let destination: [number, number] = [target[0], target[2]];
        if (this.obstructed(guard.position, target)) {
          if (replan)
            this.paths.set(
              guard.id,
              findPath(
                [guard.position[0], guard.position[2]],
                destination,
                blocks,
              ),
            );
          const path = this.paths.get(guard.id) ?? [];
          if (
            path.length &&
            Math.hypot(
              path[0][0] - guard.position[0],
              path[0][1] - guard.position[2],
            ) < 0.3
          )
            path.shift();
          if (path[0]) destination = path[0];
          else destination = [guard.position[0], guard.position[2]];
        }
        const dx = destination[0] - guard.position[0],
          dz = destination[1] - guard.position[2],
          length = Math.hypot(dx, dz);
        if (length > 0.05) {
          guard.rotationY = Math.atan2(dx, dz);
          const step = Math.min(
            length,
            (guard.state === "chase" ? 3.9 : 1.3) * dt,
          );
          const nx = guard.position[0] + (dx / length) * step,
            nz = guard.position[2] + (dz / length) * step;
          if (!isBlocked(nx, guard.position[2], blocks, 0.22)) {
            guard.position[0] = nx;
            moved = true;
          }
          if (!isBlocked(guard.position[0], nz, blocks, 0.22)) {
            guard.position[2] = nz;
            moved = true;
          }
        }
      }
      const phase =
        (mesh.userData.phase ?? 0) + dt * (guard.state === "chase" ? 11 : 5);
      mesh.userData.phase = phase;
      mesh.position.set(...guard.position);
      const speed =
        dt > 0
          ? Math.hypot(
              guard.position[0] - beforeX,
              guard.position[2] - beforeZ,
            ) / dt
          : 0;
      guard.examining =
        !!examiner &&
        guard.state === "patrol" &&
        speed < 0.05 &&
        Math.hypot(guard.position[0] + 5.7, guard.position[2] + 0.7) < 0.4;
      if (guard.examining) guard.rotationY = 0;
      this.guardActors
        .get(guard.id)
        ?.update(guard, speed, dt, this.camera, this.guardQuality, this.mobile);
      const distance = Math.hypot(
        guard.position[0] - this.playerPos[0],
        guard.position[2] - this.playerPos[2],
      );
      mesh.userData.stride =
        (mesh.userData.stride ?? 0) +
        Math.hypot(guard.position[0] - beforeX, guard.position[2] - beforeZ);
      if (
        moved &&
        mesh.userData.stride >= (guard.state === "chase" ? 1.2 : 0.67) &&
        distance < 12
      ) {
        sound.guardFootstep(guard.position, guard.state === "chase", wall);
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
    this.worldData.opening.body.traverse((o) => {
      if (o instanceof THREE.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m.name === "Outfit" || !m.visible) m.dispose();
    });
    this.bodyActor?.dispose();
    this.guardActors.clear();
    this.guardAssets.dispose();
    this.guardKey.shadow.dispose();
    this.worldData.windowLight.shadow.dispose();
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
