import * as THREE from "three";
import type { PrisonWorldData } from "./world";
import type { GuardActor } from "./guard-actor";
export function attachBeltKey(world: PrisonWorldData, actor?: GuardActor) {
  if (!actor) return;
  const key = world.pickupMeshes.get("cell_key_pickup")!;
  const hips = actor.hitTarget.getObjectByName("Hips");
  if (!hips) return;
  actor.root.updateMatrixWorld(true);
  key.position
    .copy(hips.getWorldPosition(new THREE.Vector3()))
    .add(
      new THREE.Vector3(-0.23, 0.03, -0.14).applyQuaternion(
        actor.root.quaternion,
      ),
    );
  key.rotation.set(Math.PI / 2, actor.root.rotation.y, 0);
  const interaction = world.interactables.find(
    (o) => o.id === "cell_key_pickup",
  )!;
  interaction.position = [key.position.x, key.position.y, key.position.z];
  interaction.radius = 2.2;
}
