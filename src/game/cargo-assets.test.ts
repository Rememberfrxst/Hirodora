import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import assets from "../assets/environment/cargo-manifest.json";
import * as THREE from "three";
import { CARGO } from "./cargo-layout";
import { sightEvidence } from "./perception";
import type { GuardData } from "./types";
test("three supplied wood assets retain embedded licensed materials, valid geometry and actual stair surfaces", async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  for (const source of assets.sources) {
    assert.match(source.license, /CC-BY-4.0/);
    assert.ok(source.author && source.source);
    const bytes = await readFile(
      new URL(`../assets/environment/${source.file}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.runtimeSHA256,
    );
    const d = await io.readBinary(bytes);
    assert.ok(d.getRoot().listTextures().length >= 2);
    for (const m of d.getRoot().listMeshes())
      for (const p of m.listPrimitives()) {
        assert.ok(p.getAttribute("TEXCOORD_0"));
        assert.ok(
          p.getMaterial()?.getBaseColorTexture() ||
            p.getMaterial()?.getName() === "hook",
          "source metal hook uses a uniform PBR factor, not a missing color map",
        );
        assert.ok(
          p.getAttribute("POSITION")!.getArray()!.every(Number.isFinite),
        );
      }
    if (source.name === "WoodStairs") {
      const heights: number[] = [];
      for (const n of d.getRoot().listNodes())
        if (n.getMesh())
          for (const p of n.getMesh()!.listPrimitives()) {
            const a = p.getAttribute("POSITION")!,
              idx = p.getIndices()!.getArray()!,
              matrix = new THREE.Matrix4().fromArray(n.getWorldMatrix());
            for (let i = 0; i < idx.length; i += 3) {
              const v = [0, 1, 2].map((k) =>
                new THREE.Vector3()
                  .fromArray(a.getElement(idx[i + k], []))
                  .applyMatrix4(matrix),
              );
              const normal = v[1]
                .clone()
                .sub(v[0])
                .cross(v[2].clone().sub(v[0]))
                .normalize();
              if (
                normal.y > 0.99 &&
                Math.max(...v.map((p) => p.z)) -
                  Math.min(...v.map((p) => p.z)) >
                  1.5 &&
                Math.max(...v.map((p) => p.x)) -
                  Math.min(...v.map((p) => p.x)) >
                  0.5
              )
                heights.push(v[0].y);
            }
          }
      for (const step of assets.treads)
        assert.ok(
          heights.some((y) => Math.abs(y - step.height) < 0.015),
          "navigation must coincide with actual rendered wood tread " +
            step.height,
        );
    }
  }
  assert.equal(assets.treads.length, 11);
  assert.equal(assets.treads.at(-1)!.height, 3.2);
  const cover = CARGO.map((c) => {
    const b = assets.sources.find((s) => s.name === c.asset)!.bounds;
    return new THREE.Box3(
      new THREE.Vector3(...b.min),
      new THREE.Vector3(...b.max),
    ).applyMatrix4(
      new THREE.Matrix4().makeRotationY(c.yaw).setPosition(c.x, c.y, c.z),
    );
  });
  const guard = {
    position: [-21, -3.8, 6],
    rotationY: Math.PI,
    visionRange: 10,
    visionAngle: 76,
  } as GuardData;
  assert.ok(sightEvidence(guard, [-21, -3.8, 3], true, false, false, []) > 0);
  assert.equal(
    sightEvidence(guard, [-21, -3.8, 3], true, false, false, cover),
    0,
    "the imported crate stack is real crouch cover, not just decoration",
  );
});
