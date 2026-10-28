import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import pistolURL from "../assets/ballistics/pistol-10mm.glb";
import canURL from "../assets/ballistics/soda-can.glb";
export async function loadBallisticsAssets(
  pickups: Map<string, THREE.Object3D>,
) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [gun, can] = await Promise.all([
    loader.loadAsync(pistolURL),
    loader.loadAsync(canURL),
  ]);
  for (const [id, model] of [
    ["pistol_10mm_pickup", gun.scene],
    ["can_attach", can.scene],
  ] as const) {
    const copy = model.clone(true);
    copy.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
    });
    pickups.get(id)!.add(copy);
  }
  return { gun: gun.scene, can: can.scene };
}
