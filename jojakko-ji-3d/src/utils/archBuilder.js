import * as THREE from 'three';
import {
  getTimberTextures,
  getKawaraTileTextures,
  getKayabukiThatchTextures,
  getHiwadabukiTextures,
  getStoneWallTextures,
  getShikkuiPlasterTexture
} from './textures.js';

// Shared cached materials so draw calls & shader compilations remain lean
let sharedMats = null;

export function getArchitecturalMaterials() {
  if (sharedMats) return sharedMats;

  const hinoki = getTimberTextures('hinoki');
  const sumi = getTimberTextures('sumi');
  const engawa = getTimberTextures('engawa');
  const redwood = getTimberTextures('redwood');
  const kawara = getKawaraTileTextures();
  const kayabuki = getKayabukiThatchTextures();
  const hiwadabuki = getHiwadabukiTextures();
  const stoneWall = getStoneWallTextures(3, 1.5);
  const shikkui = getShikkuiPlasterTexture();

  sharedMats = {
    hinoki: new THREE.MeshStandardMaterial({
      map: hinoki.map,
      bumpMap: hinoki.bumpMap,
      bumpScale: 0.04,
      roughness: 0.82,
      metalness: 0.04
    }),
    sumiTimber: new THREE.MeshStandardMaterial({
      map: sumi.map,
      bumpMap: sumi.bumpMap,
      bumpScale: 0.04,
      roughness: 0.86,
      metalness: 0.05
    }),
    redwood: new THREE.MeshStandardMaterial({
      map: redwood.map,
      bumpMap: redwood.bumpMap,
      bumpScale: 0.035,
      roughness: 0.78,
      metalness: 0.05
    }),
    engawa: new THREE.MeshStandardMaterial({
      map: engawa.map,
      bumpMap: engawa.bumpMap,
      bumpScale: 0.03,
      roughness: 0.68,
      metalness: 0.04
    }),
    kawara: new THREE.MeshStandardMaterial({
      map: kawara.map,
      bumpMap: kawara.bumpMap,
      bumpScale: 0.09,
      roughness: 0.62,
      metalness: 0.18
    }),
    kayabuki: new THREE.MeshStandardMaterial({
      map: kayabuki.map,
      bumpMap: kayabuki.bumpMap,
      bumpScale: 0.16,
      roughness: 0.96,
      metalness: 0.0
    }),
    hiwadabuki: new THREE.MeshStandardMaterial({
      map: hiwadabuki.map,
      bumpMap: hiwadabuki.bumpMap,
      bumpScale: 0.08,
      roughness: 0.88,
      metalness: 0.02
    }),
    stoneWall: new THREE.MeshStandardMaterial({
      map: stoneWall.map,
      bumpMap: stoneWall.bumpMap,
      bumpScale: 0.14,
      roughness: 0.9,
      metalness: 0.02
    }),
    granite: new THREE.MeshStandardMaterial({
      color: 0x8a8b84,
      bumpMap: stoneWall.bumpMap,
      bumpScale: 0.05,
      roughness: 0.86,
      metalness: 0.03
    }),
    mossyGranite: new THREE.MeshStandardMaterial({
      color: 0x6f7865,
      bumpMap: stoneWall.bumpMap,
      bumpScale: 0.06,
      roughness: 0.92,
      metalness: 0.02
    }),
    shikkui: new THREE.MeshStandardMaterial({
      map: shikkui,
      color: 0xf1ece1,
      roughness: 0.88,
      metalness: 0.0
    }),
    kamebara: new THREE.MeshStandardMaterial({
      map: shikkui,
      color: 0xf5f0e6,
      roughness: 0.76,
      metalness: 0.02
    }),
    bronzePatina: new THREE.MeshStandardMaterial({
      color: 0x3b4d44,
      roughness: 0.42,
      metalness: 0.72
    }),
    goldAccent: new THREE.MeshStandardMaterial({
      color: 0xc9a34e,
      roughness: 0.34,
      metalness: 0.82
    }),
    strawWaraji: new THREE.MeshStandardMaterial({
      color: 0xc2a36b,
      roughness: 0.95,
      metalness: 0.0
    }),
    lanternGlow: new THREE.MeshStandardMaterial({
      color: 0xf5ecd8,
      emissive: new THREE.Color(0xffa94d),
      emissiveIntensity: 0.25,
      roughness: 0.6
    }),
    snowCap: new THREE.MeshStandardMaterial({
      color: 0xf4f7fb,
      roughness: 0.85,
      metalness: 0.02
    })
  };

  return sharedMats;
}

