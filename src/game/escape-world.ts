import * as THREE from "three";
import type { PrisonWorldData } from "./world";
import { CELL_ROOMS } from "./cell-block";
import { routeGuards, type EscapeRegion } from "./escape-route";
import type { InteractiveObject } from "./types";

/** Isolated, lazily constructed chapters. Existing officer LODs are shared;
 * only one chapter's geometry/lights/AI is active at a time. */
export class EscapeWorld {
  readonly roots = new Map<EscapeRegion, THREE.Group>();
  readonly colliders = new Map<EscapeRegion, THREE.Box3[]>();
  readonly actions = new Map<EscapeRegion, InteractiveObject[]>();
  readonly gates = new Map<
    string,
    { mesh: THREE.Group; bounds: THREE.Box3; region: EscapeRegion }
  >();
  private ownedMaterials = new Set<THREE.Material>();
  private sourceStone?: THREE.MeshStandardMaterial;
  private sourceFloor?: THREE.MeshStandardMaterial;
  readonly entry: THREE.Group;
  constructor(private world: PrisonWorldData) {
    world.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m instanceof THREE.MeshStandardMaterial) {
            if (m.name === "RockWall16") this.sourceStone = m;
            if (m.name === "RockWall16_Floor") this.sourceFloor = m;
          }
      }
    });
    const c = CELL_ROOMS.find((c) => c.number === 15)!;
    this.entry = new THREE.Group();
    this.entry.name = "Cell015_ConcealedSecurityDoor";
    this.entry.position.set(c.centerX, c.floorY, c.rear + 0.28);
    this.mesh(
      this.entry,
      [1.65, 2.65, 0.12],
      [0, 1.325, 0],
      this.mat(0x293c38, 0.72, 0.5),
    );
    for (const x of [-0.85, 0.85])
      this.mesh(
        this.entry,
        [0.09, 2.8, 0.2],
        [x, 1.4, 0],
        this.mat(0x525b54, 0.6, 0.6),
      );
    this.sign(this.entry, "SERVICE · 015", [0, 2.55, 0.08], 1.3);
    this.mesh(
      this.entry,
      [0.12, 0.055, 0.14],
      [0.6, 1.1, 0.13],
      this.mat(0x959a86, 0.4, 0.8),
    );
    world.scene.add(this.entry);
    world.interactables.push({
      id: "route_enter",
      name: "Concealed security door",
      prompt: "Open hidden security door",
      actionType: "door",
      position: [c.centerX, c.floorY + 1, c.rear + 0.6],
      radius: 2,
    });
  }
  private mat(color: number, roughness = 0.85, metalness = 0) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.ownedMaterials.add(m);
    return m;
  }
  private mesh(
    root: THREE.Object3D,
    size: number[],
    p: number[],
    mat: THREE.Material,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      mat,
    );
    m.position.fromArray(p);
    m.receiveShadow = true;
    if (
      mat instanceof THREE.MeshStandardMaterial &&
      mat.map?.wrapS === THREE.RepeatWrapping
    ) {
      const pos = m.geometry.getAttribute("position"),
        normal = m.geometry.getAttribute("normal"),
        uv = m.geometry.getAttribute("uv");
      for (let i = 0; i < pos.count; i++)
        uv.setXY(
          i,
          (Math.abs(normal.getX(i)) > 0.5
            ? pos.getZ(i) + p[2]
            : pos.getX(i) + p[0]) / 2,
          (Math.abs(normal.getY(i)) > 0.5
            ? pos.getZ(i) + p[2]
            : pos.getY(i) + p[1]) / 2,
        );
    }
    root.add(m);
    return m;
  }
  private sign(root: THREE.Object3D, text: string, p: number[], width = 2.6) {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#15201e";
    ctx.fillRect(0, 0, 768, 128);
    ctx.strokeStyle = "#92987e";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 752, 112);
    ctx.fillStyle = "#e5dfc2";
    ctx.textAlign = "center";
    ctx.font = "bold 42px monospace";
    ctx.fillText(text, 384, 81, 730);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.8 });
    this.ownedMaterials.add(mat);
    return this.mesh(root, [width, width / 6, 0.035], p, mat);
  }
  ensure(region: EscapeRegion) {
    if (this.roots.has(region)) return;
    const root = new THREE.Group();
    root.name = `EscapeChapter_${region}`;
    root.visible = false;
    this.roots.set(region, root);
    this.world.scene.add(root);
    const blocks: THREE.Box3[] = [],
      actions: InteractiveObject[] = [];
    this.colliders.set(region, blocks);
    this.actions.set(region, actions);
    const stone = this.mat(0x6b7164),
      steel = this.mat(0x384c47, 0.6, 0.75),
      concrete = this.mat(0x78796e),
      amber = this.mat(0xbba65f, 0.7),
      dark = this.mat(0x152121);
    // Reuse the game's existing masonry textures, including mobile derivatives.
    if (this.sourceStone) stone.copy(this.sourceStone);
    if (this.sourceFloor) concrete.copy(this.sourceFloor);
    if (region === "military") {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!,
        pixels = ctx.createImageData(256, 256);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const n = Math.sin(i * 78.233) * 43758.5453,
          v = 64 + Math.floor((n - Math.floor(n)) * 38);
        pixels.data.set([v, v + 2, v, 255], i);
      }
      ctx.putImageData(pixels, 0, 0);
      const grain = new THREE.CanvasTexture(c);
      grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
      grain.colorSpace = THREE.SRGBColorSpace;
      concrete.map = grain;
      concrete.normalMap = null;
      concrete.roughnessMap = null;
      concrete.aoMap = null;
      concrete.color.set(0xb9b7a2);
      concrete.roughness = 0.95;
    }
    const solid = (s: number[], p: number[], mat = stone) => {
      const m = this.mesh(root, s, p, mat);
      blocks.push(new THREE.Box3().setFromObject(m));
      return m;
    };
    const slab = (s: number[], p: number[], mat = concrete) =>
      this.mesh(root, s, p, mat);
    const action = (
      id: string,
      name: string,
      p: [number, number, number],
      radius = 2.1,
    ) =>
      actions.push({
        id,
        name,
        prompt: name,
        actionType: "interact",
        position: p,
        radius,
      });
    const lamp = (x: number, y: number, z: number) => {
      slab([1.5, 0.12, 0.3], [x, y, z], steel);
      const glow = new THREE.MeshStandardMaterial({
        color: 0xe1dfbc,
        emissive: 0xc9ceab,
        emissiveIntensity: 1.2,
      });
      this.ownedMaterials.add(glow);
      slab([1.3, 0.04, 0.22], [x, y - 0.08, z], glow);
      const light = new THREE.PointLight(0xe4d7aa, 18, 12, 2);
      light.position.set(x, y - 0.2, z);
      root.add(light);
    };
    const crate = (x: number, z: number, w = 1.8) => {
      const template = this.world.cargo.find((r) => r.name.includes("WoodBox"))
        ?.children[0];
      if (!template) {
        solid([w, 1.25, 1.5], [x, 0.625, z], steel);
        return;
      }
      const holder = new THREE.Group(),
        model = template.clone(true);
      model.traverse((o) => {
        o.visible = true;
      });
      holder.add(model);
      const bounds = new THREE.Box3().setFromObject(holder),
        size = bounds.getSize(new THREE.Vector3());
      holder.scale.set(w / size.x, 1.25 / size.y, 1.5 / size.z);
      holder.position.set(x, 0, z);
      model.position.add(
        new THREE.Vector3(
          -(bounds.min.x + bounds.max.x) / 2,
          -bounds.min.y,
          -(bounds.min.z + bounds.max.z) / 2,
        ),
      );
      root.add(holder);
      holder.updateMatrixWorld(true);
      blocks.push(new THREE.Box3().setFromObject(holder));
      // Clones share source GLB geometry/materials; do not dispose them twice.
      holder.traverse((o) => {
        o.userData.routeShared = true;
      });
    };
    root.add(
      new THREE.HemisphereLight(
        0xc9d8d2,
        0x3c4639,
        region === "military" ? 1.3 : 0.75,
      ),
    );
    if (region === "secret") {
      slab([36, 0.3, 12], [118, -0.15, 6]);
      slab([36, 0.22, 12], [118, 3.7, 6], dark);
      solid([0.35, 3.8, 12], [100, 1.9, 6]);
      solid([0.35, 3.8, 12], [136, 1.9, 6]);
      solid([36, 3.8, 0.35], [118, 1.9, 0]);
      solid([36, 3.8, 0.35], [118, 1.9, 12]);
      for (let i = 0; i < 3; i++) {
        const x = 106 + i * 12;
        this.sign(
          root,
          ["SECURITY · 01", "RADIO · 02", "COMMAND · 03"][i],
          [x, 2.9, 0.22],
          3,
        );
        lamp(x, 3.45, 5);
        crate(x + 2, 9);
        crate(x - 2, 3, 1.4);
        // Desks, cabinets, radio consoles and wall conduit distinguish the rooms.
        solid([3, 0.16, 0.85], [x, 0.85, 1.3], steel);
        for (const dx of [-1.3, 1.3])
          slab([0.08, 0.8, 0.7], [x + dx, 0.4, 1.3], steel);
        for (let j = 0; j < 3; j++) {
          slab([0.65, 0.42, 0.28], [x - 0.9 + j * 0.9, 1.13, 1.25], dark);
          slab([0.5, 0.25, 0.01], [x - 0.9 + j * 0.9, 1.15, 1.4], amber);
        }
        for (const z of [3, 5, 7]) {
          solid([0.7, 2.2, 1.5], [x + 3.7, 1.1, z], steel);
          for (let h = 0.25; h < 2; h += 0.45)
            slab([0.025, 0.035, 1.15], [x + 3.32, h, z], amber);
        }
        for (const z of [0.35, 11.65])
          slab([11.5, 0.1, 0.1], [x, 3.1, z], steel);
        for (const dx of [-5.5, 5.5])
          slab([0.12, 3.6, 0.12], [x + dx, 1.8, 0.3], steel);
      }
      for (const [i, x] of [
        [1, 112],
        [2, 124],
      ]) {
        solid([0.25, 3.8, 4.6], [x, 1.9, 2.3]);
        solid([0.25, 3.8, 4.6], [x, 1.9, 9.7]);
        solid([0.25, 1.2, 2.8], [x, 3.2, 6]);
        const gate = new THREE.Group();
        root.add(gate);
        this.mesh(gate, [0.18, 2.6, 2.8], [x, 1.3, 6], steel);
        this.sign(
          root,
          `SECTOR ${i + 1} · LOCK`,
          [x - 0.12, 2.95, 6],
          2,
        ).rotation.y = -Math.PI / 2;
        this.gates.set(`route_gate_${i}`, {
          mesh: gate,
          bounds: new THREE.Box3().setFromObject(gate),
          region,
        });
        action(`route_gate_${i}`, "Open security bulkhead", [x - 0.9, 1, 6]);
      }
      action("route_return", "Return to Cell 015", [101, 1, 6]);
      this.sign(root, "RETURN · C / 015", [100.2, 2.4, 6], 2).rotation.y =
        Math.PI / 2;
      slab([1.7, 0.06, 1.8], [132, 0.035, 10], steel);
      this.sign(root, "MAINTENANCE ↓", [132, 1.1, 11.78], 2.4);
      action("route_hatch", "Open underground escape hatch", [132, 1, 10]);
      // An actual enclosed below-floor tunnel, reached through a ladder transition.
      slab([7, 0.3, 26], [132, -4.15, 22]);
      slab([7, 0.3, 26], [132, -1.2, 22], dark);
      solid([0.3, 3, 26], [128.3, -2.5, 22]);
      solid([0.3, 3, 26], [135.7, -2.5, 22]);
      solid([7, 3, 0.3], [132, -2.5, 35]);
      solid([7, 3, 0.3], [132, -2.5, 9]);
      for (const z of [11, 20, 30]) lamp(132, -1.45, z);
      for (const z of [10.4, 33])
        for (let y = -3.8; y < -1; y += 0.32)
          slab([1.1, 0.045, 0.045], [132, y, z], amber);
      this.sign(root, "ISLAND DEFENCE →", [132, -2, 34.8], 3);
      action("route_climb_back", "Climb back to command room", [132, -3, 10.4]);
      action("route_military", "Climb to military compound", [132, -3, 33]);
    } else {
      slab([98, 0.4, 70], [229, -0.2, 0]);
      for (let x = 185; x < 276; x += 6)
        slab([3.2, 0.008, 0.13], [x, 0.012, 0], amber);
      for (const z of [-4.2, 4.2]) slab([96, 0.1, 0.18], [229, 0.05, z], steel);
      const moon = new THREE.DirectionalLight(0xc8dcdf, 1.8);
      moon.position.set(200, 50, -35);
      root.add(moon);
      for (const z of [-35, 35]) {
        solid([98, 4, 0.4], [229, 2, z], concrete);
        for (let x = 183; x < 278; x += 4)
          slab([0.08, 0.7, 0.08], [x, 4.2, z], steel);
      }
      solid([0.4, 4, 70], [180, 2, 0], concrete);
      solid([0.4, 4, 31], [277, 2, -19.5], concrete);
      solid([0.4, 4, 31], [277, 2, 19.5], concrete);
      for (let i = 0; i < 4; i++) {
        const x = 199 + i * 19;
        // Open-ended barracks provide real cover, not painted facades.
        for (const z of [-25, 25]) {
          solid([11, 3.2, 0.3], [x, 1.6, z], steel);
          solid([0.3, 3.2, 8], [x - 5.5, 1.6, z + (z < 0 ? -4 : 4)], steel);
          slab([12, 0.25, 9], [x, 3.35, z + (z < 0 ? -4 : 4)], dark);
          this.sign(
            root,
            `BARRACK ${i + 1}`,
            [x, 2.4, z + (z < 0 ? 0.2 : -0.2)],
            3,
          ).rotation.y = z < 0 ? 0 : Math.PI;
          for (let k = -4; k <= 4; k += 2) {
            slab(
              [0.025, 2.6, 0.09],
              [x + k, 1.4, z + (z < 0 ? 0.18 : -0.18)],
              amber,
            );
            slab(
              [1.2, 0.7, 0.06],
              [x + k, 1.6, z + (z < 0 ? 0.2 : -0.2)],
              dark,
            );
          }
        }
        crate(x, 7);
        crate(x + 5, -7);
        crate(x + 7, 18, 2.4);
        lamp(x, 5, 0);
        slab([0.12, 5, 0.12], [x, 2.5, 1], steel);
        for (const z of [-32, 32]) {
          slab([3, 0.25, 3], [x, 5.2, z], steel);
          for (const dx of [-1.3, 1.3])
            slab([0.12, 5, 0.12], [x + dx, 2.5, z], steel);
          slab([3.5, 0.22, 3.5], [x, 7.1, z], dark);
        }
      }
      this.sign(root, "ISLAND DEFENCE · RESTRICTED", [184, 3.2, -3], 5);
      action(
        "route_tunnel_return",
        "Return to underground tunnel",
        [182, 1, 0],
      );
      for (const [i, x] of [
        [1, 219],
        [2, 251],
      ]) {
        slab([0.7, 1.1, 0.6], [x, 0.55, 2], steel);
        this.sign(root, "RALLY · SAVE", [x, 1.7, 2], 1.8);
        action(`route_rally_${i}`, "Activate secured rally checkpoint", [
          x,
          1,
          1,
        ]);
      }
      const gate = new THREE.Group();
      root.add(gate);
      this.mesh(gate, [0.25, 3.4, 8], [277, 1.7, 0], steel);
      this.gates.set("route_sea_gate", {
        mesh: gate,
        bounds: new THREE.Box3().setFromObject(gate),
        region,
      });
      action("route_sea_gate", "Release dock security gate", [275.8, 1, 0]);
      this.sign(root, "EVACUATION DOCK →", [274, 3.8, 0], 4).rotation.y =
        -Math.PI / 2;
      for (let x = 277.1; x < 285; x += 0.32)
        slab(
          [0.29, 0.3, 6],
          [x, -0.15, 0],
          this.mat(x % 1 < 0.5 ? 0x514d3a : 0x5e5841),
        );
      for (const z of [-3, 3])
        for (let x = 278; x < 285; x += 2) {
          solid([0.1, 1.1, 0.1], [x, 0.55, z], steel);
          slab([2, 0.08, 0.08], [x, 1.1, z], steel);
        }
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(250, 200),
        this.mat(0x173f47, 0.26, 0.6),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(290, -1.1, 0);
      root.add(water);
      const boat = new THREE.Group();
      boat.name = "IslandEscapeBoat";
      root.add(boat);
      boat.position.set(287, -0.05, 0);
      boat.rotation.y = Math.PI / 2;
      const shape = new THREE.Shape([
        new THREE.Vector2(-0.9, -1.8),
        new THREE.Vector2(-1.1, 1.4),
        new THREE.Vector2(0, 2.7),
        new THREE.Vector2(1.1, 1.4),
        new THREE.Vector2(0.9, -1.8),
      ]);
      shape.holes.push(
        new THREE.Path([
          new THREE.Vector2(0.7, -1.45),
          new THREE.Vector2(0.82, 1.2),
          new THREE.Vector2(0, 2.05),
          new THREE.Vector2(-0.82, 1.2),
          new THREE.Vector2(-0.7, -1.45),
        ]),
      );
      const hull = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.65,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.06,
          bevelThickness: 0.04,
        }),
        this.mat(0x263c37, 0.8, 0.2),
      );
      hull.rotation.x = Math.PI / 2;
      hull.position.y = 0.6;
      boat.add(hull);
      this.mesh(boat, [1.5, 0.18, 3.5], [0, 0.4, 0], this.mat(0x5e5b46));
      for (const z of [-1.3, 0, 1.3])
        this.mesh(boat, [1.65, 0.13, 0.32], [0, 0.65, z], steel);
      this.mesh(boat, [0.55, 0.9, 0.5], [0, 0.45, -2.05], dark);
      this.sign(root, "BOARD · FREEDOM", [287, 1.8, 0], 2.5).rotation.y =
        -Math.PI / 2;
      action(
        "route_boat",
        "Board boat and escape the island",
        [287, 1, 0],
        2.8,
      );
    }
    for (const guard of routeGuards(region)) {
      const mesh = new THREE.Group();
      mesh.position.fromArray(guard.position);
      root.add(mesh);
      this.world.guards.push(guard);
      this.world.guardMeshes.set(guard.id, mesh);
    }
  }
  blockers(region: EscapeRegion, flags: Record<string, boolean>) {
    return [
      ...(this.colliders.get(region) || []),
      ...[...this.gates]
        .filter(([id, g]) => g.region === region && !flags[id])
        .map(([, g]) => g.bounds),
    ];
  }
  sync(flags: Record<string, boolean>) {
    for (const [id, g] of this.gates) g.mesh.visible = !flags[id];
  }
  dispose() {
    for (const root of [this.entry, ...this.roots.values()]) {
      root.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          !(o instanceof THREE.SkinnedMesh) &&
          !o.userData.routeShared
        )
          o.geometry.dispose();
      });
      root.removeFromParent();
    }
    for (const m of this.ownedMaterials) {
      if (
        m instanceof THREE.MeshStandardMaterial &&
        m.map instanceof THREE.CanvasTexture
      )
        m.map.dispose();
      m.dispose();
    }
  }
}
