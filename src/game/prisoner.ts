import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import url from "../assets/guards/prisoner.glb";

export class PrisonerActor {
  private model!: THREE.Group;
  private mixer!: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = "";
  constructor(public root: THREE.Group) {}
  async load() {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(url);
    this.model = gltf.scene;
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = o.receiveShadow = true;
        if (o instanceof THREE.SkinnedMesh) {
          o.boundingSphere = new THREE.Sphere(
            new THREE.Vector3(0, 0.9, 0),
            2.2,
          );
          o.frustumCulled = true;
        }
      }
    });
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip);
      if (clip.name === "Death") {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }
    this.pose("Idle", 0);
  }
  pose(clip: string, time: number) {
    if (!this.mixer) return;
    this.root.userData.animation = clip;
    if (this.current !== clip) {
      this.mixer.stopAllAction();
      this.actions.get(clip)!.reset().play();
      this.current = clip;
    }
    const action = this.actions.get(clip)!;
    action.enabled = true;
    action.paused = false;
    action.time =
      clip === "Death"
        ? Math.min(time, action.getClip().duration - 0.001)
        : time % action.getClip().duration;
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
  }
  dispose() {
    if (!this.model) return;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    this.root.remove(this.model);
  }
}
