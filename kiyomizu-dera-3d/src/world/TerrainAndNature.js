import * as THREE from 'three';
import { getTerrainHeight, TERRACES, RAMPS_AND_PATHS } from './SitePlan.js';

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Check if (x, z) lies inside a cleared building pad or paved road so trees don't grow inside halls!
function isInsideBuildingOrPath(x, z) {
  for (const t of TERRACES) {
    if (Math.abs(x - t.cx) < t.hx + 1.8 && Math.abs(z - t.cz) < t.hz + 1.8) {
      return true;
    }
  }
  // Hondo stage & cliff undercroft clearance
  if (x > 4.5 && x < 43.5 && z > -13.0 && z < 21.0) return true;
  // Okuno-in stage clearance
  if (x > 64.0 && x < 83.0 && z > 9.0 && z < 27.0) return true;
  // Kiyomizu-zaka Machiya street clearance
  if (x > -174 && x < -110 && Math.abs(z - 4.0) < 14.5) return true;
  // Joju-in Moon Pond clearance
  if (x > -30 && x < -6 && z > -73 && z < -42) return true;

  for (const r of RAMPS_AND_PATHS) {
    const abx = r.bx - r.ax;
    const abz = r.bz - r.az;
    const lenSq = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((x - r.ax) * abx + (z - r.az) * abz) / lenSq));
    const px = r.ax + abx * t;
    const pz = r.az + abz * t;
    if (Math.hypot(x - px, z - pz) < r.halfWidth + 2.2) return true;
  }
  return false;
}

