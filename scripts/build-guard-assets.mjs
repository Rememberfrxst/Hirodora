/** Offline authoring only. Runtime loads the resulting CC0-derived skinned GLBs.
 * See docs/GUARD-ASSETS.md for pinned sources and reproducible asset setup.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  resample,
  meshopt,
  textureCompress,
  weld,
  simplify,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const source =
  process.env.HIRODORA_CHARACTER_SOURCE || "/tmp/hirodora-character-pipeline";
const sourceRevision = "8e2cc69f529a4a384951c78312c134e31f456c04";
const makeHumanRevision = "a8bc2d54ff0ac92e78ff71431b1023eda42bf482";
const assetPackSha256 =
  "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107";
for (const [directory, expected] of [
  [source, sourceRevision],
  [resolve(source, "vendor/mh"), makeHumanRevision],
]) {
  const actual = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actual !== expected)
    throw new Error(`Unpinned asset source: ${directory}`);
}
const archive =
  process.env.HIRODORA_ASSET_PACK ||
  "/tmp/hirodora-assets/makehuman_system_assets_cc0.zip";
const hash = createHash("sha256");
for await (const chunk of createReadStream(archive)) hash.update(chunk);
if (hash.digest("hex") !== assetPackSha256)
  throw new Error("CC0 source archive checksum mismatch");
if (process.argv.includes("--verify-sources")) {
  console.log(
    "Pinned authoring repositories and official CC0 archive verified.",
  );
  process.exit(0);
}
const load = (file) => import(pathToFileURL(resolve(source, file)).href);
const [
  { nodeLibrary },
  { buildHuman, textureFiles },
  { DEFAULT_PARAMS },
  { Animator },
  { clipById },
  { exportGLB },
] = await Promise.all([
  load("scripts/node-assets.ts"),
  load("src/core/human.ts"),
  load("src/core/params.ts"),
  load("src/core/anim/evaluate.ts"),
  load("src/core/anim/clips/index.ts"),
  load("src/export/glb.ts"),
]);
const lib = await nodeLibrary();
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const params = {
  ...DEFAULT_PARAMS,
  name: "HirodoraOfficerDunneV7",
  seed: 147,
  age: 0.58,
  muscle: 0.44,
  weight: 0.56,
  height: 0.5,
  african: 0.12,
  asian: 0.08,
  caucasian: 0.8,
  modifiers: { "nose/nose-flaring": 0.16, "chin/chin-prominent": 0.28 },
  skin: "middleage_caucasian_male",
  hair: "short04",
  hairTint: "#84786b",
  facialHair: "stubble",
  beardColor: "#40372f",
  eyebrows: "eyebrow003",
  eyes: "brownlight",
  outfit: "male_casualsuit01",
  outfitTint: "#7593b7",
  top: "uniform_shirt_long",
  bottom: "uniform_trousers",
  shoes: "shoes03",
  accessories: ["utility_belt"],
  garmentStyles: {
    uniform_shirt_long: {
      pattern: "solid",
      color: "#293c54",
      color2: "#526075",
    },
    uniform_trousers: { pattern: "solid", color: "#25344b", color2: "#43526b" },
    tactical_vest: { pattern: "molle", color: "#202a35", color2: "#3f4c58" },
    utility_belt: { pattern: "leather", color: "#171c24", color2: "#3e434a" },
  },
  faceBones: true,
  faceShapes: true,
  speechShapes: false,
  expression: "neutral",
};
const baseIdle = clipById.get("idle");
const poses = [
  { id: "investigate", name: "Investigate", amplitude: 24, lean: 5 },
  { id: "search", name: "Search", amplitude: 42, lean: 3 },
  { id: "alert", name: "Alert", amplitude: 10, lean: 9 },
].map(({ id, name, amplitude, lean }) => ({
  ...baseIdle,
  id,
  name,
  duration: 4,
  sample(t) {
    const pose = baseIdle.sample(t);
    pose.bones.Head = [0, amplitude * Math.sin((t * Math.PI) / 2), 0];
    pose.bones.Spine = [
      lean,
      amplitude * 0.12 * Math.sin((t * Math.PI) / 2),
      0,
    ];
    if (id === "alert") {
      pose.bones.LeftArm = [32, 0, 18];
      pose.bones.LeftForeArm = [110, 0, 0];
      pose.face = { browDownLeft: 0.3, browDownRight: 0.3, mouthPress: 0.15 };
    }
    return pose;
  },
}));
const inPlaceTurn = (id) => {
  const c = clipById.get(id);
  return {
    ...c,
    sample(t) {
      const pose = c.sample(t);
      pose.root.yaw = 0;
      return pose;
    },
  };
};
const clips = [
  baseIdle,
  clipById.get("walk"),
  clipById.get("run"),
  inPlaceTurn("turn_left_45"),
  inPlaceTurn("turn_right_45"),
  ...poses,
  { ...clipById.get("knockdown"), name: "Collapse" },
];
const patch = await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
<defs><pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1h8M1 0v8" stroke="#303f4b" stroke-width="1"/></pattern></defs>
<rect width="1024" height="512" rx="36" fill="#19232c"/><rect width="1024" height="512" fill="url(#weave)"/>
<rect x="18" y="18" width="988" height="476" rx="28" fill="none" stroke="#c8bd97" stroke-width="8" stroke-dasharray="8 5"/>
<path d="M105 105l92 34v98q0 90-92 146-92-56-92-146v-98z" transform="translate(40)" fill="#b7a46c"/>
<text x="145" y="260" text-anchor="middle" font-family="sans-serif" font-size="65" fill="#19232c">47</text>
<g fill="#d2c8a6" font-family="sans-serif" font-weight="bold" text-anchor="middle"><text x="625" y="215" font-size="81">CORRECTIONS</text><text x="625" y="322" font-size="66" letter-spacing="14">LOW TIDE</text></g></svg>`),
)
  .png()
  .toBuffer();

// Rigid manufactured equipment is baked into the same GLB and weighted to the
// torso/hip bones. Human anatomy comes from the authored MakeHuman mesh, not primitives.
function equip(ch, distant) {
  const m = ch.mesh,
    parts = [],
    s = ch.height / 1.8;
  const materials = [
    {
      name: "Embroidered corrections ID",
      color: "#ffffff",
      roughness: 0.94,
      metalness: 0,
      map: "corrections.png",
    },
    { name: "Radio polymer", color: "#171d24", roughness: 0.72, metalness: 0 },
    {
      name: "Brushed steel equipment",
      color: "#8b9299",
      roughness: 0.37,
      metalness: 0.9,
    },
    {
      name: "Radio display",
      color: "#4a776c",
      roughness: 0.4,
      metalness: 0.15,
    },
  ].map((x) => ({ ...x, alpha: "opaque", doubleSided: false }));
  const add = (geo, pos, mat, bone = "Spine2", rot = [0, 0, 0]) => {
    geo.rotateX(rot[0]);
    geo.rotateY(rot[1]);
    geo.rotateZ(rot[2]);
    geo.translate(...pos);
    geo.scale(s, s, s);
    parts.push({
      geo,
      mat: m.materials.length + mat,
      joint: ch.rig.bones.findIndex((b) => b.name === bone),
    });
  };
  const box = (size) => new RoundedBoxGeometry(...size, distant ? 1 : 2, 0.004);
  // Flat embroidered name strip over the fitted CC0 work shirt; remove the
  // former bulky muscle-shaped vest so the shirt and human silhouette read.
  add(box([0.13, 0.042, 0.004]), [-0.084, 1.38, 0.156], 0);
  // Curved breast shield with recessed border, sized to the shirt instead of
  // a floating oversized chest card. Perimeter rings follow a shield outline.
  const outline = [
    [-0.023, 0.027],
    [0, 0.035],
    [0.023, 0.027],
    [0.021, -0.006],
    [0, -0.035],
    [-0.021, -0.006],
  ];
  const vertices = [],
    indices = [],
    uvs = [];
  for (const scale of [1, 0.78, 0])
    for (const [x, y] of outline) {
      vertices.push(
        x * scale,
        y * scale,
        scale === 0.78 ? 0.004 : scale === 0 ? 0.002 : 0,
      );
      uvs.push(x / 0.05 + 0.5, y / 0.08 + 0.5);
    }
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < 6; i++) {
      const a = ring * 6 + i,
        b = ring * 6 + ((i + 1) % 6),
        c = a + 6,
        d = b + 6;
      indices.push(a, c, b, b, c, d);
    }
  const shield = new THREE.BufferGeometry();
  shield.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  shield.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  shield.setIndex(indices);
  shield.computeVertexNormals();
  add(shield, [0.085, 1.405, 0.153], 2);
  // Sewn epaulettes sit on the shoulder slope and follow upper-arm joints.
  for (const side of [-1, 1])
    add(
      box([0.064, 0.009, 0.058]),
      [side * 0.18, 1.505, 0.015],
      1,
      side < 0 ? "RightArm" : "LeftArm",
      [0, 0, side * -0.18],
    );
  add(box([0.046, 0.088, 0.032]), [0.146, 1.49, 0.14], 1);
  add(
    new THREE.CylinderGeometry(0.003, 0.004, 0.11, 8),
    [0.158, 1.585, 0.14],
    1,
  );
  add(box([0.03, 0.021, 0.003]), [0.146, 1.505, 0.158], 3);
  for (let y = 0; y < 4; y++)
    add(box([0.027, 0.002, 0.002]), [0.146, 1.48 - y * 0.006, 0.158], 2);
  // Steel handcuffs at the rear-left belt, and keys clipped to the right hip.
  for (const [x, y] of [
    [0.196, 0.91],
    [0.21, 0.843],
  ])
    add(
      new THREE.TorusGeometry(0.028, 0.004, 8, 28),
      [x, y, -0.09],
      2,
      "Hips",
      [0, 0.2, 0],
    );
  add(
    new THREE.TorusGeometry(0.013, 0.003, 6, 12),
    [0.204, 0.878, -0.09],
    2,
    "Hips",
    [0, 0.5, 0],
  );
  add(
    new THREE.TorusGeometry(0.021, 0.003, 8, 20),
    [-0.223, 0.96, 0.055],
    2,
    "Hips",
  );
  for (let i = 0; i < 3; i++) {
    add(
      box([0.006, 0.055, 0.003]),
      [-0.225 + i * 0.009, 0.917, 0.055 + i * 0.004],
      2,
      "Hips",
      [0, 0, (i - 1) * 0.17],
    );
    add(
      box([0.015, 0.009, 0.004]),
      [-0.22 + i * 0.009, 0.895, 0.055 + i * 0.004],
      2,
      "Hips",
    );
  }
  const pos = [...m.positions],
    nrm = [...m.normals],
    uv = [...m.uvs],
    joints = [...m.joints],
    weights = [...m.weights];
  for (const { geo, mat, joint } of parts) {
    const base = pos.length / 3,
      count = geo.attributes.position.count;
    pos.push(...geo.attributes.position.array);
    nrm.push(...geo.attributes.normal.array);
    uv.push(...geo.attributes.uv.array);
    for (let i = 0; i < count; i++) {
      joints.push(joint, 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }
    const indices = geo.index
      ? Uint32Array.from(geo.index.array, (i) => i + base)
      : Uint32Array.from({ length: count }, (_, i) => i + base);
    m.groups.push({
      material: mat,
      indices,
      polySizes: new Uint8Array(indices.length / 3).fill(3),
      polyIndices: indices,
    });
    geo.dispose();
  }
  const old = m.positions.length;
  m.positions = new Float32Array(pos);
  m.normals = new Float32Array(nrm);
  m.uvs = new Float32Array(uv);
  m.joints = new Uint16Array(joints);
  m.weights = new Float32Array(weights);
  if (m.morphs)
    m.morphs.deltas = m.morphs.deltas.map((d) => {
      const out = new Float32Array(pos.length);
      out.set(d.subarray(0, old));
      return out;
    });
  m.materials.push(...materials);
  // One draw per manufactured material, not one draw for every key/radio grille.
  const batches = new Map();
  for (const group of m.groups) {
    const list = batches.get(group.material) || [];
    list.push(group.indices);
    batches.set(group.material, list);
  }
  m.groups = [...batches].map(([material, lists]) => {
    const indices = new Uint32Array(lists.reduce((n, a) => n + a.length, 0));
    let offset = 0;
    for (const a of lists) {
      indices.set(a, offset);
      offset += a.length;
    }
    return {
      material,
      indices,
      polyIndices: indices,
      polySizes: new Uint8Array(indices.length / 3).fill(3),
    };
  });
}

await mkdir("src/assets/guards", { recursive: true });
const report = [];
for (const [tier, detail, resolution] of [
  ["hero", "high", 2048],
  ["mobile", "medium", 1024],
  ["distant", "low", 256],
]) {
  console.log(`Authoring ${tier} officer`);
  const ch = await buildHuman(lib, { ...params, detail });
  equip(ch, tier === "distant");
  const textures = new Map(
    await Promise.all(
      textureFiles(ch.mesh)
        .filter((f) => f !== "corrections.png")
        .map(async (f) => [f, await lib.texture(f)]),
    ),
  );
  textures.set("corrections.png", patch);
  // Retain the authored work-shirt seams, collar, pockets and trouser folds;
  // recolour its original CC0 albedo into a coherent correctional navy uniform.
  const animator = new Animator(ch.rig, ch.face);
  const baked =
    tier === "hero"
      ? clips.map((c) => ({
          name: c.name,
          loop: c.loop,
          ...animator.bake(c, 30, { rootMotion: false }),
        }))
      : [];
  const raw = exportGLB(ch.mesh, "HirodoraOfficer", textures, ch.rig, baked);
  const doc = await io.readBinary(raw);
  doc.getRoot().setExtras({
    source: "MakeHuman CC0 / Ara 3D Gen",
    tier,
    height: ch.height,
  });
  // Packed linear ORM: restrained normal-derived microcavity occlusion,
  // varied roughness and metallic response. Not a claim of ray-traced AO.
  for (const mat of doc.getRoot().listMaterials()) {
    if (mat.getName() === "Skin") {
      mat.setBaseColorFactor([1, 0.97, 0.95, 1]);
      mat.setNormalScale(0.45);
      mat.setRoughnessFactor(0.72);
    }
    if (mat.getName() === "Eyes") mat.setRoughnessFactor(0.22);
    const size = 64,
      data = Buffer.alloc(size * size * 3);
    const normal = mat.getNormalTexture();
    const normals = normal
      ? await sharp(normal.getImage())
          .resize(size, size)
          .removeAlpha()
          .raw()
          .toBuffer()
      : null;
    const rough = mat.getRoughnessFactor(),
      metal = mat.getMetallicFactor();
    for (let i = 0; i < size * size; i++) {
      const x = i % size,
        y = Math.floor(i / size),
        grain = Math.sin(x * 21.7 + y * 37.1) * 0.5 + 0.5;
      const slope = normals
        ? Math.hypot(normals[i * 3] / 127.5 - 1, normals[i * 3 + 1] / 127.5 - 1)
        : 0;
      data[i * 3] = Math.round(255 * (1 - Math.min(0.22, slope * 0.16)));
      data[i * 3 + 1] = Math.round(
        255 * Math.min(1, Math.max(0, rough + (grain - 0.5) * 0.08)),
      );
      data[i * 3 + 2] = Math.round(255 * metal);
    }
    const orm = doc
      .createTexture(mat.getName() + " ORM")
      .setMimeType("image/png")
      .setImage(
        await sharp(data, { raw: { width: size, height: size, channels: 3 } })
          .png()
          .toBuffer(),
      );
    mat
      .setMetallicRoughnessTexture(orm)
      .setRoughnessFactor(1)
      .setMetallicFactor(1)
      .setOcclusionTexture(orm)
      .setOcclusionStrength(0.4);
  }
  if (tier === "distant")
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.005 }),
    );
  await doc.transform(
    dedup(),
    prune(),
    resample(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [resolution, resolution],
      quality: 88,
      effort: 65,
    }),
    // Hair cards and closed-mouth interiors do not need the face/cloth 2K budget.
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      pattern: /hair_|teeth_|tongue_/,
      resize: [
        tier === "hero" ? 1024 : Math.min(512, resolution),
        tier === "hero" ? 1024 : Math.min(512, resolution),
      ],
      quality: 86,
      effort: 65,
    }),
    meshopt({
      encoder: MeshoptEncoder,
      level: "high",
      quantizePosition: 16,
      quantizeTexcoord: 14,
    }),
  );
  const file = `src/assets/guards/officer-${tier}.glb`;
  await io.write(file, doc);
  const triangles = doc
    .getRoot()
    .listMeshes()
    .reduce(
      (n, m) =>
        n +
        m
          .listPrimitives()
          .reduce((a, p) => a + p.getIndices().getCount() / 3, 0),
      0,
    );
  report.push({
    tier,
    triangles,
    bones: ch.rig.bones.length,
    height: ch.height,
    animations: baked.map((c) => c.name),
    file,
  });
  console.log(JSON.stringify(report.at(-1)));
}
await writeFile(
  "src/assets/guards/manifest.json",
  JSON.stringify(
    {
      sourceRevision,
      makeHumanRevision,
      assetPackSha256,
      params,
      lods: report,
    },
    null,
    2,
  ) + "\n",
);
