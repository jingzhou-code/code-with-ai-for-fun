// Procedural Web Audio API Zen Soundscape for Ogurayama Jōjakkō-ji (小倉山 常寂光寺)
// Zero external audio files: synthesizes mountain breeze, bamboo rustle, water trickle,
// Shishi-odoshi clack, Sagano warbler birdsong, Shigure rain, and the 1973 Ōshikichō Bonshō Bell!

export function createZenSoundscape() {
  let ctx = null;
  let masterGain = null;
  let rainGain = null;
  let enabled = false;
  let ambientTimer = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0;
    masterGain.connect(ctx.destination);

    // 1. Soft Mt. Ogura Mountain Wind through Bamboo & Momiji Leaves (Modulated Pink Noise)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.85;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.28;

    // Slow mountain breeze swell LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 210;
    lfo.connect(lfoDepth);
    lfoDepth.connect(windFilter.frequency);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start();
    lfo.start();

    // 2. Ogura Shigure Drizzle Layer (Muted unless rain toggle is on)
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1350;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(masterGain);
    rainSrc.start();

    // 3. Periodic Zen Accents: Distant Bush Warbler (鶯) & Pond Bamboo Shishi-odoshi (鹿威し)
    ambientTimer = setInterval(() => {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      if (Math.random() < 0.45) {
        triggerBirdChirp();
      } else {
        triggerShishiOdoshi();
      }
    }, 6800);

    return ctx;
  }

  function triggerBirdChirp() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const base = 1650 + Math.random() * 450;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.28, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(base * 0.92, now + 0.32);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function triggerShishiOdoshi() {
    // Hollow Mōsō bamboo resonant "Ka-kōn" knock by the north pond!
    if (!ctx) return;
    const now = ctx.currentTime;
    [540, 815].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t0 + 0.09);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(idx === 0 ? 0.055 : 0.025, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    });
  }

  function playBonshoBell(delaySec = 0.54) {
    // Physically-inspired modal synthesis of Jōjakkō-ji's 1973 Dr. Aoki Ichiro Ōshikichō (古律黄鐘調) Bronze Bell!
    const c = ensureContext();
    if (!c) return;
    if (c.state === 'suspended') c.resume();

    const bellOut = c.createGain();
    bellOut.gain.value = enabled ? 0.58 : 0.42; // Bell is always audible when explicitly struck!
    bellOut.connect(c.destination);

    const t0 = c.currentTime + delaySec;

    // Wooden Shumoku striker impact thud
    const thudOsc = c.createOscillator();
    const thudGain = c.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(92, t0);
    thudOsc.frequency.exponentialRampToValueAtTime(36, t0 + 0.14);
    thudGain.gain.setValueAtTime(0.45, t0);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    thudOsc.connect(thudGain);
    thudGain.connect(bellOut);
    thudOsc.start(t0);
    thudOsc.stop(t0 + 0.2);

    // Classic Japanese Bonshō partials with slow acoustic "Unari" (うなり) beating!
    const partials = [
      { f: 110.0, amp: 0.42, decay: 8.8 },   // Hum tone (下駒)
      { f: 110.55, amp: 0.34, decay: 8.4 },  // Hum beat twin (~0.55 Hz deep meditative unari!)
      { f: 220.0, amp: 0.38, decay: 6.8 },   // Prime
      { f: 220.85, amp: 0.26, decay: 6.4 },  // Prime beat twin
      { f: 261.63, amp: 0.22, decay: 5.0 },  // Minor third tierce
      { f: 329.63, amp: 0.18, decay: 4.2 },  // Fifth
      { f: 440.0, amp: 0.24, decay: 3.4 },   // Ōshikichō (黄鐘調 ~A4) nominal!
      { f: 698.4, amp: 0.10, decay: 2.0 },   // Upper metallic shimmer
      { f: 987.8, amp: 0.06, decay: 1.1 }    // Initial bronze strike brilliance
    ];

    partials.forEach((p) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(p.amp, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);

      osc.connect(g);
      g.connect(bellOut);
      osc.start(t0);
      osc.stop(t0 + p.decay + 0.1);
    });
  }

  function setEnabled(on) {
    enabled = on;
    const c = ensureContext();
    if (!c) return false;
    if (c.state === 'suspended') c.resume();
    masterGain.gain.setTargetAtTime(on ? 0.65 : 0.0, c.currentTime, 0.35);
    return enabled;
  }

  function setShigureRain(raining) {
    if (!ctx || !rainGain) return;
    rainGain.gain.setTargetAtTime(raining ? 0.22 : 0.0, ctx.currentTime, 0.45);
  }

  function dispose() {
    if (ambientTimer) clearInterval(ambientTimer);
    if (ctx) ctx.close();
  }

  return {
    setEnabled,
    isEnabled: () => enabled,
    setShigureRain,
    playBonshoBell,
    dispose
  };
}