export function buildTerrainAndNature(materials) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'OtowaTerrainAndKyotoWorld';

  // =========================================================================
  // 1. SCULPTED OTOWA-SAN & KIN'UN-KEI GORGE TERRAIN MESH (440m x 360m)
  // =========================================================================
  const sizeX = 430;
  const sizeZ = 350;
  const segX = 215;
  const segZ = 175;
  const terrainGeo = new THREE.PlaneGeometry(sizeX, sizeZ, segX, segZ);
  terrainGeo.rotateX(-Math.PI * 0.5);

  const posAttr = terrainGeo.attributes.position;
  const count = posAttr.count;
  const baseColors = new Float32Array(count * 3);
  const winterColors = new Float32Array(count * 3);
  const activeColors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i) - 10; // Center around x = -10 (range [-225, +205])
    const vz = posAttr.getZ(i) + 5; // Range [-170, +180]
    const vy = getTerrainHeight(vx, vz);
    posAttr.setXYZ(i, vx, vy, vz);
  }
  terrainGeo.computeVertexNormals();
  const normAttr = terrainGeo.attributes.normal;

  const colMoss = new THREE.Color(0x3a4a2a);
  const colForestSoil = new THREE.Color(0x463b2d);
  const colCliffRock = new THREE.Color(0x5c574f);
  const colGravel = new THREE.Color(0x8e877b);
  const colSnow = new THREE.Color(0xe5ebf2);
  const tmpC = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const ny = normAttr.getY(i); // 1.0 = flat, < 0.72 = steep cliff slope
    const noise = hash(i * 0.37);

    let onTerrace = false;
    for (const t of TERRACES) {
      if (Math.abs(vx - t.cx) < t.hx && Math.abs(vz - t.cz) < t.hz) {
        onTerrace = true;
        break;
      }
    }

    if (ny < 0.72) {
      tmpC.copy(colCliffRock).lerp(colForestSoil, noise * 0.35);
    } else if (onTerrace) {
      tmpC.copy(colGravel).offsetHSL(0, 0, (noise - 0.5) * 0.05);
    } else {
      tmpC.copy(colMoss).lerp(colForestSoil, noise * 0.48);
    }

    baseColors[i * 3] = tmpC.r;
    baseColors[i * 3 + 1] = tmpC.g;
    baseColors[i * 3 + 2] = tmpC.b;

    // Winter snow color (steep cliffs still show dark rock striations!)
    const snowBlend = ny < 0.68 ? 0.25 : 0.86 - noise * 0.1;
    tmpC.lerp(colSnow, snowBlend);
    winterColors[i * 3] = tmpC.r;
    winterColors[i * 3 + 1] = tmpC.g;
    winterColors[i * 3 + 2] = tmpC.b;

    activeColors[i * 3] = baseColors[i * 3];
    activeColors[i * 3 + 1] = baseColors[i * 3 + 1];
    activeColors[i * 3 + 2] = baseColors[i * 3 + 2];
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(activeColors, 3));
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  worldGroup.add(terrainMesh);

  // =========================================================================
  // 2. PAVED STONE ROADS (石畳), STEPPED GRANITE STAIRS (石段) & ISHIGAKI WALLS
  // =========================================================================
  const stoneworkGroup = new THREE.Group();

  // Build crisp 3D stepped granite stairs & stone-paved paths along RAMPS_AND_PATHS
  for (const r of RAMPS_AND_PATHS) {
    const dx = r.bx - r.ax;
    const dz = r.bz - r.az;
    const horizLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);

    if (r.isStair) {
      const steps = r.steps || 18;
      const stepD = horizLen / steps;
      const stepW = r.halfWidth * 2;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const sx = r.ax + dx * t;
        const sz = r.az + dz * t;
        const sy = r.ay + (r.by - r.ay) * t;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(stepW, 0.42, stepD + 0.14),
          materials.paving
        );
        stepMesh.position.set(sx, sy - 0.05, sz);
        stepMesh.rotation.y = yaw;
        stepMesh.receiveShadow = true;
        stepMesh.castShadow = true;
        stoneworkGroup.add(stepMesh);
      }
      // Stone stair cheek curbs (耳石)
      for (const side of [-1, 1]) {
        const curbLen = Math.hypot(horizLen, r.by - r.ay);
        const pitch = -Math.atan2(r.by - r.ay, horizLen);
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.55, curbLen),
          materials.stoneLantern
        );
        const perpX = Math.cos(yaw) * side * (r.halfWidth + 0.18);
        const perpZ = -Math.sin(yaw) * side * (r.halfWidth + 0.18);
        curb.position.set(
          (r.ax + r.bx) * 0.5 + perpX,
          (r.ay + r.by) * 0.5 + 0.12,
          (r.az + r.bz) * 0.5 + perpZ
        );
        curb.rotation.order = 'YXZ';
        curb.rotation.y = yaw;
        curb.rotation.x = pitch;
        stoneworkGroup.add(curb);
      }
    } else {
      // Gently conforming flagstone paving ribbon
      const segs = Math.max(6, Math.round(horizLen / 3.5));
      const segLen = horizLen / segs;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs;
        const t1 = (s + 1) / segs;
        const tm = (t0 + t1) * 0.5;
        const sx = r.ax + dx * tm;
        const sz = r.az + dz * tm;
        const y0 = getTerrainHeight(r.ax + dx * t0, r.az + dz * t0);
        const y1 = getTerrainHeight(r.ax + dx * t1, r.az + dz * t1);
        const pitch = -Math.atan2(y1 - y0, segLen);

        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(r.halfWidth * 1.9, 0.18, segLen + 0.22),
          materials.paving
        );
        slab.position.set(sx, (y0 + y1) * 0.5 + 0.04, sz);
        slab.rotation.order = 'YXZ';
        slab.rotation.y = yaw;
        slab.rotation.x = pitch;
        slab.receiveShadow = true;
        stoneworkGroup.add(slab);
      }
    }
  }

  // Monumental Temple Dry-Stone Retaining Walls (石垣 Ishigaki) supporting key terraces!
  const retainingWalls = [
    // Nio-mon West & South retaining wall
    { cx: -105.5, cz: -2.0, w: 2.2, h: 5.5, d: 28.0, topY: 10.5 },
    { cx: -96.0, cz: 13.5, w: 20.0, h: 5.5, d: 2.2, topY: 10.5 },
    // Sai-mon & Sanju-no-to dramatic high South stone wall overlooking Kin'un-kei!
    { cx: -82.5, cz: 6.0, w: 2.2, h: 5.2, d: 12.5, topY: 15.2 },
    { cx: -50.0, cz: 19.2, w: 46.0, h: 8.6, d: 2.8, topY: 16.8 },
    // Todoroki-mon & Hondo approach terrace wall
    { cx: -10.0, cz: 9.2, w: 24.0, h: 6.8, d: 2.4, topY: 18.0 },
    // Jishu Jinja retaining wall behind Hondo
    { cx: 24.0, cz: -24.8, w: 28.0, h: 5.4, d: 2.2, topY: 23.5 },
  ];
  for (const rw of retainingWalls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(rw.w, rw.h, rw.d), materials.ishigaki);
    mesh.position.set(rw.cx, rw.topY - rw.h * 0.5 + 0.05, rw.cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    stoneworkGroup.add(mesh);
  }
  worldGroup.add(stoneworkGroup);

  // =========================================================================
  // 3. GPU-INSTANCED HIGASHIYAMA FOREST (2,400+ Maples, Cherries & Cedars!)
  // =========================================================================
  const mapleCoords = [];
  const cedarCoords = [];

  for (let i = 0; i < 6200; i++) {
    const r1 = hash(i * 1.13 + 7.1);
    const r2 = hash(i * 2.47 + 19.3);

    // Concentrate deciduous maples/sakura heavily in Kin'un-kei Gorge, beneath Stage, & around Pagodas!
    let tx, tz;
    if (i < 2400) {
      // Dense Kin'un-kei Gorge & Stage cliffside sea of foliage!
      tx = -105 + r1 * 195;
      tz = 14 + r2 * 76;
    } else {
      // Broader Otowa-san mountainside & northern/southern ridges
      tx = -185 + r1 * 375;
      tz = -155 + r2 * 320;
    }

    if (isInsideBuildingOrPath(tx, tz)) continue;

    const ty = getTerrainHeight(tx, tz);
    // Keep eastern high mountain & far ridges rich with towering Japanese Cedars (北山杉・檜)
    const preferCedar = tx > 78 || tz < -74 || tz > 102 || hash(i * 5.1) > 0.74;
    if (preferCedar && cedarCoords.length < 950) {
      cedarCoords.push({ x: tx, y: ty, z: tz, seed: hash(i * 3.9) });
    } else if (mapleCoords.length < 1550) {
      mapleCoords.push({ x: tx, y: ty, z: tz, seed: hash(i * 4.3) });
    }
  }

  // Instanced Japanese Maples / Sakura Trees (Trunk + Multi-Lobe Organic Crown)
  const mapleCount = mapleCoords.length;
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.28, 3.6, 6);
  trunkGeo.translate(0, 1.8, 0);

  // Layered cloud-like crown merged from 3 spheres in local space
  const crownGeo = createLayeredFoliageCrownGeometry();
  const crownMat = new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0.02,
  });

  const mapleTrunks = new THREE.InstancedMesh(trunkGeo, materials.machiyaWood, mapleCount);
  const mapleCrowns = new THREE.InstancedMesh(crownGeo, crownMat, mapleCount);
  mapleTrunks.castShadow = true;
  mapleCrowns.castShadow = true;
  mapleCrowns.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < mapleCount; i++) {
    const m = mapleCoords[i];
    const s = 0.82 + m.seed * 0.88;
    dummy.position.set(m.x, m.y - 0.25, m.z);
    dummy.rotation.set((m.seed - 0.5) * 0.12, m.seed * Math.PI * 2, 0);
    dummy.scale.set(s, s * (0.9 + (m.seed % 0.3)), s);
    dummy.updateMatrix();
    mapleTrunks.setMatrixAt(i, dummy.matrix);
    mapleCrowns.setMatrixAt(i, dummy.matrix);
  }
  worldGroup.add(mapleTrunks, mapleCrowns);

  // Instanced Japanese Cedars & Hinoki Cypress (杉・檜) on Mt. Otowa slopes
  const cedarCount = cedarCoords.length;
  const cedarTrunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 8.5, 6);
  cedarTrunkGeo.translate(0, 4.25, 0);
  const cedarConeGeo = createCedarCanopyGeometry();
  const cedarMat = new THREE.MeshStandardMaterial({
    roughness: 0.88,
    metalness: 0.02,
  });
  const cedarTrunks = new THREE.InstancedMesh(cedarTrunkGeo, materials.machiyaWood, cedarCount);
  const cedarCrowns = new THREE.InstancedMesh(cedarConeGeo, cedarMat, cedarCount);
  cedarCrowns.castShadow = true;
  cedarCrowns.receiveShadow = true;

  for (let i = 0; i < cedarCount; i++) {
    const c = cedarCoords[i];
    const s = 0.85 + c.seed * 0.95;
    dummy.position.set(c.x, c.y - 0.3, c.z);
    dummy.rotation.set(0, c.seed * Math.PI * 2, 0);
    dummy.scale.set(s, s * (1.0 + c.seed * 0.35), s);
    dummy.updateMatrix();
    cedarTrunks.setMatrixAt(i, dummy.matrix);
    cedarCrowns.setMatrixAt(i, dummy.matrix);
  }
  worldGroup.add(cedarTrunks, cedarCrowns);

  // Seasonal Palette Updater for all 2,500+ trees & terrain!
  const palettes = {
    autumn: [0xb92218, 0xd93f1e, 0xe6781e, 0xe2af2b, 0x9b241c, 0x62732d],
    spring: [0xf7d3de, 0xf2b0c5, 0xfceef3, 0xe89eb8, 0x7da449, 0x618a3d],
    summer: [0x2e6428, 0x3b7831, 0x4b8938, 0x265422, 0x569440, 0x336b2c],
    winter: [0xdde5ee, 0xcbd5e0, 0xeaf0f6, 0x7b7168, 0xd4dde8, 0xbfc9d4],
  };
  const cedarSeasonHex = {
    autumn: [0x1f3f25, 0x274b2c, 0x1a3620],
    spring: [0x264d2b, 0x315d35, 0x204224],
    summer: [0x1d4723, 0x27582d, 0x183c1d],
    winter: [0x9fb0b8, 0xb8c6cf, 0x6f857b],
  };

  function applySeasonToNature(season) {
    const pal = palettes[season] || palettes.autumn;
    const cPal = cedarSeasonHex[season] || cedarSeasonHex.autumn;
    const colorObj = new THREE.Color();

    for (let i = 0; i < mapleCount; i++) {
      const idx = Math.floor(mapleCoords[i].seed * pal.length) % pal.length;
      colorObj.setHex(pal[idx]);
      colorObj.offsetHSL((mapleCoords[i].seed - 0.5) * 0.03, 0, (mapleCoords[i].seed - 0.5) * 0.06);
      mapleCrowns.setColorAt(i, colorObj);
    }
    mapleCrowns.instanceColor.needsUpdate = true;

    for (let i = 0; i < cedarCount; i++) {
      const idx = i % cPal.length;
      colorObj.setHex(cPal[idx]);
      cedarCrowns.setColorAt(i, colorObj);
    }
    cedarCrowns.instanceColor.needsUpdate = true;

    // Update terrain snow vs moss/soil vertex colors
    const src = season === 'winter' ? winterColors : baseColors;
    const colAttr = terrainGeo.attributes.color;
    colAttr.array.set(src);
    colAttr.needsUpdate = true;
  }

  // =========================================================================
  // 4. DISTANT KYOTO BASIN, KAMO RIVER, YASAKA PAGODA, KYOTO TOWER & NISHIYAMA
  // =========================================================================
  const kyotoVista = buildDistantKyotoPanorama(materials);
  worldGroup.add(kyotoVista.group);

  // Apply default Autumn palette immediately
  applySeasonToNature('autumn');

  return {
    group: worldGroup,
    applySeasonToNature,
    setCityNightGlow: kyotoVista.setCityNightGlow,
  };
}

