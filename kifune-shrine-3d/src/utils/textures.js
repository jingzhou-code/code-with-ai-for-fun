import * as THREE from 'three';
import { createRng } from './noise.js';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finalizeTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createWoodTextures({ baseHex = '#c7975e', grainHex = '#9a6b38', size = 256 } = {}) {
  const rng = createRng(baseHex.charCodeAt(1) * 97 + 13);
  const colorCanvas = makeCanvas(size, size);
  const bumpCanvas = makeCanvas(size, size);
  const ctx = colorCanvas.getContext('2d');
  const bctx = bumpCanvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 220; i++) {
    const x = rng() * size;
    const w = 1 + rng() * 3.2;
    const alpha = 0.05 + rng() * 0.14;
    ctx.fillStyle = grainHex;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, 0, w, size);

    const bVal = Math.floor(105 + rng() * 45);
    bctx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bctx.globalAlpha = 0.25;
    bctx.fillRect(x, 0, w, size);
  }
  ctx.globalAlpha = 1;
  bctx.globalAlpha = 1;

  // Subtle growth ring waves
  ctx.strokeStyle = grainHex;
  ctx.lineWidth = 1.1;
  for (let r = 0; r < 18; r++) {
    const baseX = (r / 18) * size;
    ctx.globalAlpha = 0.08 + (r % 3) * 0.03;
    ctx.beginPath();
    for (let y = 0; y <= size; y += 8) {
      const wave = Math.sin((y / size) * Math.PI * 2 + r) * 3.5;
      if (y === 0) ctx.moveTo(baseX + wave, y);
      else ctx.lineTo(baseX + wave, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return {
    map: finalizeTexture(colorCanvas, { repeatX: 2, repeatY: 2, srgb: true }),
    bumpMap: finalizeTexture(bumpCanvas, { repeatX: 2, repeatY: 2, srgb: false })
  };
}

export function createCopperRoofTextures(size = 256) {
  const rng = createRng(4021);
  const colorCanvas = makeCanvas(size, size);
  const bumpCanvas = makeCanvas(size, size);
  const ctx = colorCanvas.getContext('2d');
  const bctx = bumpCanvas.getContext('2d');

  ctx.fillStyle = '#2b3532';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 6;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const shade = Math.floor((rng() - 0.5) * 14);
      const red = 42 + shade;
      const green = 54 + shade + Math.floor(rng() * 10);
      const blue = 50 + shade;
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

      // Subtle verdigris patina along bottom edge of copper plate
      const grad = ctx.createLinearGradient(0, y, 0, y + rowH);
      grad.addColorStop(0, 'rgba(92, 138, 120, 0.14)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(18, 22, 20, 0.38)');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

      // Bump standing seam
      bctx.fillStyle = '#d8d8d8';
      bctx.fillRect(x, y, colW, 2);
      bctx.fillStyle = '#ababab';
      bctx.fillRect(x, y, 2, rowH);
    }
  }

  return {
    map: finalizeTexture(colorCanvas, { repeatX: 4, repeatY: 4, srgb: true }),
    bumpMap: finalizeTexture(bumpCanvas, { repeatX: 4, repeatY: 4, srgb: false })
  };
}

