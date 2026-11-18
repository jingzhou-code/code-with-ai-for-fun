import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Generates authentic Notre Dame Yellow/Buff Brick (fired from St. Joseph's Lake marl)
 * plus a matching bump map and nighttime warm-window emissive map.
 */
function createBrickMaterialSet({
  baseHex = '#d5bc8a',
  variation = 18,
  windowCols = 8,
  windowRows = 4,
  archedWindows = true,
  repeatX = 3,
  repeatY = 2,
}) {
  const w = 512;
  const h = 512;
  const diffCanvas = makeCanvas(w, h);
  const bumpCanvas = makeCanvas(w, h);
  const emisCanvas = makeCanvas(w, h);

  const dCtx = diffCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const eCtx = emisCanvas.getContext('2d');

  // Parse base color
  const baseColor = new THREE.Color(baseHex);
  const br = Math.round(baseColor.r * 255);
  const bg = Math.round(baseColor.g * 255);
  const bb = Math.round(baseColor.b * 255);

  // Mortar background
  dCtx.fillStyle = `rgb(${br - 24}, ${bg - 22}, ${bb - 18})`;
  dCtx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#555555';
  bCtx.fillRect(0, 0, w, h);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, w, h);

  // Running bond bricks
  const brickRows = 48;
  const brickCols = 24;
  const rowH = h / brickRows;
  const colW = w / brickCols;
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < brickRows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= brickCols; c++) {
      const jitter = (rand() - 0.5) * variation;
      const rr = Math.min(255, Math.max(0, Math.round(br + jitter)));
      const gg = Math.min(255, Math.max(0, Math.round(bg + jitter * 0.9)));
      const bbb = Math.min(255, Math.max(0, Math.round(bb + jitter * 0.75)));
      dCtx.fillStyle = `rgb(${rr},${gg},${bbb})`;
      dCtx.fillRect(c * colW + offset + 1, r * rowH + 1, colW - 2, rowH - 2);

      const bumpVal = Math.round(185 + (rand() - 0.5) * 40);
      bCtx.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      bCtx.fillRect(c * colW + offset + 1, r * rowH + 1, colW - 2, rowH - 2);
    }
  }

  // Limestone belt courses at top & bottom of story bands
  for (let row = 0; row < windowRows; row++) {
    const bandTop = (row / windowRows) * h;
    dCtx.fillStyle = '#dfd8c7';
    dCtx.fillRect(0, bandTop, w, 5);
    bCtx.fillStyle = '#e8e8e8';
    bCtx.fillRect(0, bandTop, w, 5);
  }

  // Collegiate / Victorian sash windows with limestone sills & warm interior lights
  const cellW = w / windowCols;
  const cellH = h / windowRows;
  for (let r = 0; r < windowRows; r++) {
    for (let c = 0; c < windowCols; c++) {
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.54) * cellH;
      const winW = cellW * 0.44;
      const winH = cellH * 0.56;
      const x0 = cx - winW / 2;
      const y0 = cy - winH / 2;

      // Limestone surround + sill
      dCtx.fillStyle = '#ded6c3';
      dCtx.fillRect(x0 - 3, y0 - 3, winW + 6, winH + 7);
      if (archedWindows) {
        dCtx.beginPath();
        dCtx.arc(cx, y0 + winW * 0.25, winW / 2 + 3, Math.PI, 0);
        dCtx.fill();
      }

      // Dark reflective glass pane
      const litChance = rand();
      dCtx.fillStyle = litChance > 0.35 ? '#263445' : '#1b2634';
      dCtx.fillRect(x0, y0, winW, winH);
      if (archedWindows) {
        dCtx.beginPath();
        dCtx.arc(cx, y0 + winW * 0.22, winW / 2, Math.PI, 0);
        dCtx.fill();
      }

      // Recessed window in bump map
      bCtx.fillStyle = '#282828';
      bCtx.fillRect(x0, y0, winW, winH);

      // Nighttime warm glowing windows (varied warmth & occupancy)
      if (litChance > 0.28) {
        const warm = litChance > 0.68 ? '#ffcf7d' : '#e6a856';
        eCtx.fillStyle = warm;
        eCtx.fillRect(x0 + 1.5, y0 + 1.5, winW - 3, winH - 3);
      }

      // Mullion crossbars
      dCtx.fillStyle = '#cfc6b2';
      dCtx.fillRect(cx - 1, y0, 2, winH);
      dCtx.fillRect(x0, cy - 1, winW, 2);
      eCtx.fillStyle = '#111111';
      eCtx.fillRect(cx - 1, y0, 2, winH);
      eCtx.fillRect(x0, cy - 1, winW, 2);
    }
  }

  const configureTex = (canvas, isSRGB = false) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return new THREE.MeshStandardMaterial({
    map: configureTex(diffCanvas, true),
    bumpMap: configureTex(bumpCanvas, false),
    bumpScale: 0.22,
    emissiveMap: configureTex(emisCanvas, true),
    emissive: new THREE.Color('#ffb95e'),
    emissiveIntensity: 0.35,
    roughness: 0.82,
    metalness: 0.04,
  });
}

