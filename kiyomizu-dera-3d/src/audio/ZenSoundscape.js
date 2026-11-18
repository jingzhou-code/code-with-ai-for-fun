// Pure Web Audio API Procedural Soundscape for Otowa-san Kiyomizu-dera:
// 1. 1478 Great Bronze Temple Bell (梵鐘 Bonsho) with authentic Japanese "unari" (うなり) beat harmonics
// 2. Gentle Otowa Waterfall stream & Higashiyama pine breeze ambient soundscape

export function createZenSoundscape() {
  let ctx = null;
  let ambientRunning = false;
  let masterAmbientGain = null;
  let kotoTimer = null;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  // Synthesize the deep, resonant strike of Kiyomizu-dera's 1478 Bonsho bell!
  function ringTempleBell() {
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;

    // Wooden Shumoku log impact thud
    const thudOsc = audio.createOscillator();
    const thudGain = audio.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(92, now);
    thudOsc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    thudGain.gain.setValueAtTime(0.45, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thudOsc.connect(thudGain).connect(audio.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.24);

    // Multi-partial bronze bell harmonics including signature Japanese Bonsho ~0.9Hz beat pair!
    const partials = [
      { freq: 116.5, amp: 0.34, decay: 9.5 },
      { freq: 117.35, amp: 0.3, decay: 9.2 }, // Creates slow meditative "unari" (うなり) shimmer!
      { freq: 233.2, amp: 0.22, decay: 6.8 },
      { freq: 311.4, amp: 0.14, decay: 5.2 },
      { freq: 467.0, amp: 0.09, decay: 3.6 },
      { freq: 698.5, amp: 0.05, decay: 2.1 },
    ];

    for (const p of partials) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(p.amp, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + p.decay);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    }
  }

  function toggleAmbient() {
    const audio = ensureContext();
    if (!audio) return false;

    if (!masterAmbientGain) {
      masterAmbientGain = audio.createGain();
      masterAmbientGain.gain.value = 0.0;
      masterAmbientGain.connect(audio.destination);

      // Filtered pink/brown noise for Otowa Waterfall murmur & mountain breeze
      const bufSize = audio.sampleRate * 3;
      const noiseBuf = audio.createBuffer(1, bufSize, audio.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 1.8;
      }
      const noiseSrc = audio.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const filter = audio.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.75;

      noiseSrc.connect(filter).connect(masterAmbientGain);
      noiseSrc.start();
    }

    ambientRunning = !ambientRunning;
    const now = audio.currentTime;
    masterAmbientGain.gain.cancelScheduledValues(now);
    masterAmbientGain.gain.linearRampToValueAtTime(ambientRunning ? 0.14 : 0.0, now + 0.8);

    if (ambientRunning) {
      // Soft pentatonic Miyako-bushi / In-sen koto harmonic droplets every few seconds
      const scale = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33];
      kotoTimer = window.setInterval(() => {
        if (!ambientRunning || !ctx) return;
        const t = ctx.currentTime;
        const f = scale[Math.floor(Math.random() * scale.length)];
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0002, t + 3.4);
        o.connect(g).connect(masterAmbientGain);
        o.start(t);
        o.stop(t + 3.5);
      }, 3600);
    } else if (kotoTimer) {
      clearInterval(kotoTimer);
      kotoTimer = null;
    }

    return ambientRunning;
  }

  return {
    ringTempleBell,
    toggleAmbient,
  };
}
