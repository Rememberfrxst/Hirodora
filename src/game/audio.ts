/**
 * Procedural Web Audio API sound synthesizer for Low Tide: Prison Escape 3D
 * Zero external audio files or 404 dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private isMuted: boolean = false;
  private lastFootstepTime: number = 0;
  private volume = 0.7;

  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.05,
      );
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.ctx.destination);

      // Start ambient low-frequency penitentiary drone
      this.startAmbientDrone();
    } catch {
      console.warn("Web Audio not supported");
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public suspend() {
    void this.ctx?.suspend();
  }

  public setAmbience(zone: "cell" | "laundry" | "tide", tension: number) {
    if (!this.ctx || !this.ambientGain || !this.ambientOsc) return;
    this.ambientOsc.frequency.setTargetAtTime(
      zone === "laundry" ? 72 : zone === "tide" ? 42 : 54,
      this.ctx.currentTime,
      0.8,
    );
    this.ambientGain.gain.setTargetAtTime(
      0.025 + tension * 0.035,
      this.ctx.currentTime,
      0.8,
    );
  }

  /** Filtered noise, resonant transients and stereo placement give each material a voice. */
  public playObject(
    kind: "metal" | "cloth" | "wood" | "water" | "drip" | "boot" | "radio",
    pan = 0,
    volume = 1,
  ) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const ctx = this.ctx,
      now = ctx.currentTime;
    const duration =
      kind === "water"
        ? 0.65
        : kind === "cloth"
          ? 0.22
          : kind === "radio"
            ? 0.3
            : 0.16;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duration),
      ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = kind === "metal" ? "bandpass" : "lowpass";
    filter.frequency.value =
      kind === "metal"
        ? 2400
        : kind === "cloth"
          ? 1500
          : kind === "radio"
            ? 1800
            : kind === "boot"
              ? 340
              : 700;
    filter.Q.value = kind === "metal" ? 5 : 0.8;
    const gain = ctx.createGain();
    gain.gain.value =
      (kind === "water" ? 0.14 : kind === "cloth" ? 0.08 : 0.2) * volume;
    const stereo = ctx.createStereoPanner();
    stereo.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter);
    filter.connect(gain);
    gain.connect(stereo);
    stereo.connect(this.masterGain);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      stereo.disconnect();
    };
    if (kind === "drip") this.playWaterDrip();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
      );
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public playWaterDrip() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(54, this.ctx.currentTime); // Low low industrial hum

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(110, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.ambientOsc = osc;
      this.ambientGain = gain;
    } catch {
      // ignore
    }
  }

  public playFootstep(
    isCrouching: boolean,
    isSprinting: boolean,
    surface: "stone" | "water" = "stone",
  ) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastFootstepTime < 0.22) return;
    this.lastFootstepTime = now;
    this.playObject(
      surface === "water" ? "water" : "boot",
      0,
      isCrouching ? 0.18 : isSprinting ? 0.8 : 0.45,
    );

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    const baseFreq = isCrouching ? 75 : isSprinting ? 120 : 95;
    osc.frequency.setValueAtTime(baseFreq + (Math.random() * 10 - 5), now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(260, now);

    const vol = isCrouching ? 0.04 : isSprinting ? 0.16 : 0.08;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBoltTurn(rushed: boolean) {
    this.playObject("metal", 0, rushed ? 0.7 : 0.25);
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rushed ? 440 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(rushed ? 180 : 140, now + 0.12);

    gain.gain.setValueAtTime(rushed ? 0.18 : 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playVentPop() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metallic release clang
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playDoorOpen() {
    this.playObject("metal", -0.15, 0.6);
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playLockClick(isSweetSpot: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isSweetSpot ? "triangle" : "sine";
    osc.frequency.setValueAtTime(isSweetSpot ? 920 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(
      isSweetSpot ? 1200 : 320,
      now + 0.05,
    );

    gain.gain.setValueAtTime(isSweetSpot ? 0.22 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playSafeClick(volume: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1240, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.03);

    gain.gain.setValueAtTime(Math.min(0.25, volume * 0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playHeartbeat() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Double thump (lub-dub)
    [0, 0.12].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(65, now + offset);
      osc.frequency.exponentialRampToValueAtTime(35, now + offset + 0.08);

      gain.gain.setValueAtTime(0.24, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  }

  public playGuardAlert() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.15);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playAlarmSiren() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.25);
    osc.frequency.linearRampToValueAtTime(750, now + 0.5);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playDartShot(isSilenced: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (isSilenced) {
      // Soft pneumatic thwip
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } else {
      // Loud gunshot crack -> triggers alarm
      this.playAlarmSiren();
    }
  }

  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [261.6, 329.6, 392.0, 523.2]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  }

  public playDefeatSting() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [220, 207, 196, 174]; // Decreasing tension
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.22, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.3);
    });
  }
}

export const sound = new SoundManager();