export function createIshigakiTextures(size = 512) {
  const rng = createRng(8817);
  const colorCanvas = makeCanvas(size, size);
  const bumpCanvas = makeCanvas(size, size);
  const ctx = colorCanvas.getContext('2d');
  const bctx = bumpCanvas.getContext('2d');

  // Deep mortar & moss background
  ctx.fillStyle = '#252b25';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#1e1e1e';
  bctx.fillRect(0, 0, size, size);

  const rows = 9;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    let x = -rng() * 28;
    const y = r * rowH;
    while (x < size) {
      const w = 42 + rng() * 54;
      const h = rowH - (4 + rng() * 4);
      const jitterY = (rng() - 0.5) * 4;

      // Kibune-ishi blue-gray-violet stone tones
      const base = 76 + Math.floor(rng() * 38);
      const rCol = base + Math.floor(rng() * 8);
      const gCol = base + Math.floor(rng() * 6);
      const bCol = base + 8 + Math.floor(rng() * 14);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 2 + jitterY, w - 5, h, 7);
      ctx.fillStyle = `rgb(${rCol},${gCol},${bCol})`;
      ctx.fill();

      // Highlight top bevel, shadow bottom
      const stoneGrad = ctx.createLinearGradient(0, y, 0, y + h);
      stoneGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
      stoneGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      stoneGrad.addColorStop(1, 'rgba(15,18,16,0.42)');
      ctx.fillStyle = stoneGrad;
      ctx.fill();

      // Moss patches in crevices
      if (rng() > 0.35) {
        ctx.fillStyle = `rgba(${52 + Math.floor(rng() * 25)}, ${88 + Math.floor(rng() * 36)}, ${48 + Math.floor(rng() * 20)}, ${0.32 + rng() * 0.35})`;
        ctx.beginPath();
        ctx.arc(x + w * rng(), y + h * (0.65 + rng() * 0.35), 6 + rng() * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      bctx.save();
      bctx.beginPath();
      bctx.roundRect(x + 3, y + 2 + jitterY, w - 5, h, 7);
      const bumpLevel = 165 + Math.floor(rng() * 75);
      bctx.fillStyle = `rgb(${bumpLevel},${bumpLevel},${bumpLevel})`;
      bctx.fill();
      bctx.restore();

      x += w;
    }
  }

  return {
    map: finalizeTexture(colorCanvas, { repeatX: 3, repeatY: 2, srgb: true }),
    bumpMap: finalizeTexture(bumpCanvas, { repeatX: 3, repeatY: 2, srgb: false })
  };
}

