import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PracticalLightPool } from "./lighting";
import { createSidearm } from "./sidearm";

test("practical lights keep four stable slots, hysteresis and zero-intensity rebinding", () => {
  const scene = new THREE.Scene();
  const sources = Array.from({ length: 8 }, (_, i) => {
    const l = new THREE.PointLight(0xffffff, 3, 12);
    l.position.set(i * 4, 3, 0);
    scene.add(l);
    return l;
  });
  const pool = new PracticalLightPool(scene, sources, new THREE.Vector3());
  assert.equal(pool.slots.length, 4);
  assert.ok(sources.every((l) => !l.visible));
  const first = pool.slots.map((s) => s.source);
  for (let i = 0; i < 100; i++)
    pool.update(new THREE.Vector3(Math.sin(i) * 0.05, 0, 0), 0.02);
  assert.deepEqual(
    pool.slots.map((s) => s.source),
    first,
  );
  let rebinds = 0;
  for (let i = 0; i < 120; i++) {
    const old = pool.slots.map((s) => s.source);
    pool.update(new THREE.Vector3(28, 0, 0), 1 / 60);
    pool.slots.forEach((s, j) => {
      if (s.source !== old[j]) {
        rebinds++;
        assert.equal(s.light.intensity, 0);
      }
      assert.equal(s.light.visible, true);
    });
    assert.equal(new Set(pool.slots.map((s) => s.source)).size, 4);
  }
  assert.ok(rebinds > 0);
  assert.ok(pool.slots.some((s) => s.source === sources[7]));
  pool.dispose();
  assert.equal(scene.children.length, 8);
});
test("sidearm has an open trigger guard, separate hardware, muzzle flash and bounded human scale", () => {
  const { root, flash, light } = createSidearm();
  const bounds = new THREE.Box3().setFromObject(root);
  assert.ok(bounds.max.z - bounds.min.z < 0.35);
  assert.ok(bounds.max.y - bounds.min.y < 0.2);
  assert.ok(root.children.length > 20);
  assert.ok(light instanceof THREE.PointLight);
  assert.ok(flash.position.z > 0.16);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
});
