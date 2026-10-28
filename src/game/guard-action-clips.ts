import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { poseGrip } from "./grip";
import { COMBAT } from "./combat";

/** Authored skeletal close-combat poses on the existing licensed human rig.
 * No authoritative movement, perception or damage decisions live here. */
export function makeStrikeClip(
  template: THREE.Object3D,
  idle: THREE.AnimationClip,
  kind: 0 | 1 | 2 = 0,
  stance = false,
) {
  const model = clone(template),
    tracks: THREE.KeyframeTrack[] = [],
    times = stance
      ? [0, 0.3, 0.6, 0.9, 1.2]
      : [0, 0.18, COMBAT.windup, 0.5, COMBAT.duration];
  const guardArms: Record<string, number[]> = {
    RightArm: [-0.28, -0.28, 0.7],
    RightForeArm: [0.1, 0.9, 0.5],
    LeftArm: [0.28, -0.28, 0.7],
    LeftForeArm: [-0.1, 0.9, 0.5],
  };
  const contact: Record<string, number[]> =
    kind === 0
      ? { LeftArm: [0.06, 0.06, 1], LeftForeArm: [0, 0.02, 1] }
      : kind === 1
        ? { RightArm: [-0.05, 0.03, 1], RightForeArm: [0, -0.01, 1] }
        : { RightArm: [-0.8, 0.07, 0.6], RightForeArm: [0.8, 0.03, 0.65] };
  const arms: Record<string, number[][]> = Object.fromEntries(
    Object.entries(guardArms).map(([name, g]) => [
      name,
      [g, g, stance ? g : (contact[name] ?? g), g, g],
    ]),
  );
  /* Previous single swinging pose is replaced by high-guard jab/cross/hook
     clips. Each contact is synchronized to the authoritative .35s clock. */
  const bind = new Map<string, THREE.Quaternion>();
  model.traverse((o) => bind.set(o.name, o.quaternion.clone()));
  const spine = model.getObjectByName("Spine")!,
    spineValues: number[] = [];
  const hips = model.getObjectByName("Hips")!,
    hipsBase = hips.position.clone(),
    hipsValues: number[] = [];
  const values = new Map<string, number[]>();
  for (let i = 0; i < times.length; i++) {
    model.traverse((o) => {
      const q = bind.get(o.name);
      if (q) o.quaternion.copy(q);
    });
    const effort = stance ? 0 : [0, 0.35, 1, 0.3, 0][i];
    const yaw = effort * (kind === 0 ? -0.16 : kind === 1 ? 0.28 : 0.4);
    spine.quaternion.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.07 + effort * 0.06, yaw, 0),
      ),
    );
    spineValues.push(...spine.quaternion.toArray());
    hipsValues.push(
      hipsBase.x + effort * (kind === 0 ? 0.015 : -0.02),
      hipsBase.y + (stance ? [0, 0.01, 0, -0.01, 0][i] : -effort * 0.018),
      hipsBase.z + effort * 0.025,
    );
    for (const [name, directions] of Object.entries(arms)) {
      const bone = model.getObjectByName(name)!;
      model.updateMatrixWorld(true);
      const direction = new THREE.Vector3(...directions[i])
        .normalize()
        .applyQuaternion(
          bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert(),
        );
      const initial = bind.get(name)!;
      bone.quaternion.copy(
        new THREE.Quaternion()
          .setFromUnitVectors(
            new THREE.Vector3(0, 1, 0).applyQuaternion(initial),
            direction,
          )
          .multiply(initial),
      );
      const data = values.get(name) || [];
      data.push(...bone.quaternion.toArray());
      values.set(name, data);
    }
  }
  for (const [name, data] of values)
    tracks.push(
      new THREE.QuaternionKeyframeTrack(name + ".quaternion", times, data),
    );
  const rest = new Map<string, THREE.Quaternion>();
  model.traverse((o) => {
    if (/^(Right|Left)Hand/.test(o.name))
      rest.set(o.name, o.quaternion.clone());
  });
  poseGrip(model, rest, "fist");
  poseGrip(model, rest, "fist", "Left");
  for (const name of rest.keys())
    if (/\d$/.test(name)) {
      const q = model.getObjectByName(name)!.quaternion.toArray();
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          name + ".quaternion",
          [0, times.at(-1)!],
          [...q, ...q],
        ),
      );
    }
  tracks.push(
    new THREE.QuaternionKeyframeTrack("Spine.quaternion", times, spineValues),
    new THREE.VectorKeyframeTrack("Hips.position", times, hipsValues),
  );
  const names = new Set(tracks.map((t) => t.name));
  return new THREE.AnimationClip(
    stance ? "Boxing" : ["Strike", "Cross", "Hook"][kind],
    times.at(-1)!,
    [
      ...idle.tracks
        .filter((t) => !names.has(t.name))
        .map((t) => {
          const copy = t.clone(); // Idle channels still provide feet, pelvis and the support hand.
          return copy;
        }),
      ...tracks,
    ],
  );
}
