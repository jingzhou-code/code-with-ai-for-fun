import { getRiverCenterX, getRiverWaterY } from '../world/terrain.js';

export function createShrineAudioSystem() {
  let ctx = null;
  let enabled = false;
  let masterGain = null;
  let riverGain = null;
  let windGain = null;
  let rainGain = null;
  let isRaining = false;

  function createNoiseBuffer(audioCtx, seconds = 3) {
    const length = audioCtx.sampleRate * seconds;
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/brownish natural water noise
      data[i] = (lastOut + 0.045 * white) / 1.045;
      lastOut = data[i];
      data[i] *= 2.8;
    }
    return buffer;
  }

  function ensureStarted() {
    if (ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    ctx = new AudioContextClass();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0;
    masterGain.connect(ctx.destination);

    const noiseBuf = createNoiseBuffer(ctx, 4);

    // 1. Kibune River mountain stream murmur
    const riverSrc = ctx.createBufferSource();
    riverSrc.buffer = noiseBuf;
    riverSrc.loop = true;
    const riverFilter = ctx.createBiquadFilter();
    riverFilter.type = 'bandpass';
    riverFilter.frequency.value = 540;
    riverFilter.Q.value = 0.7;
    riverGain = ctx.createGain();
    riverGain.gain.value = 0.28;
    riverSrc.connect(riverFilter).connect(riverGain).connect(masterGain);
    riverSrc.start();

    // 2. Mountain cedar wind sigh
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 260;
    windGain = ctx.createGain();
    windGain.gain.value = 0.14;
    windSrc.connect(windFilter).connect(windGain).connect(masterGain);
    windSrc.start();

    // 3. Sacred Rain patter
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1600;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.0;
    rainSrc.connect(rainFilter).connect(rainGain).connect(masterGain);
    rainSrc.start();
  }

  function toggle() {
    ensureStarted();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume();
    enabled = !enabled;
    masterGain.gain.setTargetAtTime(enabled ? 0.65 : 0.0, ctx.currentTime, 0.25);
    return enabled;
  }

  function setRain(rainActive) {
    isRaining = rainActive;
    if (ctx && rainGain) {
      rainGain.gain.setTargetAtTime(rainActive ? 0.22 : 0.0, ctx.currentTime, 0.4);
    }
  }

  // Synthesize authentic Nirei-Nihakushu-Ichirei (Coin + Suzu Bell + Two Crisp Claps)
  function playPrayerRitualSound() {
    if (!enabled) {
      ensureStarted();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
    }
    const out = enabled ? masterGain : ctx.destination;
    const now = ctx.currentTime;

    // Coin clink into wooden Saisen-bako
    [1680, 2490].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.001, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);
      osc.connect(g).connect(out);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.38);
    });

    // Metallic Suzu Shrine Bell rattle (3 shakes)
    for (let shake = 0; shake < 4; shake++) {
      const t0 = now + 0.28 + shake * 0.16;
      [2120, 2780, 3540].forEach((f) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f + Math.random() * 90;
        g.gain.setValueAtTime(0.001, t0);
        g.gain.exponentialRampToValueAtTime(0.065, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
        osc.connect(g).connect(out);
        osc.start(t0);
        osc.stop(t0 + 0.26);
      });
    }

    // Two crisp echoed shrine handclaps (二拍手) at +2.05s and +2.48s
    [2.05, 2.48].forEach((offset) => {
      const tc = now + offset;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.018));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1150;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(bp).connect(g).connect(out);
      src.start(tc);
    });
  }

  // Crystalline Miyako-bushi / Gagaku harmonic water chime for Mizuura-mikuji & Musubibumi
  function playSacredWaterChime() {
    ensureStarted();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const out = enabled ? masterGain : ctx.destination;
    const now = ctx.currentTime;
    const notes = [587.33, 622.25, 880.0, 987.77, 1174.66]; // Japanese In-sen scale (D, Eb, A, B, D)
    notes.forEach((freq, i) => {
      const t = now + i * 0.13;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  function update(cameraPos) {
    if (!ctx || !enabled || !riverGain) return;
    const rx = getRiverCenterX(cameraPos.z);
    const ry = getRiverWaterY(cameraPos.z);
    const distRiver = Math.hypot(cameraPos.x - rx, cameraPos.y - ry);
    const distSpring = Math.hypot(cameraPos.x - -17.2, cameraPos.z - 17.2);
    const distOmoi = Math.abs(cameraPos.z - -84.0);

    const minWaterDist = Math.min(distRiver, distSpring * 1.2, distOmoi * 1.4);
    const proximity = Math.max(0.08, Math.min(0.55, 4.8 / (minWaterDist + 6.5)));
    riverGain.gain.setTargetAtTime(proximity + (isRaining ? 0.08 : 0), ctx.currentTime, 0.2);
  }

  return {
    toggle,
    setRain,
    playPrayerRitualSound,
    playSacredWaterChime,
    update,
    isEnabled: () => enabled
  };
}
