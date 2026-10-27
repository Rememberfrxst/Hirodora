import * as THREE from "three";
import type { PrisonWorldData } from "./world";
import type { GuardActor } from "./guard-actor";
import type { PrisonerActor } from "./prisoner";
import { sound } from "./audio";
import { introFrame, SHOT_TIME } from "./intro";
import { createSidearm } from "./sidearm";
import { positionCellSlider } from "./cell-gates";
export class OpeningCinematic {
  public time = 0;
  private fired = false;
  private opened = false;
  private closed = false;
  private landed = false;
  private warned = false;
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
    this.fired = this.opened = this.closed = this.landed = this.warned = false;
    this.actors.get("guard_dunne")?.reset();
    this.seek(0, false);
  }
  seek(t: number, audible = false, dt = 1 / 30) {
    const previous = this.time;
    this.time = t;
    const f = introFrame(t),
      w = this.world,
      g = w.guards[0];
    w.opening.body.visible = true;
    w.opening.body.position.set(...f.prisoner);
    w.opening.body.rotation.set(0, f.prisonerYaw, 0);
    this.prisoner.pose(f.prisonerClip, f.prisonerTime);
    positionCellSlider(w.doors.get("cell_47_door")!, f.doorOpen);
    w.pickupMeshes.get("cell_key_pickup")!.visible = t >= 10.3;
    g.position = f.guard;
    g.rotationY = f.guardYaw;
    g.examining = t >= 10.3;
    g.cinematicAim = t >= 2.8 && t < 6.2;
    g.state = "patrol";
    const dolly = Math.max(0, Math.min(1, (t - 1.5) / 2));
    this.camera.position.set(
      -6.3,
      1.65,
      this.reducedMotion ? -6 : -6 + 1.2 * dolly * dolly * (3 - 2 * dolly),
    );
    this.camera.lookAt(
      -5.4,
      this.reducedMotion ? 1.1 : 1.25 - 0.25 * Math.min(1, t / 6),
      -0.15,
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
      if (
        t >= 1.6 &&
        t < 4.4 &&
        Math.floor((t - 1.6) / 0.26) !== Math.floor((previous - 1.6) / 0.26)
      )
        sound.playFootstep(false, true, "concrete", f.prisoner);
      if (
        t >= 6.2 &&
        t < 8 &&
        Math.floor((t - 6.2) / 0.46) !== Math.floor((previous - 6.2) / 0.46)
      )
        sound.playFootstep(false, false, "concrete", f.guard);
      if (t >= 0.2 && !this.opened) {
        sound.playDoorOpen([-6, 0, -2], false, "intro-gate");
        this.opened = true;
      }
      if (t >= 2.5 && !this.warned) {
        sound.guardVoice("chase", [-4, 0, 0.2]);
        this.warned = true;
      }
      if (t >= SHOT_TIME && !this.fired) {
        sound.playGunshot([-4, 1.5, 0.2]);
        this.fired = true;
      }
      if (t >= 5.9 && !this.landed) {
        sound.contact(
          "prisoner-fall",
          "fabric",
          "concrete",
          5,
          [-6.4, 0, -0.1],
        );
        this.landed = true;
      }
      if (t >= 8.9 && !this.closed) {
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
