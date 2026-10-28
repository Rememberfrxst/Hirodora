import * as THREE from "three";
import type { PrisonWorldData } from "./world";
import type { GuardActor } from "./guard-actor";
import type { PrisonerActor } from "./prisoner";
import { sound } from "./audio";
import { introFrame, SHOT_TIME, WAKE_DURATION } from "./intro";
import voices from "../assets/audio/intro-voice-manifest.json";
import { createSidearm } from "./sidearm";
import { positionCellSlider } from "./cell-gates";
export class OpeningCinematic {
  public time = 0;
  private fired = false;
  private opened = false;
  private closed = false;
  private landed = false;
  private played = new Set<string>();
  private weapon = createSidearm();
  constructor(
    private world: PrisonWorldData,
    private camera: THREE.PerspectiveCamera,
    private actors: Map<string, GuardActor>,
    private prisoner: PrisonerActor,
    public reducedMotion: boolean,
  ) {
    world.scene.add(this.weapon.root);
    this.weapon.root.visible = false;
  }
  start() {
    this.time = 0;
    this.fired = this.opened = this.closed = this.landed = false;
    this.played.clear();
    sound.playedIntroCues.length = 0;
    this.actors.get("guard_dunne")?.reset();
    this.seek(0, false);
  }
  seek(t: number, audible = false, dt = 1 / 30) {
    const previous = this.time;
    this.time = t;
    const f = introFrame(t),
      u = Math.max(0, t - WAKE_DURATION),
      w = this.world,
      g = w.guards[0];
    w.opening.body.visible = true;
    w.opening.body.position.set(...f.prisoner);
    w.opening.body.rotation.set(0, f.prisonerYaw, 0);
    this.prisoner.pose(f.prisonerClip, f.prisonerTime);
    this.prisoner.wakeGesture(f.wakeGesture);
    positionCellSlider(w.doors.get("cell_47_door")!, f.doorOpen);
    w.pickupMeshes.get("cell_key_pickup")!.visible = u >= 10.3;
    g.position = f.guard;
    g.rotationY = f.guardYaw;
    g.examining = u >= 10.3;
    g.cinematicAim = u >= 2.8 && u < 6.2;
    g.state = "patrol";
    const dolly = Math.max(0, Math.min(1, (u - 1.5) / 2));
    const waking = Math.max(0, Math.min(1, (t - 0.3) / 4));
    this.camera.position.set(
      -6.3,
      this.reducedMotion
        ? 1.65
        : 0.85 + 0.8 * waking * waking * (3 - 2 * waking),
      this.reducedMotion
        ? -6
        : -6.4 + 0.4 * waking + 1.2 * dolly * dolly * (3 - 2 * dolly),
    );
    const look = this.reducedMotion
      ? t < WAKE_DURATION
        ? 0
        : 1
      : Math.max(0, Math.min(1, (t - 6.6) / 2.6));
    const easedLook = look * look * (3 - 2 * look);
    this.camera.lookAt(
      THREE.MathUtils.lerp(-6.05, -5.4, easedLook),
      THREE.MathUtils.lerp(
        1.45,
        this.reducedMotion ? 1.1 : 1.25 - 0.25 * Math.min(1, u / 6),
        easedLook,
      ),
      THREE.MathUtils.lerp(-5, -0.15, easedLook),
    );
    this.camera.updateMatrixWorld();
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    sound.updateListener(
      [this.camera.position.x, 0, this.camera.position.z],
      Math.atan2(-forward.x, -forward.z),
    );
    this.actors
      .get(g.id)
      ?.update(g, f.guardSpeed, dt, this.camera, "mobile", false);
    for (const other of w.guards.slice(1))
      this.actors
        .get(other.id)
        ?.update(other, 0, dt, this.camera, "mobile", false);
    this.weapon.root.visible = !!g.cinematicAim;
    if (g.cinematicAim) {
      const socket = this.actors
        .get(g.id)
        ?.weaponGrip(new THREE.Vector3(-6.4, 1.2, -0.1));
      if (socket) {
        this.weapon.root.position.copy(socket.position);
        this.weapon.root.quaternion.copy(socket.quaternion);
      }
    }
    const flash = t >= SHOT_TIME && t < SHOT_TIME + 0.09;
    this.weapon.flash.visible = flash;
    this.weapon.light.intensity = flash ? 5 : 0;
    if (audible && t >= previous) {
      for (const cue of voices.sources)
        if (t >= cue.start && !this.played.has(cue.id)) {
          this.played.add(cue.id);
          if (t < cue.start + cue.duration)
            sound.playIntroVoice(
              cue.id,
              t - cue.start,
              cue.speaker === "Cellmate"
                ? f.prisoner
                : cue.speaker === "Prison Guard"
                  ? f.guard
                  : undefined,
            );
        }
      if (
        u >= 1.6 &&
        u < 4.4 &&
        Math.floor((u - 1.6) / 0.26) !==
          Math.floor((previous - WAKE_DURATION - 1.6) / 0.26)
      )
        sound.playFootstep(false, true, "concrete", f.prisoner);
      if (
        u >= 6.2 &&
        u < 8 &&
        Math.floor((u - 6.2) / 0.46) !==
          Math.floor((previous - WAKE_DURATION - 6.2) / 0.46)
      )
        sound.playFootstep(false, false, "concrete", f.guard);
      if (t >= 2.5 && !this.opened) {
        sound.playDoorOpen([-6, 0, -2], false, "intro-gate");
        this.opened = true;
      }
      if (t >= SHOT_TIME && !this.fired) {
        sound.playGunshot([-4, 1.5, 0.2]);
        this.fired = true;
      }
      if (u >= 5.9 && !this.landed) {
        sound.contact(
          "prisoner-fall",
          "fabric",
          "concrete",
          5,
          [-6.4, 0, -0.1],
        );
        this.landed = true;
      }
      if (u >= 8.9 && !this.closed) {
        sound.playDoorOpen([-6, 0, -2], true, "intro-gate");
        sound.playLockClick(true, [-6, 1.1, -2]);
        this.closed = true;
      }
    }
    return f;
  }
  hide() {
    this.weapon.root.visible = false;
    this.weapon.light.intensity = 0;
    positionCellSlider(this.world.doors.get("cell_47_door")!, 0);
    this.world.guards[0].cinematicAim = false;
  }
  dispose() {
    this.hide();
    this.world.scene.remove(this.weapon.root);
    this.weapon.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
