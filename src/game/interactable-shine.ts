import * as THREE from "three";
import type { PrisonWorldData } from "./world";

/** Depth-tested, local highlights. No bloom pass, x-ray outline or extra lights. */
export class InteractableShine {
  private texture: THREE.CanvasTexture;
  private entries: {
    id: string;
    root: THREE.Object3D;
    materials: {
      m: THREE.MeshStandardMaterial;
      color: THREE.Color;
      intensity: number;
    }[];
    sprite: THREE.Sprite;
  }[] = [];
  constructor(private world: PrisonWorldData) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const c = canvas.getContext("2d")!;
    const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 29);
    gradient.addColorStop(0, "#fffef2");
    gradient.addColorStop(0.18, "#fffddfbb");
    gradient.addColorStop(1, "#fffddf00");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = "#fffef0";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        r = i % 2 ? 3 : 29;
      c.lineTo(32 + Math.sin(a) * r, 32 + Math.cos(a) * r);
    }
    c.closePath();
    c.fill();
    this.texture = new THREE.CanvasTexture(canvas);
    const roots = [...world.pickupMeshes].map(([id, root]) => ({ id, root }));
    roots.push(
      { id: "bed_push", root: world.opening.bed },
      { id: "toilet_move", root: world.opening.toilet },
    );
    (world.opening.toilet.userData.bolts as THREE.Mesh[]).forEach((root, i) =>
      roots.push({ id: `toilet_bolt_${i}`, root }),
    );
    for (const { id, root } of roots) {
      const materials: {
        m: THREE.MeshStandardMaterial;
        color: THREE.Color;
        intensity: number;
      }[] = [];
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const copy = (m: THREE.Material) => {
          if (!(m instanceof THREE.MeshStandardMaterial)) return m;
          const clone = m.clone();
          materials.push({
            m: clone,
            color: m.emissive.clone(),
            intensity: m.emissiveIntensity,
          });
          return clone;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(copy)
          : copy(o.material);
      });
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.texture,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          opacity: 0,
          color: 0xfff4cd,
        }),
      );
      sprite.visible = false;
      world.scene.add(sprite);
      this.entries.push({ id, root, materials, sprite });
    }
  }
  update(
    camera: THREE.Camera,
    time: number,
    focus: string | null,
    region: boolean,
  ) {
    for (const [i, e] of this.entries.entries()) {
      const obj = this.world.interactables.find((o) => o.id === e.id);
      const distance = e.root
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(camera.position);
      const available =
        !region && e.root.visible && !!obj && !obj.disabled && distance < 5;
      const selected = focus === e.id;
      const pulse = (1 + Math.sin(time * 2.5 + i * 1.7)) / 2;
      for (const { m, color, intensity } of e.materials) {
        m.emissive.copy(color);
        m.emissiveIntensity = intensity;
        if (available) {
          m.emissive.set(0xb7c7a1);
          m.emissiveIntensity =
            (selected ? 0.018 : 0.0045) * (0.75 + pulse * 0.25);
        }
      }
      e.sprite.visible = available;
      if (!available) continue;
      const bounds = new THREE.Box3().setFromObject(e.root),
        point = bounds.getCenter(new THREE.Vector3());
      point.y = bounds.max.y + 0.025;
      e.sprite.position.copy(point);
      e.sprite.scale.setScalar(selected ? 0.1 : 0.065);
      (e.sprite.material as THREE.SpriteMaterial).rotation = time * 0.3;
      (e.sprite.material as THREE.SpriteMaterial).opacity =
        0.15 + 0.55 * pulse ** 8;
    }
  }
  dispose() {
    this.texture.dispose();
    for (const e of this.entries) {
      for (const { m } of e.materials) m.dispose();
      e.sprite.removeFromParent();
      (e.sprite.material as THREE.Material).dispose();
    }
  }
}
