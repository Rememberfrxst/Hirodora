/** Derive the first-person arm from the existing CC0 humanoid, with real fingers/UVs. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const d = await io.read("src/assets/guards/prisoner.glb");
const n = d
    .getRoot()
    .listNodes()
    .find((n) => n.getSkin()),
  names = n
    .getSkin()
    .listJoints()
    .map((j) => j.getName());
const mesh = n.getMesh();
for (const p of [...mesh.listPrimitives()]) {
  if (p.getMaterial().getName() !== "Skin") {
    mesh.removePrimitive(p);
    continue;
  }
  for (const target of p.listTargets()) p.removeTarget(target);
  const joints = p.getAttribute("JOINTS_0"),
    weights = p.getAttribute("WEIGHTS_0");
  const keep = (i) =>
    joints
      .getElement(i, [])
      .reduce(
        (sum, j, k) =>
          sum +
          (/^Right(ForeArm|Hand)/.test(names[j])
            ? weights.getElement(i, [])[k]
            : 0),
        0,
      ) > 0.98;
  const indices = p.getIndices().getArray(),
    filtered = [];
  for (let i = 0; i < indices.length; i += 3)
    if (keep(indices[i]) && keep(indices[i + 1]) && keep(indices[i + 2]))
      filtered.push(...indices.slice(i, i + 3));
  p.setIndices(
    d
      .createAccessor("ArmTriangles")
      .setType("SCALAR")
      .setBuffer(d.getRoot().listBuffers()[0])
      .setArray(new Uint32Array(filtered)),
  );
  for (const semantic of p.listSemantics())
    if (semantic === "COLOR_0") p.setAttribute(semantic, null);
}
for (const animation of d.getRoot().listAnimations()) animation.dispose();
mesh.setWeights([]);
n.setWeights([]);
await d.transform(
  prune(),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write("src/assets/guards/first-person-arm.glb", d);
console.log(
  "Authored rigged first-person forearm from existing licensed prisoner.",
);
