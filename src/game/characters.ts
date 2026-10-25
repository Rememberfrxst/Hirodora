import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import anatomy from "../assets/human-head.json";

// Shared authored anatomy keeps the face's eyelids, lips, nose, ears and jaw intact.
const headGeometry = new THREE.BufferGeometry();
headGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(anatomy.position, 3),
);
headGeometry.setAttribute(
  "normal",
  new THREE.Float32BufferAttribute(anatomy.normal, 3),
);
headGeometry.setIndex(anatomy.index);
const tones: number[] = [];
for (let i = 0; i < anatomy.position.length; i += 3) {
  const [x, y, z] = anatomy.position.slice(i, i + 3);
  const tone = new THREE.Color(0xffffff);
  if (y < 0.015 && z > 0.09) tone.set(0xb5a59e); // subtle lower-face stubble
  if (Math.abs(x) < 0.033 && y > -0.018 && y < -0.008 && z > 0.12)
    tone.set(0xc38f89);
  tones.push(tone.r, tone.g, tone.b);
}
headGeometry.setAttribute("color", new THREE.Float32BufferAttribute(tones, 3));

const mat = (color: number, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const leather = mat(0x151b22, 0.55),
  metal = mat(0x58626b, 0.4, 0.65),
  gold = mat(0xc3aa6d, 0.35, 0.6);
const eyeWhite = mat(0xb5b8ae, 0.4),
  iris = mat(0x40372a, 0.3),
  pupil = mat(0x111518, 0.28);

function rounded(
  parent: THREE.Object3D,
  size: number[],
  xyz: number[],
  material: THREE.Material,
  radius = 0.018,
) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius),
    material,
  );
  mesh.position.set(...(xyz as [number, number, number]));
  parent.add(mesh);
  return mesh;
}
function ellipsoid(
  parent: THREE.Object3D,
  size: number[],
  xyz: number[],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
  mesh.scale.set(...(size as [number, number, number]));
  mesh.position.set(...(xyz as [number, number, number]));
  parent.add(mesh);
  return mesh;
}
function capsule(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  xyz: number[],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 4, 10),
    material,
  );
  mesh.position.set(...(xyz as [number, number, number]));
  parent.add(mesh);
  return mesh;
}
function patch(
  parent: THREE.Object3D,
  text: string,
  xyz: number[],
  width: number,
  back = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#17212b";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#d9dbcb";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 45);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const label = rounded(
    parent,
    [width, width / 4, 0.008],
    xyz,
    new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
    0.001,
  );
  if (back) label.rotation.y = Math.PI;
}

