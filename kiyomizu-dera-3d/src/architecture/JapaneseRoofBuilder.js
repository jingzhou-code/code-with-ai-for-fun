import * as THREE from 'three';

// Build a curved Japanese hipped (Yosemune 寄棟造), hip-and-gable (Irimoya 入母屋造),
// gabled (Kirizuma 切妻造), or square pagoda tier (Hogyo 宝形造) roof with authentic eave sori & corner upturn.
export function createCurvedJapaneseRoof({
  width = 12,
  depth = 10,
  height = 4.2,
  overhang = 1.6,
  style = 'irimoya', // 'yosemune' | 'irimoya' | 'kirizuma' | 'pagoda'
  ridgeAxis = 'x', // 'x' (ridge runs East-West) or 'z' (ridge runs North-South, e.g. Tsumairi wings)
  roofMaterial,
  trimMaterial,
  gableMaterial,
  ornamentMaterial,
  thickness = 0.34,
  soriStrength = 0.22,
  cornerLift = 0.38,
}) {
  const group = new THREE.Group();

  const spanMajor = (ridgeAxis === 'x' ? width : depth) + overhang * 2;
  const spanMinor = (ridgeAxis === 'x' ? depth : width) + overhang * 2;
  const halfMaj = spanMajor * 0.5;
  const halfMin = spanMinor * 0.5;

  let ridgeRatio = 0.44;
  if (style === 'kirizuma') ridgeRatio = 1.0;
  else if (style === 'pagoda') ridgeRatio = 0.0;
  else if (style === 'irimoya') ridgeRatio = 0.48;
  else if (style === 'yosemune') ridgeRatio = 0.42;

  const ridgeHalf = halfMaj * ridgeRatio;

  const segMaj = 28;
  const segMin = 24;

  function roofSurfaceY(uMaj, uMin) {
    // uMaj in [-halfMaj, halfMaj], uMin in [-halfMin, halfMin]
    const absMin = Math.abs(uMin) / halfMin; // 0 at ridge center -> 1 at minor eave
    let absMaj = 0;
    if (style !== 'kirizuma') {
      const denom = Math.max(0.001, halfMaj - ridgeHalf);
      absMaj = Math.max(0, (Math.abs(uMaj) - ridgeHalf) / denom);
    }
    const d = style === 'kirizuma' ? absMin : Math.max(absMin, absMaj);
    // Classical concave catenary curve (照り / 反り)
    const sag = Math.pow(1 - d, 1.48);
    let y = sag * height;
    // Subtle belly curve & upturned corners (隅反り)
    const cornerFactor = Math.pow(absMin * (Math.abs(uMaj) / halfMaj), 2.1);
    y += cornerFactor * cornerLift;
    y -= Math.sin(d * Math.PI) * soriStrength * height * 0.32;
    return y;
  }

  // Create top roof shell + underside soffit shell + perimeter eave fascia (軒付)
  const positions = [];
  const uvs = [];
  const indices = [];

  const cols = segMaj + 1;
  const rows = segMin + 1;

  // Top vertices: 0 .. cols*rows - 1
  for (let j = 0; j <= segMin; j++) {
    const v = j / segMin;
    const uMin = -halfMin + v * spanMinor;
    for (let i = 0; i <= segMaj; i++) {
      const u = i / segMaj;
      const uMaj = -halfMaj + u * spanMajor;
      const y = roofSurfaceY(uMaj, uMin);
      const wx = ridgeAxis === 'x' ? uMaj : uMin;
      const wz = ridgeAxis === 'x' ? uMin : uMaj;
      positions.push(wx, y, wz);
      uvs.push(u * (spanMajor / 6), v * (spanMinor / 6));
    }
  }

  // Bottom vertices: offset by cols*rows
  const bottomOffset = cols * rows;
  for (let j = 0; j <= segMin; j++) {
    const v = j / segMin;
    const uMin = -halfMin + v * spanMinor;
    for (let i = 0; i <= segMaj; i++) {
      const u = i / segMaj;
      const uMaj = -halfMaj + u * spanMajor;
      const y = roofSurfaceY(uMaj, uMin) - thickness;
      const wx = ridgeAxis === 'x' ? uMaj : uMin;
      const wz = ridgeAxis === 'x' ? uMin : uMaj;
      positions.push(wx, y, wz);
      uvs.push(u * (spanMajor / 6), v * (spanMinor / 6));
    }
  }

  for (let j = 0; j < segMin; j++) {
    for (let i = 0; i < segMaj; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Top surface
      indices.push(a, c, b, b, c, d);
      // Underside surface
      indices.push(
        bottomOffset + a,
        bottomOffset + b,
        bottomOffset + c,
        bottomOffset + b,
        bottomOffset + d,
        bottomOffset + c
      );
    }
  }

  // Stitch outer perimeter fascia (軒付厚)
  const addQuad = (t0, t1, b0, b1) => {
    indices.push(t0, b0, t1, t1, b0, b1);
  };
  for (let i = 0; i < segMaj; i++) {
    // j = 0 edge
    addQuad(i + 1, i, bottomOffset + i + 1, bottomOffset + i);
    // j = segMin edge
    const r = segMin * cols;
    addQuad(r + i, r + i + 1, bottomOffset + r + i, bottomOffset + r + i + 1);
  }
  for (let j = 0; j < segMin; j++) {
    // i = 0 edge
    const a = j * cols;
    const b = (j + 1) * cols;
    addQuad(a, b, bottomOffset + a, bottomOffset + b);
    // i = segMaj edge
    const c = j * cols + segMaj;
    const d = (j + 1) * cols + segMaj;
    addQuad(d, c, bottomOffset + d, bottomOffset + c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(geo, roofMaterial);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  roofMesh.userData.isRoofShell = true;
  group.add(roofMesh);

  // Main Ridge (大棟 Omune) + Onigawara / Shibi finials
  const tMat = trimMaterial || roofMaterial;
  if (ridgeHalf > 0.15) {
    const ridgeLen = ridgeHalf * 2 + 0.35;
    const ridgeGeo =
      ridgeAxis === 'x'
        ? new THREE.BoxGeometry(ridgeLen, 0.42, 0.46)
        : new THREE.BoxGeometry(0.46, 0.42, ridgeLen);
    const ridgeMesh = new THREE.Mesh(ridgeGeo, tMat);
    ridgeMesh.position.y = height + 0.14;
    ridgeMesh.castShadow = true;
    ridgeMesh.userData.isRoofShell = true;
    group.add(ridgeMesh);

    // Ridge end finials (鬼瓦 / 獅子口)
    for (const sign of [-1, 1]) {
      const oni = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.58), ornamentMaterial || tMat);
      if (ridgeAxis === 'x') oni.position.set(sign * (ridgeHalf + 0.12), height + 0.28, 0);
      else oni.position.set(0, height + 0.28, sign * (ridgeHalf + 0.12));
      oni.castShadow = true;
      oni.userData.isRoofShell = true;
      group.add(oni);
    }
  }

  // Descending Hip Ridges (隅棟 Sumimune)
  if (style !== 'kirizuma') {
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [sx, sz] of corners) {
      const startMaj = sx * ridgeHalf;
      const startVec =
        ridgeAxis === 'x'
          ? new THREE.Vector3(startMaj, height + 0.06, 0)
          : new THREE.Vector3(0, height + 0.06, startMaj);
      const endY = roofSurfaceY(sx * halfMaj, sz * halfMin) + 0.06;
      const endVec =
        ridgeAxis === 'x'
          ? new THREE.Vector3(sx * halfMaj, endY, sz * halfMin)
          : new THREE.Vector3(sz * halfMin, endY, sx * halfMaj);

      const curveMid = startVec.clone().lerp(endVec, 0.55);
      curveMid.y -= height * 0.12;
      const hipCurve = new THREE.QuadraticBezierCurve3(startVec, curveMid, endVec);
      const hipGeo = new THREE.TubeGeometry(hipCurve, 12, 0.13, 6, false);
      const hipMesh = new THREE.Mesh(hipGeo, tMat);
      hipMesh.castShadow = true;
      hipMesh.userData.isRoofShell = true;
      group.add(hipMesh);
    }
  }

  // Triangular Irimoya / Kirizuma Gable Walls (妻壁 + 懸魚 Gegyo)
  if ((style === 'irimoya' || style === 'kirizuma') && gableMaterial) {
    const gableBaseHalf = style === 'kirizuma' ? halfMin * 0.84 : halfMin * 0.46;
    const gableBottomY = style === 'kirizuma' ? 0.0 : height * 0.44;
    const gablePosMaj = style === 'kirizuma' ? halfMaj - overhang * 0.72 : ridgeHalf;

    for (const sign of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(-gableBaseHalf, gableBottomY);
      shape.lineTo(gableBaseHalf, gableBottomY);
      shape.lineTo(0, height - 0.05);
      shape.closePath();

      const gGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false });
      const gMesh = new THREE.Mesh(gGeo, gableMaterial);
      if (ridgeAxis === 'x') {
        gMesh.rotation.y = Math.PI * 0.5;
        gMesh.position.set(sign * gablePosMaj - 0.09, 0, 0);
      } else {
        gMesh.position.set(0, 0, sign * gablePosMaj - 0.09);
      }
      gMesh.userData.isRoofShell = true;
      group.add(gMesh);

      // Gegyo (懸魚) carved pendant under gable apex
      const gegyo = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.56, 4),
        ornamentMaterial || tMat
      );
      gegyo.rotation.x = Math.PI;
      if (ridgeAxis === 'x') {
        gegyo.position.set(sign * (gablePosMaj + 0.14), height - 0.45, 0);
      } else {
        gegyo.position.set(0, height - 0.45, sign * (gablePosMaj + 0.14));
      }
      gegyo.userData.isRoofShell = true;
      group.add(gegyo);
    }
  }

  return group;
}

