import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates Indiana Limestone Collegiate Gothic facade (color + bump + night emissive)
 */
function createGothicFacadeTextures(variant = 'limestone') {
  const W = 512;
  const H = 512;
  const { canvas: colC, ctx: col } = makeCanvas(W, H);
  const { canvas: bmpC, ctx: bmp } = makeCanvas(W, H);
  const { canvas: emiC, ctx: emi } = makeCanvas(W, H);
  const rand = seededRandom(variant === 'redbrick' ? 402 : 1892);

  const isBrick = variant === 'redbrick';
  col.fillStyle = isBrick ? '#7c342b' : '#d8cfc0';
  col.fillRect(0, 0, W, H);
  bmp.fillStyle = '#808080';
  bmp.fillRect(0, 0, W, H);
  emi.fillStyle = '#000000';
  emi.fillRect(0, 0, W, H);

  // Ashlar stone or brick courses
  const rows = isBrick ? 48 : 24;
  const rowH = H / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = isBrick ? 16 : 8;
    const colW = W / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const v = (rand() - 0.5) * 18;
      if (isBrick) {
        col.fillStyle = `rgb(${126 + v}, ${53 + v * 0.5}, ${43 + v * 0.4})`;
      } else {
        col.fillStyle = `rgb(${216 + v}, ${207 + v}, ${191 + v})`;
      }
      col.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

      const bv = 128 + (rand() - 0.5) * 26;
      bmp.fillStyle = `rgb(${bv},${bv},${bv})`;
      bmp.fillRect(x + 1, y + 1, colW - 2, rowH - 2);
    }
    // Mortar line
    col.fillStyle = isBrick ? 'rgba(210,198,180,0.35)' : 'rgba(120,112,98,0.28)';
    col.fillRect(0, y, W, 1.2);
    bmp.fillStyle = '#585858';
    bmp.fillRect(0, y, W, 1.5);
  }

  // Subtle vertical weathering
  const grad = col.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(55,50,45,0.16)');
  grad.addColorStop(0.18, 'rgba(0,0,0,0)');
  grad.addColorStop(0.85, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(45,42,38,0.18)');
  col.fillStyle = grad;
  col.fillRect(0, 0, W, H);

  // 4 stories of Gothic mullioned lancet / Tudor windows
  const floors = 4;
  const bays = 6;
  const floorH = H / floors;
  const bayW = W / bays;

  for (let f = 0; f < floors; f++) {
    const fy = f * floorH;
    // Limestone stringcourse ledge
    col.fillStyle = '#e5ddce';
    col.fillRect(0, fy + floorH - 7, W, 5);
    bmp.fillStyle = '#dcdcdc';
    bmp.fillRect(0, fy + floorH - 7, W, 5);

    for (let b = 0; b < bays; b++) {
      const bx = b * bayW;
      const winW = bayW * 0.54;
      const winH = floorH * (f === 0 ? 0.62 : 0.56);
      const wx = bx + (bayW - winW) * 0.5;
      const wy = fy + floorH * 0.2;

      // Carved limestone surround
      col.fillStyle = '#e4dccb';
      col.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);
      bmp.fillStyle = '#cfcfcf';
      bmp.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);

      // Pointed / Tudor arch head on top floor or ground floor
      col.fillStyle = '#232a32';
      bmp.fillStyle = '#2a2a2a';
      col.beginPath();
      col.moveTo(wx, wy + winH);
      col.lineTo(wx, wy + 10);
      col.quadraticCurveTo(wx + winW * 0.5, wy - 6, wx + winW, wy + 10);
      col.lineTo(wx + winW, wy + winH);
      col.closePath();
      col.fill();

      bmp.beginPath();
      bmp.moveTo(wx, wy + winH);
      bmp.lineTo(wx, wy + 10);
      bmp.quadraticCurveTo(wx + winW * 0.5, wy - 6, wx + winW, wy + 10);
      bmp.lineTo(wx + winW, wy + winH);
      bmp.closePath();
      bmp.fill();

      // Warm interior glow for night emissive
      const litChance = rand();
      if (litChance > 0.28) {
        const warmth = 0.65 + rand() * 0.35;
        const r = Math.round(255 * warmth);
        const g = Math.round(205 * warmth);
        const bl = Math.round(125 * warmth);
        emi.fillStyle = `rgb(${r},${g},${bl})`;
        emi.fillRect(wx + 2, wy + 6, winW - 4, winH - 8);

        // Daytime warm interior hint behind leaded glass
        col.fillStyle = `rgba(195, 165, 115, ${0.14 + rand() * 0.14})`;
        col.fillRect(wx + 2, wy + 6, winW - 4, winH - 8);
      }

      // Stone mullions (vertical & transom)
      col.fillStyle = '#cfc5b3';
      col.fillRect(wx + winW * 0.5 - 1.5, wy + 2, 3, winH - 2);
      col.fillRect(wx, wy + winH * 0.42, winW, 2.5);

      emi.fillStyle = '#000000';
      emi.fillRect(wx + winW * 0.5 - 1.5, wy, 3, winH);
      emi.fillRect(wx, wy + winH * 0.42, winW, 2.5);
    }
  }

  const wrap = (c, srgb = false) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };

  return {
    map: wrap(colC, true),
    bumpMap: wrap(bmpC, false),
    emissiveMap: wrap(emiC, true)
  };
}

