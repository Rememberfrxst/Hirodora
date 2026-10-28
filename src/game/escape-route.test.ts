import test from "node:test";
import assert from "node:assert/strict";
import {
  ENEMY_GUN,
  stepEnemyGun,
  routeGuards,
  routeSupport,
  ROUTE,
} from "./escape-route";
import { findPath } from "./navigation";
test("enemy bullets deal 50: four confirmed hits defeat 200 HP; lost sight cancels aim", () => {
  let health = 200,
    windup: number | undefined,
    cooldown = 0,
    shots = 0;
  for (let t = 0; t < 15; t += 0.05) {
    const s = stepEnemyGun(windup, cooldown, true, 0.05);
    windup = s.windup;
    cooldown = s.cooldown;
    if (s.fire) {
      health = Math.max(0, health - ENEMY_GUN.damage);
      if (++shots === 4) break;
    }
  }
  assert.equal(shots, 4);
  assert.equal(health, 0);
  assert.equal(stepEnemyGun(0.79, 0, false, 0.05).fire, false);
  assert.equal(stepEnemyGun(0.79, 0, false, 0.05).windup, undefined);
  assert.equal(stepEnemyGun(undefined, 1, true, 0.05).windup, undefined);
  assert.equal(stepEnemyGun(0.79, 0, true, 0.05).fire, true);
});
test("hidden rooms, underground tunnel and military dock have bounded support and patrol routes", () => {
  for (const region of ["secret", "military"] as const)
    for (const g of routeGuards(region))
      for (const p of g.patrolRoute)
        assert.equal(routeSupport(region, p[0], p[2], p[1]), p[1]);
  assert.equal(routeGuards("secret").length, 6);
  assert.equal(routeGuards("military").length, 10);
  assert.equal(routeSupport("secret", 132, 25, -4), -4);
  assert.equal(routeSupport("secret", 132, 25, 0), undefined);
  assert.equal(routeSupport("military", 280, 10, 0), undefined);
  assert.equal(routeSupport("military", 284, 0, 0), 0);
  assert.equal(routeSupport("military", 300, 0, 0), undefined);
  assert.ok(findPath([182, 0], [270, 0], [], ROUTE.military).length > 100);
});
