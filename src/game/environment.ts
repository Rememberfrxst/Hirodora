import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import modelURL from "../assets/environment/cell-props.glb";
import brickColor from "../assets/environment/masonry-albedo.webp";
import brickNormal from "../assets/environment/masonry-normal.webp";
import brickORM from "../assets/environment/masonry-orm.webp";
import concreteColor from "../assets/environment/concrete-albedo.webp";
import concreteNormal from "../assets/environment/concrete-normal.webp";
import concreteORM from "../assets/environment/concrete-orm.webp";
import metalColor from "../assets/environment/metal-albedo.webp";
import metalNormal from "../assets/environment/metal-normal.webp";
import metalORM from "../assets/environment/metal-orm.webp";
import woolColor from "../assets/environment/wool-albedo.webp";
import woolNormal from "../assets/environment/wool-normal.webp";
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
  const masonry = surface(brickColor, brickNormal, brickORM);
  masonry.normalScale.set(0.23, 0.23);
  const floor = surface(concreteColor, concreteNormal, concreteORM, 1);
  floor.color.set(0xabab9c);
  floor.normalScale.set(0.3, 0.3);
  floor.aoMapIntensity = 0.25;
  const concrete = surface(concreteColor, concreteNormal, concreteORM, 1);
  concrete.color.set(0x9b9b8d);
  concrete.normalScale.set(0.2, 0.2);
  const metal = surface(metalColor, metalNormal, metalORM, 0.8, 0.65);
  const exterior = new THREE.MeshBasicMaterial({
    map: texture(exteriorURL, true),
  });
  for (const x of [-7, -12]) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), exterior);
    sky.position.set(x, 2.9, -12.3);
    scene.add(sky);
  }
  const wool = new THREE.MeshStandardMaterial({
    map: texture(woolColor, true),
    normalMap: texture(woolNormal),
    roughness: 1,
    normalScale: new THREE.Vector2(0.25, 0.25),
    color: 0x9caca0,
  });
  wool.map!.repeat.set(5, 5);
  wool.normalMap!.repeat.set(5, 5);
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
  const anchors: { name: string; root: THREE.Group }[] = [];
  const add = (name: string, x: number, y: number, z: number, rotation = 0) => {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotation;
    scene.add(root);
    anchors.push({ name, root });
    return root;
  };
  const load = () => {
    if (loaded || disposed) return Promise.resolve();
    if (pending) return pending;
    pending = Promise.all([
      Promise.all(
        textures.map(async ({ url, target }) => {
          const image = await loader.loadAsync(url);
          if (disposed) {
            image.dispose();
            return;
          }
          target.image = image.image;
          target.needsUpdate = true;
        }),
      ),
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(modelURL),
    ])
      .then(([, gltf]) => {
        if (disposed) {
          gltf.scene.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          return;
        }
        for (const anchor of anchors) {
          const template = gltf.scene.getObjectByName(anchor.name);
          if (!template)
            throw Error(`Missing environment model ${anchor.name}`);
          const clone = template.clone(true);
          clone.name = `CellAsset_${anchor.name}`;
          clone.position.set(0, 0, 0);
          clone.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            o.castShadow = o.receiveShadow = true;
            const replace = (m: THREE.Material) =>
              m.name === "PaintedSteel"
                ? metal
                : m.name === "BlanketWool"
                  ? wool
                  : m;
            o.material = Array.isArray(o.material)
              ? o.material.map(replace)
              : replace(o.material);
          });
          anchor.root.add(clone);
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
  return { masonry, floor, concrete, metal, wool, add, load, dispose };
}
