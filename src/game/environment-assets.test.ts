import { test } from "node:test";
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { readFile } from "node:fs/promises";
test("cell GLB includes the five authored fixtures with valid normals, UVs and finite geometry", async () => {
  await MeshoptDecoder.ready;
  const doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .read(
      new URL("../assets/environment/cell-props.glb", import.meta.url).pathname,
    );
  const nodes = doc.getRoot().listNodes();
  for (const name of ["Bunk", "Toilet", "Sink", "Window", "Luminaire"])
    assert.ok(
      nodes.some((n) => n.getName() === name),
      name,
    );
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const position = p.getAttribute("POSITION")!,
        normal = p.getAttribute("NORMAL")!,
        uv = p.getAttribute("TEXCOORD_0")!;
      assert.ok(position && normal && uv, m.getName());
      assert.ok(Array.from(position.getArray()!).every(Number.isFinite));
      for (let i = 0; i < normal.getCount(); i++)
        assert.ok(
          Math.abs(Math.hypot(...normal.getElement(i, [])) - 1) < 0.03,
          "unit normals",
        );
    }
});
test("matched scene captures preserve original colliders, doors and interactions", async () => {
  const before = JSON.parse(
    await readFile(
      new URL(
        "../../docs/screenshots/environment/before/capture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const after = JSON.parse(
    await readFile(
      new URL(
        "../../docs/screenshots/environment/after/capture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.deepEqual(after.views, before.views, "identical capture cameras");
  assert.deepEqual(
    after.gameplay,
    before.gameplay,
    "exact gameplay geometry and interaction snapshots",
  );
});