/**
 * Generates Millard Sheets' iconic 1964 "Word of Life" ("Touchdown Jesus") stone mosaic
 * on the southern facade of Hesburgh Library.
 */
function createWordOfLifeMosaicMaterial() {
  const w = 512;
  const h = 1024;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  // Buff brick library wall background with vertical stoneribs
  ctx.fillStyle = '#d3ba89';
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(160,132,88,0.22)' : 'rgba(235,220,188,0.18)';
    ctx.fillRect(x, 0, 4, h);
  }

  // Mosaic stone tesserae backdrop aura
  const aura = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.45, w * 0.52);
  aura.addColorStop(0, 'rgba(248, 226, 162, 0.92)');
  aura.addColorStop(0.45, 'rgba(205, 174, 122, 0.72)');
  aura.addColorStop(1, 'rgba(211, 186, 137, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(36, 40, w - 72, h - 80);

  // Lower & Middle Tiers: Procession of scholars, saints, apostles, scientists in 81 granite tones
  const robePalette = ['#35536e', '#8c3f32', '#4c6b50', '#b5893e', '#6d5546', '#c8b48a', '#3d4856', '#9b643b'];
  let s = 42;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const tiers = [
    { y: 790, count: 9, scale: 1.0 },
    { y: 650, count: 11, scale: 0.92 },
    { y: 520, count: 9, scale: 0.88 },
  ];
  for (const tier of tiers) {
    for (let i = 0; i < tier.count; i++) {
      const fx = 72 + ((w - 144) * (i + 0.5)) / tier.count + (rnd() - 0.5) * 10;
      const fy = tier.y + (rnd() - 0.5) * 18;
      const figH = 115 * tier.scale;
      const figW = 34 * tier.scale;

      // Halo / headstone highlight
      ctx.fillStyle = 'rgba(236, 214, 158, 0.65)';
      ctx.beginPath();
      ctx.arc(fx, fy - figH * 0.45, 13 * tier.scale, 0, Math.PI * 2);
      ctx.fill();

      // Robe body
      ctx.fillStyle = robePalette[(i + Math.floor(tier.y)) % robePalette.length];
      ctx.beginPath();
      ctx.moveTo(fx - figW * 0.36, fy - figH * 0.35);
      ctx.lineTo(fx + figW * 0.36, fy - figH * 0.35);
      ctx.lineTo(fx + figW * 0.52, fy + figH * 0.5);
      ctx.lineTo(fx - figW * 0.52, fy + figH * 0.5);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.fillStyle = '#d9b38c';
      ctx.beginPath();
      ctx.arc(fx, fy - figH * 0.45, 8 * tier.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Radiant golden cross & mandorla behind Christ the Teacher
  ctx.strokeStyle = '#e7be5a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 48);
  ctx.lineTo(w * 0.5, 470);
  ctx.moveTo(w * 0.22, 195);
  ctx.lineTo(w * 0.78, 195);
  ctx.stroke();

  // Halo of the Resurrected Christ
  ctx.fillStyle = '#f6d574';
  ctx.beginPath();
  ctx.arc(w * 0.5, 178, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b98528';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Iconic "Touchdown Jesus" Figure — Resurrected Christ with BOTH ARMS RAISED HIGH!
  // Flowing Ivory & Gold Granite Robes
  ctx.fillStyle = '#f2ead7';
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 32, 215);
  ctx.lineTo(w * 0.5 + 32, 215);
  ctx.lineTo(w * 0.5 + 48, 465);
  ctx.lineTo(w * 0.5 - 48, 465);
  ctx.closePath();
  ctx.fill();

  // Crimson & Gold Stole / Mantle folds
  ctx.fillStyle = '#9e3c2e';
  ctx.fillRect(w * 0.5 - 12, 218, 24, 235);
  ctx.fillStyle = '#d7a441';
  ctx.fillRect(w * 0.5 - 5, 218, 10, 235);

  // Raised Left & Right Arms ("Touchdown!" pose!)
  ctx.strokeStyle = '#f2ead7';
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left raised arm
  ctx.moveTo(w * 0.5 - 26, 236);
  ctx.lineTo(w * 0.5 - 76, 172);
  ctx.lineTo(w * 0.5 - 88, 96);
  // Right raised arm
  ctx.moveTo(w * 0.5 + 26, 236);
  ctx.lineTo(w * 0.5 + 76, 172);
  ctx.lineTo(w * 0.5 + 88, 96);
  ctx.stroke();

  // Hands
  ctx.fillStyle = '#dfb892';
  ctx.beginPath();
  ctx.arc(w * 0.5 - 88, 90, 9, 0, Math.PI * 2);
  ctx.arc(w * 0.5 + 88, 90, 9, 0, Math.PI * 2);
  ctx.fill();

  // Head & Beard of Christ
  ctx.fillStyle = '#ddb690';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 178, 17, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6c4931';
  ctx.beginPath();
  ctx.arc(w * 0.5, 186, 14, 0, Math.PI);
  ctx.fill();

  // Subtle mosaic stone grid overlay (6,700 granite pieces effect)
  ctx.strokeStyle = 'rgba(70, 55, 38, 0.16)';
  ctx.lineWidth = 1;
  for (let y = 40; y < h - 40; y += 12) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
  }
  for (let x = 40; x < w - 40; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, h - 40);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color('#ffe2a8'),
    emissiveIntensity: 0.12,
    roughness: 0.68,
    metalness: 0.08,
  });
}

