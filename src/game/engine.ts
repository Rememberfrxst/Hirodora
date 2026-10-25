/**
 * Core 3D Game Engine for Hirodora: The Obsidian Penitentiary
 * First-person controller, realistic stealth perception, tactical guard AI, and mini-game hooks.
 */

import * as THREE from "three";
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

export const ALL_ITEMS: Record<ItemId, InventoryItem> = {
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

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
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
  private scratchFrom = new THREE.Vector3();
  private scratchTo = new THREE.Vector3();
  private scratchHit = new THREE.Vector3();
  private visibilityRay = new THREE.Ray();
  private collisionSignature = -1;
  private collisionCache: THREE.Box3[] = [];
  private lastRender = 0;
  private softwareRenderer = false;
  private lights: THREE.PointLight[] = [];
  private hintTime = -30;
  private touchMove: [number, number] = [0, 0];
  private drag: { id: number; x: number; y: number } | null = null;
  private pathTime = 0;
  private paths = new Map<string, [number, number][]>();
  private saveKey = "hirodora-checkpoint-v2";
  private checkpoint: GameCheckpoint | null = null;
  private noticeUntil = 0;
  public onStateChange?: () => void;
  public gameState: GameState = "title";
  public endingType: EndingType | null = null;
  public gameOverReason = "";
  public playerPos: [number, number, number] = [-6, 0, -6];
  public playerRotY = 0;
  public cameraPitch = 0;
  public inventory: ItemId[] = ["small_key", "note_from_unknown"];
  public equippedItem: ItemId | null = null;
  public activeMiniGame: ActiveMiniGame = null;
  public activeInteractPrompt: string | null = null;
  public activeObjective = "Find the sharpened spoon beneath your bunk.";
  public munshiHint: string | null = null;
  public gameFlags: Record<string, boolean> = {};
  public overlayOpen = false;
  public mobile = matchMedia("(pointer: coarse)").matches;
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
    this.renderer.setPixelRatio(
      this.softwareRenderer
        ? 0.65
        : Math.min(devicePixelRatio, this.mobile ? 1.35 : 1.75),
    );
    this.renderScale = this.renderer.getPixelRatio();
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
    this.scene.traverse((object) => {
      if (object instanceof THREE.PointLight) this.lights.push(object);
    });
    this.loadCheckpoint();
    this.setupInputs();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private setupInputs() {
    const signal = this.events.signal;
    window.addEventListener(
      "keydown",
      (e) => {
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
        if (e.code === "KeyE") this.interact();
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
    window.addEventListener(
      "resize",
      () => {
        const w = mountElWidth(this.mountEl),
          h = this.mountEl.clientHeight || innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      },
      { signal },
    );
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

  private look(dx: number, dy: number) {
    this.playerRotY -= dx * this.sensitivity;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - dy * this.sensitivity,
      -1.35,
      1.35,
    );
  }
  public clearInput() {
    this.keys = {};
    this.touchMove = [0, 0];
    this.drag = null;
    this.touchSprint = false;
  }
  public setTouchMove(x: number, z: number) {
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
      this.jumpHeight > 0
    )
      return;
    this.stats.isCrouching = false;
    this.jumpVelocity = 4.3;
    sound.playObject("cloth", 0, 0.4);
    this.emitChange();
  }
  public startGame() {
    sound.init();
    sound.resume();
    if (this.checkpoint) this.restoreCheckpoint(this.checkpoint);
    this.gameState = "playing";
    this.clearInput();
    document.body.dataset.state = "playing";
    this.triggerSubtitle(
      "KABIR RAO · PRISONER 047",
      "Voss framed me. Iyer needs the ledger. A sharpened spoon beneath the bunk… that’s where I start.",
      "monologue",
      7,
    );
  }
  public pauseGame() {
    if (this.gameState !== "playing") return;
    this.gameState = "paused";
    this.overlayOpen = false;
    this.clearInput();
    sound.suspend();
    document.exitPointerLock?.();
    this.emitChange();
  }
  public resumeGame() {
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
    if (this.checkpoint) this.restoreCheckpoint(this.checkpoint);
    else
      this.restoreCheckpoint({
        id: "start",
        name: "Cell 47",
        playerPosition: [-6, 0, -6],
        playerRotationY: 0,
        act: 1,
        inventory: ["small_key", "note_from_unknown"],
        flags: {},
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
      inventory: ["small_key", "note_from_unknown"],
      flags: {},
    });
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
      (this.gameFlags.sea_gate_open ? 4 : 0);
    if (signature === this.collisionSignature) return this.collisionCache;
    const blocks = [...this.worldData.colliders];
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
  private obstructed(a: [number, number, number], b: [number, number, number]) {
    const origin = this.scratchFrom.set(a[0], 1.45, a[2]),
      target = this.scratchTo.set(b[0], 1.45, b[2]);
    const distance = origin.distanceTo(target),
      ray = this.visibilityRay.set(origin, target.sub(origin).normalize());
    return this.blockers().some((box) => {
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
      if (obj.id === "boulder_rescue_tunnel" && this.stats.act !== 3) continue;
      const dx = obj.position[0] - this.playerPos[0],
        dz = obj.position[2] - this.playerPos[2],
        distance = Math.hypot(dx, dz);
      const facing =
        distance < 0.65 ||
        (-Math.sin(this.playerRotY) * dx - Math.cos(this.playerRotY) * dz) /
          distance >
          0.15;
      if (
        distance < obj.radius &&
        distance < best &&
        facing &&
        !this.obstructed(this.playerPos, obj.position)
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
      const cp = JSON.parse(localStorage.getItem(this.saveKey) || "null");
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
    this.activeObjective =
      cp.name === "Cell 47"
        ? "Find the sharpened spoon beneath your bunk."
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
      const mesh = this.worldData.guardMeshes.get(g.id)!;
      mesh.rotation.x = 0;
      mesh.position.set(...g.position);
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
      const mesh = this.worldData.guardMeshes.get(guard.id)!;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.2;
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
    if (
      this.gameState === "playing" &&
      !this.activeMiniGame &&
      !this.overlayOpen
    ) {
      this.elapsed += dt;
      this.move(dt);
      this.updateGuards(dt);
      this.updateEnvironment(dt);
      if (this.munshiHint && this.elapsed > this.noticeUntil)
        this.munshiHint = null;
    } else if (this.gameState === "title") {
      const t = this.reducedMotion ? 0 : now * 0.00008;
      this.camera.position.set(-6.7 + Math.sin(t) * 0.3, 1.7, -4.3);
      this.camera.lookAt(-4.4, 1.2, -8.7);
    }
    const simulationActive =
      this.gameState === "playing" && !this.activeMiniGame && !this.overlayOpen;
    if (
      (simulationActive || this.gameState === "title") &&
      now - this.lastRender > (this.mobile || this.softwareRenderer ? 33 : 16)
    ) {
      this.lastRender = now;
      this.lightBudgetTime -= dt;
      if (this.lightBudgetTime <= 0) {
        this.lightBudgetTime = 0.4;
        const nearest = [...this.lights].sort(
          (a, b) =>
            a.position.distanceToSquared(this.camera.position) -
            b.position.distanceToSquared(this.camera.position),
        );
        this.lights.forEach((light) => {
          light.visible = nearest.indexOf(light) < 4;
        });
      }
      const renderStart = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.frameAverage =
        this.frameAverage * 0.95 + (performance.now() - renderStart) * 0.05;
      if (
        this.mobile &&
        !this.softwareRenderer &&
        this.frameAverage > 27 &&
        this.renderScale > 0.8
      ) {
        this.renderScale = Math.max(0.8, this.renderScale - 0.1);
        this.renderer.setPixelRatio(this.renderScale);
        this.frameAverage = 20;
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
    const moving = Math.hypot(mx, mz) > 0.08 && !this.stats.isInHidingSpot;
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
      const targetNoise = applySoundMasking(
        this.stats.isCrouching ? 3 : this.stats.isSprinting ? 30 : 12,
        this.playerPos,
        this.worldData.soundMaskingMachinePos,
      );
      this.stats.noiseLevel = Math.max(
        targetNoise,
        calculateDecayedNoise(this.stats.noiseLevel, dt),
      );
      this.footTime -= dt;
      if (this.footTime <= 0) {
        this.footTime = this.stats.isCrouching
          ? 0.7
          : this.stats.isSprinting
            ? 0.28
            : 0.46;
        sound.playFootstep(
          this.stats.isCrouching,
          this.stats.isSprinting,
          this.playerPos[0] > 15 ? "water" : "stone",
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
    const closest = this.findClosestInteractable();
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
      if (guard.state === "knocked_out") {
        guard.stateTimer -= dt;
        if (guard.stateTimer <= 0) {
          guard.state = "searching";
          guard.stateTimer = 8;
          mesh.rotation.x = 0;
          mesh.position.y = 0;
        }
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
          "Containment breach. Secure the gates. Bring the prisoner in alive.",
          "radio",
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
          ? guard.patrolRoute[guard.currentWaypoint]
          : guard.investigationTarget;
      if (!target) continue;
      if (
        Math.hypot(
          target[0] - guard.position[0],
          target[2] - guard.position[2],
        ) < 0.35
      ) {
        if (guard.state === "patrol")
          guard.currentWaypoint =
            (guard.currentWaypoint + 1) % guard.patrolRoute.length;
        target = undefined;
      }
      let moved = false;
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
      mesh.rotation.y = guard.rotationY;
      for (const [name, sign] of [
        ["leftLeg", 1],
        ["rightLeg", -1],
        ["leftArm", -1],
        ["rightArm", 1],
      ] as const)
        mesh.userData[name].rotation.x = moved
          ? Math.sin(phase) * 0.32 * sign
          : 0;
      mesh.userData.head.rotation.y =
        guard.state === "chase" ? 0 : Math.sin(phase * 0.3) * 0.2;
      if (mesh.userData.leftKnee) {
        mesh.userData.leftKnee.rotation.x = moved
          ? Math.max(0, -Math.sin(phase)) * 0.42
          : 0.025;
        mesh.userData.rightKnee.rotation.x = moved
          ? Math.max(0, Math.sin(phase)) * 0.42
          : 0.025;
        mesh.userData.leftElbow.rotation.x =
          -0.12 - (moved ? Math.max(0, Math.sin(phase)) * 0.16 : 0);
        mesh.userData.rightElbow.rotation.x =
          -0.12 - (moved ? Math.max(0, -Math.sin(phase)) * 0.16 : 0);
      }
      const distance = Math.hypot(
        guard.position[0] - this.playerPos[0],
        guard.position[2] - this.playerPos[2],
      );
      if (
        moved &&
        Math.sin(phase) > 0.96 &&
        !mesh.userData.stepped &&
        distance < 12
      ) {
        sound.playObject(
          "boot",
          (guard.position[0] - this.playerPos[0]) / 10,
          0.6 * (1 - distance / 14),
        );
        mesh.userData.stepped = true;
      } else if (Math.sin(phase) < 0.8) mesh.userData.stepped = false;
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
      sound.playObject(
        this.playerPos[0] > 15 ? "water" : "drip",
        Math.sin(this.elapsed),
      );
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
    this.events.abort();
    cancelAnimationFrame(this.frameId);
    this.clearInput();
    sound.suspend();
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