/**
 * Generates Brutalist grooved limestone texture for SOM's Regenstein Library
 */
function createBrutalistTextures() {
  const W = 512;
  const H = 512;
  const { canvas: colC, ctx: col } = makeCanvas(W, H);
  const { canvas: bmpC, ctx: bmp } = makeCanvas(W, H);
  const { canvas: emiC, ctx: emi } = makeCanvas(W, H);
  const rand = seededRandom(1970);

  col.fillStyle = '#d5cdbf';
  col.fillRect(0, 0, W, H);
  bmp.fillStyle = '#808080';
  bmp.fillRect(0, 0, W, H);
  emi.fillStyle = '#000000';
  emi.fillRect(0, 0, W, H);

  // Deep vertical corduroy grooves characteristic of Regenstein
  for (let x = 0; x < W; x += 4) {
    const shade = (x % 8 === 0 ? -16 : 10) + (rand() - 0.5) * 8;
    col.fillStyle = `rgb(${212 + shade}, ${205 + shade}, ${192 + shade})`;
    col.fillRect(x, 0, 3, H);
    const b = x % 8 === 0 ? 70 : 185;
    bmp.fillStyle = `rgb(${b},${b},${b})`;
    bmp.fillRect(x, 0, 3, H);
  }

  // Horizontal panel joints
  for (let y = 0; y < H; y += 64) {
    col.fillStyle = 'rgba(80,75,68,0.35)';
    col.fillRect(0, y, W, 2);
    bmp.fillStyle = '#303030';
    bmp.fillRect(0, y, W, 3);
  }

  // Narrow vertical study slit windows
  const floors = 5;
  const floorH = H / floors;
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH;
    for (let x = 22; x < W - 20; x += 48) {
      if (rand() > 0.18) {
        col.fillStyle = '#1e252c';
        col.fillRect(x, fy + 16, 8, floorH - 32);
        bmp.fillStyle = '#181818';
        bmp.fillRect(x, fy + 16, 8, floorH - 32);
        if (rand() > 0.25) {
          emi.fillStyle = '#ffcf86';
          emi.fillRect(x + 1, fy + 18, 6, floorH - 36);
        }
      }
    }
  }

  const wrap = (c, srgb = false) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };

  return {
    map: wrap(colC, true),
    bumpMap: wrap(bmpC, false),
    emissiveMap: wrap(emiC, true)
  };
}

/**
 * Generates Modern Glass Curtain Wall textures (Booth, CCD, Rubenstein, Law School, ERC)
 */
function createCurtainWallTextures(tint = '#385063', mullionColor = '#9aa6b0', seed = 2004) {
  const W = 512;
  const H = 512;
  const { canvas: colC, ctx: col } = makeCanvas(W, H);
  const { canvas: emiC, ctx: emi } = makeCanvas(W, H);
  const rand = seededRandom(seed);

  col.fillStyle = tint;
  col.fillRect(0, 0, W, H);
  emi.fillStyle = '#000000';
  emi.fillRect(0, 0, W, H);

  const floors = 8;
  const cols = 12;
  const fH = H / floors;
  const cW = W / cols;

  for (let f = 0; f < floors; f++) {
    const y = f * fH;
    const floorLit = rand() > 0.32;
    for (let c = 0; c < cols; c++) {
      const x = c * cW;
      const v = (rand() - 0.5) * 16;
      col.fillStyle = `rgba(${160 + v}, ${195 + v}, ${220 + v}, 0.16)`;
      col.fillRect(x + 2, y + 10, cW - 4, fH - 12);

      if (floorLit && rand() > 0.22) {
        const w = 0.6 + rand() * 0.4;
        emi.fillStyle = `rgb(${Math.round(245 * w)}, ${Math.round(220 * w)}, ${Math.round(168 * w)})`;
        emi.fillRect(x + 3, y + 12, cW - 6, fH - 15);
      }
    }
    // Spandrel band
    col.fillStyle = 'rgba(20, 26, 32, 0.55)';
    col.fillRect(0, y, W, 9);
    // Horizontal mullion
    col.fillStyle = mullionColor;
    col.fillRect(0, y + 9, W, 2);
  }

  for (let c = 0; c <= cols; c++) {
    col.fillStyle = mullionColor;
    col.fillRect(c * cW - 1, 0, 2, H);
  }

  const wrap = (c, srgb = false) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };

  return {
    map: wrap(colC, true),
    emissiveMap: wrap(emiC, true)
  };
}

