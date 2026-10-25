import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import heroURL from "../assets/guards/officer-hero.glb";
import mobileURL from "../assets/guards/officer-mobile.glb";
import distantURL from "../assets/guards/officer-distant.glb";
import type { GuardData } from "./types";
import { angleDelta, guardClip, type GuardClip } from "./guard-motion";

export type GuardQuality = "auto" | "desktop" | "mobile";
type Tier = "hero" | "mobile" | "distant";
const urls: Record<Tier, string> = {
  hero: heroURL,
  mobile: mobileURL,
  distant: distantURL,
};

function disposeModels(models: Iterable<GLTF>) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  for (const model of models)
    model.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.dispose();
    (t.source.data as ImageBitmap)?.close?.();
  });
}

/** One cache per engine. Clones share GPU geometry/textures, never bones or mixers. */
export class GuardAssetPool {
  private templates = new Map<Tier, GLTF>();
  private pending?: Promise<void>;
  private disposed = false;
  async preload(anisotropy: number) {
    if (this.pending) return this.pending;
    this.pending = Promise.allSettled(
      (Object.keys(urls) as Tier[]).map(async (tier) => {
        if (this.templates.has(tier)) return;
        const model = await new GLTFLoader()
          .setMeshoptDecoder(MeshoptDecoder)
          .loadAsync(urls[tier]);
        if (this.disposed) {
          disposeModels([model]);
          return;
        }
        model.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = object.receiveShadow = true;
          // Conservative animation bounds include the grounded collapse pose.
          if (object instanceof THREE.SkinnedMesh)
            object.boundingSphere = new THREE.Sphere(
              new THREE.Vector3(0, 0.9, 0),
              2.1,
            );
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            for (const value of Object.values(mat))
              if (value instanceof THREE.Texture) value.anisotropy = anisotropy;
          }
        });
        this.templates.set(tier, model);
      }),
    )
      .then((results) => {
        const failure = results.find((r) => r.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
  create(root: THREE.Group, captain: boolean) {
    return new GuardActor(root, this.templates, captain);
  }
  dispose() {
    this.disposed = true;
    disposeModels(this.templates.values());
    this.templates.clear();
  }
}

interface RigView {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  head?: THREE.Object3D;
  faces: THREE.SkinnedMesh[];
}

export class GuardActor {
  private views = new Map<Tier, RigView>();
  public tier: Tier = "hero";
  public animation: GuardClip = "Idle";
  private current?: THREE.AnimationAction;
  private time = Math.random() * 3;
  private accumulated = 0;
  private frustum = new THREE.Frustum();
  private projection = new THREE.Matrix4();
  private sphere = new THREE.Sphere(new THREE.Vector3(), 2.2);
  private headOffset = new THREE.Quaternion();
  private lookEuler = new THREE.Euler();
  private targetYaw = 0;
  private lookYaw = 0;
  public get hitTarget() {
    return this.views.get(this.tier)!.root;
  }

  constructor(
    public root: THREE.Group,
    templates: Map<Tier, GLTF>,
    captain: boolean,
  ) {
    const animations = templates.get("hero")!.animations;
    for (const [tier, template] of templates) {
      const model = clone(template.scene);
      // Actual unposed bounds normalize feet-to-scalp to the gameplay height.
      const bounds = new THREE.Box3().setFromObject(model);
      model.scale.setScalar(
        (captain ? 1.84 : 1.8) / (bounds.max.y - bounds.min.y),
      );
      model.position.y = -bounds.min.y * model.scale.y;
      model.name = "Officer_" + tier;
      model.visible = false;
      root.add(model);
      const mixer = new THREE.AnimationMixer(model),
        actions = new Map<string, THREE.AnimationAction>();
      for (const clip of animations) {
        const action = mixer.clipAction(clip);
        if (clip.name === "Collapse") {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        actions.set(clip.name, action);
      }
      const faces: THREE.SkinnedMesh[] = [];
      model.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh && o.morphTargetDictionary)
          faces.push(o);
      });
      this.views.set(tier, {
        root: model,
        mixer,
        actions,
        head: model.getObjectByName("Head"),
        faces,
      });
    }
    root.userData.guardActor = this;
  }

  update(
    guard: GuardData,
    speed: number,
    dt: number,
    camera: THREE.Camera,
    quality: GuardQuality,
    mobile: boolean,
  ) {
    this.time += dt;
    this.accumulated += dt;
    this.root.position.set(...guard.position);
    const turn = angleDelta(guard.rotationY, this.root.rotation.y);
    this.root.rotation.y += turn * (1 - Math.exp(-dt * 13));
    const distance = camera.position.distanceTo(this.root.position);
    // Hysteresis prevents LOD flicker at the boundary. Close-ups retain the hero mesh.
    const far = distance > (this.tier === "distant" ? 14 : 17);
    const nextTier: Tier = far
      ? "distant"
      : quality === "mobile" || (quality === "auto" && mobile)
        ? "mobile"
        : "hero";
    const nextClip = guardClip(guard.state, speed, turn);
    const changedTier = nextTier !== this.tier;
    const previousTime = this.current?.time || 0;
    if (changedTier) {
      this.views.get(this.tier)!.root.visible = false;
      this.views.get(this.tier)!.mixer.stopAllAction();
      this.tier = nextTier;
      this.current = undefined;
    }
    const view = this.views.get(this.tier)!;
    view.root.visible = true;
    if (!this.current || nextClip !== this.animation) {
      const previous = this.current;
      this.current = view.actions.get(nextClip)!;
      this.current.reset().setEffectiveWeight(1).play();
      if (changedTier && nextClip === this.animation)
        this.current.time = Math.min(
          previousTime,
          this.current.getClip().duration,
        );
      else if (!previous && nextClip === "Idle")
        this.current.time = this.time % this.current.getClip().duration;
      if (previous)
        this.current.crossFadeFrom(
          previous,
          nextClip === "Collapse" ? 0.12 : 0.22,
          false,
        );
      this.animation = nextClip;
    }
    this.current.setEffectiveTimeScale(
      nextClip === "Walk"
        ? THREE.MathUtils.clamp(speed / 1.3, 0.65, 1.6)
        : nextClip === "Run"
          ? THREE.MathUtils.clamp(speed / 3.9, 0.7, 1.5)
          : 1,
    );
    this.projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this.frustum.setFromProjectionMatrix(this.projection);
    this.sphere.center.copy(this.root.position).y += 0.8;
    const visible = this.frustum.intersectsSphere(this.sphere);
    if (!visible || (this.tier === "distant" && this.accumulated < 1 / 15))
      return;
    view.mixer.update(this.accumulated);
    this.accumulated = 0;
    if (guard.state !== "knocked_out") {
      // Limited visual head tracking: never alters AI sight direction/perception.
      this.targetYaw =
        guard.state === "chase" || guard.state === "suspicious"
          ? THREE.MathUtils.clamp(
              angleDelta(
                Math.atan2(
                  camera.position.x - guard.position[0],
                  camera.position.z - guard.position[2],
                ),
                this.root.rotation.y,
              ),
              -0.48,
              0.48,
            )
          : 0;
      this.lookYaw += (this.targetYaw - this.lookYaw) * (1 - Math.exp(-dt * 5));
      if (view.head)
        view.head.quaternion.multiply(
          this.headOffset.setFromEuler(this.lookEuler.set(0, this.lookYaw, 0)),
        );
      const blinkPhase = (this.time % 4.1) / 0.15;
      const blink = blinkPhase < 1 ? Math.sin(blinkPhase * Math.PI) : 0;
      for (const face of view.faces)
        for (const name of ["eyeBlinkLeft", "eyeBlinkRight"]) {
          const index = face.morphTargetDictionary![name];
          if (index !== undefined) face.morphTargetInfluences![index] = blink;
        }
    }
  }
  reset() {
    this.views.forEach((v) => v.mixer.stopAllAction());
    this.current = undefined;
    this.animation = "Idle";
    this.accumulated = 0;
  }
  dispose() {
    this.views.forEach((v) => {
      v.mixer.stopAllAction();
      v.mixer.uncacheRoot(v.root);
      v.root.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      });
      this.root.remove(v.root);
    });
    delete this.root.userData.guardActor;
    this.views.clear();
  }
}