// Undulating Karahafu (軒唐破風) curved entrance canopy for Sai-mon, Zuigu-do, Hondo Kuramayose
export function createKarahafuCanopy({ width = 4.4, depth = 2.6, height = 1.35, roofMaterial, trimMaterial }) {
  const group = new THREE.Group();
  const segX = 20;
  const segZ = 8;
  const positions = [];
  const uvs = [];
  const indices = [];

  const profileY = (nx) => {
    // Classic convex center arch curving into concave upturned wingtips
    const bell = Math.cos(nx * Math.PI * 0.85);
    const flare = Math.pow(Math.abs(nx), 2.4) * 0.36;
    return Math.max(0, bell) * height + flare * height;
  };

  for (let j = 0; j <= segZ; j++) {
    const vz = j / segZ;
    const z = -depth * 0.5 + vz * depth;
    for (let i = 0; i <= segX; i++) {
      const ux = i / segX;
      const nx = ux * 2 - 1;
      const x = nx * width * 0.5;
      const y = profileY(nx);
      positions.push(x, y, z);
      uvs.push(ux * 2, vz * 1.5);
    }
  }
  const cols = segX + 1;
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = roofMaterial.clone();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  group.add(mesh);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.42, 8), trimMaterial || roofMaterial);
  finial.position.set(0, height + 0.18, depth * 0.46);
  group.add(finial);

  return group;
}

