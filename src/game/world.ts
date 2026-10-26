import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GuardData, InteractiveObject } from "./types";
import { buildHumanOfficer } from "./characters";
import { createEnvironment } from "./environment";

export interface PrisonWorldData {
  scene: THREE.Scene;
  loadEnvironment: () => Promise<void>;
  disposeEnvironment: () => void;
  windowLight: THREE.SpotLight;
  colliders: THREE.Box3[];
  doors: Map<string, THREE.Group>;
  doorColliders: Map<string, THREE.Box3>;
  interactables: InteractiveObject[];
  guards: GuardData[];
  guardMeshes: Map<string, THREE.Group>;
  pickupMeshes: Map<string, THREE.Object3D>;
  rescuedBoulder: THREE.Group;
  waterMesh: THREE.Mesh;
  searchlight: THREE.SpotLight;
  soundMaskingMachinePos: [number, number, number];
  dustParticles: THREE.Points;
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

function buildLegacyBunkBounds() {
  const group = new THREE.Group();
  for (const x of [-0.6, 0.6])
    for (const z of [-1.1, 1.1]) {
      cylinder(group, 0.035, 2.2, [x, 1.1, z]);
      box(group, [0.15, 0.025, 0.15], [x, 0.02, z], rust);
    }
  for (const y of [0.42, 1.55]) {
    box(group, [1.22, 0.09, 2.25], [0, y, 0], iron, 0.025);
    box(group, [1.12, 0.16, 2.12], [0, y + 0.13, 0], linen, 0.065);
    // Steel slats remain visible under the mattress at first-person distance.
    for (let z = -0.82; z <= 0.82; z += 0.24)
      box(group, [1.06, 0.035, 0.055], [0, y + 0.03, z], iron, 0.008);
    box(group, [0.82, 0.15, 0.44], [0, y + 0.28, -0.76], linen, 0.07);
    // A subdivided, draped blanket rather than a rigid cuboid.
    const geometry = new THREE.PlaneGeometry(1.3, 1.4, 14, 16);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        z = vertices.getY(i);
      vertices.setXYZ(
        i,
        x,
        y +
          0.245 +
          Math.sin(z * 23 + x * 4) * 0.018 -
          Math.max(0, Math.abs(x) - 0.565) * 2.5,
        z + 0.3,
      );
    }
    geometry.computeVertexNormals();
    const blanket = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x445856,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    group.add(blanket);
    // Creased mattress edge and a seam make the bedding read as fabric, not foam boxes.
    for (const x of [-0.52, 0.52])
      box(group, [0.018, 0.11, 1.86], [x, y + 0.13, 0.02], wool, 0.006);
  }
  for (const y of [0.5, 0.8, 1.1, 1.4])
    box(group, [0.4, 0.035, 0.035], [0.38, y, -1.15], iron, 0.012);
  box(group, [0.035, 0.25, 1.8], [0.6, 1.85, 0.1], iron, 0.015);
  // Guard rail, wall brackets and ladder stiles are separate welded parts.
  box(group, [1.16, 0.05, 0.05], [0, 1.93, 1.07], iron, 0.012);
  for (const x of [-0.48, 0.48])
    box(group, [0.05, 0.38, 0.05], [x, 1.74, 1.07], iron, 0.012);
  for (const z of [-1.02, 1.02])
    box(group, [0.12, 0.05, 0.08], [-0.6, 0.42, z], rust, 0.01);
  return group;
}

function buildLegacyToiletBounds() {
  const group = new THREE.Group();
  const profile = [
    [0.12, 0],
    [0.17, 0.08],
    [0.12, 0.25],
    [0.26, 0.38],
    [0.29, 0.48],
    [0.22, 0.5],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), ceramic);
  bowl.scale.z = 1.22;
  group.add(bowl);
  const seat = new THREE.Mesh(
    new THREE.TorusGeometry(0.245, 0.035, 8, 32),
    dark,
  );
  seat.rotation.x = Math.PI / 2;
  seat.scale.y = 1.25;
  seat.position.y = 0.51;
  group.add(seat);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 24),
    new THREE.MeshStandardMaterial({
      color: 0x253f43,
      roughness: 0.12,
      metalness: 0.25,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.y = 1.22;
  water.position.y = 0.49;
  group.add(water);
  box(group, [0.46, 0.47, 0.19], [0, 0.72, -0.34], ceramic, 0.04);
  box(group, [0.5, 0.055, 0.23], [0, 0.97, -0.34], ceramic, 0.025);
  box(group, [0.09, 0.035, 0.035], [-0.2, 0.83, -0.22], iron, 0.01);
  for (const x of [-0.13, 0.13])
    cylinder(group, 0.018, 0.08, [x, 0.55, -0.16], iron).rotation.z =
      Math.PI / 2;
  cylinder(group, 0.02, 0.7, [0.3, 0.4, -0.35], rust);
  const valve = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 6, 16),
    material(0x994c37),
  );
  valve.position.set(0.3, 0.4, -0.3);
  group.add(valve);
  return group;
}

