/** Licensed, rigged t-shirt/jeans prisoner. Offline authoring, not runtime generation. */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  resample,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
execFileSync(
  process.execPath,
  ["--import", "tsx", "scripts/build-guard-assets.mjs", "--verify-sources"],
  { stdio: "inherit" },
);
const source =
  process.env.HIRODORA_CHARACTER_SOURCE || "/tmp/hirodora-character-pipeline";
const load = (f) => import(pathToFileURL(resolve(source, f)).href);
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
const params = {
  ...DEFAULT_PARAMS,
  name: "Cell47Prisoner",
  seed: 247,
  age: 0.53,
  weight: 0.43,
  muscle: 0.36,
  skin: "young_caucasian_male2",
  hair: "short02",
  hairTint: "#594b3d",
  facialHair: "stubble",
  outfit: "male_casualsuit06",
  outfitTint: "#c9c6b4",
  shoes: "shoes01",
  detail: "medium",
  speechShapes: false,
};
const lib = await nodeLibrary(),
  ch = await buildHuman(lib, params);
const textures = new Map(
  await Promise.all(
    textureFiles(ch.mesh).map(async (f) => [f, await lib.texture(f)]),
  ),
);
const animator = new Animator(ch.rig, ch.face);
const clips = ["idle", "walk", "run", "death_backward"].map((id) => {
  const c = clipById.get(id);
  return {
    name: id === "death_backward" ? "Death" : c.name,
    loop: c.loop,
    ...animator.bake(c, 30, { rootMotion: false }),
  };
});
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const doc = await io.readBinary(
  exportGLB(ch.mesh, "Cell47Prisoner", textures, ch.rig, clips),
);
for (const m of doc.getRoot().listMaterials()) {
  m.setMetallicFactor(0);
  if (m.getName() === "Skin") {
    m.setRoughnessFactor(0.73);
    m.setNormalScale(0.55);
  }
}
await doc.transform(
  dedup(),
  prune(),
  resample(),
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [2048, 2048],
    quality: 88,
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write("src/assets/guards/prisoner.glb", doc);
const triangles = doc
  .getRoot()
  .listMeshes()
  .reduce(
    (sum, m) =>
      sum +
      m.listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0),
    0,
  );
await writeFile(
  "src/assets/guards/prisoner-manifest.json",
  JSON.stringify(
    {
      source: "MakeHuman CC0 via pinned Ara 3D Gen; see GUARD-ASSETS.md",
      params,
      triangles,
      bones: ch.rig.bones.length,
      clips: clips.map((c) => c.name),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Authored prisoner:",
  triangles,
  "triangles, t-shirt/jeans, 4 skeletal clips",
);
