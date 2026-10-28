import * as THREE from "three";
import type { ItemId } from "./types";

export type GripStyle = "power" | "pinch" | "pistol" | "pistol10" | "fist";
export function gripStyle(item: ItemId | null): GripStyle {
  if (item === "dart_pistol") return "pistol";
  if (item === "pistol_10mm") return "pistol10";
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
    const trigger10 = style === "pistol10" && finger === "Index";
    const directions =
      style === "fist"
        ? [
            [-0.98, 0.16, 0],
            [-0.18, -0.98, 0],
            [0.78, -0.63, 0],
          ]
        : style === "pistol10" && !trigger10
          ? [
              [-0.82, 0.4, 0],
              [-0.2, -0.98, 0],
              [0.9, -0.35, 0],
            ]
          : trigger10
            ? [
                [0, 0.9, 0.33],
                [-0.92, 0.05, 0.39],
                [0.35, -0.8, 0],
              ]
            : trigger
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
    style === "pinch" ? [0, 0.99, 0.1] : [0.65, 0.56, -0.51],
  );
  if (arm.getObjectByName(side + "ArmMesh")) {
    const point = (name: string) =>
      hand.worldToLocal(
        arm.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()),
      );
    const reach = (finger: string, target: THREE.Vector3) => {
      const names = Array.from(
          { length: 4 },
          (_, i) => `${side}Hand${finger}${i + 1}`,
        ),
        points = names.map(point),
        base = points[0].clone();
      const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]));
      for (let iteration = 0; iteration < 18; iteration++) {
        points[3].copy(target);
        for (let i = 2; i >= 0; i--)
          points[i]
            .sub(points[i + 1])
            .normalize()
            .multiplyScalar(lengths[i])
            .add(points[i + 1]);
        points[0].copy(base);
        for (let i = 1; i < 4; i++)
          points[i]
            .sub(points[i - 1])
            .normalize()
            .multiplyScalar(lengths[i - 1])
            .add(points[i - 1]);
      }
      for (let i = 0; i < 3; i++)
        aim(names[i], points[i + 1].clone().sub(points[i]).toArray());
    };
    if (style === "pinch" && side === "Right") {
      reach("Index", new THREE.Vector3(-0.045, 0.145, 0.045));
      reach("Thumb", new THREE.Vector3(-0.035, 0.123, 0.045));
    }
    if (style === "power" && side === "Right")
      reach("Thumb", new THREE.Vector3(-0.005, 0.12, 0.03));
    if (style === "pistol10" && side === "Right")
      reach("Thumb", new THREE.Vector3(-0.012, 0.142, 0.033));
    if (style === "pistol10") {
      // Solve the two proximal segments to the actual 10mm trigger socket.
      const a = point(side + "HandIndex1"),
        target = new THREE.Vector3(-0.028, 0.17, 0.048),
        direction = target.clone().sub(a),
        distance = direction.length(),
        unit = direction.normalize();
      const l1 = arm.getObjectByName(side + "HandIndex2")!.position.length(),
        l2 = arm.getObjectByName(side + "HandIndex3")!.position.length();
      const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance),
        height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
      const pole = new THREE.Vector3(0, 1, 0)
        .addScaledVector(unit, -unit.y)
        .normalize();
      const middle = a
        .clone()
        .addScaledVector(unit, along)
        .addScaledVector(pole, height);
      aim(side + "HandIndex1", middle.clone().sub(a).toArray());
      aim(side + "HandIndex2", target.sub(middle).toArray());
      aim(side + "HandIndex3", [0.35, -0.8, 0]);
    }
  }
}
