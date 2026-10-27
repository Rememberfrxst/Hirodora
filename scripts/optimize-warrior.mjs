import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld,
  simplify,
  dedup,
  prune,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await Promise.all([
  MeshoptEncoder.ready,
  MeshoptDecoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const doc = await io.read(process.argv[2]);
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.12, error: 0.002 }),
  dedup(),
  prune(),
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [2048, 2048],
    quality: 90,
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write(process.argv[3], doc);
const hash = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
await writeFile(
  process.argv[3].replace(/\.glb$/, "-manifest.json"),
  JSON.stringify(
    {
      title: "The Redeemed Warrior",
      author: "denizuchia",
      license: "CC BY 4.0",
      licenseURL: "https://creativecommons.org/licenses/by/4.0/",
      source:
        "https://sketchfab.com/3d-models/the-redeemed-warrior-65f5d47ef460496d9fc9a312c2cf9b5e",
      sourceTriangles: 857264,
      triangles: doc
        .getRoot()
        .listMeshes()
        .reduce(
          (n, m) =>
            n +
            m
              .listPrimitives()
              .reduce((n, p) => n + p.getIndices().getCount() / 3, 0),
          0,
        ),
      sourceSHA256: process.argv[4] ? await hash(process.argv[4]) : null,
      runtimeSHA256: await hash(process.argv[3]),
      changes:
        "USD transforms baked; floor/scale normalization; normals and UVs retained; mesh simplification; 2K WebP and Meshopt encoding",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Warrior optimized triangles",
  doc
    .getRoot()
    .listMeshes()
    .reduce(
      (n, m) =>
        n +
        m
          .listPrimitives()
          .reduce((n, p) => n + p.getIndices().getCount() / 3, 0),
      0,
    ),
);
