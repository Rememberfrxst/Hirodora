import * as THREE from "three";
import type { ItemId } from "./types";

export type GripStyle = "power" | "pinch" | "pistol";
export function gripStyle(item: ItemId | null): GripStyle {
  if (item === "dart_pistol") return "pistol";
  return item === "cell_key" ||
    item === "small_key" ||
    item === "master_key_c" ||
    item === "lockpick" ||
    item === "rubber_washer"
    ? "pinch"
    : "power";
}

/** Aim a phalanx in the palm's anatomical frame, preserving its bind-pose roll.
 * The source's palm is Y-longitudinal / Z-transverse, NOT an X-axis curl rig.
 * All poses are applied from saved rest rotations; switching cannot accumulate.
 */
export function poseGrip(
  arm: THREE.Object3D,
  rest: Map<string, THREE.Quaternion>,
  style: GripStyle,
  side: "Right" | "Left" = "Right",
) {
  const hand = arm.getObjectByName(side + "Hand")!;
  for (const [name, q] of rest)
    if (name.startsWith(side + "Hand"))
      arm.getObjectByName(name)!.quaternion.copy(q);
  arm.updateMatrixWorld(true);
  const aim = (name: string, direction: number[]) => {
    const bone = arm.getObjectByName(name);
    if (!bone) return;
    const target = new THREE.Vector3(
      direction[0] * (side === "Left" ? -1 : 1),
      direction[1],
      direction[2] * (side === "Left" ? -1 : 1),
    )
      .normalize()
      .applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()))
      .applyQuaternion(
        bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert(),
      );
    const current = new THREE.Vector3(0, 1, 0).applyQuaternion(bone.quaternion);
    bone.quaternion.premultiply(
      new THREE.Quaternion().setFromUnitVectors(current, target),
    );
    arm.updateMatrixWorld(true);
  };
  for (const finger of ["Index", "Middle", "Ring", "Pinky"]) {
    const pinch = style === "pinch" && finger === "Index";
    const trigger = style === "pistol" && finger === "Index";
    const directions = trigger
      ? [
          [-0.35, 0.94, 0.04],
          [-0.5, 0.86, 0],
          [-0.7, 0.71, 0],
        ]
      : pinch
        ? [
            [-0.45, 0.89, 0],
            [-0.95, 0.3, 0],
            [-0.6, -0.8, 0],
          ]
        : [
            [-0.72, 0.69, 0],
            [-0.92, -0.39, 0],
            [0.08, -1, 0],
          ];
    directions.forEach((d, i) => aim(`${side}Hand${finger}${i + 1}`, d));
  }
  aim(side + "HandThumb1", [-0.7, 0.65, 0.3]);
  aim(side + "HandThumb2", [-0.15, 0.93, -0.34]);
  aim(
    side + "HandThumb3",
    style === "pinch" ? [-0.5, 0.85, 0.14] : [0.65, 0.56, -0.51],
  );
}
