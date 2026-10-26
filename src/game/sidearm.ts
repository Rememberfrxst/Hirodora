import * as THREE from "three";

/** Authored hard-surface pistol, local +Z muzzle; origin is the palm grip. */
export function createSidearm() {
  const root = new THREE.Group();
  root.name = "OfficerSidearm";
  const steel = new THREE.MeshStandardMaterial({
    color: 0x434c52,
    roughness: 0.38,
    metalness: 0.8,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x222a2e,
    roughness: 0.83,
  });
  const bore = new THREE.MeshStandardMaterial({
    color: 0x080b0d,
    roughness: 0.95,
  });
  const profile = (
    points: number[][],
    width: number,
    material: THREE.Material,
    holes: number[][][] = [],
  ) => {
    const shape = new THREE.Shape(
      points.map(([z, y]) => new THREE.Vector2(z, y)),
    );
    for (const points of holes)
      shape.holes.push(
        new THREE.Path(points.map(([z, y]) => new THREE.Vector2(z, y))),
      );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      steps: 1,
      bevelEnabled: true,
      bevelSize: 0.0012,
      bevelThickness: 0.0012,
      bevelSegments: 2,
      curveSegments: 6,
    });
    geo.translate(0, 0, -width / 2);
    geo.rotateY(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  // Separate slide, receiver, raked grip and open trigger guard (not a solid silhouette).
  profile(
    [
      [-0.055, 0.045],
      [0.164, 0.045],
      [0.166, 0.079],
      [0.156, 0.089],
      [-0.05, 0.089],
      [-0.058, 0.079],
    ],
    0.032,
    steel,
  );
  profile(
    [
      [-0.049, 0.043],
      [0.145, 0.043],
      [0.14, 0.024],
      [0.072, 0.021],
      [0.053, 0.005],
      [-0.03, 0.005],
    ],
    0.031,
    polymer,
  );
  profile(
    [
      [-0.029, 0.026],
      [0.024, 0.014],
      [0.005, -0.08],
      [-0.045, -0.076],
    ],
    0.033,
    polymer,
  );
  profile(
    [
      [0.014, 0.028],
      [0.091, 0.028],
      [0.093, -0.008],
      [0.078, -0.029],
      [0.018, -0.029],
    ],
    0.022,
    polymer,
    [
      [
        [0.031, 0.018],
        [0.031, -0.017],
        [0.072, -0.017],
        [0.081, -0.006],
        [0.081, 0.018],
      ],
    ],
  );
  profile(
    [
      [0.05, 0.021],
      [0.055, 0.017],
      [0.051, -0.006],
      [0.045, -0.013],
      [0.041, -0.01],
      [0.047, 0.003],
    ],
    0.009,
    steel,
  );
  // Front/rear sights, slide grooves, muzzle ring and a recessed bore.
  profile(
    [
      [0.14, 0.089],
      [0.154, 0.089],
      [0.152, 0.096],
      [0.143, 0.096],
    ],
    0.009,
    steel,
  );
  for (const x of [-0.012, 0.012]) {
    const sight = profile(
      [
        [-0.048, 0.089],
        [-0.033, 0.089],
        [-0.033, 0.096],
        [-0.047, 0.096],
      ],
      0.006,
      steel,
    );
    sight.position.x = x;
  }
  for (let i = 0; i < 6; i++)
    for (const x of [-0.0172, 0.0172]) {
      const groove = new THREE.Mesh(
        new THREE.PlaneGeometry(0.0018, 0.025),
        bore,
      );
      groove.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      groove.position.set(x, 0.064, -0.041 + i * 0.005);
      root.add(groove);
    }
  const muzzle = new THREE.Mesh(
    new THREE.RingGeometry(0.0048, 0.0074, 16),
    steel,
  );
  muzzle.position.set(0, 0.061, 0.168);
  root.add(muzzle);
  const interior = new THREE.Mesh(new THREE.CircleGeometry(0.0048, 16), bore);
  interior.position.set(0, 0.061, 0.1665);
  root.add(interior);
  const port = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.014), bore);
  port.rotation.y = Math.PI / 2;
  port.position.set(0.0173, 0.065, 0.045);
  root.add(port);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 4),
    new THREE.MeshBasicMaterial({
      color: 0xffe5a1,
      transparent: true,
      opacity: 0.9,
    }),
  );
  flash.position.set(0, 0.061, 0.198);
  flash.scale.set(0.7, 0.7, 2);
  root.add(flash);
  const light = new THREE.PointLight(0xffcb77, 0, 3, 2);
  light.position.copy(flash.position);
  root.add(light);
  return { root, flash, light };
}
