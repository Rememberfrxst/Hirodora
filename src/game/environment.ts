import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import modelURL from "../assets/environment/retained-fixtures.glb";
import uploadedURL from "../assets/environment/uploaded-props.glb";
import stairsURL from "../assets/environment/wood-stairs.glb";
import boxURL from "../assets/environment/wood-box.glb";
import palletURL from "../assets/environment/cargo-pallet.glb";
import bridgeURL from "../assets/environment/metal-bridge.glb";
import rockColor from "../assets/environment/rock16-albedo.webp";
import rockNormal from "../assets/environment/rock16-normal.webp";
import rockORM from "../assets/environment/rock16-orm.webp";
import mobileColor from "../assets/environment/rock16-mobile-albedo.webp";
import mobileNormal from "../assets/environment/rock16-mobile-normal.webp";
import mobileORM from "../assets/environment/rock16-mobile-orm.webp";
import { isAppleMobile } from "./platform";
import metalColor from "../assets/environment/metal-albedo.webp";
import metalNormal from "../assets/environment/metal-normal.webp";
import metalORM from "../assets/environment/metal-orm.webp";
import stainURL from "../assets/environment/water-stain.webp";
import exteriorURL from "../assets/environment/exterior.webp";

/** All assets resolve locally, including in the embedded offline document. */
export function createEnvironment(scene: THREE.Scene) {
  const textures: { url: string; target: THREE.Texture }[] = [];
  let loaded = false,
    disposed = false;
  let pending: Promise<void> | undefined;
  const loader = new THREE.TextureLoader();
  function texture(url: string, color = false) {
    const t = new THREE.Texture();
    textures.push({ url, target: t });
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  function surface(
    color: string,
    normal: string,
    orm: string,
    roughness = 1,
    metalness = 0,
  ) {
    const packed = texture(orm);
    return new THREE.MeshStandardMaterial({
      map: texture(color, true),
      normalMap: texture(normal),
      roughnessMap: packed,
      aoMap: packed,
      metalnessMap: packed,
      roughness,
      metalness,
      normalScale: new THREE.Vector2(0.45, 0.45),
      aoMapIntensity: 0.55,
    });
  }
  // One shared 2K scanned texture set, not duplicate GPU images per room/surface.
  const mobile =
    typeof window !== "undefined" &&
    (isAppleMobile() || matchMedia("(pointer: coarse)").matches);
  const masonry = surface(
    mobile ? mobileColor : rockColor,
    mobile ? mobileNormal : rockNormal,
    mobile ? mobileORM : rockORM,
  );
  masonry.name = "RockWall16";
  masonry.normalScale.set(0.65, 0.65);
  masonry.aoMapIntensity = 0.65;
  const floor = masonry.clone();
  floor.name = "RockWall16_Floor";
  floor.normalScale.set(0.28, 0.28);
  const concrete = masonry.clone();
  const ceiling = masonry.clone();
  ceiling.name = "RockWall16_Ceiling";
  ceiling.normalScale.set(0.4, 0.4);
  const metal = surface(metalColor, metalNormal, metalORM, 0.8, 0.65);
  const exterior = new THREE.MeshBasicMaterial({
    map: texture(exteriorURL, true),
  });
  for (const x of [-7, -12]) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), exterior);
    sky.position.set(x, 2.9, -12.3);
    scene.add(sky);
  }
  const stain = new THREE.MeshBasicMaterial({
    map: texture(stainURL, true),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const [x, y, z, w, h] of [
    [-7, 1.5, -11.227, 2.2, 1.6],
    [-12, 1.5, -11.227, 2.2, 1.6],
  ]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stain);
    decal.position.set(x, y, z);
    scene.add(decal);
  }
  // Localized damp beneath the existing washstand; visual only, no collision.
  const plumbingStain = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 1.35),
    stain,
  );
  plumbingStain.position.set(-8.612, 0.9, -7.8);
  plumbingStain.rotation.y = Math.PI / 2;
  scene.add(plumbingStain);
  const anchors: { name: string; root: THREE.Group }[] = [];
  const add = (name: string, x: number, y: number, z: number, rotation = 0) => {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotation;
    scene.add(root);
    anchors.push({ name, root });
    return root;
  };
  const load = (onProgress?: (completed: number, total: number) => void) => {
    if (loaded || disposed) return Promise.resolve();
    if (pending) return pending;
    let completed = 0;
    const track = <T>(task: Promise<T>) =>
      task.then((value) => {
        onProgress?.(++completed, textures.length + 6);
        return value;
      });
    pending = Promise.all([
      Promise.all(
        textures.map(({ url, target }) =>
          track(
            (async () => {
              const image = await loader.loadAsync(url);
              if (disposed) {
                image.dispose();
                return;
              }
              target.image = image.image;
              target.needsUpdate = true;
            })(),
          ),
        ),
      ),
      track(
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(modelURL),
      ),
      track(
        new GLTFLoader()
          .setMeshoptDecoder(MeshoptDecoder)
          .loadAsync(uploadedURL),
      ),
      track(
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(stairsURL),
      ),
      track(
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(boxURL),
      ),
      track(
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(palletURL),
      ),
      track(
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(bridgeURL),
      ),
    ])
      .then(([, gltf, uploaded, stairs, box, pallet, bridge]) => {
        if (disposed) {
          gltf.scene.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          return;
        }
        const batches = new Map<
          string,
          {
            geometry: THREE.BufferGeometry;
            material: THREE.Material | THREE.Material[];
            matrices: THREE.Matrix4[];
          }
        >();
        for (const anchor of anchors) {
          const suppliedName = anchor.name === "Bunk" ? "Table" : anchor.name;
          const template =
            [stairs, box, pallet, bridge]
              .map((g) => g.scene.getObjectByName(anchor.name))
              .find(Boolean) ||
            uploaded.scene.getObjectByName(suppliedName) ||
            gltf.scene.getObjectByName(anchor.name);
          if (!template)
            throw Error(`Missing environment model ${anchor.name}`);
          const clone = template.clone(true);
          clone.name = `CellAsset_${suppliedName}`;
          if (anchor.name === "Toilet") clone.scale.multiplyScalar(1.16);
          if (anchor.name === "Bunk")
            clone.scale.multiply(new THREE.Vector3(1.12, 1, 1.12));
          // Supplied roots contain metre/floor normalization: preserve transforms.
          if (
            ![
              "Bunk",
              "Toilet",
              "Screwdriver",
              "WoodStairs",
              "WoodBox",
              "CargoPallet",
              "MetalBridge",
            ].includes(anchor.name)
          )
            clone.position.set(0, 0, 0);
          clone.userData.sourceAsset = suppliedName;
          clone.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            o.castShadow = o.receiveShadow = true;
            const replace = (m: THREE.Material) =>
              m.name === "PaintedSteel" ? metal : m;
            o.material = Array.isArray(o.material)
              ? o.material.map(replace)
              : replace(o.material);
          });
          anchor.root.add(clone);
          // Reuse actual GLB primitives through spatially chunked instancing.
          // Opening movable fixtures and the inspected washstand remain unique.
          const movable =
            anchor.name === "Screwdriver" ||
            (anchor.name === "Bunk" &&
              anchor.root.position.x === -4.25 &&
              anchor.root.position.z === -8.4) ||
            (anchor.name === "Toilet" && anchor.root.position.x === -8.05) ||
            (anchor.name === "Sink" && anchor.root.position.x === -8.27);
          if (!movable) {
            anchor.root.updateMatrixWorld(true);
            clone.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              const materials = Array.isArray(o.material)
                ? o.material
                : [o.material];
              const key = [
                o.geometry.uuid,
                ...materials.map((m) => m.uuid),
                Math.floor(anchor.root.position.x / 8),
              ].join(":");
              const batch = batches.get(key) || {
                geometry: o.geometry,
                material: o.material,
                matrices: [] as THREE.Matrix4[],
              };
              batch.matrices.push(o.matrixWorld.clone());
              batches.set(key, batch);
              o.visible = false; // Retain inspectable source bounds, not duplicate draws.
            });
          }
        }
        for (const batch of batches.values()) {
          const mesh = new THREE.InstancedMesh(
            batch.geometry,
            batch.material,
            batch.matrices.length,
          );
          mesh.name = "CellFixtureInstances";
          batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
          mesh.instanceMatrix.needsUpdate = true;
          mesh.castShadow = mesh.receiveShadow = true;
          mesh.computeBoundingBox();
          mesh.computeBoundingSphere();
          scene.add(mesh);
        }
        loaded = true;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
  const dispose = () => {
    disposed = true;
    textures.forEach(({ target }) => target.dispose());
  };
  return { masonry, floor, concrete, ceiling, metal, add, load, dispose };
}