/**
 * Builds an authentic curved Japanese roof (入母屋造 Irimoya, 切妻造 Kirizuma, or 宝形造 Hōgyō)
 * with concave Sori curvature and upward-flaring corner eaves (軒反り).
 */
export function createCurvedJapaneseRoof({
  width = 10,
  depth = 8,
  height = 2.8,
  style = 'irimoya', // 'irimoya' | 'kirizuma' | 'hogyo'
  roofType = 'kawara', // 'kawara' | 'kayabuki' | 'hiwadabuki'
  thickness = 0.24,
  sori = 0.28,
  cornerLift = 0.22,
  ridgeRatio = 0.44,
  openCenterRadius = 0
} = {}) {
  const mats = getArchitecturalMaterials();
  const group = new THREE.Group();
  const roofMat =
    roofType === 'kayabuki'
      ? mats.kayabuki
      : roofType === 'hiwadabuki'
      ? mats.hiwadabuki
      : mats.kawara;

  const segX = 28;
  const segZ = 24;
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const ridgeHalf = style === 'hogyo' ? 0 : style === 'kirizuma' ? hw * 0.98 : hw * ridgeRatio;

  function evalRoofY(nx, nz) {
    // nx in [-1, 1] along width (X), nz in [-1, 1] along depth (Z)
    const ax = Math.abs(nx);
    const az = Math.abs(nz);
    let tEdge;
    if (style === 'kirizuma') {
      tEdge = az;
    } else if (style === 'hogyo') {
      tEdge = Math.max(ax, az);
    } else {
      // Irimoya: upper part has a horizontal ridge of half-length ridgeRatio, hips slope outside ridgeRatio
      const hipX = ax <= ridgeRatio ? 0 : (ax - ridgeRatio) / (1 - ridgeRatio);
      tEdge = Math.max(hipX, az);
    }
    tEdge = Math.min(1, Math.max(0, tEdge));
    // Concave catenary-like Sori profile: steep near ridge (tEdge=0), gentle sweep near eave (tEdge=1)
    const base = Math.pow(1 - tEdge, 1 + sori * 1.9) * height;
    // Corner eave upward lift (Nokizori)
    const cornerFactor = Math.pow(ax * az, 1.65);
    return base + cornerFactor * cornerLift;
  }

  // Build top surface + bottom soffit +thick eave rim as a single solid manifold mesh (or paired top/rim)
  const topGeo = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iz = 0; iz <= segZ; iz++) {
    const nz = (iz / segZ) * 2 - 1;
    for (let ix = 0; ix <= segX; ix++) {
      const nx = (ix / segX) * 2 - 1;
      const x = nx * hw;
      const z = nz * hd;
      const y = evalRoofY(nx, nz);
      positions.push(x, y, z);
      uvs.push((nx + 1) * 0.5 * (width / 4), (nz + 1) * 0.5 * (depth / 4));
    }
  }

  const rowStride = segX + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      if (openCenterRadius > 0) {
        const cx = ((ix + 0.5) / segX * 2 - 1) * hw;
        const cz = ((iz + 0.5) / segZ * 2 - 1) * hd;
        if (Math.hypot(cx, cz) < openCenterRadius * 0.85) continue;
      }
      const a = iz * rowStride + ix;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Add thick eave skirt around perimeter (especially dramatic for Kayabuki thatch & Hiwadabuki!)
  const actualThick = roofType === 'kayabuki' ? Math.max(thickness, 0.58) : roofType === 'hiwadabuki' ? Math.max(thickness, 0.34) : thickness;
  const baseVertOffset = positions.length / 3;

  const perimPts = [];
  for (let ix = 0; ix <= segX; ix++) perimPts.push([ix / segX * 2 - 1, 1]);
  for (let iz = segZ; iz >= 0; iz--) perimPts.push([1, iz / segZ * 2 - 1]);
  for (let ix = segX; ix >= 0; ix--) perimPts.push([ix / segX * 2 - 1, -1]);
  for (let iz = 0; iz <= segZ; iz++) perimPts.push([-1, iz / segZ * 2 - 1]);

  perimPts.forEach(([nx, nz], idx) => {
    const x = nx * hw;
    const z = nz * hd;
    const yTop = evalRoofY(nx, nz);
    const inward = roofType === 'kayabuki' ? 0.94 : 0.985;
    positions.push(x, yTop, z);
    uvs.push(idx * 0.12, 1);
    positions.push(x * inward, yTop - actualThick, z * inward);
    uvs.push(idx * 0.12, 0);
  });

  for (let i = 0; i < perimPts.length - 1; i++) {
    const p0 = baseVertOffset + i * 2;
    const p1 = p0 + 1;
    const p2 = p0 + 2;
    const p3 = p0 + 3;
    indices.push(p0, p1, p2, p2, p1, p3);
  }

  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  topGeo.setIndex(indices);
  topGeo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(topGeo, roofMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  roofMesh.userData.isRoof = true;
  group.add(roofMesh);

  // Dark wooden soffit underside
  const soffitGeo = topGeo.clone();
  const soffitMat = mats.hinoki;
  const soffit = new THREE.Mesh(soffitGeo, soffitMat);
  soffit.position.y = -actualThick * 0.85;
  soffit.scale.set(0.96, 0.88, 0.96);
  group.add(soffit);

  // Ridge beam (Ōmune) & Onigawara / Chigimune depending on roofType
  if (style !== 'hogyo' && ridgeHalf > 0.15) {
    const ridgeY = height + 0.08;
    if (roofType === 'kayabuki') {
      // Bamboo & timber押え木 (Osaegi / Kuragake) crowning thatched ridge
      const ridgeLog = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, ridgeHalf * 2 + 0.5, 12),
        mats.hinoki
      );
      ridgeLog.rotation.z = Math.PI * 0.5;
      ridgeLog.position.y = ridgeY + 0.06;
      ridgeLog.castShadow = true;
      group.add(ridgeLog);

      const crossCount = Math.max(3, Math.floor(ridgeHalf * 1.6));
      for (let i = 0; i < crossCount; i++) {
        const rx = -ridgeHalf * 0.85 + (i / (crossCount - 1)) * ridgeHalf * 1.7;
        for (const s of [-1, 1]) {
          const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.95, 6), mats.sumiTimber);
          spar.position.set(rx, ridgeY + 0.08, s * 0.16);
          spar.rotation.x = s * 0.62;
          group.add(spar);
        }
      }
    } else {
      const ridgeMat = roofType === 'hiwadabuki' ? mats.kawara : mats.kawara;
      const ridgeBox = new THREE.Mesh(
        new THREE.BoxGeometry(ridgeHalf * 2 + 0.25, 0.34, 0.36),
        ridgeMat
      );
      ridgeBox.position.y = ridgeY + 0.06;
      ridgeBox.castShadow = true;
      group.add(ridgeBox);

      // Gold/bronze trim cap & Onigawara end tiles
      for (const side of [-1, 1]) {
        const oni = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.54, 0.48), ridgeMat);
        oni.position.set(side * (ridgeHalf + 0.12), ridgeY + 0.16, 0);
        oni.castShadow = true;
        group.add(oni);
      }
    }

    // Irimoya Gable triangles (破風 Hafu + 白漆喰妻壁 + 懸魚 Gegyo)
    if (style === 'irimoya') {
      for (const side of [-1, 1]) {
        const gableX = side * ridgeHalf;
        const gableW = hd * 0.92;
        const gableH = height * 0.56;
        const shape = new THREE.Shape();
        shape.moveTo(-gableW * 0.5, 0);
        shape.lineTo(gableW * 0.5, 0);
        shape.lineTo(0, gableH);
        shape.closePath();

        const tsuma = new THREE.Mesh(new THREE.ShapeGeometry(shape), mats.shikkui);
        tsuma.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        tsuma.position.set(gableX * 0.98, height - gableH - 0.04, 0);
        group.add(tsuma);

        // Gegyo (懸魚) carved wooden gable pendant
        const gegyo = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), mats.goldAccent);
        gegyo.rotation.x = Math.PI;
        gegyo.position.set(gableX * 1.02, height - 0.28, 0);
        group.add(gegyo);
      }
    }
  }

  // Exposed eave rafters (垂木 Taruki) for non-thatched roofs
  if (roofType !== 'kayabuki') {
    const rafterCountX = Math.min(20, Math.max(8, Math.floor(width * 1.8)));
    for (let i = 0; i <= rafterCountX; i++) {
      const nx = (i / rafterCountX) * 2 - 1;
      const x = nx * hw * 0.96;
      const yEave = evalRoofY(nx, 1);
      for (const sz of [-1, 1]) {
        const taruki = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.85), mats.hinoki);
        taruki.position.set(x, yEave - actualThick * 0.55 + 0.08, sz * (hd - 0.36));
        taruki.rotation.x = sz * 0.22;
        group.add(taruki);
      }
    }
  }

  return group;
}