// Traditional Temple Balustrade (高欄 Koran + 擬宝珠 Giboshi bronze finials)
export function createKoranBalustrade({
  length = 10,
  height = 0.96,
  postSpacing = 2.2,
  woodMaterial,
  giboshiMaterial,
}) {
  const group = new THREE.Group();
  const half = length * 0.5;

  // Base sill (地覆), middle rail (平桁), top rounded handrail (架木)
  const rails = [
    { y: 0.1, h: 0.1, w: 0.12 },
    { y: height * 0.52, h: 0.07, w: 0.09 },
    { y: height * 0.92, h: 0.1, w: 0.13 },
  ];
  for (const r of rails) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.24, r.h, r.w), woodMaterial);
    rail.position.y = r.y;
    rail.castShadow = true;
    group.add(rail);
  }

  const count = Math.max(2, Math.round(length / postSpacing) + 1);
  for (let i = 0; i < count; i++) {
    const x = -half + (i / (count - 1)) * length;
    const isEnd = i === 0 || i === count - 1;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(isEnd ? 0.075 : 0.055, isEnd ? 0.075 : 0.055, height, 10),
      woodMaterial
    );
    post.position.set(x, height * 0.5, 0);
    post.castShadow = true;
    group.add(post);

    // Bronze Giboshi (擬宝珠) lotus-bud cap on end & major posts
    if (isEnd || i % 2 === 0) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), giboshiMaterial);
      cap.scale.set(1, 1.35, 1);
      cap.position.set(x, height + 0.09, 0);
      group.add(cap);
    }
  }
  return group;
}