/**
 * Generates Slate Roof Shingles texture
 */
function createSlateRoofTexture() {
  const W = 256;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = seededRandom(99);

  ctx.fillStyle = '#6f7c8c';
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 8) {
    for (let x = 0; x < W; x += 12) {
      const v = (rand() - 0.5) * 26;
      ctx.fillStyle = `rgb(${112 + v}, ${125 + v}, ${140 + v})`;
      ctx.fillRect(x + (y % 16 === 0 ? 0 : 6), y, 11, 7);
    }
    ctx.fillStyle = 'rgba(28,34,42,0.38)';
    ctx.fillRect(0, y + 7, W, 1);
  }

  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Generates Prairie Roman Brick texture for Frank Lloyd Wright's Robie House
 */
function createPrairieBrickTexture() {
  const W = 256;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  const rand = seededRandom(1910);

  ctx.fillStyle = '#9a4632';
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 6) {
    for (let x = 0; x < W; x += 32) {
      const v = (rand() - 0.5) * 20;
      ctx.fillStyle = `rgb(${156 + v}, ${72 + v * 0.5}, ${50 + v * 0.4})`;
      ctx.fillRect(x + (y % 12 === 0 ? 0 : 16), y, 30, 5);
    }
    // Deep raked horizontal mortar joint
    ctx.fillStyle = '#cbbba0';
    ctx.fillRect(0, y + 5, W, 1);
  }

  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Generates Stagg Field Football Turf texture with Maroon "CHICAGO" endzones
 */
