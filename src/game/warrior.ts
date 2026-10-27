import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import url from "../assets/guards/redeemed-warrior.glb";

/** Supplied USDZ converted offline. The NPC remains independent of guard AI. */
export class WarriorActor {
  private model?: THREE.Group;
  private disposed = false;
  constructor(private root: THREE.Group) {}
  async load() {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(url);
    this.model = gltf.scene;
    this.model.name = "TheRedeemedWarrior";
    this.model.rotation.y = Math.PI;
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
    });
    this.root.add(this.model);
    if (this.disposed) this.dispose();
  }
  update(time: number, reducedMotion: boolean) {
    if (this.model)
      this.model.scale.y = reducedMotion
        ? 1
        : 1 + Math.sin(time * 1.4) * 0.0015;
  }
  dispose() {
    this.disposed = true;
    this.model?.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m))
            if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    if (this.model) this.root.remove(this.model);
    this.model = undefined;
  }
}