export function createStonePavingTexture(size = 256) {
  const rng = createRng(5521);
  const canvas = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const bctx = bump.getContext('2d');

  ctx.fillStyle = '#5c6163';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#606060';
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const rad = 1 + rng() * 4;
    const v = 72 + Math.floor(rng() * 52);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.32)`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = `rgba(${v + 40},${v + 40},${v + 40},0.35)`;
    bctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    bctx.arc(x, y, rad, 0, Math.PI * 2);
    bctx.fill();
  }

  // Moss along left/right stone step edges
  const leftMoss = ctx.createLinearGradient(0, 0, size, 0);
  leftMoss.addColorStop(0, 'rgba(62, 92, 52, 0.45)');
  leftMoss.addColorStop(0.18, 'rgba(62, 92, 52, 0.0)');
  leftMoss.addColorStop(0.82, 'rgba(62, 92, 52, 0.0)');
  leftMoss.addColorStop(1, 'rgba(62, 92, 52, 0.45)');
  ctx.fillStyle = leftMoss;
  ctx.fillRect(0, 0, size, size);

  return {
    map: finalizeTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true }),
    bumpMap: finalizeTexture(bump, { repeatX: 1, repeatY: 1, srgb: false })
  };
}

export function createGravelTexture(size = 256, raked = false) {
  const rng = createRng(raked ? 9191 : 3131);
  const canvas = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const bctx = bump.getContext('2d');

  ctx.fillStyle = raked ? '#c8cbc6' : '#959994';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const v = (raked ? 175 : 118) + Math.floor(rng() * 55);
    ctx.fillStyle = `rgb(${v},${v + 1},${v})`;
    ctx.fillRect(x, y, 2, 2);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 2);
  }

  if (raked) {
    for (let x = 0; x < size; x += 8) {
      ctx.fillStyle = 'rgba(90, 95, 95, 0.22)';
      ctx.fillRect(x, 0, 3, size);
      ctx.fillStyle = 'rgba(245, 246, 242, 0.28)';
      ctx.fillRect(x + 3, 0, 2, size);

      bctx.fillStyle = '#404040';
      bctx.fillRect(x, 0, 3, size);
      bctx.fillStyle = '#d8d8d8';
      bctx.fillRect(x + 3, 0, 3, size);
    }
  }

  return {
    map: finalizeTexture(canvas, { repeatX: raked ? 8 : 14, repeatY: raked ? 8 : 14, srgb: true }),
    bumpMap: finalizeTexture(bump, { repeatX: raked ? 8 : 14, repeatY: raked ? 8 : 14, srgb: false })
  };
}

export function createLanternPaperTexture(size = 128) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size * 0.56, 6, size / 2, size / 2, size * 0.68);
  grad.addColorStop(0, '#fff7dc');
  grad.addColorStop(0.45, '#ffd27d');
  grad.addColorStop(1, '#e0933e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Delicate wooden kumiko lattice frame
  ctx.strokeStyle = '#5a1910';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.33, 0);
  ctx.lineTo(size * 0.33, size);
  ctx.moveTo(size * 0.67, 0);
  ctx.lineTo(size * 0.67, size);
  ctx.moveTo(0, size * 0.36);
  ctx.lineTo(size, size * 0.36);
  ctx.moveTo(0, size * 0.7);
  ctx.lineTo(size, size * 0.7);
  ctx.stroke();

  return finalizeTexture(canvas, { srgb: true });
}

export function createTatamiTexture(size = 256) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b9ad78';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(145,134,82,0.35)' : 'rgba(212,202,148,0.28)';
    ctx.fillRect(0, y, size, 1.5);
  }
  // Dark brocade border (heri)
  ctx.fillStyle = '#26342c';
  ctx.fillRect(0, 0, 14, size);
  ctx.fillRect(size - 14, 0, 14, size);
  ctx.strokeStyle = '#bfa054';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4, 0, size - 8, size);

  return finalizeTexture(canvas, { repeatX: 3, repeatY: 2, srgb: true });
}

export function createPlaqueTexture(text, { vertical = true, bg = '#151210', fg = '#e5c16c', border = '#c89e46' } = {}) {
  const canvas = makeCanvas(vertical ? 192 : 384, vertical ? 384 : 160);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = [...text];
  if (vertical) {
    const fontSize = Math.min(68, Math.floor((h - 76) / Math.max(chars.length, 1)));
    ctx.font = `700 ${fontSize}px "Noto Serif JP", "Noto Serif SC", "Songti SC", Georgia, serif`;
    const step = (h - 76) / chars.length;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, w / 2, 38 + step * (idx + 0.5));
    });
  } else {
    const fontSize = Math.min(64, Math.floor((w - 64) / Math.max(chars.length, 1)));
    ctx.font = `700 ${fontSize}px "Noto Serif JP", "Noto Serif SC", "Songti SC", Georgia, serif`;
    ctx.fillText(text, w / 2, h / 2 + 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createShrineCurtainTexture() {
  const canvas = makeCanvas(512, 160);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3c2952';
  ctx.fillRect(0, 0, 512, 160);

  // Vertical fabric folds & white ceremonial stripes
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(0, 14, 512, 8);
  ctx.fillRect(0, 28, 512, 4);

  // Sacred crests (stylized twin-leaf hollyhock / water-crest)
  for (let i = 0; i < 4; i++) {
    const cx = 64 + i * 128;
    const cy = 92;
    ctx.strokeStyle = 'rgba(246, 243, 236, 0.92)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(246, 243, 236, 0.9)';
    ctx.beginPath();
    ctx.ellipse(cx - 9, cy + 2, 9, 14, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 9, cy + 2, 9, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSharedMaterialLibrary() {
  const hinoki = createWoodTextures({ baseHex: '#c9995f', grainHex: '#9c6c37' });
  const agedWood = createWoodTextures({ baseHex: '#564132', grainHex: '#332419' });
  const darkCedar = createWoodTextures({ baseHex: '#2e231c', grainHex: '#18120e' });
  const vermilion = createWoodTextures({ baseHex: '#c62b1f', grainHex: '#961c13' });
  const copper = createCopperRoofTextures();
  const ishigaki = createIshigakiTextures();
  const stoneStep = createStonePavingTexture();
  const gravel = createGravelTexture(256, false);
  const rakedGravel = createGravelTexture(256, true);
  const lanternPaper = createLanternPaperTexture();
  const tatami = createTatamiTexture();
  const curtainTex = createShrineCurtainTexture();

  const materials = {
    hinoki: new THREE.MeshStandardMaterial({
      map: hinoki.map,
      bumpMap: hinoki.bumpMap,
      bumpScale: 0.03,
      roughness: 0.68,
      metalness: 0.04
    }),
    agedWood: new THREE.MeshStandardMaterial({
      map: agedWood.map,
      bumpMap: agedWood.bumpMap,
      bumpScale: 0.04,
      roughness: 0.82,
      metalness: 0.03
    }),
    darkCedar: new THREE.MeshStandardMaterial({
      map: darkCedar.map,
      bumpMap: darkCedar.bumpMap,
      bumpScale: 0.04,
      roughness: 0.85,
      metalness: 0.03
    }),
    vermilion: new THREE.MeshStandardMaterial({
      map: vermilion.map,
      bumpMap: vermilion.bumpMap,
      bumpScale: 0.015,
      roughness: 0.36,
      metalness: 0.08
    }),
    copperRoof: new THREE.MeshStandardMaterial({
      map: copper.map,
      bumpMap: copper.bumpMap,
      bumpScale: 0.05,
      roughness: 0.46,
      metalness: 0.42
    }),
    ishigaki: new THREE.MeshStandardMaterial({
      map: ishigaki.map,
      bumpMap: ishigaki.bumpMap,
      bumpScale: 0.14,
      roughness: 0.88,
      metalness: 0.04
    }),
    stoneStep: new THREE.MeshStandardMaterial({
      map: stoneStep.map,
      bumpMap: stoneStep.bumpMap,
      bumpScale: 0.05,
      roughness: 0.76,
      metalness: 0.05
    }),
    kibuneStone: new THREE.MeshStandardMaterial({
      color: 0x5c606d,
      bumpMap: stoneStep.bumpMap,
      bumpScale: 0.08,
      roughness: 0.72,
      metalness: 0.08
    }),
    mossRock: new THREE.MeshStandardMaterial({
      color: 0x4c5d49,
      bumpMap: stoneStep.bumpMap,
      bumpScale: 0.09,
      roughness: 0.88,
      metalness: 0.02
    }),
    gravel: new THREE.MeshStandardMaterial({
      map: gravel.map,
      bumpMap: gravel.bumpMap,
      bumpScale: 0.04,
      roughness: 0.92,
      metalness: 0.0
    }),
    rakedGravel: new THREE.MeshStandardMaterial({
      map: rakedGravel.map,
      bumpMap: rakedGravel.bumpMap,
      bumpScale: 0.06,
      roughness: 0.9,
      metalness: 0.0
    }),
    whitePlaster: new THREE.MeshStandardMaterial({
      color: 0xf1ece1,
      roughness: 0.86,
      metalness: 0.01
    }),
    blackLacquer: new THREE.MeshStandardMaterial({
      color: 0x181617,
      roughness: 0.28,
      metalness: 0.22
    }),
    goldHardware: new THREE.MeshStandardMaterial({
      color: 0xdcb455,
      emissive: 0x3b2a08,
      emissiveIntensity: 0.2,
      roughness: 0.26,
      metalness: 0.86
    }),
    lanternGlow: new THREE.MeshStandardMaterial({
      map: lanternPaper,
      emissive: new THREE.Color(0xff9d3b),
      emissiveMap: lanternPaper,
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0.0
    }),
    shojiGlow: new THREE.MeshStandardMaterial({
      color: 0xf7ebd2,
      emissive: new THREE.Color(0xffb45e),
      emissiveIntensity: 0.65,
      roughness: 0.75
    }),
    tatami: new THREE.MeshStandardMaterial({
      map: tatami,
      roughness: 0.84,
      metalness: 0.0
    }),
    redMosen: new THREE.MeshStandardMaterial({
      color: 0xb32420,
      roughness: 0.9,
      metalness: 0.0
    }),
    bamboo: new THREE.MeshStandardMaterial({
      color: 0x768c52,
      roughness: 0.52,
      metalness: 0.04
    }),
    shimenawa: new THREE.MeshStandardMaterial({
      color: 0xd6be86,
      bumpMap: hinoki.bumpMap,
      bumpScale: 0.06,
      roughness: 0.9,
      metalness: 0.0
    }),
    shideWhite: new THREE.MeshStandardMaterial({
      color: 0xfaf8f2,
      roughness: 0.75,
      side: THREE.DoubleSide
    }),
    musubibumiGreen: new THREE.MeshStandardMaterial({
      color: 0xc5e0c8,
      roughness: 0.72,
      side: THREE.DoubleSide
    }),
    curtain: new THREE.MeshStandardMaterial({
      map: curtainTex,
      roughness: 0.78,
      side: THREE.DoubleSide
    }),
    snowCap: new THREE.MeshStandardMaterial({
      color: 0xf4f7fb,
      roughness: 0.82,
      metalness: 0.02
    })
  };

  return { materials, textures: { hinoki, ishigaki, copper, lanternPaper } };
}
