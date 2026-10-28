import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { BALLISTICS, bulletDamage } from "./ballistics";
import { decideGuard } from "./guard-ai";
import type { GuardData } from "./types";
import assets from "../assets/ballistics/manifest.json";
test("10mm body hits deal 100 and exactly two defeat a 200 HP officer", () => {
  assert.equal(BALLISTICS.guardHP, 200);
  const first = bulletDamage(undefined, false);
  assert.deepEqual(first, { health: 100, dead: false, damage: 100 });
  assert.deepEqual(bulletDamage(first.health, false), {
    health: 0,
    dead: true,
    damage: 100,
  });
});
test("one head hit is lethal, dead bodies cannot take negative HP", () => {
  assert.deepEqual(bulletDamage(200, true), {
    health: 0,
    dead: true,
    damage: 200,
  });
  assert.equal(bulletDamage(0, false).damage, 0);
});
test("dead guards do not recover, chase or attack even with fresh sight/noise", () => {
  const g = {
    dead: true,
    state: "knocked_out",
    stateTimer: 0,
    position: [0, 0, 0],
  } as unknown as GuardData;
  const result = decideGuard(
    g,
    { vision: 1, player: [0, 0, 0.5], atTarget: true, captureClear: true },
    1000,
  );
  assert.equal(result.next.state, "knocked_out");
  assert.equal(result.speed, 0);
  assert.equal(result.caughtPlayer, false);
  assert.equal(result.target, undefined);
});
test("uploaded gun and can are credited real PBR GLBs with stable metre bounds", async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  for (const a of assets.sources) {
    assert.match(a.license, /CC-BY-4.0/);
    assert.match(a.source, /sketchfab.com/);
    const bytes = await readFile(
      new URL(`../assets/ballistics/${a.file}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      a.runtimeSHA256,
    );
    const doc = await io.readBinary(bytes);
    assert.ok(doc.getRoot().listTextures().length >= 3);
    for (const mesh of doc.getRoot().listMeshes())
      for (const p of mesh.listPrimitives()) {
        assert.ok(
          p.getMaterial()!.getBaseColorTexture() ||
            (p.getMaterial()!.getName() === "lambert1" &&
              p.getMaterial()!.getNormalTexture() &&
              p.getMaterial()!.getMetallicRoughnessTexture()),
          "the can's plain aluminium uses a constant albedo with real normal/roughness maps",
        );
        assert.ok(p.getAttribute("TEXCOORD_0"));
        assert.ok(
          p.getAttribute("POSITION")!.getArray()!.every(Number.isFinite),
        );
      }
    const b = getBounds(doc.getRoot().getDefaultScene()!);
    assert.ok(
      Math.abs(
        (a.file.startsWith("pistol")
          ? b.max[2] - b.min[2]
          : b.max[1] - b.min[1]) - (a.file.startsWith("pistol") ? 0.24 : 0.125),
      ) < 0.001,
    );
  }
});