export function createStaggFieldTexture() {
  const W = 1024;
  const H = 512;
  const { canvas, ctx } = makeCanvas(W, H);

  // Outer perimeter grass
  ctx.fillStyle = '#2d6334';
  ctx.fillRect(0, 0, W, H);

  const marginX = 72;
  const marginY = 48;
  const fW = W - marginX * 2;
  const fH = H - marginY * 2;

  // Alternating 5-yard turf stripes
  const stripes = 24;
  const sW = fW / stripes;
  for (let i = 0; i < stripes; i++) {
    if (i < 2 || i >= stripes - 2) {
      // UChicago Maroon Endzones!
      ctx.fillStyle = '#7a0e18';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#32733b' : '#2b6633';
    }
    ctx.fillRect(marginX + i * sW, marginY, sW + 1, fH);
  }

  // White boundary & yard lines
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 4;
  ctx.strokeRect(marginX, marginY, fW, fH);

  ctx.lineWidth = 2;
  for (let i = 2; i <= stripes - 2; i++) {
    const x = marginX + i * sW;
    ctx.beginPath();
    ctx.moveTo(x, marginY);
    ctx.lineTo(x, marginY + fH);
    ctx.stroke();
  }

  // Center UChicago "C" emblem
  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  ctx.fillStyle = '#800000';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0.45, Math.PI * 2 - 0.45);
  ctx.arc(0, 0, 20, Math.PI * 2 - 0.45, 0.45, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Endzone "CHICAGO" lettering
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(marginX + sW, H * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('CHICAGO', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(marginX + fW - sW, H * 0.5);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('MAROONS', 0, 0);
  ctx.restore();

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Generates radial granite paving texture for Henry Moore's "Nuclear Energy" CP-1 plaza
 */
export function createRadialGraniteTexture() {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = '#b9b2a6';
  ctx.fillRect(0, 0, S, S);

  const cx = S / 2;
  const cy = S / 2;
  ctx.strokeStyle = 'rgba(70,65,58,0.45)';
  ctx.lineWidth = 2;
  for (let r = 24; r < S * 0.5; r += 22) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24);
    ctx.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Shared Campus Material Library with live Day/Night & Seasonal responsiveness
 */
export function createCampusMaterials() {
  const gothicStoneTex = createGothicFacadeTextures('limestone');
  const redBrickTex = createGothicFacadeTextures('redbrick');
  const brutalistTex = createBrutalistTextures();
  const glassBlueTex = createCurtainWallTextures('#2b4356', '#9bb0be', 2004);
  const glassDarkTex = createCurtainWallTextures('#1d2730', '#4f5d69', 1959);
  const glassWarmTex = createCurtainWallTextures('#3a4a52', '#c8bfa8', 2016);
  const slateTex = createSlateRoofTexture();
  const prairieTex = createPrairieBrickTexture();

  // Cloned repeat helpers so buildings of different sizes keep realistic scale
  const emissiveMaterials = [];
  const roofMaterials = [];
  const lawnMaterials = [];

  const registerEmissive = (mat, baseIntensity = 1.0) => {
    mat.userData.baseEmissiveIntensity = baseIntensity;
    emissiveMaterials.push(mat);
    return mat;
  };

  const gothicFacade = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: gothicStoneTex.map,
      bumpMap: gothicStoneTex.bumpMap,
      bumpScale: 0.35,
      emissive: new THREE.Color('#ffb860'),
      emissiveMap: gothicStoneTex.emissiveMap,
      emissiveIntensity: 0.15,
      roughness: 0.84,
      metalness: 0.04
    }),
    1.15
  );

  const redBrickGothic = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: redBrickTex.map,
      bumpMap: redBrickTex.bumpMap,
      bumpScale: 0.35,
      emissive: new THREE.Color('#ffb860'),
      emissiveMap: redBrickTex.emissiveMap,
      emissiveIntensity: 0.15,
      roughness: 0.82,
      metalness: 0.04
    }),
    1.1
  );

  const regensteinLimestone = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: brutalistTex.map,
      bumpMap: brutalistTex.bumpMap,
      bumpScale: 0.55,
      emissive: new THREE.Color('#ffc470'),
      emissiveMap: brutalistTex.emissiveMap,
      emissiveIntensity: 0.15,
      roughness: 0.88,
      metalness: 0.03
    }),
    1.2
  );

  const limestoneTrim = new THREE.MeshStandardMaterial({
    color: '#dfd6c5',
    roughness: 0.82,
    metalness: 0.04
  });

  const limestoneDark = new THREE.MeshStandardMaterial({
    color: '#c4baa6',
    roughness: 0.86,
    metalness: 0.04
  });

  const slateRoof = new THREE.MeshStandardMaterial({
    map: slateTex,
    color: '#8d9aa8',
    roughness: 0.68,
    metalness: 0.14
  });
  slateRoof.userData.baseColor = new THREE.Color('#8d9aa8');
  roofMaterials.push(slateRoof);

  const copperPatina = new THREE.MeshStandardMaterial({
    color: '#5a8f7b',
    roughness: 0.52,
    metalness: 0.38
  });

  const prairieBrick = new THREE.MeshStandardMaterial({
    map: prairieTex,
    roughness: 0.78,
    metalness: 0.05
  });

  const curtainGlass = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: glassBlueTex.map,
      emissive: new THREE.Color('#ffe0a8'),
      emissiveMap: glassBlueTex.emissiveMap,
      emissiveIntensity: 0.18,
      roughness: 0.16,
      metalness: 0.72
    }),
    1.25
  );

  const saarinenPleatedGlass = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: glassDarkTex.map,
      emissive: new THREE.Color('#ffdca0'),
      emissiveMap: glassDarkTex.emissiveMap,
      emissiveIntensity: 0.18,
      roughness: 0.12,
      metalness: 0.82
    }),
    1.25
  );

  const warmModernFacade = registerEmissive(
    new THREE.MeshStandardMaterial({
      map: glassWarmTex.map,
      emissive: new THREE.Color('#ffdfb0'),
      emissiveMap: glassWarmTex.emissiveMap,
      emissiveIntensity: 0.18,
      roughness: 0.35,
      metalness: 0.48
    }),
    1.15
  );

  const mansuetoDomeGlass = registerEmissive(
    new THREE.MeshPhysicalMaterial({
      color: '#a8d4ee',
      emissive: new THREE.Color('#ffcf87'),
      emissiveIntensity: 0.12,
      roughness: 0.08,
      metalness: 0.15,
      transmission: 0.62,
      transparent: true,
      opacity: 0.74,
      ior: 1.48
    }),
    0.85
  );

  const miesSteel = new THREE.MeshStandardMaterial({
    color: '#1c1f24',
    roughness: 0.38,
    metalness: 0.76
  });

  const legorretaOchre = new THREE.MeshStandardMaterial({
    color: '#d47c46',
    roughness: 0.76,
    metalness: 0.04
  });

  const legorretaGold = new THREE.MeshStandardMaterial({
    color: '#deb053',
    roughness: 0.76,
    metalness: 0.04
  });

  const bronzeMoore = new THREE.MeshStandardMaterial({
    color: '#6b5335',
    roughness: 0.34,
    metalness: 0.84
  });

  const mastYellowSteel = new THREE.MeshStandardMaterial({
    color: '#f0e6c8',
    roughness: 0.32,
    metalness: 0.55
  });

  const stainedGlass = registerEmissive(
    new THREE.MeshStandardMaterial({
      color: '#5b4278',
      emissive: new THREE.Color('#ffaa4c'),
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.2
    }),
    2.0
  );

  const quadGrass = new THREE.MeshStandardMaterial({
    color: '#4e7840',
    roughness: 0.94,
    metalness: 0.0
  });
  quadGrass.userData.baseColor = new THREE.Color('#4e7840');
  lawnMaterials.push(quadGrass);

  const midwayGrass = new THREE.MeshStandardMaterial({
    color: '#46703a',
    roughness: 0.95,
    metalness: 0.0
  });
  midwayGrass.userData.baseColor = new THREE.Color('#46703a');
  lawnMaterials.push(midwayGrass);

  const cobblestone = new THREE.MeshStandardMaterial({
    color: '#cbc2b2',
    roughness: 0.9,
    metalness: 0.02
  });

  const asphalt = new THREE.MeshStandardMaterial({
    color: '#34383e',
    roughness: 0.88,
    metalness: 0.05
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: '#235975',
    roughness: 0.1,
    metalness: 0.78
  });

  const maroonBanner = new THREE.MeshStandardMaterial({
    color: '#800000',
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  /**
   * Clone a textured facade material with exact UV tiling proportional to real building meters
   */
  function tiledFacade(baseMat, widthMeters, heightMeters, tileW = 18, tileH = 14) {
    const m = baseMat.clone();
    if (m.map) {
      m.map = m.map.clone();
      m.map.repeat.set(Math.max(1, Math.round(widthMeters / tileW)), Math.max(1, heightMeters / tileH));
      m.map.needsUpdate = true;
    }
    if (m.bumpMap) {
      m.bumpMap = m.bumpMap.clone();
      m.bumpMap.repeat.copy(m.map.repeat);
      m.bumpMap.needsUpdate = true;
    }
    if (m.emissiveMap) {
      m.emissiveMap = m.emissiveMap.clone();
      m.emissiveMap.repeat.copy(m.map.repeat);
      m.emissiveMap.needsUpdate = true;
    }
    m.userData.baseEmissiveIntensity = baseMat.userData.baseEmissiveIntensity || 1.0;
    emissiveMaterials.push(m);
    return m;
  }

  /**
   * Updates all campus materials dynamically for Time-of-Day & Season
   */
  function syncEnvironment({ nightFactor = 0, season = 'autumn' }) {
    for (const m of emissiveMaterials) {
      const base = m.userData.baseEmissiveIntensity || 1.0;
      m.emissiveIntensity = 0.06 + nightFactor * base * 1.35;
    }

    const isWinter = season === 'winter';
    const snowGrass = new THREE.Color('#dfe6ec');
    const autumnGrass = new THREE.Color('#5a7a3e');
    const springGrass = new THREE.Color('#4a863f');
    const summerGrass = new THREE.Color('#3f7536');

    for (const lm of lawnMaterials) {
      if (isWinter) {
        lm.color.copy(snowGrass);
      } else if (season === 'autumn') {
        lm.color.copy(autumnGrass);
      } else if (season === 'spring') {
        lm.color.copy(springGrass);
      } else {
        lm.color.copy(summerGrass);
      }
    }

    const snowRoof = new THREE.Color('#cfd8e2');
    for (const rm of roofMaterials) {
      rm.color.copy(isWinter ? snowRoof : rm.userData.baseColor);
    }

    waterMat.color.set(isWinter ? '#8fb3c9' : '#215875');
    waterMat.roughness = isWinter ? 0.28 : 0.09;
  }

  return {
    gothicFacade,
    redBrickGothic,
    regensteinLimestone,
    limestoneTrim,
    limestoneDark,
    slateRoof,
    copperPatina,
    prairieBrick,
    curtainGlass,
    saarinenPleatedGlass,
    warmModernFacade,
    mansuetoDomeGlass,
    miesSteel,
    legorretaOchre,
    legorretaGold,
    bronzeMoore,
    mastYellowSteel,
    stainedGlass,
    quadGrass,
    midwayGrass,
    cobblestone,
    asphalt,
    waterMat,
    maroonBanner,
    tiledFacade,
    syncEnvironment,
    registerEmissive
  };
}