/**
 * Battered mossy Kyoto stone retaining wall / podium (石垣)
 */
export function createStonePodium(width, height, depth, batter = 0.08) {
  const mats = getArchitecturalMaterials();
  const geo = new THREE.BoxGeometry(width, height, depth, 4, 2, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      pos.setX(i, pos.getX(i) * (1 - batter));
      pos.setZ(i, pos.getZ(i) * (1 - batter));
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.stoneWall);
  mesh.position.y = height * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Authentic Kyoto Stone Lantern (春日灯籠 Kasuga-dōrō or 雪見灯籠 Yukimi-dōrō)
 */
export function createStoneLantern(style = 'kasuga', scale = 1.0) {
  const mats = getArchitecturalMaterials();
  const g = new THREE.Group();

  if (style === 'yukimi') {
    // Three/four-legged snow-viewing garden lantern near pond
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6), mats.mossyGranite);
      leg.position.set(Math.cos(a) * 0.24, 0.24, Math.sin(a) * 0.24);
      leg.rotation.z = -Math.cos(a) * 0.28;
      leg.rotation.x = Math.sin(a) * 0.28;
      leg.castShadow = true;
      g.add(leg);
    }
    const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.12, 6), mats.granite);
    chudai.position.y = 0.52;
    g.add(chudai);

    const hibukuro = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 6), mats.lanternGlow);
    hibukuro.position.y = 0.74;
    hibukuro.userData.isLanternCore = true;
    g.add(hibukuro);

    const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.28, 6), mats.mossyGranite);
    kasa.position.y = 1.02;
    kasa.castShadow = true;
    g.add(kasa);

    const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mats.mossyGranite);
    hoju.position.y = 1.2;
    g.add(hoju);
  } else {
    // Tall standing Kasuga temple stone lantern
    const kiso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.24, 6), mats.mossyGranite);
    kiso.position.y = 0.12;
    kiso.castShadow = true;
    g.add(kiso);

    const sao = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.95, 8), mats.granite);
    sao.position.y = 0.7;
    sao.castShadow = true;
    g.add(sao);

    const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.22, 0.16, 6), mats.granite);
    chudai.position.y = 1.24;
    g.add(chudai);

    const hibukuro = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), mats.lanternGlow);
    hibukuro.position.y = 1.48;
    hibukuro.userData.isLanternCore = true;
    g.add(hibukuro);

    // Corner frames of hibukuro
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.06), mats.granite);
        post.position.set(sx * 0.15, 1.48, sz * 0.15);
        g.add(post);
      }
    }

    const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.32, 6), mats.mossyGranite);
    kasa.position.y = 1.82;
    kasa.castShadow = true;
    g.add(kasa);

    const hoju = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), mats.granite);
    hoju.position.y = 2.04;
    g.add(hoju);
  }

  g.scale.setScalar(scale);
  return g;
}

/**
 * Low Kyoto bamboo handrail / Kekkai fence along moss & stone steps
 */
export function createBambooRailSegment(ax, ay, az, bx, by, bz, height = 0.62) {
  const g = new THREE.Group();
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x717d4c,
    roughness: 0.58,
    metalness: 0.04
  });
  const knotMat = new THREE.MeshStandardMaterial({ color: 0x221d18, roughness: 0.9 });

  const start = new THREE.Vector3(ax, ay + height, az);
  const end = new THREE.Vector3(bx, by + height, bz);
  const len = start.distanceTo(end);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, len + 0.15, 8), bambooMat);
  rail.position.copy(mid);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  rail.castShadow = true;
  g.add(rail);

  const posts = Math.max(2, Math.round(len / 2.6) + 1);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    const pz = az + (bz - az) * t;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, height + 0.12, 7), bambooMat);
    post.position.set(px, py + height * 0.5, pz);
    post.castShadow = true;
    g.add(post);

    // Black hemp rope knot (シュロ縄 Shuro-nawa)
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.015, 6, 10), knotMat);
    tie.position.set(px, py + height, pz);
    tie.rotation.x = Math.PI * 0.5;
    g.add(tie);
  }
  return g;
}
