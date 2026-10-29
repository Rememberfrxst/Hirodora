import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GuardData, InteractiveObject } from "./types";
import { buildHumanOfficer } from "./characters";
import { createEnvironment } from "./environment";
import {
  CELL_BLOCK,
  CELL_ROOMS,
  CELL_GATE_WIDTH,
  type CellRoom,
} from "./cell-block";
import { ATRIUM, STAIR_OPENINGS, stairPoint, upperFloorAt } from "./atrium";
import { configureCellSlider } from "./cell-gates";
import { CARGO } from "./cargo-layout";
import cargoAssets from "../assets/environment/cargo-manifest.json";
import { CROSS_BRIDGE } from "./cross-bridge";

export interface PrisonWorldData {
  cells: readonly CellRoom[];
  scene: THREE.Scene;
  cargo: THREE.Group[];
  loadEnvironment: (
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<void>;
  disposeEnvironment: () => void;
  windowLight: THREE.SpotLight;
  colliders: THREE.Box3[];
  visionColliders: THREE.Box3[];
  doors: Map<string, THREE.Group>;
  doorColliders: Map<string, THREE.Box3>;
  interactables: InteractiveObject[];
  guards: GuardData[];
  guardMeshes: Map<string, THREE.Group>;
  pickupMeshes: Map<string, THREE.Object3D>;
  rescuedBoulder: THREE.Group;
  cell46NPC: THREE.Group;
  waterMesh: THREE.Mesh;
  searchlight: THREE.SpotLight;
  soundMaskingMachinePos: [number, number, number];
  dustParticles: THREE.Points;
  opening: {
    bed: THREE.Group;
    toilet: THREE.Group;
    bedBounds: THREE.Box3;
    toiletBounds: THREE.Box3;
    passageSeal: THREE.Mesh;
    passageBounds: THREE.Box3;
    body: THREE.Group;
    legacyVent: THREE.Group;
  };
}

const material = (color: number, roughness = 0.75, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const iron = material(0x354046, 0.48, 0.75);
const rust = material(0x614e3d, 0.85, 0.45);
const linen = material(0xa2a498, 0.96);
const wool = material(0x374d50, 0.98);
const ceramic = material(0xc8cfbc, 0.28);
const wood = material(0x584234, 0.88);
const dark = material(0x161d22, 0.62);
const brass = material(0xc9a669, 0.35, 0.65);

function box(
  parent: THREE.Object3D,
  size: number[],
  pos: number[],
  mat: THREE.Material,
  round = 0,
) {
  const geometry = round
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, round)
    : new THREE.BoxGeometry(...(size as [number, number, number]));
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...(pos as [number, number, number]));
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(
  parent: THREE.Object3D,
  size: number[],
  pos: number[],
  mat: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
  mesh.scale.set(...(size as [number, number, number]));
  mesh.position.set(...(pos as [number, number, number]));
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  pos: number[],
  mat = iron,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 10),
    mat,
  );
  mesh.position.set(...(pos as [number, number, number]));
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function label(
  parent: THREE.Object3D,
  text: string,
  pos: number[],
  width = 2,
  color = "#d9d3b9",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#172526";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#697068";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color;
  ctx.font = "bold 46px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66, 475);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return box(
    parent,
    [width, width / 4, 0.025],
    pos,
    new THREE.MeshStandardMaterial({ map, roughness: 0.85 }),
  );
}

// Uploaded table: 1.2821 x .82 x 2.1643m. Keep the saved "bed" puzzle IDs,
// but do not leave an invisible two-metre-high bunk collider above the table.
function buildTableBounds() {
  const group = new THREE.Group();
  box(group, [1.435952, 0.82, 2.423216], [0, 0.36, 0], iron);
  return group;
}

function buildLegacyToiletBounds() {
  const group = new THREE.Group();
  box(group, [0.648294, 1.1368, 1.011226], [0, 0.5184, 0], ceramic);
  return group;
}

// Legacy supporting NPCs remain outside the patrol-officer overhaul.
const buildSupportingNPC = buildHumanOfficer;