/**
 * Generates authentic Notre Dame Stadium FieldTurf:
 * - Alternating mowed 5-yard turf bands
 * - Gold & Navy interlocking "ND" monogram at the 50-yard line
 * - Yard lines, numbers, hash marks
 * - Famous 9 white diagonal lines at 42° in each end zone (9+9=18, 42° -> 1842 founding year!)
 */
function createStadiumTurfMaterial() {
  const w = 1024;
  const h = 2048;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  // Outer turf apron
  ctx.fillStyle = '#1b5d34';
  ctx.fillRect(0, 0, w, h);

  const marginX = 96;
  const marginY = 120;
  const fieldW = w - marginX * 2;
  const fieldH = h - marginY * 2; // 120 yards total (10N endzone + 100 play + 10S endzone)
  const yardPx = fieldH / 120;

  // Alternating 5-yard mowed bands across the 100-yard playing field
  for (let yd = 0; yd < 120; yd += 5) {
    const y = marginY + yd * yardPx;
    const isEndzone = yd < 10 || yd >= 110;
    if (isEndzone) {
      ctx.fillStyle = '#16522d';
    } else {
      ctx.fillStyle = (yd / 5) % 2 === 0 ? '#1f6e3d' : '#1a6135';
    }
    ctx.fillRect(marginX, y, fieldW, yardPx * 5 + 1);
  }

  // Iconic Notre Dame End Zones: 9 diagonal white lines at 42 degrees!
  const drawEndzoneDiagonals = (ezTopY) => {
    const ezH = yardPx * 10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(marginX + 6, ezTopY + 6, fieldW - 12, ezH - 12);
    ctx.clip();

    ctx.strokeStyle = 'rgba(245, 248, 245, 0.9)';
    ctx.lineWidth = 8;
    const tan42 = Math.tan((42 * Math.PI) / 180);
    const dx = ezH / tan42;
    for (let i = 0; i < 9; i++) {
      const startX = marginX + fieldW * 0.14 + (i * (fieldW * 0.72)) / 8;
      ctx.beginPath();
      ctx.moveTo(startX + dx * 0.5, ezTopY + ezH - 10);
      ctx.lineTo(startX - dx * 0.5, ezTopY + 10);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawEndzoneDiagonals(marginY);
  drawEndzoneDiagonals(marginY + 110 * yardPx);

  // White sidelines, end lines & goal lines
  ctx.strokeStyle = '#f5f7f5';
  ctx.lineWidth = 10;
  ctx.strokeRect(marginX, marginY, fieldW, fieldH);

  // Yard lines every 5 yards
  ctx.lineWidth = 4;
  for (let yd = 10; yd <= 110; yd += 5) {
    const y = marginY + yd * yardPx;
    ctx.lineWidth = yd === 10 || yd === 110 || yd === 60 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(marginX, y);
    ctx.lineTo(marginX + fieldW, y);
    ctx.stroke();
  }

  // Hash marks every 1 yard
  ctx.lineWidth = 3;
  for (let yd = 11; yd < 110; yd++) {
    if (yd % 5 === 0) continue;
    const y = marginY + yd * yardPx;
    ctx.beginPath();
    ctx.moveTo(marginX + fieldW * 0.34, y);
    ctx.lineTo(marginX + fieldW * 0.365, y);
    ctx.moveTo(marginX + fieldW * 0.635, y);
    ctx.lineTo(marginX + fieldW * 0.66, y);
    ctx.stroke();
  }

  // Yard numbers
  ctx.fillStyle = 'rgba(245, 248, 245, 0.92)';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  nums.forEach((num, idx) => {
    const yd = 20 + idx * 10;
    const y = marginY + yd * yardPx;
    // Left side rotated
    ctx.save();
    ctx.translate(marginX + fieldW * 0.14, y);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
    // Right side rotated
    ctx.save();
    ctx.translate(marginX + fieldW * 0.86, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  });

  // Center 50-yard line Gold & Navy Interlocking "ND" Monogram
  const cx = w * 0.5;
  const cy = marginY + 60 * yardPx;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.font = 'bold 118px Georgia, serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#0c2340';
  ctx.fillStyle = '#dcb043';
  ctx.strokeText('ND', 0, 4);
  ctx.fillText('ND', 0, 4);
  ctx.restore();

  // Green Shamrocks on 35-yard kickoff lines
  for (const yd of [45, 75]) {
    const sy = marginY + yd * yardPx;
    ctx.fillStyle = '#2fa855';
    ctx.beginPath();
    ctx.arc(cx - 7, sy - 5, 8, 0, Math.PI * 2);
    ctx.arc(cx + 7, sy - 5, 8, 0, Math.PI * 2);
    ctx.arc(cx, sy - 14, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.78,
    metalness: 0.02,
  });
}

function createStainedGlassMaterial() {
  const w = 256;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#141a29';
  ctx.fillRect(0, 0, w, h);

  const jewelColors = ['#1d4ed8', '#b91c1c', '#d97706', '#047857', '#6d28d9', '#f59e0b', '#2563eb'];
  for (let y = 12; y < h - 12; y += 22) {
    for (let x = 12; x < w - 12; x += 22) {
      ctx.fillStyle = jewelColors[((x * 7 + y * 13) >> 3) % jewelColors.length];
      ctx.fillRect(x + 2, y + 2, 18, 18);
    }
  }
  // Rose medallion center
  const rg = ctx.createRadialGradient(w / 2, h * 0.28, 6, w / 2, h * 0.28, 72);
  rg.addColorStop(0, '#fde68a');
  rg.addColorStop(0.45, '#dc2626');
  rg.addColorStop(0.85, '#1d4ed8');
  rg.addColorStop(1, '#0f172a');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.28, 72, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color('#ffdf9e'),
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.15,
  });
}

function createLimestoneMaterial() {
  const w = 256;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ddd5c4';
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < 16; r++) {
    const off = (r % 2) * 16;
    for (let col = -1; col <= 8; col++) {
      const v = 214 + (((r * 31 + col * 17) % 15) - 7);
      ctx.fillStyle = `rgb(${v}, ${v - 7}, ${v - 20})`;
      ctx.fillRect(col * 32 + off + 1, r * 16 + 1, 30, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.08,
    roughness: 0.76,
    metalness: 0.04,
  });
}

function createSlateRoofMaterial() {
  const w = 256;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2d3644';
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < 24; r++) {
    const off = (r % 2) * 8;
    for (let col = -1; col <= 16; col++) {
      const shade = 44 + ((r * 13 + col * 7) % 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 20})`;
      ctx.fillRect(col * 16 + off + 1, r * 10.5 + 1, 14, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.12,
    color: new THREE.Color('#ffffff'),
    roughness: 0.62,
    metalness: 0.14,
  });
}

function createJumbotronMaterial() {
  const w = 512;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#07172e');
  grad.addColorStop(0.5, '#0c2340');
  grad.addColorStop(1, '#07172e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#dcb043';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#f5cb5c';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('NOTRE DAME', w / 2, 96);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PLAY LIKE A CHAMPION TODAY', w / 2, 148);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('IRISH  35   ·   4TH QTR   ·   VISITOR  14', w / 2, 202);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.75,
    roughness: 0.3,
  });
}

export function createCampusMaterials() {
  const ndBuffBrick = createBrickMaterialSet({
    baseHex: '#d7be8b',
    variation: 20,
    windowCols: 8,
    windowRows: 4,
    archedWindows: true,
    repeatX: 2.5,
    repeatY: 1.6,
  });

  const ndWarmGothicBrick = createBrickMaterialSet({
    baseHex: '#cca974',
    variation: 22,
    windowCols: 6,
    windowRows: 3,
    archedWindows: false,
    repeatX: 2.2,
    repeatY: 1.4,
  });

  const highRiseBrick = createBrickMaterialSet({
    baseHex: '#d3bd92',
    variation: 14,
    windowCols: 8,
    windowRows: 10,
    archedWindows: false,
    repeatX: 1.6,
    repeatY: 1.2,
  });

  const limestone = createLimestoneMaterial();
  const slateRoof = createSlateRoofMaterial();
  const redTileRoof = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6c4b3c'),
    roughness: 0.7,
    metalness: 0.08,
  });

  const verdigrisCopper = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4f8a78'),
    roughness: 0.46,
    metalness: 0.42,
  });

  const goldenDome = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffd452'),
    emissive: new THREE.Color('#ffaa00'),
    emissiveIntensity: 0.14,
    roughness: 0.16,
    metalness: 0.9,
  });

  const bronzeStatue = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#495446'),
    roughness: 0.38,
    metalness: 0.72,
  });

  const whiteMarble = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f4f1ea'),
    emissive: new THREE.Color('#fff1d0'),
    emissiveIntensity: 0.08,
    roughness: 0.42,
    metalness: 0.05,
  });

  const boulderRock = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6b6861'),
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });

  const rusticTimber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5c4028'),
    roughness: 0.88,
    metalness: 0.02,
  });

  const stainedGlass = createStainedGlassMaterial();
  const wordOfLife = createWordOfLifeMosaicMaterial();
  const stadiumTurf = createStadiumTurfMaterial();
  const jumbotron = createJumbotronMaterial();

  const whiteDomeShell = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eceae2'),
    roughness: 0.48,
    metalness: 0.08,
  });

  const glassGreenhouse = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8ecae6'),
    emissive: new THREE.Color('#7bdff2'),
    emissiveIntensity: 0.18,
    roughness: 0.12,
    metalness: 0.55,
    transparent: true,
    opacity: 0.76,
  });

  const neonNumberOne = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff2e2e'),
    emissive: new THREE.Color('#ff2424'),
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });

  const lampGlobe = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fff5d6'),
    emissive: new THREE.Color('#ffc966'),
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });

  const stadiumSeatsNavy = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#132c52'),
    roughness: 0.72,
    metalness: 0.08,
  });

  const stadiumSeatsGold = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c89c32'),
    roughness: 0.65,
    metalness: 0.12,
  });

  // Update lighting/season responsiveness across all shared materials
  function updateAtmosphere({ nightFactor, gameday, season }) {
    const winGlow = 0.06 + nightFactor * 1.15;
    ndBuffBrick.emissiveIntensity = winGlow;
    ndWarmGothicBrick.emissiveIntensity = winGlow * 0.95;
    highRiseBrick.emissiveIntensity = winGlow * 1.05;
    stainedGlass.emissiveIntensity = 0.22 + nightFactor * 1.65;
    wordOfLife.emissiveIntensity = 0.08 + nightFactor * 0.52;
    goldenDome.emissiveIntensity = 0.09 + nightFactor * 0.55;
    lampGlobe.emissiveIntensity = 0.15 + nightFactor * 2.1;
    neonNumberOne.emissiveIntensity = gameday || nightFactor > 0.35 ? 2.6 : 0.2;
    jumbotron.emissiveIntensity = gameday ? 1.35 : 0.55 + nightFactor * 0.6;

    // Winter frost tint on roofs
    if (season === 'winter') {
      slateRoof.color.setHex(0xdce4ee);
      redTileRoof.color.setHex(0xcfd8e3);
    } else {
      slateRoof.color.setHex(0xffffff);
      redTileRoof.color.setHex(0x6c4b3c);
    }
  }

  return {
    ndBuffBrick,
    ndWarmGothicBrick,
    highRiseBrick,
    limestone,
    slateRoof,
    redTileRoof,
    verdigrisCopper,
    goldenDome,
    bronzeStatue,
    whiteMarble,
    boulderRock,
    rusticTimber,
    stainedGlass,
    wordOfLife,
    stadiumTurf,
    jumbotron,
    whiteDomeShell,
    glassGreenhouse,
    neonNumberOne,
    lampGlobe,
    stadiumSeatsNavy,
    stadiumSeatsGold,
    updateAtmosphere,
  };
}
