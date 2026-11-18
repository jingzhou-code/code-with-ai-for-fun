import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (srgb) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

/**
 * 构建欧式三段式立面材质（含漫反射石材/砖石纹理 + 夜晚自习灯火自发光贴图 + 凹凸贴图）
 */
export function createFacadeMaterialSet(renderer) {
  const maxAniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  const tones = {
    limestone: {
      base: '#e6dac4',
      plinth: '#bfb29c',
      joint: 'rgba(120, 102, 78, 0.26)',
      trim: '#f2ead9',
      glassTop: '#314963',
      glassBot: '#526f8c',
      warmRate: 0.72,
    },
    'warm-stone': {
      base: '#dfd0b6',
      plinth: '#b3a38c',
      joint: 'rgba(112, 92, 68, 0.28)',
      trim: '#eee3cf',
      glassTop: '#2f455c',
      glassBot: '#4c6985',
      warmRate: 0.68,
    },
    'red-brick-stone': {
      base: '#b65d49',
      plinth: '#cfc2ad',
      joint: 'rgba(72, 34, 26, 0.28)',
      trim: '#e8dcc8',
      glassTop: '#2b3f54',
      glassBot: '#48647f',
      warmRate: 0.75,
    },
    dormitory: {
      base: '#dfc9ae',
      plinth: '#b96b55',
      joint: 'rgba(110, 82, 62, 0.22)',
      trim: '#f3eadb',
      glassTop: '#33485e',
      glassBot: '#56728d',
      warmRate: 0.82,
    },
  };

  const materials = {};
  const emissiveMaterials = [];

  Object.entries(tones).forEach(([key, cfg]) => {
    const W = 512;
    const H = 512;
    const diffCanvas = makeCanvas(W, H);
    const dCtx = diffCanvas.getContext('2d');

    const emisCanvas = makeCanvas(W, H);
    const eCtx = emisCanvas.getContext('2d');

    const bumpCanvas = makeCanvas(W, H);
    const bCtx = bumpCanvas.getContext('2d');

    // 背景墙体
    dCtx.fillStyle = cfg.base;
    dCtx.fillRect(0, 0, W, H);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, W, H);

    bCtx.fillStyle = '#909090';
    bCtx.fillRect(0, 0, W, H);

    // 底层花岗岩重块基座 (Rusticated Plinth: 底部 22%)
    const plinthTop = Math.floor(H * 0.78);
    dCtx.fillStyle = cfg.plinth;
    dCtx.fillRect(0, plinthTop, W, H - plinthTop);

    // 石材分缝与微噪点质感
    for (let y = 0; y < H; y += 16) {
      dCtx.fillStyle = y >= plinthTop ? 'rgba(65,55,45,0.28)' : cfg.joint;
      dCtx.fillRect(0, y, W, y >= plinthTop ? 2 : 1);
      bCtx.fillStyle = '#606060';
      bCtx.fillRect(0, y, W, 2);
      const offset = ((y / 16) % 2) * 32;
      for (let x = offset; x < W; x += 64) {
        dCtx.fillRect(x, y, 1, 16);
        bCtx.fillRect(x, y, 1, 16);
      }
    }

    // 细微石材颗粒噪点
    for (let i = 0; i < 2200; i++) {
      const nx = (i * 173) % W;
      const ny = (i * 293) % H;
      dCtx.fillStyle = i % 2 === 0 ? 'rgba(255,250,240,0.06)' : 'rgba(60,45,30,0.05)';
      dCtx.fillRect(nx, ny, 3, 3);
    }

    // 古典腰线与檐口线脚 (Cornice & Belt Courses)
    [18, plinthTop - 6].forEach((cy) => {
      dCtx.fillStyle = cfg.trim;
      dCtx.fillRect(0, cy, W, 8);
      dCtx.fillStyle = 'rgba(70,55,40,0.28)';
      dCtx.fillRect(0, cy + 8, W, 3);
      bCtx.fillStyle = '#d8d8d8';
      bCtx.fillRect(0, cy, W, 8);
    });

    // 5层窗户网格（顶层带欧式半圆拱窗，底层拱券窗）
    const cols = 8;
    const rows = 5;
    const cellW = W / cols;
    const rowTop = 34;
    const rowAreaH = H - rowTop - 16;
    const cellH = rowAreaH / rows;

    let seed = key.length * 97 + 31;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * cellW + cellW * 0.5;
        const winW = cellW * 0.48;
        const winH = cellH * (r === rows - 1 ? 0.62 : 0.6);
        const wx = cx - winW * 0.5;
        const wy = rowTop + r * cellH + cellH * 0.2;
        const arched = r === 0 || r === rows - 1;

        // 窗框外石套
        dCtx.fillStyle = cfg.trim;
        dCtx.fillRect(wx - 4, wy - 3, winW + 8, winH + 7);
        if (arched) {
          dCtx.beginPath();
          dCtx.arc(cx, wy + winW * 0.42, winW * 0.5 + 4, Math.PI, 0);
          dCtx.fill();
        }

        // 窗玻璃渐变
        const grad = dCtx.createLinearGradient(0, wy, 0, wy + winH);
        grad.addColorStop(0, cfg.glassTop);
        grad.addColorStop(1, cfg.glassBot);
        dCtx.fillStyle = grad;

        bCtx.fillStyle = '#383838';

        dCtx.beginPath();
        bCtx.beginPath();
        if (arched) {
          const rad = winW * 0.5;
          dCtx.arc(cx, wy + rad, rad, Math.PI, 0);
          dCtx.rect(wx, wy + rad, winW, winH - rad);
          bCtx.arc(cx, wy + rad, rad, Math.PI, 0);
          bCtx.rect(wx, wy + rad, winW, winH - rad);
        } else {
          dCtx.rect(wx, wy, winW, winH);
          bCtx.rect(wx, wy, winW, winH);
        }
        dCtx.fill();
        bCtx.fill();

        // 夜间灯光贴图（区分暖色自习灯与理科实验室冷白光）
        const litRoll = rand();
        if (litRoll < cfg.warmRate) {
          const warmColors = ['#ffdf9a', '#ffd27d', '#fff0c2', '#cfe6ff'];
          const chosen = key === 'red-brick-stone' && litRoll < 0.22
            ? '#cde4ff'
            : warmColors[Math.floor(rand() * 3)];
          eCtx.fillStyle = chosen;
          eCtx.beginPath();
          if (arched) {
            const rad = winW * 0.46;
            eCtx.arc(cx, wy + rad + 1, rad, Math.PI, 0);
            eCtx.rect(wx + 2, wy + rad + 1, winW - 4, winH - rad - 3);
          } else {
            eCtx.rect(wx + 2, wy + 2, winW - 4, winH - 4);
          }
          eCtx.fill();
        }

        // 白色古典十字窗棂 (Mullions)
        dCtx.fillStyle = cfg.trim;
        dCtx.fillRect(cx - 1, wy + 2, 2, winH - 3);
        dCtx.fillRect(wx + 1, wy + winH * 0.48, winW - 2, 2);

        eCtx.fillStyle = '#111111';
        eCtx.fillRect(cx - 1, wy, 2, winH);
        eCtx.fillRect(wx, wy + winH * 0.48, winW, 2);

        // 窗台投影
        dCtx.fillStyle = 'rgba(55,44,34,0.35)';
        dCtx.fillRect(wx - 5, wy + winH + 3, winW + 10, 3);
      }
    }

    const map = finalizeTexture(diffCanvas, 1, 1, true);
    const emissiveMap = finalizeTexture(emisCanvas, 1, 1, true);
    const bumpMap = finalizeTexture(bumpCanvas, 1, 1, false);
    map.anisotropy = maxAniso;
    emissiveMap.anisotropy = maxAniso;

    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.35,
      emissive: new THREE.Color('#ffcf86'),
      emissiveMap,
      emissiveIntensity: 0.0,
      roughness: 0.78,
      metalness: 0.06,
    });

    materials[key] = mat;
    emissiveMaterials.push(mat);
  });

  return { materials, emissiveMaterials };
}

