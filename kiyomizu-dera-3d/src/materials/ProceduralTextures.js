import * as THREE from 'three';

function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function makeCanvasTexture(canvas, repeatX = 1, repeatY = 1, isSRGB = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (isSRGB) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

// Deterministic pseudo-random helper for crisp procedural grain
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function createMaterialLibrary() {
  // 1. Hiwadabuki (檜皮葺 — Layered Cypress Bark Roof)
  const hiwadaColor = createCanvas(512, 512);
  const hCtx = hiwadaColor.getContext('2d');
  hCtx.fillStyle = '#3b2c22';
  hCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    const shade = 38 + Math.floor(hash2(y, 1.3) * 20);
    hCtx.fillStyle = `rgb(${shade + 18}, ${shade + 5}, ${shade - 4})`;
    hCtx.fillRect(0, y, 512, 5);
    hCtx.fillStyle = 'rgba(18, 12, 8, 0.45)';
    hCtx.fillRect(0, y + 5, 512, 1);
  }
  // Vertical bark fiber streaks & subtle aged moss tint
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 8 + Math.random() * 24;
    hCtx.fillStyle = i % 11 === 0 ? 'rgba(72, 84, 52, 0.14)' : 'rgba(24, 17, 12, 0.22)';
    hCtx.fillRect(x, y, 1.5, len);
  }

  const hiwadaBump = createCanvas(512, 512);
  const hbCtx = hiwadaBump.getContext('2d');
  hbCtx.fillStyle = '#808080';
  hbCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    hbCtx.fillStyle = '#b4b4b4';
    hbCtx.fillRect(0, y, 512, 4);
    hbCtx.fillStyle = '#404040';
    hbCtx.fillRect(0, y + 4, 512, 2);
  }

  // 2. Hon-gawarabuki (本瓦葺 — Smoked Ibushi-gin Ceramic Roof Tiles)
  const kawaraColor = createCanvas(512, 512);
  const kCtx = kawaraColor.getContext('2d');
  kCtx.fillStyle = '#34383d';
  kCtx.fillRect(0, 0, 512, 512);
  const cols = 16;
  const colW = 512 / cols;
  for (let c = 0; c < cols; c++) {
    const x0 = c * colW;
    const grad = kCtx.createLinearGradient(x0, 0, x0 + colW, 0);
    grad.addColorStop(0.0, '#25282c');
    grad.addColorStop(0.28, '#4d535b');
    grad.addColorStop(0.52, '#34383e');
    grad.addColorStop(0.85, '#596069');
    grad.addColorStop(1.0, '#1e2125');
    kCtx.fillStyle = grad;
    kCtx.fillRect(x0, 0, colW, 512);
  }
  for (let r = 0; r < 512; r += 24) {
    kCtx.fillStyle = 'rgba(15, 17, 20, 0.52)';
    kCtx.fillRect(0, r, 512, 3);
    kCtx.fillStyle = 'rgba(130, 138, 148, 0.16)';
    kCtx.fillRect(0, r + 3, 512, 2);
  }

  const kawaraBump = createCanvas(512, 512);
  const kbCtx = kawaraBump.getContext('2d');
  for (let c = 0; c < cols; c++) {
    const x0 = c * colW;
    const grad = kbCtx.createLinearGradient(x0, 0, x0 + colW, 0);
    grad.addColorStop(0, '#383838');
    grad.addColorStop(0.3, '#d8d8d8');
    grad.addColorStop(0.65, '#606060');
    grad.addColorStop(0.88, '#ececec');
    grad.addColorStop(1, '#303030');
    kbCtx.fillStyle = grad;
    kbCtx.fillRect(x0, 0, colW, 512);
  }

  // 3. Aged Keyaki / Hinoki Structural Timber (欅・檜古材)
  const woodColor = createCanvas(512, 512);
  const wCtx = woodColor.getContext('2d');
  wCtx.fillStyle = '#5a402c';
  wCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 2) {
    const v = Math.sin(x * 0.14) * 10 + (hash2(x, 4.2) - 0.5) * 18;
    wCtx.fillStyle = `rgb(${88 + v}, ${62 + v * 0.75}, ${42 + v * 0.55})`;
    wCtx.fillRect(x, 0, 2, 512);
  }
  for (let i = 0; i < 650; i++) {
    wCtx.fillStyle = 'rgba(30, 18, 10, 0.16)';
    wCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 25 + Math.random() * 65);
  }

  // 4. Hinoki Stage Planks (清水舞台 166枚檜板)
  const deckColor = createCanvas(512, 512);
  const dCtx = deckColor.getContext('2d');
  dCtx.fillStyle = '#7b6148';
  dCtx.fillRect(0, 0, 512, 512);
  const plankCount = 16;
  const plankW = 512 / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const x0 = p * plankW;
    const tone = (hash2(p, 9.1) - 0.5) * 18;
    dCtx.fillStyle = `rgb(${124 + tone}, ${98 + tone * 0.8}, ${73 + tone * 0.65})`;
    dCtx.fillRect(x0 + 1, 0, plankW - 2, 512);
    dCtx.fillStyle = 'rgba(28, 20, 14, 0.58)';
    dCtx.fillRect(x0, 0, 1.5, 512);
  }
  for (let i = 0; i < 900; i++) {
    dCtx.fillStyle = 'rgba(54, 39, 27, 0.13)';
    dCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 30 + Math.random() * 60);
  }

  // 5. Vermilion Lacquer (丹塗り / 朱塗り — Nio-mon, Sanju-no-to, Sai-mon, Shoro, Jishu Jinja)
  const vermilionCanvas = createCanvas(256, 256);
  const vCtx = vermilionCanvas.getContext('2d');
  vCtx.fillStyle = '#b93621';
  vCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i++) {
    const shade = (Math.random() - 0.5) * 20;
    vCtx.fillStyle = `rgba(${185 + shade}, ${54 + shade * 0.4}, ${33 + shade * 0.3}, 0.25)`;
    vCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 24);
  }

  // 6. Shikkui White Lime Plaster (白漆喰壁)
  const plasterCanvas = createCanvas(256, 256);
  const pCtx = plasterCanvas.getContext('2d');
  pCtx.fillStyle = '#ece6da';
  pCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const g = 224 + Math.floor(Math.random() * 20);
    pCtx.fillStyle = `rgba(${g}, ${g - 5}, ${g - 13}, 0.35)`;
    pCtx.fillRect(Math.random() * 256, Math.random() * 256, 6, 6);
  }

  // 7. Ishigaki Dry-Laid Retaining Wall Stones (石垣)
  const ishigakiCanvas = createCanvas(512, 512);
  const iCtx = ishigakiCanvas.getContext('2d');
  iCtx.fillStyle = '#2d2b28';
  iCtx.fillRect(0, 0, 512, 512);
  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -32;
    while (x < 512) {
      const w = 52 + Math.floor(hash2(x + 13, r) * 44);
      const base = 92 + Math.floor(hash2(x, r * 3.7) * 42);
      const moss = hash2(x * 1.9, r) > 0.72;
      iCtx.fillStyle = moss
        ? `rgb(${base - 10}, ${base + 4}, ${base - 18})`
        : `rgb(${base + 4}, ${base + 1}, ${base - 4})`;
      iCtx.beginPath();
      iCtx.roundRect(x + 3, r * rowH + 3, w - 6, rowH - 6, 7);
      iCtx.fill();
      x += w;
    }
  }

  const ishigakiBump = createCanvas(512, 512);
  const ibCtx = ishigakiBump.getContext('2d');
  ibCtx.fillStyle = '#222222';
  ibCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -32;
    while (x < 512) {
      const w = 52 + Math.floor(hash2(x + 13, r) * 44);
      ibCtx.fillStyle = '#cfcfcf';
      ibCtx.beginPath();
      ibCtx.roundRect(x + 4, r * rowH + 4, w - 8, rowH - 8, 7);
      ibCtx.fill();
      x += w;
    }
  }

  // 8. Ishidatami Granite Flagstone Paving (石畳参道)
  const pavingCanvas = createCanvas(512, 512);
  const pvCtx = pavingCanvas.getContext('2d');
  pvCtx.fillStyle = '#5f5b54';
  pvCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 64) {
      const ox = (y / 32) % 2 === 0 ? 0 : 32;
      const shade = 112 + Math.floor(hash2(x + ox, y) * 32);
      pvCtx.fillStyle = `rgb(${shade}, ${shade - 3}, ${shade - 8})`;
      pvCtx.fillRect(((x + ox) % 512) + 2, y + 2, 60, 28);
    }
  }

  // 9. Polychrome Kumimono Bracket Frieze (極彩色組物)
  const polyCanvas = createCanvas(256, 64);
  const plCtx = polyCanvas.getContext('2d');
  plCtx.fillStyle = '#244d3e';
  plCtx.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 16) {
    plCtx.fillStyle = '#c94429';
    plCtx.fillRect(x + 2, 6, 12, 18);
    plCtx.fillStyle = '#d9b153';
    plCtx.fillRect(x + 4, 28, 8, 12);
    plCtx.fillStyle = '#2d7098';
    plCtx.fillRect(x + 2, 44, 12, 12);
  }

  const hiwadaMap = makeCanvasTexture(hiwadaColor, 4, 4);
  const hiwadaBumpMap = makeCanvasTexture(hiwadaBump, 4, 4, false);
  const kawaraMap = makeCanvasTexture(kawaraColor, 5, 4);
  const kawaraBumpMap = makeCanvasTexture(kawaraBump, 5, 4, false);
  const woodMap = makeCanvasTexture(woodColor, 2, 2);
  const deckMap = makeCanvasTexture(deckColor, 4, 4);
  const vermilionMap = makeCanvasTexture(vermilionCanvas, 2, 2);
  const plasterMap = makeCanvasTexture(plasterCanvas, 2, 2);
  const ishigakiMap = makeCanvasTexture(ishigakiCanvas, 3, 2);
  const ishigakiBumpMap = makeCanvasTexture(ishigakiBump, 3, 2, false);
  const pavingMap = makeCanvasTexture(pavingCanvas, 6, 6);
  const polyMap = makeCanvasTexture(polyCanvas, 6, 1);

  const materials = {
    hiwadabuki: new THREE.MeshStandardMaterial({
      map: hiwadaMap,
      bumpMap: hiwadaBumpMap,
      bumpScale: 0.18,
      color: new THREE.Color(0xffffff),
      roughness: 0.9,
      metalness: 0.03,
    }),
    kawarabuki: new THREE.MeshStandardMaterial({
      map: kawaraMap,
      bumpMap: kawaraBumpMap,
      bumpScale: 0.22,
      color: new THREE.Color(0xffffff),
      roughness: 0.56,
      metalness: 0.24,
    }),
    keyakiDark: new THREE.MeshStandardMaterial({
      map: woodMap,
      bumpMap: woodMap,
      bumpScale: 0.08,
      color: new THREE.Color(0x9a7b63),
      roughness: 0.84,
      metalness: 0.04,
    }),
    keyakiPillar: new THREE.MeshStandardMaterial({
      map: woodMap,
      bumpMap: woodMap,
      bumpScale: 0.1,
      color: new THREE.Color(0xa6866c),
      roughness: 0.8,
      metalness: 0.04,
    }),
    nukiBeam: new THREE.MeshStandardMaterial({
      map: woodMap,
      color: new THREE.Color(0x8c6d54),
      roughness: 0.82,
      metalness: 0.04,
    }),
    hinokiStage: new THREE.MeshStandardMaterial({
      map: deckMap,
      bumpMap: deckMap,
      bumpScale: 0.09,
      color: new THREE.Color(0xd7c1a8),
      roughness: 0.76,
      metalness: 0.03,
    }),
    vermilion: new THREE.MeshStandardMaterial({
      map: vermilionMap,
      bumpMap: woodMap,
      bumpScale: 0.04,
      color: new THREE.Color(0xd9482e),
      roughness: 0.52,
      metalness: 0.08,
    }),
    shikkui: new THREE.MeshStandardMaterial({
      map: plasterMap,
      color: new THREE.Color(0xf5efe4),
      roughness: 0.88,
      metalness: 0.02,
    }),
    ishigaki: new THREE.MeshStandardMaterial({
      map: ishigakiMap,
      bumpMap: ishigakiBumpMap,
      bumpScale: 0.35,
      color: new THREE.Color(0xb8b2a8),
      roughness: 0.92,
      metalness: 0.04,
    }),
    paving: new THREE.MeshStandardMaterial({
      map: pavingMap,
      bumpMap: pavingMap,
      bumpScale: 0.12,
      color: new THREE.Color(0xc2bbb0),
      roughness: 0.86,
      metalness: 0.05,
    }),
    polychrome: new THREE.MeshStandardMaterial({
      map: polyMap,
      roughness: 0.55,
      metalness: 0.14,
    }),
    bronzeSorin: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x9a8252),
      roughness: 0.36,
      metalness: 0.78,
    }),
    goldGiboshi: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xd6ae58),
      roughness: 0.28,
      metalness: 0.86,
    }),
    agedBellBronze: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x465249),
      roughness: 0.46,
      metalness: 0.72,
    }),
    stoneLantern: new THREE.MeshStandardMaterial({
      map: plasterMap,
      color: new THREE.Color(0x9d988e),
      roughness: 0.92,
      metalness: 0.03,
    }),
    lanternGlow: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xfff0d2),
      emissive: new THREE.Color(0xff9d3b),
      emissiveIntensity: 0.45,
      roughness: 0.4,
    }),
    redMosen: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xb4241e),
      roughness: 0.88,
      metalness: 0.02,
    }),
    machiyaWood: new THREE.MeshStandardMaterial({
      map: woodMap,
      color: new THREE.Color(0x523c2d),
      roughness: 0.85,
      metalness: 0.03,
    }),
    xrayGhostRoof: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xd8cbb8),
      transparent: true,
      opacity: 0.16,
      roughness: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    xrayPrimaryPillar: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xe06d3b),
      emissive: new THREE.Color(0x993814),
      emissiveIntensity: 0.42,
      roughness: 0.45,
    }),
    xrayNukiBeam: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xe5b95c),
      emissive: new THREE.Color(0x7a5916),
      emissiveIntensity: 0.35,
      roughness: 0.45,
    }),
  };

  // Seasonal roof/stone snow frosting helper
  function applySeasonMaterialState(season, nightFactor) {
    const isWinter = season === 'winter';
    materials.hiwadabuki.color.setHex(isWinter ? 0xdde4ec : 0xffffff);
    materials.hiwadabuki.roughness = isWinter ? 0.72 : 0.9;
    materials.kawarabuki.color.setHex(isWinter ? 0xd5dde8 : 0xffffff);
    materials.kawarabuki.metalness = isWinter ? 0.06 : 0.24;
    materials.paving.color.setHex(isWinter ? 0xe0e5ec : 0xc2bbb0);
    materials.hinokiStage.color.setHex(isWinter ? 0xe4ddd6 : 0xd7c1a8);

    // Warm lantern glow scales automatically at sunset & night!
    materials.lanternGlow.emissiveIntensity = 0.25 + nightFactor * 2.55;
  }

  return { materials, applySeasonMaterialState };
}