// Legacy supporting NPCs remain outside the patrol-officer overhaul.
const buildSupportingNPC = buildHumanOfficer;

export function buildPrisonWorld(scene: THREE.Scene): PrisonWorldData {
  scene.background = new THREE.Color(0x18252b);
  scene.fog = new THREE.FogExp2(0x18252b, 0.018);
  const staticWorld = new THREE.Group();
  scene.add(staticWorld);
  const colliders: THREE.Box3[] = [];
  const doors = new Map<string, THREE.Group>();
  const doorColliders = new Map<string, THREE.Box3>();
  const interactables: InteractiveObject[] = [];
  const environment = createEnvironment(scene);
  const stone = environment.masonry;
  const concrete = environment.concrete;
  iron.copy(environment.metal);
  const plaster = concrete.clone();
  plaster.color.set(0xa6aaa0);
  const paint = concrete.clone();
  paint.color.set(0xabb6a5);
  const floor = environment.floor;
  const wall = (size: number[], pos: number[], mat: THREE.Material = stone) => {
    const mesh = box(staticWorld, size, pos, mat);
    if (size[1] > 3) {
      projectUV(mesh, 2);
      const thinX = size[0] < 0.8;
      const lowerWall = box(
        staticWorld,
        [size[0] + (thinX ? 0.016 : 0), 1.35, size[2] + (thinX ? 0 : 0.016)],
        [pos[0], 0.6, pos[2]],
        paint,
      );
      projectUV(lowerWall, 2);
      box(
        staticWorld,
        [size[0] + (thinX ? 0.024 : 0), 0.025, size[2] + (thinX ? 0 : 0.024)],
        [pos[0], 1.29, pos[2]],
        iron,
      );
    }
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  };
  const prop = (model: THREE.Group, x: number, z: number, rotation = 0) => {
    model.position.set(x, 0, z);
    model.rotation.y = rotation;
    // Retain the exact legacy gameplay bounds; the new GLB supplies the visible furniture.
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
  const ground = box(staticWorld, [46, 0.3, 23], [7, -0.2, 0], floor);
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
  projectUV(ground, 3);
  // A concrete ceiling closes the cell volume; beams and conduits give the formerly
  // black void a readable institutional structure without altering walkable space.
  projectUV(box(staticWorld, [46, 0.22, 23], [7, 4.18, 0], concrete), 2.5);
  for (const x of [-13.5, -8.5, -3.5, 1.5, 6.5, 11.5, 16.5, 21.5, 26.5])
    box(staticWorld, [0.22, 0.34, 22.4], [x, 4.0, 0], iron, 0.015);
  for (const z of [-9.4, -4.4, 0.6, 5.6, 10.1])
    box(staticWorld, [45.4, 0.09, 0.13], [7, 3.92, z], rust, 0.008);
  wall([0.5, 4.3, 23], [-16, 2, 0]);
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
  wall([46, 4.3, 0.5], [7, 2, 11.5]);
  wall([0.5, 4.3, 23], [30, 2, 0]);
  // Cell partitions. The only escape from Cell 47 is the serviced ventilation duct.
  for (const x of [-14, -8.8, -3.1]) wall([0.35, 4.2, 9.3], [x, 2, -6.7]);
  function bars(x: number, z: number, width: number) {
    for (let bx = x - width / 2; bx <= x + width / 2; bx += 0.21)
      cylinder(staticWorld, 0.022, 3.7, [bx, 1.85, z]);
    box(staticWorld, [width, 0.12, 0.12], [x, 3.7, z], iron);
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - 0.08),
        new THREE.Vector3(x + width / 2, 3.8, z + 0.08),
      ),
    );
  }
  function door(id: string, x: number, z: number, width = 1.4, across = false) {
    const group = new THREE.Group();
    for (let i = 0; i < 7; i++)
      cylinder(group, 0.028, 3.4, [(i * width) / 6, 1.7, 0]);
    for (const y of [0.25, 1.5, 3.25])
      box(group, [width, 0.08, 0.07], [width / 2, y, 0], iron);
    box(group, [0.2, 0.23, 0.08], [width * 0.8, 1.4, 0.03], rust);
    group.position.set(x, 0, z);
    if (across) group.rotation.y = Math.PI / 2;
    scene.add(group);
    doors.set(id, group);
    doorColliders.set(
      id,
      new THREE.Box3().setFromObject(group).expandByScalar(0.03),
    );
    return group;
  }
  bars(-12.5, -2, 3);
  bars(-9.4, -2, 1);
  door("cell_46_door", -11, -2, 1.4);
  bars(-7.3, -2, 2.6);
  bars(-3.8, -2, 1.1);
  door("cell_47_door", -6, -2, 1.4);
  prop(buildLegacyBunkBounds(), -4.25, -8.4);
  prop(buildLegacyToiletBounds(), -7.65, -9.85);
  prop(buildLegacyBunkBounds(), -13, -8.4);
  environment.add("Bunk", -4.25, -0.05, -8.4, Math.PI);
  environment.add("Bunk", -13, -0.05, -8.4, Math.PI);
  environment.add("Toilet", -7.65, -0.05, -9.85, Math.PI);
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
    staticWorld.add(shadow);
  }
  label(staticWorld, "C / 047", [-5.8, 3.65, -2]);
  label(staticWorld, "C / 046", [-11.4, 3.65, -2]);
  label(staticWorld, "DAY 412  /  LOW TIDE", [-6, 1.7, -11.19], 2.5);
  const pickupMeshes = new Map<string, THREE.Object3D>();
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
  const vent = box(staticWorld, [0.08, 0.8, 0.85], [-8.58, 0.7, -9.7], iron);
  for (let y = 0.4; y < 1.05; y += 0.12)
    box(staticWorld, [0.095, 0.035, 0.68], [-8.52, y, -9.7], dark);
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
  const boulder = buildSupportingNPC(false, true);
  boulder.position.set(-10.7, 0, -6.6);
  staticWorld.add(boulder);
  box(staticWorld, [0.9, 0.08, 0.75], [-10.7, 0.9, -5.75], wood, 0.02);
  for (const x of [-11.05, -10.35])
    for (const z of [-6, -5.5])
      cylinder(staticWorld, 0.035, 0.88, [x, 0.44, z]);
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
    [-11, 9],
    [-2, 3],
    [4.5, 4],
    [11.5, 4],
  ])
    wall([width, 4.2, 0.35], [x, 2, 2]);
  for (const x of [-4, 3, 9]) wall([0.3, 4.2, 9.3], [x, 2, 6.7], plaster);
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
    box(staticWorld, [1.4, 0.12, 2.5], [x, 0.6, 7.5], iron, 0.03);
    box(staticWorld, [1.3, 0.2, 2.35], [x, 0.77, 7.5], linen, 0.06);
    box(staticWorld, [1.32, 0.07, 1.4], [x, 0.91, 7.95], medical, 0.025);
    for (const z of [6.4, 8.6])
      box(staticWorld, [1.4, 0.7, 0.05], [x, 0.9, z], iron);
  }
  label(staticWorld, "+  INFIRMARY", [-8, 3, 2.21], 2.5);
  wall([1.4, 1.9, 0.5], [-8, 0.95, 10.7], medical);
  const stethoscope = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.015, 8, 20, Math.PI * 1.65),
    dark,
  );
  tube.position.set(-8, 1.55, 10.41);
  stethoscope.add(tube);
  cylinder(stethoscope, 0.045, 0.025, [-8.1, 1.35, 10.4], iron).rotation.x =
    Math.PI / 2;
  scene.add(stethoscope);
  pickupMeshes.set("stethoscope_pickup", stethoscope);
  interaction(
    "stethoscope_pickup",
    "Medical cabinet",
    "Take the acoustic stethoscope",
    -8,
    9.7,
    "pickup",
  );
  // Laundry: glazed drum doors, pipes, linen and mechanical sound masking.
  label(staticWorld, "LAUNDRY / 02", [-1.5, 3, 2.21], 2);
  for (const x of [-2.7, -1, 0.7]) {
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
  // Structural rhythm, service pipes, hazard stripes and warm practical fixtures.
  for (let x = -14; x < 16; x += 5) {
    for (const z of [-1.8, 1.8])
      box(staticWorld, [0.18, 4, 0.18], [x, 2, z], iron);
    box(staticWorld, [0.2, 0.2, 4], [x, 3.9, 0], iron);
    environment.add("Luminaire", x + 2, 3.7, 0);
  }
  for (const z of [-1.6, 1.6])
    cylinder(staticWorld, 0.065, 42, [6, 3.6, z], rust).rotation.z =
      Math.PI / 2;
  for (let x = -13; x < 15; x += 3) {
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
  label(staticWorld, "SILENCE / LIGHTS OUT 22:00", [-6.5, 2.7, 2.2], 2.2);
  label(staticWorld, "BLOCK C / AUTHORIZED PERSONNEL", [4.8, 2.7, -1.78], 2.3);
  for (const [x, z, color] of [
    [-6, -6, 0xffc58a],
    [-11, -5, 0xeeb675],
    [-6, 0, 0xffc790],
    [5, 0, 0xffc790],
    [-8, 6, 0x9ac8bf],
    [0, 6, 0x86afba],
    [6, 7, 0xf4c28e],
    [11, -6, 0xf2bc77],
    [20, 0, 0x75b4c4],
    [27, 0, 0xc9e9e5],
  ]) {
    const light = new THREE.PointLight(color, 14, 11, 2);
    light.position.set(x, 3.2, z);
    scene.add(light);
    environment.add("Luminaire", x, 3.32, z);
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
      position: [-5, 0, 0],
      rotationY: Math.PI / 2,
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
      position: [12, 0, 0],
      rotationY: -Math.PI / 2,
      patrolRoute: [
        [4, 0, 0],
        [13, 0, 0],
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
    scene,
    loadEnvironment: environment.load,
    disposeEnvironment: environment.dispose,
    windowLight,
    colliders,
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
