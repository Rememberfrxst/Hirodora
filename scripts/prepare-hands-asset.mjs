/** Rebuild the supplied CC BY rig in a documented, stable anatomical frame. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  prune,
  dedup,
  weld,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import * as T from "three";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const bytes = await readFile(process.argv[2]),
  d = await io.readBinary(bytes),
  root = d.getRoot(),
  meta = root.getAsset().extras;
if (!meta?.source || !String(meta.license).includes("CC-BY-4.0"))
  throw Error("Missing redistributable hands provenance");
const old = root.listNodes().find((n) => n.getSkin()),
  skin = old.getSkin(),
  joints = skin.listJoints(),
  ibm = skin.getInverseBindMatrices(),
  source = old.getMesh().listPrimitives()[0];
const oldNodes = [...root.listNodes()];
const bind = new Map(
  joints.map((j, i) => [
    j.getName(),
    new T.Matrix4().fromArray(ibm.getElement(i, [])).invert(),
  ]),
);
const pos = (name) => new T.Vector3().setFromMatrixPosition(bind.get(name));
const scene = d.createScene("Uploaded anatomical hands");
root.setDefaultScene(scene);
const buffer = root.listBuffers()[0],
  scale = 1.25;
const accessor = (type, array) =>
  d.createAccessor().setType(type).setBuffer(buffer).setArray(array);
let triangles = 0;
for (const [side, suffix, armNames] of [
  [
    "Right",
    [
      "_025",
      "_026",
      "_027",
      "_028",
      "_029",
      "_030",
      "_031",
      "_032",
      "_033",
      "_034",
      "_035",
      "_036",
      "_037",
      "_038",
      "_039",
      "_040",
    ],
    ["Bone.001_03", "Bone.018_04"],
  ],
  [
    "Left",
    [
      "_08",
      "_09",
      "_010",
      "_011",
      "_012",
      "_013",
      "_014",
      "_015",
      "_016",
      "_017",
      "_018",
      "_019",
      "_020",
      "_021",
      "_022",
      "_023",
    ],
    ["Bone.0011_06", "Bone.0181_00"],
  ],
]) {
  const find = (s) => joints.find((n) => n.getName().endsWith(s)).getName(),
    names = suffix.map(find),
    wrist = pos(names[0]);
  const y = pos(names[8]).sub(wrist).normalize(),
    z = pos(names[10]).sub(pos(names[1])).normalize(),
    x = new T.Vector3().crossVectors(y, z).normalize();
  z.crossVectors(x, y).normalize();
  const basis = new T.Matrix4().makeBasis(x, y, z),
    toLocal = basis.clone().invert(),
    convert = (p) =>
      p.clone().sub(wrist).applyMatrix4(toLocal).multiplyScalar(scale);
  const entries = [
    { name: side + "ForeArm", source: armNames[0], parent: -1 },
    { name: side + "ForeArmTwist", source: armNames[1], parent: 0 },
    { name: side + "Hand", source: names[0], parent: 1 },
  ];
  for (const [f, start] of [
    ["Pinky", 1],
    ["Ring", 4],
    ["Middle", 7],
    ["Index", 10],
    ["Thumb", 13],
  ]) {
    // Source digit order is pinky/ring/middle/index/thumb, validated in bind space.
    const first = entries.length;
    for (let k = 0; k < 3; k++)
      entries.push({
        name: side + "Hand" + f + (k + 1),
        source: names[start + k],
        parent: k ? first + k - 1 : 2,
      });
    const last = pos(names[start + 2]),
      prev = pos(names[start + 1]);
    const end = last.clone().add(
      last
        .clone()
        .sub(prev)
        .normalize()
        .multiplyScalar(
          joints
            .find((n) => n.getName() === names[start + 2])
            .listChildren()[0]
            .getTranslation()[1],
        ),
    );
    entries.push({
      name: side + "Hand" + f + "4",
      point: end,
      parent: first + 2,
    });
  }
  const world = [],
    nodes = [];
  entries.forEach((e, i) => {
    const p = convert(e.point || pos(e.source));
    let q = new T.Quaternion();
    if (e.name.includes("Hand") && !e.name.endsWith("Hand")) {
      const next = entries.find((n) => n.parent === i);
      if (next)
        q.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          convert(next.point || pos(next.source))
            .sub(p)
            .normalize(),
        );
    }
    const matrix = new T.Matrix4().compose(p, q, new T.Vector3(1, 1, 1));
    world.push(matrix);
    const local =
      e.parent < 0 ? matrix : world[e.parent].clone().invert().multiply(matrix);
    const a = new T.Vector3(),
      b = new T.Quaternion(),
      c = new T.Vector3();
    local.decompose(a, b, c);
    const node = d
      .createNode(e.name)
      .setTranslation(a.toArray())
      .setRotation(b.toArray())
      .setScale(c.toArray());
    nodes.push(node);
    if (e.parent >= 0) nodes[e.parent].addChild(node);
    else scene.addChild(node);
  });
  const mapping = new Map(
    entries.filter((e) => e.source).map((e) => [e.source, entries.indexOf(e)]),
  );
  const positions = source.getAttribute("POSITION"),
    normals = source.getAttribute("NORMAL"),
    js = source.getAttribute("JOINTS_0"),
    ws = source.getAttribute("WEIGHTS_0"),
    count = positions.getCount();
  const pArray = new Float32Array(count * 3),
    nArray = new Float32Array(count * 3),
    jArray = new Uint16Array(count * 4),
    weights = new Float32Array(count * 4),
    keep = [];
  for (let i = 0; i < count; i++) {
    pArray.set(
      convert(new T.Vector3().fromArray(positions.getElement(i, []))).toArray(),
      i * 3,
    );
    nArray.set(
      new T.Vector3()
        .fromArray(normals.getElement(i, []))
        .transformDirection(toLocal)
        .toArray(),
      i * 3,
    );
    const j = js.getElement(i, []),
      w = ws.getElement(i, []);
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const idx = mapping.get(joints[j[k]].getName());
      jArray[i * 4 + k] = idx ?? 0;
      weights[i * 4 + k] = w[k];
      if (idx !== undefined) sum += w[k];
    }
    keep.push(sum > 0.985);
  }
  const indices = source.getIndices().getArray(),
    filtered = [];
  for (let i = 0; i < indices.length; i += 3)
    if (keep[indices[i]] && keep[indices[i + 1]] && keep[indices[i + 2]])
      filtered.push(...indices.slice(i, i + 3));
  triangles += filtered.length / 3;
  const primitive = source
    .clone()
    .setIndices(accessor("SCALAR", new Uint32Array(filtered)))
    .setAttribute("POSITION", accessor("VEC3", pArray))
    .setAttribute("NORMAL", accessor("VEC3", nArray))
    .setAttribute("JOINTS_0", accessor("VEC4", jArray))
    .setAttribute("WEIGHTS_0", accessor("VEC4", weights))
    .setAttribute("TANGENT", null);
  const inverse = new Float32Array(world.length * 16);
  world.forEach((m, i) => inverse.set(m.clone().invert().toArray(), i * 16));
  const newSkin = d
    .createSkin(side + "HandRig")
    .setInverseBindMatrices(accessor("MAT4", inverse));
  nodes.forEach((n) => newSkin.addJoint(n));
  scene.addChild(
    d
      .createNode(side + "ArmMesh")
      .setMesh(d.createMesh(side + "ForearmAndHand").addPrimitive(primitive))
      .setSkin(newSkin),
  );
}
for (const a of root.listAnimations()) a.dispose();
for (const s of [...root.listScenes()]) if (s !== scene) s.dispose();
for (const n of oldNodes) n.dispose();
await d.transform(
  prune(),
  weld(),
  dedup(),
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [2048, 2048],
    quality: 92,
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
const output = await io.writeBinary(d);
await writeFile("src/assets/guards/first-person-arm.glb", output);
const manifest = {
  ...meta,
  sourceSHA256: createHash("sha256").update(bytes).digest("hex"),
  runtimeSHA256: createHash("sha256").update(output).digest("hex"),
  bytes: output.length,
  triangles,
  scale,
  changes:
    "Original textured forearms/hands retained; upper-arm triangles cropped by skin weights; split left/right meshes; anatomical bind-space joint renaming and neutral palm frame; original PBR maps as 2K WebP, meshopt. Source animation replaced by game-authored grip/reload presentation.",
};
await writeFile(
  "src/assets/guards/hand-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "src/assets/guards/HANDS-LICENSE.txt",
  `${meta.title}\nAuthor: ${meta.author}\nSource: ${meta.source}\nLicense: ${meta.license}\nChanges: ${manifest.changes}\n`,
);
console.log(manifest);