/**
 * 欧式坡屋顶瓦面与古典穹顶纹理集
 */
export function createRoofMaterials() {
  const makeShingle = (baseHex, darkHex, lightHex) => {
    const c = makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = darkHex;
      ctx.fillRect(0, y + 13, 256, 3);
      const shift = ((y / 16) % 2) * 16;
      for (let x = shift; x < 256; x += 32) {
        ctx.fillStyle = (x + y) % 64 === 0 ? lightHex : darkHex;
        ctx.fillRect(x, y, 2, 16);
      }
    }
    const tex = finalizeTexture(c, 4, 2, true);
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.72,
      metalness: 0.12,
    });
  };

  // 肋拱穹顶纹理（用于廖凯原法学楼、李兆基图书馆、行政会议中心）
  const makeDomeMat = (baseHex, ribHex, metal = 0.24) => {
    const c = makeCanvas(512, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = ribHex;
      ctx.fillRect(x, 0, 5, 256);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 5, 0, 3, 256);
    }
    for (let y = 24; y < 256; y += 42) {
      ctx.fillStyle = ribHex;
      ctx.fillRect(0, y, 512, 3);
    }
    const tex = finalizeTexture(c, 1, 1, true);
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.52,
      metalness: metal,
    });
  };

  return {
    slate: makeShingle('#495666', '#333d4a', '#5b6a7c'),
    terracotta: makeShingle('#9d4c3b', '#783527', '#b55f4c'),
    copperDome: makeDomeMat('#4e7d73', '#6da196', 0.28),
    grandStoneDome: makeDomeMat('#cfc1a9', '#e7dbc6', 0.14),
    slateDome: makeDomeMat('#4d5d6e', '#697c90', 0.22),
    arenaSilver: makeDomeMat('#b9c3cc', '#dce3e9', 0.52),
  };
}