export function buildPrisonWorld(scene: THREE.Scene): PrisonWorldData {
  scene.background = new THREE.Color(0x18252b);
  scene.fog = new THREE.FogExp2(0x344039, 0.033);
  const staticWorld = new THREE.Group();
  scene.add(staticWorld);
  const colliders: THREE.Box3[] = [];
  const barredFaces = new Set<THREE.Box3>();
  const doors = new Map<string, THREE.Group>();
  const doorColliders = new Map<string, THREE.Box3>();
  const interactables: InteractiveObject[] = [];
  const environment = createEnvironment(scene);
  const stone = environment.masonry;
  const concrete = environment.concrete;
  iron.copy(environment.metal);
  const plaster = concrete.clone();
  const floor = environment.floor;
  const wall = (size: number[], pos: number[], mat: THREE.Material = stone) => {
    if (pos[1] === 2 && size[1] >= 4.2) {
      size = [size[0], size[1] + 1, size[2]];
      pos = [pos[0], 2.5, pos[2]];
    }
    const mesh = box(staticWorld, size, pos, mat);
    // World-space 2m repeat on every face, including low partitions and piers.
    projectUV(mesh, 2);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  };
  const prop = (
    model: THREE.Group,
    x: number,
    z: number,
    rotation = 0,
    y = 0,
  ) => {
    model.position.set(x, y, z);
    model.rotation.y = rotation;
    // Collision proxies are not rendered; furniture proxies match replacement size.
    colliders.push(new THREE.Box3().setFromObject(model));
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    return model;
  };
  const interaction = (
    id: string,
    name: string,
    prompt: string,
    x: number,
    z: number,
    actionType: InteractiveObject["actionType"],
    actionRequiredItem?: InteractiveObject["actionRequiredItem"],
  ) => {
    interactables.push({
      id,
      name,
      prompt,
      position: [x, 1, z],
      radius: 1.85,
      actionType,
      actionRequiredItem,
    });
  };
  const ground = box(staticWorld, [33.1, 0.3, 23], [13.45, -0.15, 0], floor);
  const projectUV = (mesh: THREE.Mesh, scale: number) => {
    const p = mesh.geometry.getAttribute("position"),
      n = mesh.geometry.getAttribute("normal"),
      uv = mesh.geometry.getAttribute("uv");
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        (Math.abs(n.getX(i)) > 0.5
          ? p.getZ(i) + mesh.position.z
          : p.getX(i) + mesh.position.x) / scale,
        (Math.abs(n.getY(i)) > 0.5
          ? p.getZ(i) + mesh.position.z
          : p.getY(i) + mesh.position.y) / scale,
      );
  };
  projectUV(ground, 2);
  // Tall, uninterrupted roof: fixtures are ceiling mounted without dangling beams.
  projectUV(
    box(staticWorld, [33.1, 0.22, 23], [13.45, 5.18, 0], environment.ceiling),
    2,
  );
  const blockLength = CELL_BLOCK.east - CELL_BLOCK.west,
    blockCenter = (CELL_BLOCK.east + CELL_BLOCK.west) / 2,
    blockWidth = CELL_BLOCK.south - CELL_BLOCK.north,
    centerZ = ATRIUM.centerZ;
  wall([0.5, 9.1, blockWidth], [CELL_BLOCK.west, 0.7, centerZ]);
  wall(
    [blockLength, -ATRIUM.depth, 0.5],
    [blockCenter, ATRIUM.depth / 2, CELL_BLOCK.north],
  );
  wall([blockLength, 9.1, 0.5], [blockCenter, 0.7, CELL_BLOCK.south]);
  wall([0.35, 9.1, 12.5], [CELL_BLOCK.east, 0.7, ATRIUM.south + 6.25]);
  wall(
    [0.35, 5.2, ATRIUM.south - 2],
    [CELL_BLOCK.east, 2.6, (ATRIUM.south + 2) / 2],
  );
  wall(
    [0.35, -ATRIUM.depth, ATRIUM.south - CELL_BLOCK.north],
    [CELL_BLOCK.east, ATRIUM.depth / 2, (ATRIUM.south + CELL_BLOCK.north) / 2],
  );
  wall(
    [-16 - CELL_BLOCK.west, 4.3, 0.5],
    [(CELL_BLOCK.west - 16) / 2, 2, CELL_BLOCK.north],
  );
  projectUV(
    box(
      staticWorld,
      [blockLength, 0.22, blockWidth],
      [blockCenter, 5.18, centerZ],
      environment.ceiling,
    ),
    2,
  );
  // Both complete lower rows sit underneath the existing large upper cells.
  projectUV(
    box(
      staticWorld,
      [blockLength, 0.3, blockWidth],
      [blockCenter, ATRIUM.depth - 0.15, centerZ],
      floor,
    ),
    2,
  );
  type FloorRect = { minX: number; maxX: number; minZ: number; maxZ: number };
  let upperFloors: FloorRect[] = [
    {
      minX: CELL_BLOCK.west,
      maxX: CELL_BLOCK.east,
      minZ: CELL_BLOCK.north,
      maxZ: ATRIUM.north,
    },
    {
      minX: CELL_BLOCK.west,
      maxX: CELL_BLOCK.east,
      minZ: ATRIUM.south,
      maxZ: CELL_BLOCK.south,
    },
    {
      minX: CELL_BLOCK.west,
      maxX: CELL_BLOCK.west + 3,
      minZ: ATRIUM.north,
      maxZ: ATRIUM.south,
    },
    {
      minX: CELL_BLOCK.east - 3,
      maxX: CELL_BLOCK.east,
      minZ: ATRIUM.north,
      maxZ: ATRIUM.south,
    },
  ];
  // Cut real openings in both the visual slabs and cross-floor occlusion.
  for (const h of STAIR_OPENINGS)
    upperFloors = upperFloors.flatMap((r) => {
      const a = Math.max(r.minX, h.minX),
        b = Math.min(r.maxX, h.maxX),
        c = Math.max(r.minZ, h.minZ),
        d = Math.min(r.maxZ, h.maxZ);
      if (a >= b || c >= d) return [r];
      return [
        { ...r, maxX: a },
        { ...r, minX: b },
        { minX: a, maxX: b, minZ: r.minZ, maxZ: c },
        { minX: a, maxX: b, minZ: d, maxZ: r.maxZ },
      ].filter((p) => p.maxX - p.minX > 0.001 && p.maxZ - p.minZ > 0.001);
    });
  const floorOccluders: THREE.Box3[] = [];
  for (const r of upperFloors) {
    projectUV(
      box(
        staticWorld,
        [r.maxX - r.minX, 0.3, r.maxZ - r.minZ],
        [(r.minX + r.maxX) / 2, -0.15, (r.minZ + r.maxZ) / 2],
        floor,
      ),
      2,
    );
    floorOccluders.push(
      new THREE.Box3(
        new THREE.Vector3(r.minX, -0.3, r.minZ),
        new THREE.Vector3(r.maxX, 0, r.maxZ),
      ),
    );
  }
  const rail = (x1: number, z1: number, x2: number, z2: number, y = 0) => {
    const length = Math.hypot(x2 - x1, z2 - z1),
      root = new THREE.Group();
    for (const h of [0.12, 0.58, 1.1])
      box(root, [length, 0.055, 0.055], [length / 2, y + h, 0], iron, 0.014);
    for (let p = 0; p <= length; p += 0.45)
      box(root, [0.032, 1.08, 0.032], [p, y + 0.55, 0], iron, 0.009);
    root.position.set(x1, 0, z1);
    root.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    staticWorld.add(root);
    const bounds = new THREE.Box3().setFromObject(root);
    colliders.push(bounds);
    barredFaces.add(bounds);
  };
  for (const z of [ATRIUM.north, ATRIUM.south]) {
    const gaps = [
      {
        minX: CROSS_BRIDGE.x - CROSS_BRIDGE.width / 2,
        maxX: CROSS_BRIDGE.x + CROSS_BRIDGE.width / 2,
      },
      ...STAIR_OPENINGS.filter((h) => z >= h.minZ && z <= h.maxZ),
    ].sort((a, b) => a.minX - b.minX);
    let start = CELL_BLOCK.west + 3;
    for (const gap of gaps) {
      if (gap.minX > start)
        rail(start, z, Math.min(gap.minX, CELL_BLOCK.east - 3), z);
      start = Math.max(start, gap.maxX);
    }
    if (start < CELL_BLOCK.east - 3) rail(start, z, CELL_BLOCK.east - 3, z);
  }
  const crossBridge = environment.add(
    "MetalBridge",
    CROSS_BRIDGE.x,
    0,
    CROSS_BRIDGE.centerZ,
  );
  crossBridge.name = "Cell041_054_MetalBridge";
  colliders.push(
    new THREE.Box3(
      new THREE.Vector3(CROSS_BRIDGE.x - 0.82, -0.06, CROSS_BRIDGE.north - 0.1),
      new THREE.Vector3(CROSS_BRIDGE.x + 0.82, 0, CROSS_BRIDGE.south + 0.1),
    ),
  );
  for (const x of [
    CROSS_BRIDGE.x - CROSS_BRIDGE.railOffset,
    CROSS_BRIDGE.x + CROSS_BRIDGE.railOffset,
  ]) {
    const b = new THREE.Box3(
      new THREE.Vector3(x - 0.025, 0, CROSS_BRIDGE.north - 0.1),
      new THREE.Vector3(x + 0.025, 1.1, CROSS_BRIDGE.south + 0.1),
    );
    colliders.push(b);
    barredFaces.add(b);
  }
  for (const x of [CELL_BLOCK.west + 3, CELL_BLOCK.east - 3]) {
    const hole = STAIR_OPENINGS.find((h) => x > h.minX && x < h.maxX);
    if (!hole) rail(x, ATRIUM.north, x, ATRIUM.south);
    else {
      if (hole.minZ > ATRIUM.north) rail(x, ATRIUM.north, x, hole.minZ);
      if (hole.maxZ < ATRIUM.south) rail(x, hole.maxZ, x, ATRIUM.south);
    }
  }
  // Horizontal safety rails around the cutouts, leaving each top landing open.
  for (const [index, h] of STAIR_OPENINGS.entries()) {
    const stair = ATRIUM.stairs[index],
      topEdge =
        Math.abs(h.minZ - stair.topZ) < Math.abs(h.maxZ - stair.topZ)
          ? h.minZ
          : h.maxZ;
    for (const [x1, z1, x2, z2, nx, nz] of [
      [h.minX, h.minZ, h.minX, h.maxZ, -1, 0],
      [h.maxX, h.minZ, h.maxX, h.maxZ, 1, 0],
      ...[h.minZ, h.maxZ]
        .filter((z) => z !== topEdge)
        .map((z) => [h.minX, z, h.maxX, z, 0, Math.sign(z - stair.topZ)]),
    ]) {
      const length = Math.hypot(x2 - x1, z2 - z1),
        count = Math.ceil(length / 0.15);
      let begin: number | undefined;
      for (let i = 0; i <= count; i++) {
        const t = (i + 0.5) / count,
          hasFloor =
            i < count &&
            upperFloorAt(
              x1 + (x2 - x1) * t + nx * 0.05,
              z1 + (z2 - z1) * t + nz * 0.05,
            );
        if (hasFloor && begin === undefined) begin = i / count;
        if (!hasFloor && begin !== undefined) {
          const end = i / count;
          rail(
            x1 + (x2 - x1) * begin,
            z1 + (z2 - z1) * begin,
            x1 + (x2 - x1) * end,
            z1 + (z2 - z1) * end,
          );
          begin = undefined;
        }
      }
    }
  }
  for (const stair of ATRIUM.stairs) {
    // The imported staircase includes its own wooden treads/posts/handrails.
    // Its real tread heights are also the authoritative navigation surface.
    const stairsRoot = environment.add(
      "WoodStairs",
      stair.x,
      ATRIUM.depth,
      stair.bottomZ,
      stair.topZ > stair.bottomZ ? -Math.PI / 2 : Math.PI / 2,
    );
    stairsRoot.name = `Stairs_Cell${stair.cell}`;
    stairsRoot.scale.set(
      Math.abs(stair.topZ - stair.bottomZ) / 7.2,
      -ATRIUM.depth / 3.2,
      1,
    );
    // Physical rail proxies transmit sight/hearing, matching the open wood rails.
    for (const x of [stair.x - 0.86, stair.x + 0.86])
      for (let i = 0; i < 16; i++) {
        const a = stairPoint(stair, i / 16),
          b = stairPoint(stair, (i + 1) / 16);
        const railBounds = new THREE.Box3(
          new THREE.Vector3(
            x - 0.035,
            Math.min(a[1], b[1]),
            Math.min(a[2], b[2]) - 0.01,
          ),
          new THREE.Vector3(
            x + 0.035,
            Math.max(a[1], b[1]) + 1.31,
            Math.max(a[2], b[2]) + 0.01,
          ),
        );
        colliders.push(railBounds);
        barredFaces.add(railBounds);
      }
  }
  const cargo = CARGO.map(({ asset, x, y, z, yaw }) => {
    const root = environment.add(asset, x, y, z, yaw);
    root.name = `LowerHall_${asset}`;
    const source = cargoAssets.sources.find((s) => s.name === asset)!;
    root.updateMatrixWorld(true);
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(...source.bounds.min),
        new THREE.Vector3(...source.bounds.max),
      ).applyMatrix4(root.matrixWorld),
    );
    return root;
  });
  for (let x = -64; x < -5; x += 5.5) {
    for (const z of [-0.5, centerZ, CELL_BLOCK.southFront - 1.5]) {
      environment.add("Luminaire", x, 4.8, z);
      const light = new THREE.PointLight(
        0xb8cebd,
        z === centerZ ? 52 : 24,
        18,
        2,
      );
      light.position.set(x, 4.65, z);
      scene.add(light);
    }
    for (const z of [-0.5, CELL_BLOCK.southFront - 1.5]) {
      environment.add("Luminaire", x, -0.65, z);
      const light = new THREE.PointLight(0xc6d0b6, 19, 10, 2);
      light.position.set(x, -0.8, z);
      scene.add(light);
    }
  }
  const rearWall = wall([46, 4.3, 0.5], [7, 2, -11.5]);
  // Keep the original solid gameplay/vision collider, but cut real visual apertures.
  staticWorld.remove(rearWall);
  for (const [left, right] of [
    [-16, -12.8],
    [-11.2, -7.8],
    [-6.2, 30],
  ])
    projectUV(
      box(
        staticWorld,
        [right - left, 4.3, 0.5],
        [(left + right) / 2, 2, -11.5],
        stone,
      ),
      2,
    );
  for (const x of [-12, -7]) {
    projectUV(box(staticWorld, [1.6, 2.35, 0.5], [x, 1.025, -11.5], stone), 2);
    projectUV(box(staticWorld, [1.6, 0.7, 0.5], [x, 3.8, -11.5], stone), 2);
  }
  wall([46, 1.1, 0.5], [7, 4.65, -11.5]);
  wall([33.1, 4.3, 0.5], [13.45, 2, 11.5]);
  wall([0.5, 4.3, 23], [30, 2, 0]);
  // Cell partitions. The only escape from Cell 47 is the serviced ventilation duct.
  for (const x of [-14, -3.1]) wall([0.35, 4.2, 9.3], [x, 2, -6.7]);
  // The opening is real geometry; only its removable seal blocks the crawl route.
  wall([0.35, 4.2, 1.05], [-8.8, 2, -10.825]);
  wall([0.35, 4.2, 7.05], [-8.8, 2, -5.525]);
  wall([0.35, 3.95, 1.2], [-8.8, 3.125, -9.7]);
  const passageSeal = box(
    scene,
    [0.36, 1.15, 1.18],
    [-8.8, 0.525, -9.7],
    concrete,
  );
  projectUV(passageSeal, 2);
  const passageBounds = new THREE.Box3().setFromObject(passageSeal);
  function bars(
    left: number,
    right: number,
    z: number,
    bottom: number,
    top: number,
  ) {
    const width = right - left,
      count = Math.ceil(width / 0.19),
      height = top - bottom;
    if (height <= 0.01 || width <= 0.01) return;
    for (let i = 0; i <= count; i++)
      cylinder(staticWorld, 0.022, height, [
        left + (width * i) / count,
        (bottom + top) / 2,
        z,
      ]);
    for (const y of [
      bottom + 0.06,
      ...(height > 1.5 ? [bottom + 1.3] : []),
      top - 0.06,
    ])
      box(staticWorld, [width, 0.075, 0.075], [(left + right) / 2, y, z], iron);
    const face = new THREE.Box3(
      new THREE.Vector3(left - 0.025, bottom, z - 0.055),
      new THREE.Vector3(right + 0.025, top, z + 0.055),
    );
    colliders.push(face);
    barredFaces.add(face);
  }
  function door(
    id: string,
    x: number,
    z: number,
    width = 1.4,
    across = false,
    floorY = 0,
    height = 3.4,
    rollers = false,
  ) {
    const group = new THREE.Group();
    const count = Math.ceil(width / 0.2);
    for (let i = 0; i <= count; i++)
      cylinder(group, 0.028, height, [(i * width) / count, height / 2, 0]);
    for (const y of [0.18, 1.4, height - 0.12])
      box(group, [width, 0.08, 0.07], [width / 2, y, 0], iron);
    box(group, [0.2, 0.23, 0.08], [width * 0.8, 1.4, 0.03], rust);
    if (rollers)
      for (const wheelX of [0.16, width - 0.16])
        cylinder(
          group,
          0.05,
          0.04,
          [wheelX, height + 0.06, 0],
          iron,
        ).rotation.x = Math.PI / 2;
    group.position.set(x, floorY, z);
    group.userData.floorY = floorY;
    if (across) group.rotation.y = Math.PI / 2;
    const closedBounds = new THREE.Box3()
      .setFromObject(group)
      .expandByScalar(0.03);
    // Gates keep independent transforms, but their welded bars draw as one mesh
    // per material instead of eleven draw calls for every single cell door.
    const pieces = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of group.children) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material))
        continue;
      child.updateMatrix();
      const geometry = child.geometry.clone().applyMatrix4(child.matrix);
      const list = pieces.get(child.material) || [];
      list.push(geometry);
      pieces.set(child.material, list);
      child.geometry.dispose();
    }
    group.clear();
    for (const [mat, geometries] of pieces) {
      const geometry = mergeGeometries(geometries, false)!;
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      geometries.forEach((g) => g.dispose());
    }
    group.userData.closedBounds = closedBounds.clone();
    scene.add(group);
    doors.set(id, group);
    doorColliders.set(id, closedBounds);
    return group;
  }
  function cellEntrance(cell: CellRoom) {
    const { left, right, doorX: x, front: z, number, floorY: y, level } = cell;
    const width = CELL_GATE_WIDTH,
      height = level === "upper" ? 2.8 : 2.6,
      wallHeight = level === "upper" ? 4.62 : 2.72;
    // Recessed masonry above each independent steel frontage; its small
    // clerestory reveal leaves the exterior roller track unobstructed.
    const ceiling = level === "upper" ? 5.06 : 3.5;
    const inward = cell.side === "north" ? -0.13 : 0.13;
    wall(
      [right - left, ceiling - wallHeight, 0.16],
      [(left + right) / 2, y + (ceiling + wallHeight) / 2, z + inward],
    );
    const sign = label(
      scene,
      `C / ${String(number).padStart(3, "0")}`,
      [
        (left + right) / 2,
        y + (level === "upper" ? 3.38 : 3.12),
        z + (cell.side === "north" ? 0.025 : -0.025),
      ],
      1.65,
    );
    sign.name = `CellNumber_${number}`;
    sign.userData.cellNumber = number;
    if (cell.side === "south") sign.rotation.y = Math.PI;
    // Full-room steel frontage with a human-sized sliding wicket in its own track.
    bars(left + 0.12, x - 0.07, z, y, y + wallHeight);
    bars(x + width + 0.07, right - 0.12, z, y, y + wallHeight);
    bars(x - 0.02, x + width + 0.02, z, y + height + 0.08, y + wallHeight);
    for (const j of [left + 0.1, right - 0.1])
      box(
        staticWorld,
        [0.09, wallHeight, 0.12],
        [j, y + wallHeight / 2, z],
        iron,
        0.01,
      );
    for (const j of [x - 0.045, x + width + 0.045])
      box(
        staticWorld,
        [0.09, height + 0.08, 0.16],
        [j, y + (height + 0.08) / 2, z],
        iron,
        0.012,
      );
    const lane = z + (cell.side === "north" ? 0.14 : -0.14);
    box(
      staticWorld,
      [right - left - 0.22, 0.1, 0.16],
      [(left + right) / 2, y + height + 0.13, lane],
      iron,
      0.015,
    );
    box(
      staticWorld,
      [width, 0.025, 0.18],
      [x + width / 2, y + 0.0125, z],
      iron,
    );
    const leaf = door(
      `cell_${number}_door`,
      x,
      lane,
      width,
      false,
      y,
      height,
      true,
    );
    configureCellSlider(leaf, cell);
  }
  for (const cell of CELL_ROOMS.filter(
    (c) => c.number === 46 || c.number === 47,
  ))
    cellEntrance(cell);
  for (let n = 45; n >= 36; n--) {
    const cx = -17 - (45 - n) * 5.5;
    wall([0.35, 4.2, 9.3], [cx - 2.75, 2, -6.7]);
    cellEntrance(CELL_ROOMS.find((c) => c.number === n)!);
    environment.add("Bunk", cx + 1.7, -0.05, -8.4, Math.PI);
    environment.add("Toilet", cx - 1.6, -0.05, -9.85, Math.PI);
    environment.add("Sink", cx - 2.2, 0, -7.8, -Math.PI / 2);
    environment.add("Luminaire", cx, 4.8, -6);
    const light = new THREE.PointLight(0xd8b991, 16, 10, 2);
    light.position.set(cx, 4.6, -6);
    scene.add(light);
    prop(buildTableBounds(), cx + 1.7, -8.4);
    prop(buildLegacyToiletBounds(), cx - 1.6, -9.85);
  }
  for (const cell of CELL_ROOMS.filter(
    (c) => c.side === "south" && c.level === "upper",
  )) {
    const { left, right, centerX: cx, doorX, front, number } = cell;
    wall([0.35, 4.2, 9.5], [left, 2, front + 4.75]);
    cellEntrance(cell);
    environment.add("Bunk", cx + 1.65, -0.05, front + 6.4);
    environment.add("Toilet", cx - 1.6, -0.05, front + 8.3);
    environment.add("Sink", left + 0.53, 0, front + 6.1, -Math.PI / 2);
    environment.add("Luminaire", cx, 4.8, front + 4.5);
    prop(buildTableBounds(), cx + 1.65, front + 6.4);
    prop(buildLegacyToiletBounds(), cx - 1.6, front + 8.3);
    const light = new THREE.PointLight(0xd8cbb1, 16, 10, 2);
    light.position.set(cx, 4.6, front + 4.5);
    scene.add(light);
  }
  for (const cell of CELL_ROOMS.filter((c) => c.level === "lower")) {
    const { centerX: cx, left, front, rear, floorY: y, side, number } = cell;
    const roomZ = (front + rear) / 2;
    wall([0.35, 3.5, 9.5], [left, y + 1.75, roomZ]);
    cellEntrance(cell);
    const tableZ = rear + (side === "north" ? 3.1 : -3.1),
      toiletZ = rear + (side === "north" ? 1.65 : -1.2);
    environment.add(
      "Bunk",
      cx + 1.4,
      y - 0.05,
      tableZ,
      side === "north" ? Math.PI : 0,
    );
    environment.add(
      "Toilet",
      cx - 1.4,
      y - 0.05,
      toiletZ,
      side === "north" ? Math.PI : 0,
    );
    environment.add("Sink", left + 0.53, y, roomZ, -Math.PI / 2);
    environment.add("Luminaire", cx, y + 3.22, roomZ);
    prop(buildTableBounds(), cx + 1.4, tableZ, 0, y);
    prop(buildLegacyToiletBounds(), cx - 1.4, toiletZ, 0, y);
    const light = new THREE.PointLight(0xd8cbb1, 12, 9, 2);
    light.position.set(cx, y + 2.45, roomZ);
    scene.add(light);
  }
  // Latched exploration gates; original Cell 46 becomes usable after its chapter.
  for (const cell of CELL_ROOMS.filter(
    (c) => c.number < 42 || c.number > 47 || c.number === 46,
  )) {
    interaction(
      `cell_latch_${cell.number}`,
      `Cell ${cell.number} gate`,
      `Open Cell ${cell.number} gate`,
      cell.doorX + CELL_GATE_WIDTH * 0.8,
      cell.front + (cell.side === "north" ? 0.14 : -0.14),
      "interact",
    );
    interactables[interactables.length - 1].position[1] = cell.floorY + 1.4;
  }
  const bedProxy = prop(buildTableBounds(), -4.25, -8.4);
  const bedBounds = colliders[colliders.length - 1];
  const toiletProxy = prop(buildLegacyToiletBounds(), -8.05, -9.7, Math.PI / 2);
  const toiletBounds = colliders[colliders.length - 1];
  prop(buildTableBounds(), -13, -8.4);
  const bed = environment.add("Bunk", -4.25, -0.05, -8.4, Math.PI);
  environment.add("Bunk", -13, -0.05, -8.4, Math.PI);
  const toilet = environment.add("Toilet", -8.05, -0.05, -9.7, -Math.PI / 2);
  const bolts: THREE.Mesh[] = [];
  const boltSteel = new THREE.MeshStandardMaterial({
    color: 0xa5a39a,
    metalness: 0.85,
    roughness: 0.45,
  });
  const boltSlot = new THREE.MeshStandardMaterial({
    color: 0x171917,
    roughness: 0.85,
  });
  for (const x of [-0.26, 0.26])
    for (const z of [-0.24, 0.24]) {
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.022, 6),
        boltSteel,
      );
      head.name = "ToiletMountingBolt";
      head.position.set(x, 0.08, z);
      // Rounded mounting lugs connect the pedestal to its floor anchors.
      const flange = new THREE.Shape();
      flange.absellipse(0, 0, 0.115, 0.046, 0, Math.PI * 2, false, 0);
      const mountingFoot = new THREE.Mesh(
        new THREE.ExtrudeGeometry(flange, {
          depth: 0.012,
          bevelEnabled: true,
          bevelThickness: 0.002,
          bevelSize: 0.003,
          bevelSegments: 2,
          steps: 1,
          curveSegments: 12,
        }),
        iron,
      );
      mountingFoot.rotation.x = -Math.PI / 2;
      mountingFoot.position.set(Math.sign(x) * 0.19, 0.05, z);
      toilet.add(mountingFoot);
      const washer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.037, 0.037, 0.007, 20),
        boltSteel,
      );
      washer.position.y = -0.014;
      head.add(washer);
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.0015, 0.004),
        boltSlot,
      );
      slot.position.y = 0.0115;
      head.add(slot);
      toilet.add(head);
      bolts.push(head);
    }
  toilet.userData.bolts = bolts;
  environment.add("Sink", -8.27, 0, -7.8, -Math.PI / 2);
  // Keep the original basin collider; the replacement is wall mounted.
  const basin = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.26,
      20,
      12,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    ceramic,
  );
  basin.scale.set(1, 0.42, 0.7);
  basin.position.set(-7.8, 0.92, -7.8);
  basin.rotation.y = Math.PI / 2;
  basin.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(basin));
  basin.geometry.dispose();
  box(staticWorld, [0.31, 0.025, 0.22], [-5.3, 0.025, -10.6], iron, 0.008);
  box(staticWorld, [0.035, 0.09, 0.035], [-5.2, 0.075, -10.62], linen, 0.008);
  // Ground contact decals and narrow window shadows are baked geometry, not extra realtime lights.
  const contactCanvas = document.createElement("canvas");
  contactCanvas.width = contactCanvas.height = 64;
  const contactCtx = contactCanvas.getContext("2d")!;
  const gradient = contactCtx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  contactCtx.fillStyle = gradient;
  contactCtx.fillRect(0, 0, 64, 64);
  const contact = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(contactCanvas),
    color: 0x091416,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  for (const [x, z, w, h] of [
    [-4.25, -8.4, 1.5, 2.5],
    [-7.65, -9.85, 0.8, 1],
    [-13, -8.4, 1.5, 2.5],
  ]) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), contact);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, -0.044, z);
    if (x === -4.25 || x === -7.65) {
      shadow.position.set(0, 0.006, 0);
      (x === -4.25 ? bed : toilet).add(shadow);
    } else staticWorld.add(shadow);
  }
  label(staticWorld, "DAY 412  /  LOW TIDE", [-6, 1.7, -11.19], 2.5);
  const pickupMeshes = new Map<string, THREE.Object3D>();
  // A complete metal key silhouette, lying behind the examining officer.
  const key = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 8, 18),
    brass,
  );
  ring.rotation.x = Math.PI / 2;
  key.add(ring);
  box(key, [0.025, 0.025, 0.15], [0, 0, 0.11], brass, 0.006);
  box(key, [0.07, 0.025, 0.025], [0.023, 0, 0.16], brass);
  key.position.set(-5.7, 0.03, -1.72);
  scene.add(key);
  pickupMeshes.set("cell_key_pickup", key);
  interaction(
    "cell_key_pickup",
    "Cell key",
    "Take the cell key",
    -5.7,
    -1.72,
    "pickup",
  );
  interaction(
    "cell47_lock",
    "Cell 47 lock",
    "Try the key",
    -5.0,
    -2.3,
    "interact",
    "cell_key",
  );
  interaction(
    "bed_push",
    "Table",
    "Push table · hold slowly",
    -5.0,
    -8.1,
    "interact",
  );
  const screwdriver = environment.add("Screwdriver", -4.45, 0.012, -8.7, 0.3);
  pickupMeshes.set("screwdriver_pickup", screwdriver);
  interaction(
    "screwdriver_pickup",
    "Screwdriver",
    "Take the screwdriver",
    -4.45,
    -8.7,
    "pickup",
  );
  for (let i = 0; i < 4; i++)
    interaction(
      `toilet_bolt_${i}`,
      `Bolt ${i + 1}`,
      "Hold to unscrew bolt",
      -7.65,
      -9.7,
      "interact",
      "screwdriver",
    );
  interaction(
    "toilet_move",
    "Toilet",
    "Move toilet · hold",
    -7.65,
    -9.7,
    "interact",
  );
  interaction("passage47", "Cell passage", "Penetrate", -8.4, -9.7, "interact");
  interaction(
    "passage46",
    "Return passage",
    "Penetrate",
    -9.25,
    -9.7,
    "interact",
  );
  const body = new THREE.Group();
  body.name = "CorridorPrisoner";
  body.position.set(-6.4, 0, -0.1);
  scene.add(body);
  pickupMeshes.set(
    "spoon_pickup",
    box(scene, [0.035, 0.026, 0.24], [-4.85, 0.08, -7.25], brass, 0.01),
  );
  interaction(
    "spoon_pickup",
    "Sharpened spoon",
    "Take the sharpened spoon",
    -4.9,
    -7.1,
    "pickup",
  );
  const legacyVent = new THREE.Group();
  scene.add(legacyVent);
  const vent = box(legacyVent, [0.08, 0.8, 0.85], [-8.58, 0.7, -9.7], iron);
  for (let y = 0.4; y < 1.05; y += 0.12)
    box(legacyVent, [0.095, 0.035, 0.68], [-8.52, y, -9.7], dark);
  vent.name = "vent";
  interaction(
    "vent_bolts_interact",
    "Service duct",
    "Loosen the service-duct bolts",
    -7.9,
    -9.3,
    "minigame",
    "spoon",
  );
  interaction(
    "kabir_wall_diary",
    "Carved inscription",
    "Read the wall inscription",
    -6,
    -10.7,
    "interact",
  );
  const boulder = new THREE.Group();
  boulder.name = "Cell46_RedeemedWarrior";
  boulder.position.set(-10.7, 0, -6.6);
  scene.add(boulder);
  box(staticWorld, [0.9, 0.08, 0.75], [-10.7, 0.9, -5.75], wood, 0.02);
  for (const x of [-11.05, -10.35])
    for (const z of [-6, -5.5])
      cylinder(staticWorld, 0.035, 0.88, [x, 0.44, z]);
  const pistolPickup = new THREE.Group();
  pistolPickup.name = "Cell46_Pistol10mm";
  pistolPickup.position.set(-10.85, 0.965, -5.75);
  pistolPickup.rotation.z = Math.PI / 2;
  scene.add(pistolPickup);
  pickupMeshes.set("pistol_10mm_pickup", pistolPickup);
  const canPickup = new THREE.Group();
  canPickup.name = "Cell46_SodaCan";
  canPickup.position.set(-10.45, 0.945, -5.75);
  scene.add(canPickup);
  pickupMeshes.set("can_attach", canPickup);
  interaction(
    "pistol_10mm_pickup",
    "10mm pistol",
    "Take the 10mm pistol",
    -10.85,
    -5.75,
    "pickup",
  );
  interactables.at(-1)!.position[1] = 1.0;
  interaction(
    "can_attach",
    "Soda can",
    "Attach can to the equipped pistol",
    -10.45,
    -5.75,
    "interact",
  );
  interactables.at(-1)!.position[1] = 1.0;
  interaction(
    "boulder_npc",
    "Boulder",
    "Challenge Boulder to earn his trust",
    -10.7,
    -5.3,
    "minigame",
  );
  wall([0.9, 2.1, 0.65], [-12.1, 1.05, -10.6], iron);
  label(staticWorld, "046", [-12.1, 1.65, -10.25], 0.5);
  interaction(
    "cell_46_locker",
    "Locker 46",
    "Unlock Locker 46",
    -12.1,
    -9.9,
    "pickup",
    "small_key",
  );
  // South wing: actual rooms with open, collision-safe doorways.
  for (const [x, width] of [
    [-1.8, 2.6],
    [4.5, 4],
    [11.5, 4],
  ])
    wall([width, 4.2, 0.35], [x, 2, 2]);
  wall([0.35, 4.2, 12.5], [-3.1, 2, 8.25], plaster);
  for (const x of [3, 9]) wall([0.3, 4.2, 9.3], [x, 2, 6.7], plaster);
  wall([11.1, 4.2, 0.35], [2.45, 2, -2]);
  wall([2.2, 4.2, 0.35], [9.1, 2, -2]);
  wall([2.2, 4.2, 0.35], [13.4, 2, -2]);
  wall([0.3, 4.2, 9.3], [8, 2, -6.7]);
  wall([0.3, 4.2, 9.3], [14.5, 2, -6.7]);
  // Master gate separates the starting block from the utility wing.
  wall([0.25, 4.2, 0.8], [2, 2, 1.7]);
  door("master_c_door", 2, 1.3, 2.6, true);
  interaction(
    "master_c_door_interact",
    "Block C gate",
    "Unlock the Block C security gate",
    1.1,
    0,
    "door",
    "master_key_c",
  );
  const medical = material(0x7d9d94, 0.85);
  for (const x of [-11, -6]) {
    box(
      staticWorld,
      [1.4, 0.12, 2.5],
      [x, 0.6, CELL_BLOCK.southFront + 2.5],
      iron,
      0.03,
    );
    box(
      staticWorld,
      [1.3, 0.2, 2.35],
      [x, 0.77, CELL_BLOCK.southFront + 2.5],
      linen,
      0.06,
    );
    box(
      staticWorld,
      [1.32, 0.07, 1.4],
      [x, 0.91, CELL_BLOCK.southFront + 2.95],
      medical,
      0.025,
    );
    for (const z of [CELL_BLOCK.southFront + 1.4, CELL_BLOCK.southFront + 3.6])
      box(staticWorld, [1.4, 0.7, 0.05], [x, 0.9, z], iron);
  }
  label(
    staticWorld,
    "+  INFIRMARY",
    [-5.95, 4.6, CELL_BLOCK.southFront - 0.1],
    2.5,
  ).rotation.y = Math.PI;
  wall([1.4, 1.9, 0.5], [-8, 0.95, CELL_BLOCK.southFront + 5.7], medical);
  const stethoscope = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.015, 8, 20, Math.PI * 1.65),
    dark,
  );
  tube.position.set(-8, 1.55, CELL_BLOCK.southFront + 5.41);
  stethoscope.add(tube);
  cylinder(
    stethoscope,
    0.045,
    0.025,
    [-8.1, 1.35, CELL_BLOCK.southFront + 5.4],
    iron,
  ).rotation.x = Math.PI / 2;
  scene.add(stethoscope);
  pickupMeshes.set("stethoscope_pickup", stethoscope);
  interaction(
    "stethoscope_pickup",
    "Medical cabinet",
    "Take the acoustic stethoscope",
    -8,
    CELL_BLOCK.southFront + 4.7,
    "pickup",
  );
  // Laundry: glazed drum doors, pipes, linen and mechanical sound masking.
  label(staticWorld, "LAUNDRY / 02", [-1.5, 3, 2.21], 2);
  for (const x of [-2.1, -0.5, 1.1]) {
    wall([1.25, 1.55, 1.1], [x, 0.775, 9.7], linen);
    const drum = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.055, 8, 24),
      iron,
    );
    drum.position.set(x, 0.78, 9.12);
    staticWorld.add(drum);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 24),
      material(0x203c44, 0.18, 0.4),
    );
    glass.position.set(x, 0.78, 9.115);
    staticWorld.add(glass);
    box(staticWorld, [0.2, 0.06, 0.03], [x, 1.38, 9.12], dark);
  }
  box(staticWorld, [1.5, 0.08, 0.8], [0, 1, 5], wood);
  const picks = new THREE.Group();
  box(picks, [0.025, 0.025, 0.3], [-0.08, 1.06, 5], brass);
  box(picks, [0.025, 0.025, 0.28], [0.07, 1.06, 5], iron);
  scene.add(picks);
  pickupMeshes.set("lockpick_pickup", picks);
  interaction(
    "lockpick_pickup",
    "Spring-steel picks",
    "Collect the lockpick set",
    0,
    4.5,
    "pickup",
  );
  wall([1.2, 0.85, 0.8], [-1, 0.425, 0.2], wool);
  interaction(
    "hide_laundry_cart",
    "Laundry cart",
    "Hide in the laundry cart",
    -1,
    -0.6,
    "hide",
  );
  // Workshop hero props and recognizable item silhouettes.
  label(staticWorld, "MAINTENANCE", [6, 3, 2.21], 2.4);
  wall([4, 0.14, 1], [6, 1, 9.5], wood);
  for (const x of [4.3, 7.7])
    box(staticWorld, [0.1, 1, 0.8], [x, 0.5, 9.5], iron);
  for (const [id, name, x, z] of [
    ["pipe_pickup", "Threaded pipe", 4.8, 8.7],
    ["steel_wool_pickup", "Steel wool", 6.1, 8.7],
    ["rubber_washer_pickup", "Rubber washer", 7.5, 8.7],
  ] as const) {
    interaction(id, name, `Collect ${name.toLowerCase()}`, x, z, "pickup");
    let item: THREE.Mesh;
    if (id === "pipe_pickup") {
      item = cylinder(scene, 0.06, 0.5, [x, 1.15, 9.3], rust);
      item.rotation.z = Math.PI / 2;
    } else if (id === "rubber_washer_pickup") {
      item = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 8, 20), dark);
      item.rotation.x = Math.PI / 2;
      item.position.set(x, 1.1, 9.3);
      scene.add(item);
    } else item = sphere(scene, [0.12, 0.07, 0.1], [x, 1.15, 9.3], iron);
    pickupMeshes.set(id, item);
  }
  box(staticWorld, [0.4, 0.25, 0.3], [6, 1.2, 6], iron, 0.03);
  box(staticWorld, [1.3, 0.1, 0.65], [6, 1, 6], wood);
  interaction(
    "crafting_bench",
    "Assembly vice",
    "Craft the improvised suppressor",
    6,
    5.3,
    "craft",
  );
  // Warden's office: paneling, desk, chair, books and a wall-mounted vault.
  label(staticWorld, "WARDEN VOSS", [11.3, 3, -2.21], 2.4).rotation.y = Math.PI;
  wall([3.2, 0.16, 1.4], [11.3, 0.95, -6.8], wood);
  for (const x of [10.1, 12.5])
    box(staticWorld, [0.45, 0.9, 1.1], [x, 0.45, -6.8], wood);
  box(staticWorld, [0.6, 0.8, 0.15], [11.3, 1.1, -8.2], dark, 0.08);
  box(staticWorld, [0.65, 0.13, 0.6], [11.3, 0.65, -8], dark, 0.04);
  box(staticWorld, [0.6, 0.025, 0.45], [11.3, 1.06, -6.7], linen);
  cylinder(staticWorld, 0.15, 0.3, [12.3, 1.28, -6.8], brass);
  wall([1.3, 1.4, 0.5], [11.3, 1.8, -10.9], iron);
  cylinder(staticWorld, 0.12, 0.08, [11.3, 1.8, -10.57], brass).rotation.x =
    Math.PI / 2;
  interaction(
    "warden_safe_interact",
    "Voss’s vault",
    "Listen to the vault tumblers",
    11.3,
    -9.6,
    "minigame",
    "stethoscope",
  );
  // Tidal tunnel and extraction. Solid side walls keep the route legible.
  wall([15, 4.2, 0.5], [22.5, 2, -2.7]);
  wall([15, 4.2, 0.5], [22.5, 2, 2.7]);
  door("sea_gate_door", 15, 2.4, 4.8, true);
  interaction(
    "sea_gate_interact",
    "Tidal gate",
    "Pick the sea-gate lock",
    14,
    0,
    "minigame",
    "lockpick",
  );
  label(staticWorld, "LOW TIDE / EXIT", [14.2, 3.2, -2.42], 2.6);
  interaction(
    "boulder_rescue_tunnel",
    "Boulder",
    "Lift the fallen beam and rescue Boulder",
    20,
    1.5,
    "interact",
  );
  box(staticWorld, [2.1, 0.2, 0.2], [20, 0.45, 1.5], wood).rotation.z = 0.2;
  const rescuedBoulder = buildSupportingNPC(false, true);
  rescuedBoulder.position.set(20.5, 0.22, 1.6);
  rescuedBoulder.rotation.z = Math.PI / 2;
  scene.add(rescuedBoulder);
  interaction(
    "sea_tunnel_exit",
    "Extraction skiff",
    "Give Iyer the ledger and escape",
    27,
    0,
    "interact",
    "warden_ledger",
  );
  box(staticWorld, [2.4, 0.3, 1.6], [28, 0.1, 0], wood, 0.1);
  const iyer = buildSupportingNPC();
  iyer.position.set(28, 0.2, -0.6);
  iyer.rotation.y = -Math.PI / 2;
  staticWorld.add(iyer);
  // Wall plumbing stays in cells; the atrium ceiling contains only lights.
  for (let x = -1; x < 15; x += 3) {
    box(staticWorld, [0.65, 0.018, 0.18], [x, 0.008, 1.35], dark);
    for (let slot = 0; slot < 7; slot++)
      box(
        staticWorld,
        [0.035, 0.022, 0.16],
        [x - 0.27 + slot * 0.09, 0.013, 1.35],
        iron,
      );
  }
  for (const x of [-8.4, -3.3, 8.2, 14.2]) {
    cylinder(staticWorld, 0.025, 3.6, [x, 1.8, -10.9], rust);
    for (const y of [0.25, 1.4, 2.7])
      box(staticWorld, [0.09, 0.045, 0.06], [x, y, -10.86], iron);
  }
  label(staticWorld, "SILENCE / LIGHTS OUT 22:00", [-6.5, 4.7, -1.78], 2.2);
  label(staticWorld, "BLOCK C / AUTHORIZED PERSONNEL", [4.8, 2.7, -1.78], 2.3);
  for (const [x, z, color] of [
    [-6, -6, 0xdde1c9],
    [-11, -5, 0xd4d8be],
    [-6, 0, 0xd9dfc9],
    [5, 0, 0xffc790],
    [0, 6, 0x86afba],
    [6, 7, 0xf4c28e],
    [11, -6, 0xf2bc77],
    [20, 0, 0x75b4c4],
    [27, 0, 0xc9e9e5],
  ]) {
    const light = new THREE.PointLight(color, 20, 11, 2);
    light.position.set(x, 4.6, z);
    scene.add(light);
    environment.add("Luminaire", x, 4.8, z);
  }
  scene.add(new THREE.HemisphereLight(0xc8d5df, 0x5d5547, 0.85));
  const moon = new THREE.DirectionalLight(0xb4c8db, 0.5);
  moon.position.set(-8, 9, -7);
  scene.add(moon);
  for (const x of [-7, -12]) {
    // Exterior sky sits behind the actual aperture; the frame and bars occlude it.
    environment.add("Window", x, 2.9, -11.12);
  }
  const windowLight = new THREE.SpotLight(0xb2c7df, 42, 17, 0.48, 0.35, 2);
  windowLight.position.set(-7.8, 4.5, -13.8);
  windowLight.target.position.set(-5.7, 0, -6.2);
  windowLight.shadow.camera.near = 0.2;
  windowLight.shadow.camera.far = 18;
  windowLight.shadow.normalBias = 0.015;
  windowLight.shadow.bias = -0.00015;
  windowLight.shadow.mapSize.set(1024, 1024);
  scene.add(windowLight, windowLight.target);
  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 4.7, 20, 8),
    new THREE.MeshStandardMaterial({
      color: 0x234f5c,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.6,
    }),
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(22.4, -0.04, 0);
  scene.add(waterMesh);
  const searchlight = new THREE.SpotLight(0xb2e6ec, 30, 30, 0.32, 0.6);
  searchlight.position.set(27, 3.8, -2);
  searchlight.target.position.set(21, 0, 0);
  scene.add(searchlight, searchlight.target);
  const positions = new Float32Array(90 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = Math.random() * 36 - 14;
    positions[i + 1] = Math.random() * 4;
    positions[i + 2] = Math.random() * 20 - 10;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  const dustParticles = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xb5d0ce,
      size: 0.022,
      transparent: true,
      opacity: 0.35,
    }),
  );
  scene.add(dustParticles);
  const guards: GuardData[] = [
    {
      id: "guard_dunne",
      name: "Officer Dunne",
      type: "patrol_dunne",
      position: [-5.7, 0, -0.7],
      rotationY: 0,
      examining: true,
      patrolRoute: [
        [-5, 0, 0],
        [0.5, 0, 0],
      ],
      currentWaypoint: 1,
      state: "patrol",
      suspicion: 0,
      visionAngle: 76,
      visionRange: 10,
      hearingMultiplier: 1,
      stateTimer: 0,
    },
    {
      id: "guard_captain",
      name: "Captain Vance",
      type: "night_captain",
      position: [-38, 0, CELL_BLOCK.southFront - 1.5],
      rotationY: -Math.PI / 2,
      patrolRoute: [
        [-38, 0, CELL_BLOCK.southFront - 1.5],
        [-63, 0, CELL_BLOCK.southFront - 1.5],
      ],
      currentWaypoint: 0,
      state: "patrol",
      suspicion: 0,
      visionAngle: 80,
      visionRange: 10,
      hearingMultiplier: 1.5,
      stateTimer: 0,
    },
  ];
  guards.push(
    ...[
      {
        id: "guard_upper_west",
        name: "Officer Hayes",
        y: 0,
        z: -0.5,
        a: -58,
        b: -28,
      },
      {
        id: "guard_upper_east",
        name: "Officer Cole",
        y: 0,
        z: CELL_BLOCK.southFront - 1.5,
        a: -10,
        b: -30,
      },
      {
        id: "guard_lower_north_east",
        name: "Officer Reed",
        y: ATRIUM.depth,
        z: -0.5,
        a: -9,
        b: -31,
      },
      {
        id: "guard_lower_north_west",
        name: "Officer Stone",
        y: ATRIUM.depth,
        z: -0.5,
        a: -57,
        b: -35,
      },
      {
        id: "guard_lower_south_east",
        name: "Officer Ward",
        y: ATRIUM.depth,
        z: CELL_BLOCK.southFront - 1.5,
        a: -12,
        b: -34,
      },
      {
        id: "guard_lower_south_west",
        name: "Officer Blake",
        y: ATRIUM.depth,
        z: CELL_BLOCK.southFront - 1.5,
        a: -62,
        b: -40,
      },
      {
        id: "guard_lower_center",
        name: "Officer Shaw",
        y: ATRIUM.depth,
        z: ATRIUM.centerZ,
        a: -25,
        b: -53,
      },
    ].map(
      ({ id, name, y, z, a, b }): GuardData => ({
        id,
        name,
        type: "patrol_dunne",
        position: [a, y, z],
        rotationY: (Math.sign(b - a) * Math.PI) / 2,
        patrolRoute: [
          [a, y, z],
          [b, y, z],
        ],
        currentWaypoint: 1,
        state: "patrol",
        suspicion: 0,
        visionAngle: 76,
        visionRange: 10,
        hearingMultiplier: 1,
        stateTimer: 0,
      }),
    ),
  );
  const guardMeshes = new Map<string, THREE.Group>();
  for (const g of guards) {
    // Stable gameplay root; the preloaded skinned GLB is attached by GameEngine.
    const mesh = new THREE.Group();
    mesh.name = g.id;
    mesh.position.set(...g.position);
    scene.add(mesh);
    guardMeshes.set(g.id, mesh);
  }
  // Merge static surfaces by material. Organic detail stays inexpensive on mobile.
  staticWorld.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  staticWorld.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
      return;
    const transformed = object.geometry
      .clone()
      .applyMatrix4(object.matrixWorld);
    const geometry = transformed.index
      ? transformed.toNonIndexed()
      : transformed;
    if (geometry !== transformed) transformed.dispose();
    geometry.deleteAttribute("uv1");
    geometry.deleteAttribute("tangent");
    const vertexCount = geometry.getAttribute("position").count;
    if (!geometry.getAttribute("uv"))
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 2), 2),
      );
    if (!geometry.getAttribute("color"))
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          new Float32Array(vertexCount * 3).fill(1),
          3,
        ),
      );
    const list = batches.get(object.material) ?? [];
    list.push(geometry);
    batches.set(object.material, list);
  });
  scene.remove(staticWorld);
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow =
        !mat.transparent && !(mat instanceof THREE.MeshBasicMaterial);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    for (const geometry of geometries) geometry.dispose();
  }
  return {
    cargo,
    cells: CELL_ROOMS,
    cell46NPC: boulder,
    opening: {
      bed,
      toilet,
      bedBounds,
      toiletBounds,
      passageSeal,
      passageBounds,
      body,
      legacyVent,
    },
    scene,
    loadEnvironment: environment.load,
    disposeEnvironment: environment.dispose,
    windowLight,
    colliders,
    visionColliders: [
      ...colliders.filter((b) => !barredFaces.has(b)),
      ...floorOccluders,
    ],
    doors,
    doorColliders,
    interactables,
    guards,
    guardMeshes,
    pickupMeshes,
    rescuedBoulder,
    waterMesh,
    searchlight,
    soundMaskingMachinePos: [-1, 0, 9.7],
    dustParticles,
  };
}