// Stone Lantern (春日型石灯籠 Toro — automatically glows warm amber at night)
export function createStoneLantern(materials, scale = 1.0) {
  const g = new THREE.Group();
  const sMat = materials.stoneLantern;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.28, 6), sMat);
  base.position.y = 0.14;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 1.15, 8), sMat);
  shaft.position.y = 0.85;
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.2, 6), sMat);
  platform.position.y = 1.5;

  // Glowing firebox (火袋)
  const fireBox = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 6), materials.lanternGlow);
  fireBox.position.y = 1.81;

  // Pagoda cap roof (笠) +宝珠
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.36, 6), sMat);
  roof.position.y = 2.18;
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), sMat);
  jewel.position.y = 2.42;

  g.add(base, shaft, platform, fireBox, roof, jewel);
  g.traverse((o) => {
    if (o.isMesh && o !== fireBox) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.scale.setScalar(scale);
  return g;
}

// Framed Temple Calligraphy Plaque (扁額 Hengaku)
export function createCalligraphyPlaque(text, width = 1.8, height = 0.85) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1815';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#c8a24e';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 112);

  ctx.fillStyle = '#e5c16c';
  ctx.font = 'bold 58px "Noto Serif JP", "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.25 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.1), mat);
  return mesh;
}

// Battered Trapezoidal Ishigaki Stone Retaining Platform (石垣基壇)
export function createIshigakiPlatform(topW, topD, height, material, batter = 0.18) {
  const bottomW = topW + height * batter * 2;
  const bottomD = topD + height * batter * 2;
  const geo = new THREE.BufferGeometry();
  const hwT = topW * 0.5;
  const hdT = topD * 0.5;
  const hwB = bottomW * 0.5;
  const hdB = bottomD * 0.5;

  const v = [
    // Top
    -hwT, height, -hdT,  hwT, height, -hdT,  hwT, height, hdT, -hwT, height, hdT,
    // Bottom
    -hwB, 0, -hdB,       hwB, 0, -hdB,       hwB, 0, hdB,      -hwB, 0, hdB,
  ];
  // Build separate face quads for clean normals and stone UV tiling
  const positions = [];
  const uvs = [];
  const addFace = (p0, p1, p2, p3, uScale, vScale) => {
    positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    uvs.push(0, vScale, uScale, vScale, uScale, 0, 0, vScale, uScale, 0, 0, 0);
  };
  const P = (idx) => [v[idx * 3], v[idx * 3 + 1], v[idx * 3 + 2]];

  addFace(P(0), P(3), P(2), P(1), topW / 6, topD / 6); // Top
  addFace(P(3), P(7), P(6), P(2), topW / 5, height / 4); // South (+Z)
  addFace(P(1), P(5), P(4), P(0), topW / 5, height / 4); // North (-Z)
  addFace(P(2), P(6), P(5), P(1), topD / 5, height / 4); // East (+X)
  addFace(P(0), P(4), P(7), P(3), topD / 5, height / 4); // West (-X)

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