/**
 * 地面草坪、花岗岩礼仪广场、道路沥青、400m标准田径场与篮网球场纹理
 */
export function createGroundTextures() {
  // 1. “江湾大草原”自然草地纹理
  const grassC = makeCanvas(512, 512);
  const gCtx = grassC.getContext('2d');
  gCtx.fillStyle = '#4c7c44';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const x = (i * 197) % 512;
    const y = (i * 353) % 512;
    gCtx.fillStyle = i % 3 === 0 ? 'rgba(98,146,74,0.28)' : 'rgba(46,84,42,0.22)';
    gCtx.fillRect(x, y, 4, 4);
  }
  const grassTex = finalizeTexture(grassC, 42, 48, true);

  // 2. 欧式花岗岩礼仪广场铺装
  const plazaC = makeCanvas(256, 256);
  const pCtx = plazaC.getContext('2d');
  pCtx.fillStyle = '#d7cec0';
  pCtx.fillRect(0, 0, 256, 256);
  pCtx.strokeStyle = 'rgba(110,98,84,0.32)';
  pCtx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    pCtx.beginPath();
    pCtx.moveTo(i, 0);
    pCtx.lineTo(i, 256);
    pCtx.moveTo(0, i);
    pCtx.lineTo(256, i);
    pCtx.stroke();
  }
  pCtx.strokeStyle = 'rgba(155,126,88,0.35)';
  pCtx.lineWidth = 4;
  pCtx.strokeRect(16, 16, 224, 224);
  const plazaTex = finalizeTexture(plazaC, 8, 8, true);

  // 3. 标准400米塑胶跑道与条纹绿茵场贴图
  const trackC = makeCanvas(1024, 1536);
  const tCtx = trackC.getContext('2d');
  tCtx.fillStyle = '#c8c3b8';
  tCtx.fillRect(0, 0, 1024, 1536);

  const cx = 512;
  const topCy = 470;
  const botCy = 1066;
  const outerR = 415;
  const innerR = 275;

  const drawStadiumPath = (ctx, r) => {
    ctx.beginPath();
    ctx.arc(cx, topCy, r, Math.PI, 0, false);
    ctx.lineTo(cx + r, botCy);
    ctx.arc(cx, botCy, r, 0, Math.PI, false);
    ctx.closePath();
  };

  // 外圈缓冲区绿地
  tCtx.fillStyle = '#3c7a49';
  drawStadiumPath(tCtx, outerR + 38);
  tCtx.fill();

  // 砖红塑胶跑道
  tCtx.fillStyle = '#b94335';
  drawStadiumPath(tCtx, outerR);
  tCtx.fill();

  // 8条白色分道线
  tCtx.strokeStyle = 'rgba(255,255,255,0.82)';
  tCtx.lineWidth = 2.4;
  for (let i = 0; i <= 8; i++) {
    const r = innerR + ((outerR - innerR) * i) / 8;
    drawStadiumPath(tCtx, r);
    tCtx.stroke();
  }

  // 内场天然草坪足球场 + 深浅割草条纹
  tCtx.save();
  drawStadiumPath(tCtx, innerR - 4);
  tCtx.clip();
  tCtx.fillStyle = '#38803f';
  tCtx.fillRect(0, 0, 1024, 1536);
  for (let y = 200; y < 1340; y += 56) {
    tCtx.fillStyle = 'rgba(110, 185, 95, 0.22)';
    tCtx.fillRect(200, y, 624, 28);
  }
  tCtx.restore();

  // 标准足球场边线、中圈与禁区
  const fw = 420;
  const fh = 680;
  const fx = cx - fw / 2;
  const fy = (topCy + botCy) / 2 - fh / 2;
  tCtx.strokeStyle = '#f5f7f5';
  tCtx.lineWidth = 4;
  tCtx.strokeRect(fx, fy, fw, fh);
  tCtx.beginPath();
  tCtx.moveTo(fx, fy + fh / 2);
  tCtx.lineTo(fx + fw, fy + fh / 2);
  tCtx.stroke();
  tCtx.beginPath();
  tCtx.arc(cx, fy + fh / 2, 62, 0, Math.PI * 2);
  tCtx.stroke();
  // 上下禁区
  tCtx.strokeRect(cx - 125, fy, 250, 105);
  tCtx.strokeRect(cx - 125, fy + fh - 105, 250, 105);

  const stadiumTex = finalizeTexture(trackC, 1, 1, true);
  stadiumTex.wrapS = THREE.ClampToEdgeWrapping;
  stadiumTex.wrapT = THREE.ClampToEdgeWrapping;

  // 4. 篮球/网球标准场地贴图
  const courtC = makeCanvas(512, 256);
  const cCtx = courtC.getContext('2d');
  cCtx.fillStyle = '#2f6f58';
  cCtx.fillRect(0, 0, 512, 256);
  cCtx.fillStyle = '#2d5c88';
  cCtx.fillRect(36, 26, 440, 204);
  cCtx.strokeStyle = '#ffffff';
  cCtx.lineWidth = 4;
  cCtx.strokeRect(36, 26, 440, 204);
  cCtx.beginPath();
  cCtx.moveTo(256, 26);
  cCtx.lineTo(256, 230);
  cCtx.stroke();
  cCtx.beginPath();
  cCtx.arc(256, 128, 32, 0, Math.PI * 2);
  cCtx.stroke();
  // 三分线与三秒区
  cCtx.fillStyle = '#b5493a';
  cCtx.fillRect(36, 92, 76, 72);
  cCtx.fillRect(400, 92, 76, 72);
  cCtx.strokeRect(36, 92, 76, 72);
  cCtx.strokeRect(400, 92, 76, 72);
  cCtx.beginPath();
  cCtx.arc(72, 128, 78, -Math.PI * 0.44, Math.PI * 0.44);
  cCtx.stroke();
  cCtx.beginPath();
  cCtx.arc(440, 128, 78, Math.PI * 0.56, Math.PI * 1.44);
  cCtx.stroke();
  const courtTex = finalizeTexture(courtC, 1, 1, true);

  return { grassTex, plazaTex, stadiumTex, courtTex };
}

/**
 * 生成门楣鎏金匾额或石刻文字贴图（如“復旦大學”、“生命科学学院”）
 */
export function createPlaqueTexture(text, opts = {}) {
  const {
    width = 512,
    height = 128,
    bg = '#dfd2bc',
    fg = '#8b6928',
    border = '#b89b5e',
    font = 'bold 58px "Songti SC", "Noto Serif SC", serif',
  } = opts;
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);
  const tex = finalizeTexture(c, 1, 1, true);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
