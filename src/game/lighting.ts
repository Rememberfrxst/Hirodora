import * as THREE from "three";
/** Four stable GPU light slots. Replacements fade to zero before rebinding. */
export class PracticalLightPool {
  public slots: {
    light: THREE.PointLight;
    source: THREE.PointLight;
    pending?: THREE.PointLight;
    weight: number;
  }[] = [];
  private timer = 0;
  constructor(
    private scene: THREE.Scene,
    private sources: THREE.PointLight[],
    position: THREE.Vector3,
  ) {
    for (const source of sources) source.visible = false;
    const nearest = [...sources].sort(
      (a, b) =>
        a.position.distanceToSquared(position) -
        b.position.distanceToSquared(position),
    );
    for (const source of nearest.slice(0, 4)) {
      const light = new THREE.PointLight(
        source.color,
        source.intensity,
        source.distance,
        source.decay,
      );
      light.position.copy(source.position);
      light.name = "StablePracticalSlot";
      scene.add(light);
      this.slots.push({ light, source, weight: 1 });
    }
  }
  update(position: THREE.Vector3, dt: number) {
    this.timer -= dt;
    const score = (s: THREE.PointLight) =>
      s.intensity / (1 + s.position.distanceToSquared(position));
    if (this.timer <= 0) {
      this.timer = 0.4;
      const claimed = new Set(
        this.slots.flatMap((s) =>
          s.pending ? [s.source, s.pending] : [s.source],
        ),
      );
      const candidates = [...this.sources]
        .filter((s) => !claimed.has(s))
        .sort((a, b) => score(b) - score(a));
      for (const slot of [...this.slots].sort(
        (a, b) => score(a.source) - score(b.source),
      )) {
        const next = candidates[0];
        if (!slot.pending && next && score(next) > score(slot.source) * 1.25) {
          slot.pending = next;
          candidates.shift();
        }
      }
    }
    for (const slot of this.slots) {
      slot.weight = slot.pending
        ? Math.max(0, slot.weight - dt / 0.35)
        : Math.min(1, slot.weight + dt / 0.35);
      if (slot.pending && slot.weight === 0) {
        slot.source = slot.pending;
        slot.pending = undefined;
        slot.light.position.copy(slot.source.position);
        slot.light.color.copy(slot.source.color);
        slot.light.distance = slot.source.distance;
        slot.light.decay = slot.source.decay;
      }
      slot.light.intensity = slot.source.intensity * slot.weight;
    }
  }
  dispose() {
    for (const slot of this.slots) this.scene.remove(slot.light);
    this.slots = [];
  }
}
