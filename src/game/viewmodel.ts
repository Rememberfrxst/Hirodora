import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createSidearm } from "./sidearm";
import type { ItemId } from "./types";
import armURL from "../assets/guards/first-person-arm.glb";

/** A separate stable-FOV scene keeps the arm readable on wide mobile screens. */
export class FirstPersonView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.02, 3);
  readonly root = new THREE.Group();
  private arm?: THREE.Group;
  private hand?: THREE.Object3D;
  private items = new Map<ItemId, THREE.Object3D>();
  private selected: ItemId | null = null;
  private transition = 0;
  private disposed = false;
  private shared = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  >();
  constructor() {
    this.scene.add(this.root, new THREE.HemisphereLight(0xd7e5dc, 0x47504a, 1));
    const key = new THREE.DirectionalLight(0xffe4c2, 1.4);
    key.position.set(-1, 2, 1);
    this.scene.add(key);
    this.root.name = "FirstPersonEquipment";
  }
  async load(
    screwdriver: THREE.Object3D,
    keyTemplate: THREE.Object3D,
    pickups: Map<string, THREE.Object3D>,
  ) {
    if (this.arm) return;
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(armURL);
    this.arm = gltf.scene;
    this.root.add(this.arm);
    const forearm = this.arm.getObjectByName("RightForeArm")!;
    this.arm.updateMatrixWorld(true);
    const parentQ = forearm
      .parent!.getWorldQuaternion(new THREE.Quaternion())
      .invert();
    forearm.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0.12, 0.22, -1).normalize().applyQuaternion(parentQ),
    );
    this.hand = this.arm.getObjectByName("RightHand")!;
    for (const finger of ["Thumb", "Index", "Middle", "Ring", "Pinky"])
      for (let i = 1; i <= 3; i++) {
        const bone = this.arm.getObjectByName("RightHand" + finger + i);
        bone?.quaternion.multiply(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              finger === "Thumb" ? 0.85 : i === 1 ? 1.25 : 1.45,
              0,
              0,
            ),
          ),
        );
      }
    this.arm.updateMatrixWorld(true);
    const wrist = this.hand.getWorldPosition(new THREE.Vector3());
    this.arm.position.add(new THREE.Vector3(0.25, -0.25, -0.52).sub(wrist));
    const driver = this.normalizeTool(screwdriver, true);
    driver.position.set(0, 0.17, 0.035);
    this.hand.add(driver);
    this.items.set("screwdriver", driver);
    const key = this.normalizeTool(keyTemplate, false);
    key.rotation.x = Math.PI / 2;
    key.position.set(0, 0.12, 0.025);
    this.hand.add(key);
    for (const id of ["cell_key", "small_key", "master_key_c"] as ItemId[])
      this.items.set(id, key);
    const pistol = createSidearm().root;
    pistol.rotation.x = Math.PI / 2;
    pistol.position.set(0, 0.07, 0.025);
    this.hand.add(pistol);
    this.items.set("dart_pistol", pistol);
    // Remaining tools are separate authored profiles, never inventory-card images.
    const metal = new THREE.MeshStandardMaterial({
      color: 0x939b9d,
      metalness: 0.8,
      roughness: 0.38,
    });
    const profile = (id: ItemId, points: THREE.Vector3[], radius: number) => {
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          24,
          radius,
          8,
          false,
        ),
        metal,
      );
      tube.position.set(0, 0.05, 0.03);
      this.hand!.add(tube);
      this.items.set(id, tube);
    };
    profile(
      "heavy_crowbar",
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.32, 0),
        new THREE.Vector3(0.07, 0.39, 0),
      ],
      0.012,
    );
    for (const id of [
      "pipe",
      "silencer",
      "lockpick",
      "stethoscope",
      "spoon",
      "steel_wool",
      "rubber_washer",
    ] as ItemId[]) {
      const source = pickups.get(`${id}_pickup`);
      if (source) {
        const held = this.normalizeTool(source, true);
        held.position.set(0, 0.1, 0.03);
        this.hand.add(held);
        this.items.set(id, held);
        continue;
      }
      if (id === "spoon") {
        const group = new THREE.Group(),
          handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.007, 0.16, 10),
            metal,
          ),
          bowl = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 10), metal);
        handle.position.y = 0.12;
        bowl.position.y = 0.215;
        bowl.scale.set(0.7, 1, 0.22);
        group.add(handle, bowl);
        group.position.z = 0.03;
        this.hand.add(group);
        this.items.set(id, group);
      } else if (id === "rubber_washer") {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.009, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0x232522, roughness: 0.96 }),
        );
        ring.position.set(0, 0.12, 0.04);
        this.hand.add(ring);
        this.items.set(id, ring);
      } else
        profile(
          id,
          [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, id === "pipe" ? 0.34 : 0.2, 0),
          ],
          id === "pipe" ? 0.022 : 0.006,
        );
    }
    for (const item of new Set(this.items.values())) item.visible = false;
    this.root.visible = false;
    if (this.disposed) this.dispose();
  }
  private normalizeTool(source: THREE.Object3D, upright: boolean) {
    source.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        this.shared.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          this.shared.add(m);
          for (const v of Object.values(m))
            if (v instanceof THREE.Texture) this.shared.add(v);
        }
      }
    });
    const group = new THREE.Group(),
      copy = source.clone(true);
    group.add(copy);
    copy.visible = true;
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3());
    copy.position.sub(center);
    if (upright) {
      if (size.z > size.y && size.z > size.x) group.rotation.x = Math.PI / 2;
      else if (size.x > size.y) group.rotation.z = Math.PI / 2;
    }
    return group;
  }
  update(
    item: ItemId | null,
    time: number,
    dt: number,
    moving: boolean,
    reduced: boolean,
    nearWall: boolean,
    visible: boolean,
  ) {
    if (item !== this.selected) {
      this.selected = item;
      this.transition = 0.22;
    }
    this.transition = Math.max(0, this.transition - dt);
    this.root.visible = visible && !!item && this.items.has(item);
    for (const model of new Set(this.items.values()))
      model.visible = model === this.items.get(item!);
    const sway = moving && !reduced ? Math.sin(time * 8) * 0.009 : 0;
    this.root.position.set(
      sway,
      -this.transition * 1.4 - (nearWall ? 0.1 : 0),
      nearWall ? 0.1 : 0,
    );
    this.root.rotation.set(nearWall ? -0.25 : 0, 0, sway * 0.5);
  }
  render(renderer: THREE.WebGLRenderer, aspect: number) {
    if (!this.root.visible) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = auto;
  }
  dispose() {
    this.disposed = true;
    // Tool meshes share their source resources with the world. Only the unique arm
    // and authored tools are disposed here; the engine owns shared world textures.
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          for (const v of Object.values(m))
            if (v instanceof THREE.Texture) textures.add(v);
        }
      }
    });
    geometries.forEach((g) => {
      if (!this.shared.has(g)) g.dispose();
    });
    materials.forEach((m) => {
      if (!this.shared.has(m)) m.dispose();
    });
    textures.forEach((t) => {
      if (!this.shared.has(t)) {
        t.dispose();
        (t.source.data as ImageBitmap)?.close?.();
      }
    });
    this.scene.clear();
  }
}