function createLayeredFoliageCrownGeometry() {
  // Build a lush organic multi-puff crown using displaced icosahedron vertices
  const geo = new THREE.IcosahedronGeometry(2.85, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const lump =
      1.0 +
      0.22 * Math.sin(x * 1.7 + y * 1.3) +
      0.18 * Math.cos(z * 1.9 - x * 1.1);
    x *= lump * 1.18;
    z *= lump * 1.18;
    y = y * 0.72 + 4.55;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createCedarCanopyGeometry() {
  const geo = new THREE.ConeGeometry(2.25, 9.6, 7, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const tierRuffle = 1.0 + 0.16 * Math.sin(y * 2.6);
    pos.setXYZ(i, x * tierRuffle, y + 7.6, z * tierRuffle);
  }
  geo.computeVertexNormals();
  return geo;
}

// Distant Kyoto City Grid, Kamo River, Hokan-ji Yasaka Pagoda, Kyoto Tower & Western Mountains!
function buildDistantKyotoPanorama(materials) {
  const g = new THREE.Group();
  g.name = 'KyotoBasinPanorama';

  // Flat Kyoto Basin plain stretching West (x: -980 .. -185)
  const basinGeo = new THREE.PlaneGeometry(820, 1200);
  basinGeo.rotateX(-Math.PI * 0.5);
  const basinMat = new THREE.MeshStandardMaterial({
    color: 0x2c302b,
    roughness: 0.95,
  });
  const basin = new THREE.Mesh(basinGeo, basinMat);
  basin.position.set(-590, -8.5, 0);
  g.add(basin);

  // Shimmering Kamo River (鴨川) running North-South through Kyoto at x = -430
  const kamoGeo = new THREE.PlaneGeometry(24, 1180);
  kamoGeo.rotateX(-Math.PI * 0.5);
  const kamoMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b6378,
    roughness: 0.12,
    metalness: 0.35,
    clearcoat: 0.9,
  });
  const kamoRiver = new THREE.Mesh(kamoGeo, kamoMat);
  kamoRiver.position.set(-430, -8.25, 0);
  kamoRiver.rotation.y = 0.08;
  g.add(kamoRiver);

  // Instanced Kyoto City Blocks (glowing softly at dusk & night!)
  const cityCount = 950;
  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  bldgGeo.translate(0, 0.5, 0);
  const cityMat = new THREE.MeshStandardMaterial({
    color: 0x454340,
    emissive: new THREE.Color(0xffb45a),
    emissiveIntensity: 0.0,
    roughness: 0.85,
  });
  const cityInst = new THREE.InstancedMesh(bldgGeo, cityMat, cityCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < cityCount; i++) {
    const cx = -225 - hash(i * 1.91) * 580;
    if (Math.abs(cx - -430) < 20) continue; // Keep Kamo River clear
    const cz = -460 + hash(i * 3.17) * 920;
    const bw = 7 + hash(i * 5.3) * 14;
    const bd = 7 + hash(i * 7.1) * 14;
    const bh = cx > -360 ? 4 + hash(i * 2.3) * 7 : 6 + hash(i * 2.3) * 19;
    dummy.position.set(cx, -8.5, cz);
    dummy.scale.set(bw, bh, bd);
    dummy.updateMatrix();
    cityInst.setMatrixAt(i, dummy.matrix);
  }
  g.add(cityInst);

  // Nearby Higashiyama Landmark: Hokan-ji Five-Storied Yasaka Pagoda (八坂の塔) to the Northwest!
  const yasakaGroup = new THREE.Group();
  yasakaGroup.position.set(-255, -2.0, -135);
  for (let t = 0; t < 5; t++) {
    const w = 6.2 * (1 - t * 0.1);
    const tier = new THREE.Mesh(new THREE.ConeGeometry(w * 0.95, 2.8, 4), materials.kawarabuki);
    tier.rotation.y = Math.PI * 0.25;
    tier.position.y = 4.0 + t * 4.4;
    yasakaGroup.add(tier);
  }
  const yasakaSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 7.5, 8), materials.bronzeSorin);
  yasakaSpire.position.y = 28.5;
  yasakaGroup.add(yasakaSpire);
  g.add(yasakaGroup);

  // Iconic Kyoto Tower (京都タワー) rising in the West-Southwest toward Kyoto Station!
  const kyotoTower = new THREE.Group();
  kyotoTower.position.set(-565, -8.5, 95);
  const towerBaseBldg = new THREE.Mesh(new THREE.BoxGeometry(28, 18, 22), cityMat);
  towerBaseBldg.position.y = 9;
  const whiteShaftMat = new THREE.MeshStandardMaterial({
    color: 0xf5f2eb,
    emissive: new THREE.Color(0xfff1dc),
    emissiveIntensity: 0.15,
    roughness: 0.4,
  });
  const redSpireMat = new THREE.MeshStandardMaterial({
    color: 0xd43828,
    emissive: new THREE.Color(0xff472e),
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.4, 42, 16), whiteShaftMat);
  shaft.position.y = 39;
  const obsDeck = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 3.8, 7.5, 18), whiteShaftMat);
  obsDeck.position.y = 62;
  const redSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.8, 26, 12), redSpireMat);
  redSpire.position.y = 78;
  kyotoTower.add(towerBaseBldg, shaft, obsDeck, redSpire);
  g.add(kyotoTower);

  // Far Western Nishiyama & Arashiyama Mountain Range (西山・愛宕山連峰) framing the sunset!
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x333c4a,
    roughness: 0.98,
  });
  for (let m = 0; m < 16; m++) {
    const mz = -560 + m * 76;
    const mh = 58 + hash(m * 9.7) * 54;
    const mr = 95 + hash(m * 4.1) * 55;
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mountainMat);
    ridge.scale.set(0.85, 1, 1.65);
    ridge.position.set(-920 - (m % 2) * 55, -10 + mh * 0.45, mz);
    g.add(ridge);
  }

  function setCityNightGlow(nightFactor) {
    cityMat.emissiveIntensity = nightFactor * 0.55;
    whiteShaftMat.emissiveIntensity = 0.12 + nightFactor * 1.15;
    redSpireMat.emissiveIntensity = 0.2 + nightFactor * 1.4;
  }

  return { group: g, setCityNightGlow };
}
