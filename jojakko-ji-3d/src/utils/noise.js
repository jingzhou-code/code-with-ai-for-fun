// Deterministic PRNG & 2D/3D Value + Gradient FBM Noise for Mount Ogura topography & procedural materials

export function createSeededRandom(seed = 1596) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = new Uint8Array(512);
(function initPerm() {
  const rng = createSeededRandom(162008); // Tahoto year 1620
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function grad2(hash, x, y) {
  switch (hash & 7) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x * 1.4142;
    case 5: return -x * 1.4142;
    case 6: return y * 1.4142;
    default: return -y * 1.4142;
  }
}

export function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];

  const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
  const x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v) * 0.7;
}

export function fbm2D(x, y, octaves = 4, lacunarity = 2.03, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2D(x * freq, y * freq);
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum / norm;
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const c1 = vx * wx + vz * wz;
  if (c1 <= 0) {
    return { dist: Math.hypot(px - ax, pz - az), t: 0 };
  }
  const c2 = vx * vx + vz * vz;
  if (c2 <= c1) {
    return { dist: Math.hypot(px - bx, pz - bz), t: 1 };
  }
  const t = c1 / c2;
  const cx = ax + t * vx;
  const cz = az + t * vz;
  return { dist: Math.hypot(px - cx, pz - cz), t };
}
