import { audioURLs } from "../assets/audio/urls";
export type Surface =
  | "concrete"
  | "tile"
  | "metal"
  | "wood"
  | "wet"
  | "dirt"
  | "gravel"
  | "water";
export type AudioBus =
  | "music"
  | "sfx"
  | "footsteps"
  | "ambience"
  | "dialogue"
  | "ui";
export const audioBuses: AudioBus[] = [
  "music",
  "sfx",
  "footsteps",
  "ambience",
  "dialogue",
  "ui",
];
type Position = [number, number, number];
type Material =
  | "metal"
  | "steel"
  | "wood"
  | "ceramic"
  | "plastic"
  | "glass"
  | "fabric"
  | "paper"
  | "concrete";

/** Sample playback never changes authoritative stealth or gameplay state. */
class SoundManager {
  private ctx: AudioContext | null = null;
  private master?: GainNode;
  private effects?: GainNode;
  private effectsVolume = 1;
  private buses = new Map<AudioBus, GainNode>();
  private levels: Record<AudioBus, number> = {
    music: 0.5,
    sfx: 0.8,
    footsteps: 0.8,
    ambience: 0.18,
    dialogue: 1,
    ui: 0.5,
  };
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private spatial = new Set<{
    panner: PannerNode;
    filter: BiquadFilterNode;
    gain: GainNode;
    position: Position;
    volume: number;
    follow: boolean;
    dialogue: boolean;
  }>();
  public occlusion?: (position: Position) => number;
  private occlusionTime = 0;
  private previous = new Map<string, number>();
  private cooldowns = new Map<string, number>();
  private volume = 0.7;
  private muted = false;
  private reverb?: ConvolverNode;
  private reverbGain?: GainNode;
  private loops: {
    source: AudioBufferSourceNode;
    gain: GainNode;
    key: string;
  }[] = [];
  private pending?: Promise<void>;
  private generation = 0;
  public failures: string[] = [];
  public playedEvents = 0;
  public lightweight = false;
  public init() {
    if (this.ctx) return;
    try {
      const ctx = (this.ctx = new AudioContext());
      this.lightweight = matchMedia("(pointer: coarse)").matches;
      this.master = ctx.createGain();
      this.effects = ctx.createGain();
      this.effects.gain.value = this.effectsVolume;
      this.effects.connect(this.master);
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 10;
      limiter.ratio.value = 8;
      this.master.connect(limiter);
      limiter.connect(ctx.destination);
      try {
        const saved = JSON.parse(
          localStorage.getItem("hirodora-audio-v1") || "null",
        );
        if (saved)
          for (const bus of audioBuses)
            if (Number.isFinite(saved[bus]))
              this.levels[bus] = Math.max(0, Math.min(1, saved[bus]));
      } catch {}
      for (const bus of audioBuses) {
        const gain = ctx.createGain();
        gain.gain.value = this.levels[bus];
        gain.connect(bus === "music" ? this.master : this.effects);
        this.buses.set(bus, gain);
      }
      // A short room impulse is a DSP effect. The audible SFX/ambience are recordings.
      if (!this.lightweight) {
        this.reverb = ctx.createConvolver();
        const impulse = ctx.createBuffer(
          2,
          ctx.sampleRate * 0.7,
          ctx.sampleRate,
        );
        for (let c = 0; c < 2; c++) {
          const samples = impulse.getChannelData(c);
          for (let i = 0; i < samples.length; i++)
            samples[i] =
              (Math.random() * 2 - 1) *
              Math.pow(1 - i / samples.length, 3) *
              0.14;
        }
        this.reverb.buffer = impulse;
        this.reverbGain = ctx.createGain();
        this.reverbGain.gain.value = 0.09;
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.effects);
        for (const bus of ["sfx", "footsteps"] as AudioBus[])
          this.buses.get(bus)!.connect(this.reverb);
      }
      this.setVolume(this.volume);
      void this.preload();
    } catch {
      this.ctx = null;
    }
  }
  public async preload() {
    if (!this.ctx) return;
    if (this.pending) return this.pending;
    const ctx = this.ctx,
      generation = this.generation;
    this.pending = (async () => {
      const queue = Object.entries(audioURLs);
      await Promise.all(
        Array.from({ length: 3 }, async () => {
          for (;;) {
            if (generation !== this.generation) return;
            const item = queue.shift();
            if (!item) return;
            const [key, url] = item;
            if (this.buffers.has(key)) continue;
            try {
              const response = await fetch(url);
              if (!response.ok) throw Error("HTTP " + response.status);
              const buffer = await ctx.decodeAudioData(
                await response.arrayBuffer(),
              );
              if (generation === this.generation) this.buffers.set(key, buffer);
            } catch {
              if (generation === this.generation) this.failures.push(key);
            }
          }
        }),
      );
      if (generation === this.generation && this.ctx) this.startLoops();
    })().finally(() => {
      if (generation === this.generation) this.pending = undefined;
    });
    return this.pending;
  }
  public get readySamples() {
    return this.buffers.size;
  }
  public get activeVoices() {
    return this.voices.size;
  }
  public getBusVolume(bus: AudioBus) {
    return this.levels[bus];
  }
  public setBusVolume(bus: AudioBus, value: number) {
    this.levels[bus] = Math.max(0, Math.min(1, value));
    if (this.ctx)
      this.buses
        .get(bus)
        ?.gain.setTargetAtTime(this.levels[bus], this.ctx.currentTime, 0.06);
    try {
      localStorage.setItem("hirodora-audio-v1", JSON.stringify(this.levels));
    } catch {}
  }
  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.ctx)
      this.master?.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.06,
      );
  }
  public setEffectsVolume(value: number) {
    this.effectsVolume = Math.max(0, Math.min(1, value));
    if (this.ctx)
      this.effects?.gain.setTargetAtTime(
        this.effectsVolume,
        this.ctx.currentTime,
        0.06,
      );
  }
  public playGunshot(position: Position) {
    this.play("guard-gunshot", "sfx", 0.8, position);
  }
  public resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume().catch(() => {});
  }
  public suspend() {
    void this.ctx?.suspend();
  }
  public resetSceneAudio() {
    for (const source of this.voices) source.stop();
    this.cooldowns.clear();
    if (!this.ctx) return;
    for (const loop of this.loops) {
      loop.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      loop.gain.gain.value = 0;
    }
    const ambience = this.buses.get("ambience");
    ambience?.gain.cancelScheduledValues(this.ctx.currentTime);
    if (ambience) ambience.gain.value = this.levels.ambience;
  }
  public toggleMute() {
    this.muted = !this.muted;
    this.setVolume(this.volume);
    return this.muted;
  }
  public isSoundMuted() {
    return this.muted;
  }
  public updateListener(position: Position, yaw: number) {
    if (!this.ctx) return;
    const l = this.ctx.listener,
      now = this.ctx.currentTime;
    if (l.positionX) {
      for (const [p, value] of [
        [l.positionX, position[0]],
        [l.positionY, 1.65],
        [l.positionZ, position[2]],
        [l.forwardX, -Math.sin(yaw)],
        [l.forwardY, 0],
        [l.forwardZ, -Math.cos(yaw)],
        [l.upX, 0],
        [l.upY, 1],
        [l.upZ, 0],
      ] as [AudioParam, number][])
        p.setTargetAtTime(value, now, 0.04);
    } else {
      l.setPosition(position[0], 1.65, position[2]);
      l.setOrientation(-Math.sin(yaw), 0, -Math.cos(yaw), 0, 1, 0);
    }
    for (const s of this.spatial) {
      if (s.follow) {
        s.panner.positionX.setTargetAtTime(s.position[0], now, 0.06);
        s.panner.positionZ.setTargetAtTime(s.position[2], now, 0.06);
      }
      if (now >= this.occlusionTime && this.occlusion) {
        const walls = Math.min(s.dialogue ? 1 : 3, this.occlusion(s.position));
        s.filter.frequency.setTargetAtTime(
          walls ? (s.dialogue ? 4200 : 1100 / walls) : 17000,
          now,
          0.12,
        );
        s.gain.gain.setTargetAtTime(
          s.volume * Math.pow(s.dialogue ? 0.65 : 0.25, walls),
          now,
          0.12,
        );
      }
    }
    if (now >= this.occlusionTime) this.occlusionTime = now + 0.2;
  }
  public surfaceAt([x, , z]: Position): Surface {
    if (x > 15) return "water";
    if (z > 3 && x < -4) return "tile";
    if (z > 3 && x < 3) return "wet";
    if (z > 3 && x >= 3) return "metal";
    return "concrete";
  }
  private choose(prefix: string) {
    const keys = Object.keys(audioURLs).filter((k) => k.startsWith(prefix));
    if (!keys.length) return "";
    const prev = this.previous.get(prefix) ?? -1;
    const index =
      keys.length === 1
        ? 0
        : (prev + 1 + Math.floor(Math.random() * (keys.length - 1))) %
          keys.length;
    this.previous.set(prefix, index);
    return keys[index];
  }
  private play(
    key: string,
    bus: AudioBus,
    volume = 1,
    position?: Position,
    walls = 0,
    rate = 1,
    follow = false,
  ) {
    if (
      !this.ctx ||
      this.muted ||
      !this.buffers.has(key) ||
      this.voices.size >= (this.lightweight ? 12 : 24)
    )
      return;
    const ctx = this.ctx,
      source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    const dialogue = bus === "dialogue";
    walls = Math.min(dialogue ? 1 : 3, walls);
    source.buffer = this.buffers.get(key)!;
    source.playbackRate.value = rate;
    filter.type = "lowpass";
    filter.frequency.value = walls ? (dialogue ? 4200 : 1100 / walls) : 17000;
    gain.gain.value =
      Math.min(1.2, volume) * Math.pow(dialogue ? 0.65 : 0.25, walls);
    source.connect(filter);
    filter.connect(gain);
    let panner: PannerNode | undefined;
    let spatial:
      | {
          panner: PannerNode;
          filter: BiquadFilterNode;
          gain: GainNode;
          position: Position;
          volume: number;
          follow: boolean;
          dialogue: boolean;
        }
      | undefined;
    if (position) {
      panner = ctx.createPanner();
      panner.panningModel = this.lightweight ? "equalpower" : "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = dialogue ? 4 : 1.5;
      panner.maxDistance = 24;
      panner.rolloffFactor = dialogue ? 0.8 : 1.6;
      panner.positionX.value = position[0];
      panner.positionY.value = position[1] + (dialogue ? 1.5 : 0.25);
      panner.positionZ.value = position[2];
      gain.connect(panner);
      panner.connect(this.buses.get(bus)!);
      spatial = {
        panner,
        filter,
        gain,
        position: follow ? position : [...position],
        volume: Math.min(1.2, volume),
        follow,
        dialogue,
      };
      this.spatial.add(spatial);
    } else gain.connect(this.buses.get(bus)!);
    this.voices.add(source);
    this.playedEvents++;
    source.onended = () => {
      this.voices.delete(source);
      if (spatial) this.spatial.delete(spatial);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
    source.start();
  }
  private limited(event: string, seconds: number) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    if (now - (this.cooldowns.get(event) ?? -100) < seconds) return false;
    this.cooldowns.set(event, now);
    return true;
  }
  public playFootstep(
    crouched: boolean,
    sprinting: boolean,
    surface: Surface | "stone" = "concrete",
    position?: Position,
    walls = 0,
  ) {
    const prefix =
      surface === "stone" || surface === "concrete"
        ? "footstep_concrete_"
        : surface === "wood"
          ? "footstep_wood_"
          : surface === "wet"
            ? "water-"
            : surface + "-";
    this.play(
      this.choose(prefix),
      "footsteps",
      crouched ? 0.14 : sprinting ? 0.85 : 0.46,
      position,
      walls,
      (sprinting ? 1.06 : 1) + Math.random() * 0.05,
    );
  }
  public guardFootstep(position: Position, running: boolean, blocked: boolean) {
    this.playFootstep(
      false,
      running,
      this.surfaceAt(position),
      position,
      blocked ? 1 : 0,
    );
  }
  public playObject(
    kind: "metal" | "cloth" | "wood" | "water" | "drip" | "boot" | "radio",
    _pan = 0,
    volume = 1,
  ) {
    if (kind === "boot") return this.playFootstep(false, false);
    const prefix = {
      metal: "impactMetal_light_",
      cloth: "fabric",
      wood: "impactWood_light_",
      water: "water-",
      drip: "water-",
      radio: "plastic",
    }[kind];
    this.play(this.choose(prefix), "sfx", volume * 0.55);
  }
  public cue(
    event:
      | "keys"
      | "bed-drag"
      | "screwdriver"
      | "ceramic-drag"
      | "hinge"
      | "paper",
    position?: Position,
    volume = 0.6,
  ) {
    if (
      this.limited(
        "cue-" + event,
        event === "bed-drag" || event === "ceramic-drag" ? 1.5 : 0.25,
      )
    )
      this.play(
        event,
        "sfx",
        volume,
        position,
        position ? (this.occlusion?.(position) ?? 0) : 0,
      );
  }
  public contact(
    id: string,
    material: Material,
    receivingSurface: Surface,
    velocity: number,
    position: Position,
  ) {
    if (velocity < 0.35 || !this.limited("contact-" + id, 0.15)) return;
    const type = {
      metal: "Metal",
      steel: "Metal",
      wood: "Wood",
      ceramic: "Plate",
      plastic: "Generic",
      glass: "Glass",
      fabric: "Soft",
      paper: "Soft",
      concrete: "Generic",
    }[material];
    const key =
      material === "plastic" || material === "paper"
        ? material
        : material === "fabric"
          ? "fabric"
          : this.choose(
              "impact" +
                type +
                (type === "Soft" || (velocity > 3 && type !== "Generic")
                  ? "_heavy_"
                  : "_light_"),
            );
    this.play(
      key,
      "sfx",
      Math.min(1, velocity / 5) * (receivingSurface === "water" ? 0.6 : 1),
      position,
    );
  }
  public guardVoice(type: "investigate" | "chase", position: Position) {
    const text =
      type === "chase"
        ? "Stop right there. This isn't over yet!"
        : "Hey, you can't do that!";
    if (this.limited("dialogue", 7)) {
      this.play(
        type === "chase" ? "guard-stop" : "guard-hey",
        "dialogue",
        1,
        position,
        this.occlusion?.(position) ?? 0,
        1,
        true,
      );
      const ambience = this.buses.get("ambience");
      if (ambience && this.ctx) {
        ambience.gain.setTargetAtTime(
          this.levels.ambience * 0.4,
          this.ctx.currentTime,
          0.12,
        );
        ambience.gain.setTargetAtTime(
          this.levels.ambience,
          this.ctx.currentTime + 4,
          0.7,
        );
      }
    }
    return text;
  }
  private startLoops() {
    if (!this.ctx || this.loops.length) return;
    for (const key of ["ventilation", "drips"]) {
      const buffer = this.buffers.get(key);
      if (!buffer) continue;
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      // Begin silently; zone mixing enables only the nearby authored source.
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.buses.get("ambience")!);
      source.start();
      this.loops.push({ source, gain, key });
    }
  }
  public setAmbience(zone: "cell" | "laundry" | "tide", tension: number) {
    if (!this.ctx) return;
    for (const loop of this.loops)
      loop.gain.gain.setTargetAtTime(
        loop.key === "ventilation"
          ? zone === "laundry"
            ? 0.055 + tension * 0.015
            : 0
          : zone === "laundry"
            ? 0.06
            : zone === "tide"
              ? 0.045
              : 0,
        this.ctx.currentTime,
        1,
      );
    this.reverbGain?.gain.setTargetAtTime(
      zone === "cell" ? 0.09 : zone === "laundry" ? 0.15 : 0.025,
      this.ctx.currentTime,
      0.5,
    );
  }
  public playWaterDrip() {
    this.playObject("drip", 0, 0.2);
  }
  public playBoltTurn(rushed: boolean) {
    this.cue("screwdriver", undefined, rushed ? 0.9 : 0.22);
  }
  public playVentPop() {
    this.play(this.choose("impactMetal_heavy_"), "sfx", 0.7);
  }
  public playDoorOpen() {
    this.cue("hinge", undefined, 0.45);
  }
  public playLockClick(_success: boolean) {
    this.play(this.choose("impactMetal_light_"), "sfx", 0.23);
  }
  public playSafeClick(volume: number) {
    this.play(this.choose("impactMetal_light_"), "sfx", volume);
  }
  public playGuardAlert() {
    /* Speech is the audible alert. */
  }
  public playAlarmSiren() {
    this.play(this.choose("impactMetal_heavy_"), "sfx", 0.8);
  }
  public playDartShot(silenced: boolean) {
    this.playObject(silenced ? "cloth" : "metal");
  }
  public playVictoryFanfare() {
    this.play(this.choose("impactGeneric_light_"), "ui", 0.3);
  }
  public playDefeatSting() {
    this.play(this.choose("impactMetal_heavy_"), "ui", 0.35);
  }
  public dispose() {
    this.generation++;
    this.pending = undefined;
    for (const source of this.voices) {
      source.stop();
      source.disconnect();
    }
    for (const loop of this.loops) {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
    }
    this.voices.clear();
    this.spatial.clear();
    this.occlusion = undefined;
    this.loops = [];
    this.buffers.clear();
    this.buses.clear();
    this.cooldowns.clear();
    void this.ctx?.close();
    this.ctx = null;
  }
}
export const sound = new SoundManager();