export function buildHumanOfficer(captain = false, inmate = false) {
  const root = new THREE.Group();
  root.name = inmate ? "Boulder" : captain ? "Captain Vance" : "Officer Dunne";
  root.userData.characterVersion = "anatomical-v2";
  const skin = new THREE.MeshStandardMaterial({
    color: captain ? 0x9e765d : 0xc59c7d,
    roughness: 0.76,
    vertexColors: true,
  });
  const uniform = mat(inmate ? 0x936047 : captain ? 0x1c2631 : 0x2c3b49, 0.91);
  const trousers = mat(inmate ? 0x4c4b47 : 0x252e38, 0.88);
  const vest = mat(0x202830, 0.94);
  const profile = [
    [0.19, 0.98],
    [0.185, 1.08],
    [0.215, 1.22],
    [0.235, 1.36],
    [0.19, 1.44],
    [0.085, 1.49],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), uniform);
  torso.scale.z = 0.64;
  root.add(torso);
  rounded(root, [0.37, 0.15, 0.26], [0, 0.96, 0], trousers, 0.055);
  capsule(root, 0.058, 0.1, [0, 1.55, 0.018], skin);
  const head = new THREE.Group();
  head.position.y = 1.64;
  root.add(head);
  head.add(new THREE.Mesh(headGeometry, skin));
  const surfaceZ = (x: number, y: number) => {
    let best = Infinity,
      z = 0.14;
    for (let i = 0; i < anatomy.position.length; i += 3) {
      if (anatomy.position[i + 2] < 0.09) continue;
      const distance =
        (anatomy.position[i] - x) ** 2 + (anatomy.position[i + 1] - y) ** 2;
      if (distance < best) {
        best = distance;
        z = anatomy.position[i + 2];
      }
    }
    return z + 0.002;
  };
  for (const side of [-1, 1]) {
    const x = side * 0.0335;
    ellipsoid(head, [0.013, 0.012, 0.014], [x, 0.056, 0.13], eyeWhite);
    ellipsoid(head, [0.006, 0.006, 0.004], [x, 0.056, 0.143], iris);
    ellipsoid(head, [0.0027, 0.0034, 0.0015], [x, 0.056, 0.146], pupil);
    const points = [
      [side * 0.017, 0.082],
      [side * 0.033, 0.085],
      [side * 0.052, 0.079],
    ].map(([x, y]) => new THREE.Vector3(x, y, surfaceZ(x, y)));
    head.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          10,
          0.0018,
          4,
          false,
        ),
        leather,
      ),
    );
  }
  // Close-cropped hair and a correctly proportioned service cap.
  ellipsoid(head, [0.093, 0.045, 0.095], [0, 0.15, 0.015], leather);
  if (!inmate) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.091, 0.096, 0.056, 24),
      uniform,
    );
    cap.position.set(0, 0.178, 0.01);
    head.add(cap);
    rounded(head, [0.17, 0.014, 0.095], [0, 0.15, 0.085], leather, 0.018);
    rounded(head, [0.019, 0.023, 0.006], [0, 0.18, 0.106], gold, 0.004);
    rounded(root, [0.36, 0.33, 0.06], [0, 1.25, 0.15], vest, 0.025);
    rounded(root, [0.35, 0.32, 0.045], [0, 1.25, -0.145], vest, 0.025);
    for (const x of [-0.145, 0.145])
      rounded(root, [0.055, 0.17, 0.037], [x, 1.435, 0.1], vest, 0.012);
    patch(root, captain ? "CAPTAIN" : "POLICE", [0.05, 1.34, 0.189], 0.18);
    patch(root, "CORRECTIONS", [0, 1.3, -0.174], 0.3, true);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.026, 5), gold);
    badge.position.set(-0.115, 1.34, 0.19);
    root.add(badge);
    rounded(root, [0.068, 0.12, 0.04], [-0.11, 1.19, 0.2], leather);
    rounded(root, [0.06, 0.11, 0.042], [0.1, 1.19, 0.2], vest);
    capsule(root, 0.004, 0.09, [-0.125, 1.31, 0.21], metal);
    for (let y = 1.12; y < 1.3; y += 0.035)
      rounded(root, [0.25, 0.009, 0.008], [0, y, 0.185], uniform, 0.002);
    for (const x of [-0.18, 0.18])
      rounded(root, [0.095, 0.045, 0.06], [x, 1.46, 0], uniform, 0.01);
  } else patch(root, "046", [0, 1.34, 0.16], 0.13);
  rounded(root, [0.39, 0.052, 0.29], [0, 0.99, 0], leather, 0.018);
  rounded(root, [0.046, 0.034, 0.012], [0, 0.99, 0.15], metal, 0.004);
  if (!inmate)
    for (const side of [-1, 1]) {
      rounded(
        root,
        [0.09, 0.135, 0.07],
        [side * 0.205, 0.95, 0.07],
        leather,
        0.015,
      );
      const keys = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.004, 5, 12),
        metal,
      );
      keys.position.set(side * 0.22, 0.89, 0.115);
      root.add(keys);
    }
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.245, 1.415, 0);
    arm.rotation.z = side * 0.08;
    root.add(arm);
    capsule(arm, 0.066, 0.145, [0, -0.105, 0], uniform);
    const elbow = new THREE.Group();
    elbow.position.y = -0.255;
    elbow.rotation.x = -0.08;
    arm.add(elbow);
    capsule(elbow, 0.052, 0.16, [0, -0.09, 0.012], inmate ? skin : uniform);
    rounded(elbow, [0.105, 0.035, 0.108], [0, -0.225, 0.012], uniform, 0.01);
    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0.016);
    elbow.add(hand);
    rounded(hand, [0.072, 0.09, 0.035], [0, -0.02, 0], skin, 0.015);
    for (let finger = 0; finger < 4; finger++)
      capsule(
        hand,
        0.008,
        0.039,
        [-0.026 + finger * 0.017, -0.085, 0.004],
        skin,
      ).rotation.x = -0.12;
    capsule(
      hand,
      0.011,
      0.038,
      [-side * 0.043, -0.025, 0.015],
      skin,
    ).rotation.z = side * 0.3;
    if (side < 0) {
      const watch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.027, 0.027, 0.012, 12),
        metal,
      );
      watch.rotation.z = Math.PI / 2;
      watch.position.set(-0.05, -0.2, 0.012);
      elbow.add(watch);
    }
    const leg = new THREE.Group();
    leg.position.set(side * 0.105, 0.95, 0);
    root.add(leg);
    capsule(leg, 0.087, 0.23, [0, -0.16, 0], trousers);
    const knee = new THREE.Group();
    knee.position.y = -0.395;
    leg.add(knee);
    capsule(knee, 0.067, 0.32, [0, -0.2, 0.005], trousers);
    rounded(knee, [0.092, 0.09, 0.025], [0, -0.035, 0.063], trousers, 0.02);
    rounded(knee, [0.135, 0.14, 0.255], [0, -0.485, 0.055], leather, 0.035);
    rounded(knee, [0.139, 0.022, 0.26], [0, -0.552, 0.055], leather, 0.008);
    for (let y = -0.45; y < -0.38; y += 0.022)
      rounded(knee, [0.06, 0.005, 0.008], [0, y, 0.12], metal, 0.002);
    root.userData[side < 0 ? "leftArm" : "rightArm"] = arm;
    root.userData[side < 0 ? "leftLeg" : "rightLeg"] = leg;
    root.userData[side < 0 ? "leftKnee" : "rightKnee"] = knee;
    root.userData[side < 0 ? "leftElbow" : "rightElbow"] = elbow;
  }
  root.userData.head = head;
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material === skin && !object.geometry.getAttribute("color"))
        object.geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(
            new Float32Array(
              object.geometry.getAttribute("position").count * 3,
            ).fill(1),
            3,
          ),
        );
    }
  });
  // Batch only rigid parts within each joint, preserving the articulated hierarchy.
  const joints: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Group) joints.push(object);
  });
  for (const joint of joints.reverse()) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of joint.children)
      if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
        const list = batches.get(child.material) ?? [];
        list.push(child);
        batches.set(child.material, list);
      }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrix);
        const geometry = transformed.index
          ? transformed.toNonIndexed()
          : transformed;
        if (geometry !== transformed) transformed.dispose();
        const count = geometry.getAttribute("position").count;
        if (!geometry.getAttribute("uv"))
          geometry.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2),
          );
        if (!geometry.getAttribute("color"))
          geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(
              new Float32Array(count * 3).fill(1),
              3,
            ),
          );
        return geometry;
      });
      const combined = mergeGeometries(geometries, false);
      if (combined) {
        meshes.forEach((mesh) => joint.remove(mesh));
        const mesh = new THREE.Mesh(combined, material);
        mesh.castShadow = mesh.receiveShadow = true;
        joint.add(mesh);
      }
      geometries.forEach((geometry) => geometry.dispose());
    }
  }
  return root;
}
