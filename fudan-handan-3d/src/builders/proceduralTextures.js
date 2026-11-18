import * as THREE from 'three';

const textureCache = new Map();

function configureRepeat(tex, rx = 1, ry = 1, srgb = true) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Deterministic pseudo-random helper for repeatable window lighting patterns
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Guanghua Towers Art-Deco Champagne Granite + Curtain Wall + Night Emissive Map
 */
export function getGuanghuaTextures() {
  if (textureCache.has('guanghua')) return textureCache.get('guanghua');

  const W = 512;
  const H = 1024;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = W;
  diffCanvas.height = H;
  const ctx = diffCanvas.getContext('2d');

  const emCanvas = document.createElement('canvas');
  emCanvas.width = W;
  emCanvas.height = H;
  const ectx = emCanvas.getContext('2d');
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, W, H);

  // Base champagne granite stone
  ctx.fillStyle = '#d8cebe';
  ctx.fillRect(0, 0, W, H);

  // Subtle stone grain
  const rand = seededRand(20050527);
  for (let i = 0; i < 3200; i++) {
    const gx = rand() * W;
    const gy = rand() * H;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,250,240,0.14)' : 'rgba(95,84,68,0.10)';
    ctx.fillRect(gx, gy, 3, 3);
  }

  const cols = 8;
  const floors = 30;
  const colW = W / cols;
  const floorH = H / floors;

  for (let r = 0; r < floors; r++) {
    const y = r * floorH;
    // Horizontal stone spandrel band
    ctx.fillStyle = '#cbbda8';
    ctx.fillRect(0, y, W, 6);

    for (let c = 0; c < cols; c++) {
      const x = c * colW;
      // Vertical Art-Deco granite pier
      ctx.fillStyle = '#dfd6c7';
      ctx.fillRect(x, y, 10, floorH);
      ctx.fillStyle = '#b7a892';
      ctx.fillRect(x + 10, y, 2, floorH);

      // Recessed blue-green Low-E curtain wall window
      const wx = x + 12;
      const wy = y + 6;
      const ww = colW - 15;
      const wh = floorH - 9;

      const grad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      grad.addColorStop(0, '#2c4c5e');
      grad.addColorStop(0.55, '#3b6478');
      grad.addColorStop(1, '#213a4a');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, ww, wh);

      // Mullion divider
      ctx.fillStyle = '#8fa4ae';
      ctx.fillRect(wx + ww * 0.5 - 0.8, wy, 1.5, wh);

      // Nighttime office / seminar lit probability
      const litChance = rand();
      if (litChance > 0.54) {
        const warm = rand() > 0.28;
        ectx.fillStyle = warm
          ? `rgba(255, 224, 166, ${(0.55 + rand() * 0.42).toFixed(2)})`
          : `rgba(205, 232, 255, ${(0.45 + rand() * 0.35).toFixed(2)})`;
        ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
      }
    }
  }

  const map = configureRepeat(new THREE.CanvasTexture(diffCanvas), 1, 1, true);
  const emissiveMap = configureRepeat(new THREE.CanvasTexture(emCanvas), 1, 1, true);
  const res = { map, emissiveMap };
  textureCache.set('guanghua', res);
  return res;
}

/**
 * Multi-Preset Facade Generator for Academic, Heritage & Dormitory Buildings
 * Presets: 'red-brick' | 'beige-louver' | 'classic-physics' | 'modern-glass' | 'heritage-grey' | 'dorm-warm'
 */
