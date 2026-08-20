// Tiny synthesized sound engine (Web Audio oscillators/noise only — no
// external audio assets, so there is zero licensing ambiguity).

type Envelope = { attack?: number; decay?: number; sustain?: number; release?: number };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  setVolume(v: number) {
    this.ensureCtx();
    if (this.master) this.master.gain.value = v;
  }

  private tone(freq: number, duration: number, type: OscillatorType = "sine", env: Envelope = {}, gainPeak = 0.28) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    const attack = env.attack ?? 0.008;
    const release = env.release ?? duration * 0.6;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  private noiseBurst(duration: number, gainPeak = 0.2, filterFreq = 4000) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(gainPeak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  click() {
    this.tone(720, 0.02, "square", { attack: 0.001, release: 0.03 }, 0.14);
  }

  /** The "tick" as a case-opening reel passes an item. `speed` 0..1 pitches it. */
  tick(speed = 0.5) {
    const freq = 260 + speed * 420;
    this.tone(freq, 0.035, "triangle", { attack: 0.001, release: 0.03 }, 0.16);
  }

  land() {
    this.tone(180, 0.15, "sine", { attack: 0.001, release: 0.18 }, 0.3);
    this.noiseBurst(0.08, 0.08, 800);
  }

  buttonHover() {
    this.tone(500, 0.02, "sine", {}, 0.05);
  }

  cardFlip() {
    this.noiseBurst(0.06, 0.14, 2500);
    this.tone(600, 0.04, "triangle", {}, 0.08);
  }

  chip() {
    this.tone(920, 0.05, "square", { release: 0.05 }, 0.1);
  }

  win(size: "small" | "big" = "small") {
    const notes = size === "big" ? [523, 659, 784, 1047] : [523, 659, 784];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, "sine", { release: 0.2 }, size === "big" ? 0.32 : 0.22), i * 90);
    });
  }

  lose() {
    this.tone(220, 0.12, "sawtooth", { release: 0.15 }, 0.18);
    setTimeout(() => this.tone(160, 0.22, "sawtooth", { release: 0.25 }, 0.16), 90);
  }

  goldCharge() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.tone(700 + i * 90, 0.09, "triangle", { release: 0.1 }, 0.16), i * 55);
    }
  }

  goldLand() {
    this.tone(1200, 0.3, "sine", { release: 0.4 }, 0.35);
    this.noiseBurst(0.25, 0.12, 3000);
    setTimeout(() => this.tone(1600, 0.35, "sine", { release: 0.4 }, 0.28), 90);
  }

  jackpotSpin() {
    this.tick(0.8);
  }

  jackpotWin() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, "sine", { release: 0.25 }, 0.3), i * 110);
    });
  }

  countdownBeep(final = false) {
    this.tone(final ? 880 : 520, final ? 0.28 : 0.14, "triangle", { release: final ? 0.3 : 0.12 }, final ? 0.4 : 0.24);
  }

  battleStart() {
    [392, 523, 659].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.16, "square", { release: 0.15 }, 0.2), i * 100);
    });
  }

  deal() {
    this.noiseBurst(0.04, 0.1, 3500);
  }
}

export const sound = new SoundEngine();
