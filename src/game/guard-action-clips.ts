import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { poseGrip } from "./grip";
import { COMBAT } from "./combat";

/** Authored skeletal close-combat poses on the existing licensed human rig.
 * No authoritative movement, perception or damage decisions live here. */
export function makeStrikeClip(
  template: THREE.Object3D,
  idle: THREE.AnimationClip,
) {
  const model = clone(template),
    tracks: THREE.KeyframeTrack[] = [],
    times = [0, 0.18, COMBAT.windup, 0.5, COMBAT.duration];
  const arms = {
    RightArm: [
      [-0.1, -0.55, 0.6],
      [-0.12, -0.5, -0.8],
      [-0.05, -0.08, 1],
      [0.15, -0.12, 1],
      [-0.1, -0.55, 0.6],
    ],
    RightForeArm: [
      [0, 0.7, 0.6],
      [0, 0.7, 0.7],
      [0.02, 0.02, 1],
      [0.1, -0.02, 1],
      [0, 0.7, 0.6],
    ],
    LeftArm: [
      [0.2, -0.7, 0.5],
      [0.2, -0.7, 0.5],
      [0.2, -0.7, 0.5],
      [0.2, -0.7, 0.5],
      [0.2, -0.7, 0.5],
    ],
    LeftForeArm: [
      [-0.2, 0.7, 0.65],
      [-0.2, 0.7, 0.65],
      [-0.2, 0.7, 0.65],
      [-0.2, 0.7, 0.65],
      [-0.2, 0.7, 0.65],
    ],
  };
  const values = new Map<string, number[]>();
  for (let i = 0; i < times.length; i++)
    for (const [name, directions] of Object.entries(arms)) {
      const bone = model.getObjectByName(name)!;
      model.updateMatrixWorld(true);
      const direction = new THREE.Vector3(...directions[i])
        .normalize()
        .applyQuaternion(
          bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert(),
        );
      bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      const data = values.get(name) || [];
      data.push(...bone.quaternion.toArray());
      values.set(name, data);
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
  poseGrip(model, rest, "power");
  poseGrip(model, rest, "power", "Left");
  for (const name of rest.keys())
    if (/\d$/.test(name)) {
      const q = model.getObjectByName(name)!.quaternion.toArray();
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          name + ".quaternion",
          [0, COMBAT.duration],
          [...q, ...q],
        ),
      );
    }
  const spine = model.getObjectByName("Spine")!,
    base = spine.quaternion.clone(),
    spineValues: number[] = [];
  for (const [pitch, yaw] of [
    [0.02, -0.1],
    [0.03, -0.25],
    [0.18, 0.18],
    [0.12, 0.24],
    [0.02, -0.1],
  ])
    spineValues.push(
      ...base
        .clone()
        .multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0)),
        )
        .toArray(),
    );
  tracks.push(
    new THREE.QuaternionKeyframeTrack("Spine.quaternion", times, spineValues),
  );
  const names = new Set(tracks.map((t) => t.name));
  return new THREE.AnimationClip("Strike", COMBAT.duration, [
    ...idle.tracks
      .filter((t) => !names.has(t.name))
      .map((t) => {
        const copy = t.clone(); // Idle channels still provide feet, pelvis and the support hand.
        return copy;
      }),
    ...tracks,
  ]);
}
