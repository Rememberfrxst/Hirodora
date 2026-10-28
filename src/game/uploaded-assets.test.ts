import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const base = new URL("../assets/environment/", import.meta.url);
test("supplied GLBs retain real textured geometry, attribution and metre/floor normalization", async () => {
  await MeshoptDecoder.ready;
  const doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder })
    .read(new URL("uploaded-props.glb", base).pathname);
  assert.ok(
    !doc
      .getRoot()
      .listExtensionsUsed()
      .some((e) => e.extensionName === "KHR_materials_pbrSpecularGlossiness"),
  );
  for (const [name, height, triangles] of [
    ["Table", 0.82, 2444],
    ["Toilet", 0.98, 3038],
    ["Screwdriver", 0.0356871, 5720],
  ] as const) {
    const node = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === name)!;
    assert.ok(node, name);
    assert.match(String(node.getExtras().license), /CC-BY-4.0/);
    assert.match(
      String(node.getExtras().source),
      /^https:\/\/sketchfab.com\/3d-models\//,
    );
    const bounds = getBounds(node);
    assert.ok(Math.abs(bounds.min[1]) < 0.001, `${name} floor aligned`);
    assert.ok(
      Math.abs(bounds.max[1] - height) < 0.001,
      `${name} correct scale`,
    );
    let count = 0;
    node.traverse((n) => {
      for (const p of n.getMesh()?.listPrimitives() || []) {
        count += p.getIndices()!.getCount() / 3;
        for (const semantic of ["POSITION", "NORMAL", "TEXCOORD_0"]) {
          const a = p.getAttribute(semantic)!;
          assert.ok(a, `${name}: ${semantic}`);
          assert.ok(Array.from(a.getArray()!).every(Number.isFinite));
        }
        const mat = p.getMaterial()!;
        assert.ok(
          mat.getBaseColorTexture(),
          `${name}: original albedo retained`,
        );
        // The supplied screwdriver has albedo/ORM + geometry normals, but no
        // tangent-space normal texture; do not fabricate missing source maps.
        if (name !== "Screwdriver")
          assert.ok(
            mat.getNormalTexture(),
            `${name}: original normal retained`,
          );
        assert.ok(
          mat.getMetallicRoughnessTexture(),
          `${name}: PBR surface retained`,
        );
      }
    });
    assert.equal(
      count,
      triangles,
      `${name} is the detailed supplied mesh, not a proxy`,
    );
  }
});
test("Rock Wall 16 is a complete 2K dielectric PBR set with correct hashes and valid normal data", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", base), "utf8"),
  );
  assert.equal(manifest.uploadedAssets.wall.license, "CC0-1.0");
  const mobile = JSON.parse(await readFile(new URL('mobile-materials.json', base), 'utf8'));
  assert.equal(mobile.license, 'CC0-1.0');
  for (const entry of mobile.records) {
    const bytes = await readFile(new URL(entry.file, base));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    const info = await sharp(bytes).metadata();
    assert.equal(info.width, 1024);
    assert.equal(info.height, 1024);
    assert.ok(entry.bytes < entry.originalBytes);
  }
  for (const file of [
    "rock16-albedo.webp",
    "rock16-normal.webp",
    "rock16-orm.webp",
    "uploaded-props.glb",
    "retained-fixtures.glb",
  ]) {
    const bytes = await readFile(new URL(file, base)),
      entry = manifest.assets.find((a: any) => a.name === file);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
    if (file.endsWith(".webp")) {
      const info = await sharp(bytes).metadata();
      assert.equal(info.width, 2048);
      assert.equal(info.height, 2048);
    }
  }
  const orm = await sharp(new URL("rock16-orm.webp", base).pathname)
    .removeAlpha()
    .raw()
    .toBuffer();
  for (let i = 2; i < orm.length; i += 3)
    assert.equal(orm[i], 0, "non-metallic stone");
  const n = await sharp(new URL("rock16-normal.webp", base).pathname)
    .removeAlpha()
    .raw()
    .toBuffer();
  for (let i = 0; i < n.length; i += 3003) {
    const length = Math.hypot(
      n[i] / 127.5 - 1,
      n[i + 1] / 127.5 - 1,
      n[i + 2] / 127.5 - 1,
    );
    assert.ok(
      Math.abs(length - 1) < 0.04,
      "linear normal conversion, no display gamma",
    );
  }
});