export function getFacadeTextures(preset = 'beige-louver', repeatX = 2, repeatY = 1) {
  const cacheKey = `facade:${preset}:${repeatX}:${repeatY}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const emCanvas = document.createElement('canvas');
  emCanvas.width = W;
  emCanvas.height = H;
  const ectx = emCanvas.getContext('2d');
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, W, H);

  const palettes = {
    'red-brick': {
      wall: '#9d4a3d',
      accent: '#dcd3c4',
      pier: '#8b3e32',
      glass1: '#263847',
      glass2: '#364e61',
      frame: '#ece6dc',
      cols: 6,
      rows: 5,
      litRate: 0.56,
    },
    'beige-louver': {
      wall: '#dcd4c4',
      accent: '#c4b9a5',
      pier: '#ebe4d7',
      glass1: '#2a4152',
      glass2: '#3a576b',
      frame: '#998f7e',
      cols: 7,
      rows: 5,
      litRate: 0.52,
    },
    'classic-physics': {
      wall: '#cfc3ae',
      accent: '#8d3f36',
      pier: '#dfd5c3',
      glass1: '#253644',
      glass2: '#334a5c',
      frame: '#e8e0d2',
      cols: 6,
      rows: 6,
      litRate: 0.48,
    },
    'modern-glass': {
      wall: '#4a5d6e',
      accent: '#9aaab8',
      pier: '#6a7d8e',
      glass1: '#1e394f',
      glass2: '#345c7a',
      frame: '#b8c6d1',
      cols: 8,
      rows: 8,
      litRate: 0.5,
    },
    'heritage-grey': {
      wall: '#6e7275',
      accent: '#dcd9d0',
      pier: '#5c6063',
      glass1: '#232c33',
      glass2: '#323e47',
      frame: '#8e2b27',
      cols: 5,
      rows: 3,
      litRate: 0.44,
    },
    'dorm-warm': {
      wall: '#e6dccb',
      accent: '#b86449',
      pier: '#d4c7b2',
      glass1: '#2c3e4c',
      glass2: '#3f5668',
      frame: '#f4efe6',
      cols: 6,
      rows: 6,
      litRate: 0.65,
    },
  };

  const p = palettes[preset] || palettes['beige-louver'];
  const rand = seededRand(preset.length * 9973 + 1905);

  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, W, H);

  // Subtle brick / stone courses
  for (let y = 0; y < H; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, W, 2);
  }

  const cw = W / p.cols;
  const rh = H / p.rows;

  for (let r = 0; r < p.rows; r++) {
    const y = r * rh;
    // Floor cornice / lintel band
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, y, W, rh * 0.16);

    for (let c = 0; c < p.cols; c++) {
      const x = c * cw;
      ctx.fillStyle = p.pier;
      ctx.fillRect(x, y, cw * 0.18, rh);

      const wx = x + cw * 0.2;
      const wy = y + rh * 0.2;
      const ww = cw * 0.72;
      const wh = rh * 0.68;

      ctx.fillStyle = p.frame;
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

      const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      g.addColorStop(0, p.glass1);
      g.addColorStop(1, p.glass2);
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);

      // Window sash bars
      ctx.fillStyle = p.frame;
      ctx.fillRect(wx + ww * 0.5 - 1, wy, 2, wh);
      ctx.fillRect(wx, wy + wh * 0.45, ww, 2);

      // Dormitory balcony rail detail
      if (preset === 'dorm-warm') {
        ctx.fillStyle = '#c8baa2';
        ctx.fillRect(wx - 3, wy + wh * 0.68, ww + 6, wh * 0.34);
        ctx.fillStyle = '#8b4c39';
        ctx.fillRect(wx - 3, wy + wh * 0.68, ww + 6, 3);
      }

      if (rand() < p.litRate) {
        const alpha = (0.48 + rand() * 0.45).toFixed(2);
        ectx.fillStyle =
          preset === 'dorm-warm'
            ? `rgba(255, 214, 148, ${alpha})`
            : `rgba(255, 232, 182, ${alpha})`;
        ectx.fillRect(wx + 2, wy + 2, ww - 4, preset === 'dorm-warm' ? wh * 0.64 : wh - 4);
      }
    }
  }

  const map = configureRepeat(new THREE.CanvasTexture(canvas), repeatX, repeatY, true);
  const emissiveMap = configureRepeat(new THREE.CanvasTexture(emCanvas), repeatX, repeatY, true);
  const res = { map, emissiveMap };
  textureCache.set(cacheKey, res);
  return res;
}

/**
 * Crisp Architectural Calligraphy / Plaque Texture
 */
export function createPlaqueTexture(text, subtext = '', variant = 'gate') {
  const key = `plaque:${text}:${subtext}:${variant}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  if (variant === 'gate') {
    // Light grey granite lintel with crimson-gold Mao Zedong calligraphy style
    ctx.fillStyle = '#e6e3dc';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#c5bfb2';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);
    ctx.fillStyle = '#8f1f1d';
    ctx.font = 'bold 74px "Noto Serif SC", "Songti SC", "STSong", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 82);
  } else if (variant === 'heritage') {
    // Traditional dark wood / lacquer plaque with gold characters
    ctx.fillStyle = '#241814';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#c8a25a';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 140);
    ctx.fillStyle = '#e6c47a';
    ctx.font = 'bold 68px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, subtext ? 68 : 82);
    if (subtext) {
      ctx.font = '500 24px "Inter", sans-serif';
      ctx.fillText(subtext, 256, 122);
    }
  } else if (variant === 'highway') {
    // Shanghai Express Road / Tunnel Blue Sign
    ctx.fillStyle = '#144a86';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.strokeRect(10, 10, 492, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Noto Sans CJK SC", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, subtext ? 62 : 82);
    if (subtext) {
      ctx.font = '500 26px "Inter", sans-serif';
      ctx.fillText(subtext, 256, 114);
    }
  } else {
    // Modern brushed stone / metro / stadium sign
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = '#f3ead8';
    ctx.font = 'bold 54px "Noto Serif SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, subtext ? 64 : 82);
    if (subtext) {
      ctx.fillStyle = '#cbb282';
      ctx.font = '500 24px "Inter", sans-serif';
      ctx.fillText(subtext, 256, 116);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache.set(key, tex);
  return tex;
}

/**
 * Procedural Lawn Grass & Granite Plaza Textures
 */
export function getGroundTextures() {
  if (textureCache.has('grounds')) return textureCache.get('grounds');

  // 1. Lush organic campus grass with subtle mowing bands
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 256;
  gCanvas.height = 256;
  const gctx = gCanvas.getContext('2d');
  gctx.fillStyle = '#38663b';
  gctx.fillRect(0, 0, 256, 256);
  const rand = seededRand(1383);
  for (let y = 0; y < 256; y += 32) {
    gctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    gctx.fillRect(0, y, 256, 32);
  }
  for (let i = 0; i < 4000; i++) {
    gctx.fillStyle = rand() > 0.5 ? 'rgba(98,158,82,0.18)' : 'rgba(28,58,32,0.18)';
    gctx.fillRect(rand() * 256, rand() * 256, 2, 3);
  }
  const grassTex = configureRepeat(new THREE.CanvasTexture(gCanvas), 8, 8, true);

  // 2. Ceremonial light granite plaza tiles
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 256;
  pCanvas.height = 256;
  const pctx = pCanvas.getContext('2d');
  pctx.fillStyle = '#cbc6bc';
  pctx.fillRect(0, 0, 256, 256);
  pctx.strokeStyle = '#aba498';
  pctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    pctx.beginPath();
    pctx.moveTo(i, 0);
    pctx.lineTo(i, 256);
    pctx.moveTo(0, i);
    pctx.lineTo(256, i);
    pctx.stroke();
  }
  const plazaTex = configureRepeat(new THREE.CanvasTexture(pCanvas), 6, 6, true);

  // 3. Basketball / Tennis court surface
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 256;
  cCanvas.height = 160;
  const cctx = cCanvas.getContext('2d');
  cctx.fillStyle = '#2d6a56';
  cctx.fillRect(0, 0, 256, 160);
  cctx.fillStyle = '#9c4338';
  cctx.fillRect(14, 14, 228, 132);
  cctx.strokeStyle = '#f2f2ee';
  cctx.lineWidth = 3;
  cctx.strokeRect(18, 18, 220, 124);
  cctx.beginPath();
  cctx.moveTo(128, 18);
  cctx.lineTo(128, 142);
  cctx.stroke();
  cctx.beginPath();
  cctx.arc(128, 80, 20, 0, Math.PI * 2);
  cctx.stroke();
  cctx.strokeRect(18, 52, 38, 56);
  cctx.strokeRect(200, 52, 38, 56);
  const courtTex = new THREE.CanvasTexture(cCanvas);
  courtTex.colorSpace = THREE.SRGBColorSpace;
  courtTex.anisotropy = 8;

  const res = { grassTex, plazaTex, courtTex };
  textureCache.set('grounds', res);
  return res;
}
