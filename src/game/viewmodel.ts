import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createSidearm } from "./sidearm";
import type { ItemId } from "./types";
import { gripStyle, poseGrip } from "./grip";
import armURL from "../assets/guards/first-person-arm.glb";
import ballistics from "../assets/ballistics/manifest.json";

/** A separate stable-FOV scene keeps the arm readable on wide mobile screens. */
export class FirstPersonView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.02, 3);
  readonly root = new THREE.Group();
  private arm?: THREE.Group;
  private hand?: THREE.Object3D;
  private leftHand?: THREE.Object3D;
  private leftForearm?: THREE.Object3D;
  private leftMesh?: THREE.Object3D;
  private leftRest?: THREE.Vector3;
  private items = new Map<ItemId, THREE.Object3D>();
  private selected: ItemId | null = null;
  private rest = new Map<string, THREE.Quaternion>();
  private transition = 0;
  private disposed = false;
  private can?: THREE.Group;
  private recoil = 0;
  private muzzleFlash?: THREE.Mesh;
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
    ballisticsModels?: { gun: THREE.Object3D; can: THREE.Object3D },
  ) {
    if (this.arm) return;
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(armURL);
    this.arm = gltf.scene;
    this.arm.scale.setScalar(1.12);
    this.root.add(this.arm);
    const forearm = this.arm.getObjectByName("RightForeArm")!;
    this.arm.updateMatrixWorld(true);
    this.hand = this.arm.getObjectByName("RightHand")!;
    this.leftHand = this.arm.getObjectByName("LeftHand");
    this.leftForearm = this.arm.getObjectByName("LeftForeArm");
    this.leftMesh = this.arm.getObjectByName("LeftArmMesh");
    this.leftRest = this.leftForearm?.position.clone();
    if (this.leftMesh) this.leftMesh.visible = false;
    // Orient the whole forearm, not a bent wrist. Local Z runs across the palm.
    const y = new THREE.Vector3(-0.3, 0.28, -1).normalize();
    const x = new THREE.Vector3()
      .crossVectors(y, new THREE.Vector3(-0.15, 1, 0.1))
      .normalize();
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    const desired = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );
    forearm.quaternion
      .copy(forearm.parent!.getWorldQuaternion(new THREE.Quaternion()).invert())
      .multiply(desired)
      .multiply(this.hand.quaternion.clone().invert());
    this.arm.traverse((bone) => {
      if (/^(Right|Left)Hand/.test(bone.name))
        this.rest.set(bone.name, bone.quaternion.clone());
    });
    poseGrip(this.arm, this.rest, "power");
    this.arm.updateMatrixWorld(true);
    const wrist = this.hand.getWorldPosition(new THREE.Vector3());
    this.arm.position.add(new THREE.Vector3(0.235, -0.265, -0.54).sub(wrist));
    const driver = this.normalizeTool(screwdriver, true);
    driver.rotation.x += Math.PI / 2;
    // Handle crosses the curled fingers; the shaft exits on the thumb side.
    driver.position.set(-0.026, 0.105, 0.087);
    this.hand.add(driver);
    this.items.set("screwdriver", driver);
    const key = this.normalizeTool(keyTemplate, false);
    key.scale.setScalar(0.45);
    key.rotation.z = -Math.PI / 2;
    key.position.set(-0.054, 0.15, 0.033);
    this.hand.add(key);
    for (const id of ["cell_key", "small_key", "master_key_c"] as ItemId[])
      this.items.set(id, key);
    const sidearm = createSidearm(),
      pistol = sidearm.root;
    sidearm.flash.visible = false;
    pistol.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 1, 0),
      ),
    );
    pistol.position.set(-0.028, 0.12, 0.027);
    pistol.getObjectByProperty("type", "PointLight")?.removeFromParent();
    this.hand.add(pistol);
    this.items.set("dart_pistol", pistol);
    if (ballisticsModels) {
      const gun = this.normalizeTool(ballisticsModels.gun, false);
      // Retain the source palm origin, rather than recentering the grip.
      gun.children[0].position.set(0, 0, 0);
      gun.quaternion.copy(pistol.quaternion);
      gun.position.copy(pistol.position);
      this.can = this.normalizeTool(ballisticsModels.can, false);
      this.can.name = "CanAttachment";
      this.can.children[0].position.set(0, 0, 0);
      this.can.rotation.x = Math.PI / 2;
      this.can.position.set(...(ballistics.muzzle as [number, number, number]));
      this.can.position.z -= 0.012;
      gun.add(this.can);
      this.muzzleFlash = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xffd18b,
          transparent: true,
          opacity: 0.8,
        }),
      );
      this.muzzleFlash.name = "MuzzleFlash";
      this.muzzleFlash.position.set(
        ...(ballistics.muzzle as [number, number, number]),
      );
      this.muzzleFlash.scale.z = 2;
      gun.add(this.muzzleFlash);
      this.hand.add(gun);
      this.items.set("pistol_10mm", gun);
    }
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
      tube.rotation.x = Math.PI / 2;
      tube.position.set(-0.028, 0.11, -0.04);
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
      const pickup = pickups.get(`${id}_pickup`);
      // Pickup silhouettes were deliberately enlarged for floor visibility.
      // Hold one active pick, not the whole two-pick display. The legacy spoon
      // pickup is only a marker; use the authored spoon profile below instead.
      const source =
        id === "spoon"
          ? undefined
          : id === "lockpick"
            ? pickup?.children[0]
            : pickup;
      if (source) {
        const held = this.normalizeTool(source, true);
        held.rotation.x += Math.PI / 2;
        const scales: Partial<Record<ItemId, number>> = {
          pipe: 0.5,
          stethoscope: 0.5,
          lockpick: 0.5,
          rubber_washer: 0.25,
          steel_wool: 0.3,
        };
        held.scale.setScalar(scales[id] ?? 1);
        if (id === "lockpick" || id === "rubber_washer")
          held.position.set(-0.054, 0.13, 0.055);
        else held.position.set(-0.028, 0.11, id === "steel_wool" ? 0 : 0.055);
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
        group.rotation.x = Math.PI / 2;
        group.position.set(-0.028, 0.11, -0.07);
        this.hand.add(group);
        this.items.set(id, group);
      } else if (id === "rubber_washer") {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.009, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0x232522, roughness: 0.96 }),
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(-0.04, 0.15, 0.025);
        this.hand.add(ring);
        this.items.set(id, ring);
      } else
        profile(
          id,
          [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, id === "pipe" ? 0.34 : 0.2, 0),
          ],
          id === "pipe" ? 0.022 : id === "silencer" ? 0.025 : 0.006,
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
    canAttached = false,
    reloadProgress: number | null = null,
  ) {
    if (item !== this.selected) {
      this.selected = item;
      this.transition = 0.22;
      if (this.arm) poseGrip(this.arm, this.rest, gripStyle(item));
      if (
        this.arm &&
        this.hand &&
        item &&
        ["cell_key", "small_key", "master_key_c"].includes(item)
      ) {
        this.arm.updateMatrixWorld(true);
        const point = (name: string) =>
          this.hand!.worldToLocal(
            this.arm!.getObjectByName(name)!.getWorldPosition(
              new THREE.Vector3(),
            ),
          );
        const pinch = point("RightHandIndex4")
          .add(point("RightHandThumb4"))
          .multiplyScalar(0.5);
        const key = this.items.get(item)!;
        const ringContact = new THREE.Vector3(0.06, 0, 0)
          .add(key.children[0].position)
          .multiply(key.scale)
          .applyQuaternion(key.quaternion);
        key.position.copy(pinch.sub(ringContact));
        key.userData.graspPoint = ringContact.toArray();
      }
    }
    this.transition = Math.max(0, this.transition - dt);
    this.recoil = Math.max(0, this.recoil - dt);
    if (this.can) this.can.visible = canAttached;
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = item === "pistol_10mm" && this.recoil > 0.14;
      this.muzzleFlash.position.z =
        ballistics.muzzle[2] + (canAttached ? 0.118 : 0.01);
    }
    this.root.visible = visible && !!item && this.items.has(item);
    for (const model of new Set(this.items.values()))
      model.visible = model === this.items.get(item!);
    const sway = moving && !reduced ? Math.sin(time * 8) * 0.009 : 0;
    this.root.position.set(
      sway,
      -this.transition * 1.4 - (nearWall ? 0.1 : 0) + this.recoil * 0.12,
      (nearWall ? 0.1 : 0) + this.recoil * 0.18,
    );
    this.root.rotation.set(
      (nearWall ? -0.25 : 0) + this.recoil * 0.4,
      0,
      sway * 0.5,
    );
    const reload = item === "pistol_10mm" && reloadProgress !== null;
    if (this.leftMesh) this.leftMesh.visible = reload;
    if (
      reload &&
      this.arm &&
      this.leftHand &&
      this.leftForearm &&
      this.leftRest
    ) {
      const p = Math.max(0, Math.min(1, reloadProgress)),
        envelope = Math.sin(Math.PI * p);
      this.root.rotation.z -= envelope * 0.18;
      this.root.rotation.x += envelope * 0.08;
      this.root.position.y -= envelope * 0.015;
      this.leftForearm.position.copy(this.leftRest);
      const leftY = new THREE.Vector3(0.7, 0.5, -0.5).normalize(),
        leftX = new THREE.Vector3()
          .crossVectors(leftY, new THREE.Vector3(0, 1, 0.1))
          .normalize(),
        leftZ = new THREE.Vector3().crossVectors(leftX, leftY).normalize();
      this.leftForearm.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(leftX, leftY, leftZ),
      );
      poseGrip(this.arm, this.rest, "power", "Left");
      this.root.updateMatrixWorld(true);
      const wrist = this.leftHand.getWorldPosition(new THREE.Vector3());
      const target = this.root.localToWorld(
        new THREE.Vector3(
          0.06 - (1 - envelope) * 0.42,
          -0.38 - (1 - envelope) * 0.4,
          -0.61,
        ),
      );
      const delta = this.arm
        .worldToLocal(target)
        .sub(this.arm.worldToLocal(wrist));
      this.leftForearm.position.add(delta);
    }
  }
  shoot() {
    this.recoil = 0.18;
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
