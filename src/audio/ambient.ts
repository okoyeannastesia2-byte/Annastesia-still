/**
 * Gentle ambient sounds, generated live with the Web Audio API.
 * No audio files: nothing to download, nothing to license, works offline.
 */
export type Ambience = 'rain' | 'ocean' | 'lofi';

interface Voice {
  stop: () => void;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voice: Voice | null = null;
let noiseBuf: { white: AudioBuffer; brown: AudioBuffer } | null = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // Let sound play like media on iPad (not silenced by the ring/silent switch) — the user chose to turn it on.
    try {
      (navigator as unknown as { audioSession?: { type: string } }).audioSession!.type = 'playback';
    } catch {
      /* older Safari */
    }
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.visibilityState === 'hidden') ctx.suspend();
      else if (voice) ctx.resume();
    });
  }
  if (!noiseBuf) {
    const len = ctx.sampleRate * 4;
    const white = ctx.createBuffer(1, len, ctx.sampleRate);
    const brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = white.getChannelData(0);
    const b = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      b[i] = last * 3.5;
    }
    noiseBuf = { white, brown };
  }
  return { ctx: ctx!, master: master!, noise: noiseBuf };
}

function loopNoise(c: AudioContext, buf: AudioBuffer) {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start();
  return s;
}

function rain(): Voice {
  const { ctx: c, master: out, noise } = ensure();
  const hiss = loopNoise(c, noise.white);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5200;
  const hissGain = c.createGain();
  hissGain.gain.value = 0.16;
  hiss.connect(hp).connect(lp).connect(hissGain).connect(out);

  const rumble = loopNoise(c, noise.brown);
  const rlp = c.createBiquadFilter();
  rlp.type = 'lowpass';
  rlp.frequency.value = 350;
  const rg = c.createGain();
  rg.gain.value = 0.35;
  rumble.connect(rlp).connect(rg).connect(out);

  // individual drops, scheduled a little ahead
  let next = c.currentTime;
  const timer = window.setInterval(() => {
    while (next < c.currentTime + 0.3) {
      next += 0.02 + Math.random() * 0.12;
      const s = c.createBufferSource();
      s.buffer = noise.white;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 3500;
      bp.Q.value = 6;
      const g = c.createGain();
      const v = 0.05 + Math.random() * 0.12;
      g.gain.setValueAtTime(0, next);
      g.gain.linearRampToValueAtTime(v, next + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, next + 0.05);
      s.connect(bp).connect(g).connect(out);
      s.start(next, Math.random() * 3, 0.06);
    }
  }, 100);
  return {
    stop() {
      window.clearInterval(timer);
      hiss.stop();
      rumble.stop();
    },
  };
}

function ocean(): Voice {
  const { ctx: c, master: out, noise } = ensure();
  const src = loopNoise(c, noise.brown);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const g = c.createGain();
  g.gain.value = 0.45;
  src.connect(lp).connect(g).connect(out);
  const foam = loopNoise(c, noise.white);
  const fhp = c.createBiquadFilter();
  fhp.type = 'bandpass';
  fhp.frequency.value = 1400;
  fhp.Q.value = 0.6;
  const fg = c.createGain();
  fg.gain.value = 0.03;
  foam.connect(fhp).connect(fg).connect(out);
  // slow swell: each wave about 9 s
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.32;
  const lfoF = c.createGain();
  lfoF.gain.value = 450;
  const lfoFoam = c.createGain();
  lfoFoam.gain.value = 0.03;
  lfo.connect(lfoG).connect(g.gain);
  lfo.connect(lfoF).connect(lp.frequency);
  lfo.connect(lfoFoam).connect(fg.gain);
  lfo.start();
  return {
    stop() {
      src.stop();
      foam.stop();
      lfo.stop();
    },
  };
}

function lofi(): Voice {
  const { ctx: c, master: out, noise } = ensure();
  const bus = c.createGain();
  bus.gain.value = 0.55;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1500;
  bus.connect(tone).connect(out);
  // tape wobble
  const wob = c.createOscillator();
  wob.frequency.value = 0.4;
  const wobG = c.createGain();
  wobG.gain.value = 6;
  wob.connect(wobG);
  wob.start();
  // vinyl crackle
  const crackle = loopNoise(c, noise.white);
  const chp = c.createBiquadFilter();
  chp.type = 'highpass';
  chp.frequency.value = 3000;
  const cg = c.createGain();
  cg.gain.value = 0.012;
  crackle.connect(chp).connect(cg).connect(out);

  const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  // Fmaj7 – Em7 – Dm7 – Cmaj7, slow and warm
  const chords = [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 57, 60],
    [48, 52, 55, 59],
  ];
  const beat = 60 / 68;
  const bar = beat * 4;
  let t = c.currentTime + 0.1;
  let i = 0;
  const note = (f: number, start: number, dur: number, vol: number, type: OscillatorType) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    wobG.connect(o.detune);
    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.4);
    g.gain.setTargetAtTime(0, start + dur - 0.6, 0.4);
    o.connect(g).connect(bus);
    o.start(start);
    o.stop(start + dur + 2);
  };
  const timer = window.setInterval(() => {
    while (t < c.currentTime + 1.5) {
      const ch = chords[i % chords.length];
      ch.forEach((m, k) => note(midi(m + 12), t + k * 0.03, bar * 2, 0.05, 'triangle'));
      note(midi(ch[0] - 12), t, bar * 2, 0.08, 'sine');
      // a few soft melody notes on top
      for (let k = 0; k < 3; k++) if (Math.random() < 0.6) note(midi(ch[(k + i) % 4] + 24), t + beat * (1 + k * 2 + Math.random() * 0.5), beat * 1.6, 0.025, 'sine');
      t += bar * 2;
      i++;
    }
  }, 300);
  return {
    stop() {
      window.clearInterval(timer);
      crackle.stop();
      wob.stop();
      bus.disconnect();
    },
  };
}

/** Start (or switch) a sound. Must be called from a tap on iPad. */
export function playAmbience(kind: Ambience | 'off', volume: number) {
  if (voice) {
    voice.stop();
    voice = null;
  }
  if (kind === 'off') {
    if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    return;
  }
  const { ctx: c, master: m } = ensure();
  c.resume();
  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(0, c.currentTime);
  m.gain.linearRampToValueAtTime(volume, c.currentTime + 2.5); // gentle fade in
  voice = kind === 'rain' ? rain() : kind === 'ocean' ? ocean() : lofi();
}

export function setAmbienceVolume(volume: number) {
  if (ctx && master && voice) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
}
