import * as THREE from 'three';
import { fbm2D, ridgeNoise2D, clamp, lerp, smoothBand } from '../utils/noise.js';
import { VALLEY_CONFIG } from '../data/landmarks.js';
import { WEIR_Z_POSITIONS } from '../shaders/waterShaders.js';

// River centerline meanders naturally along the eastern floor of Kibune Valley
export function getRiverCenterX(z) {
  return 17.5 + Math.sin(z * 0.026) * 3.6 + Math.cos(z * 0.012) * 1.8;
}

// River water surface height with stepped mountain weirs flowing North (-Z) -> South (+Z)
export function getRiverWaterY(z) {
  let y = 2.55 - z * 0.029;
  for (let i = 0; i < WEIR_Z_POSITIONS.length; i++) {
    const wz = WEIR_Z_POSITIONS[i];
    // Smooth 0.42m cascade drop across each weir
    const drop = smoothBand(wz - 0.6, wz + 0.9, z) * 0.42;
    y -= drop;
  }
  // Compensate cumulative offset so z=70 sits nicely around +0.25m
  return y + 1.15;
}

// Main Kibune street / pilgrimage path centerline
export function getRoadCenterX(z) {
  if (z < -72) {
    const t = smoothBand(-72, -86, z);
    return lerp(getRiverCenterX(z) - 12.2, -6.0, t);
  }
  return getRiverCenterX(z) - 12.2;
}

export function getRoadY(z) {
  if (z <= -84) {
    // Cedar avenue rising gently from Omoi-gawa (-84, y=6.0) to Okumiya gate (-118, y=6.8)
    const t = clamp((-84 - z) / 34.0, 0, 1);
    return lerp(5.95, VALLEY_CONFIG.okumiyaY, t);
  }
  return 3.6 - z * 0.028;
}

// Helper: distance & progress along a 2D line segment (ax,az)->(bx,bz)
export function projectOntoSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const rawT = ((x - ax) * dx + (z - az) * dz) / lenSq;
  const t = clamp(rawT, 0, 1);
  const px = ax + dx * t;
  const pz = az + dz * t;
  const dist = Math.hypot(x - px, z - pz);
  return { t, rawT, dist, px, pz };
}

export const STAIR_CORRIDORS = {
  omotesando: {
    ax: -1.2,
    az: 70.2,
    ay: getRoadY(70.2),
    bx: -21.5,
    bz: 45.0,
    by: VALLEY_CONFIG.honguY,
    halfWidth: 4.4
  },
  kitasando: {
    ax: 0.8,
    az: -5.5,
    ay: getRoadY(-5.5),
    bx: -19.0,
    bz: 6.8,
    by: VALLEY_CONFIG.honguY,
    halfWidth: 3.1
  },
  yuiSteps: {
    ax: 0.4,
    az: -39.0,
    ay: getRoadY(-39.0),
    bx: -15.8,
    bz: -39.0,
    by: VALLEY_CONFIG.yuiY,
    halfWidth: 3.1
  }
};

function rectInfluence(x, z, xMin, xMax, zMin, zMax, feather = 5.5) {
  const dx = Math.max(xMin - x, 0, x - xMax);
  const dz = Math.max(zMin - z, 0, z - zMax);
  const d = Math.hypot(dx, dz);
  return 1.0 - smoothBand(0, feather, d);
}

export function getTerrainHeight(x, z) {
  const riverX = getRiverCenterX(z);
  const roadX = getRoadCenterX(z);
  const roadY = getRoadY(z);
  const waterY = getRiverWaterY(z);

  // Base mountain valley V-profile: Mt. Kibune (West, steep) & Mt. Kurama (East, lush)
  let h = roadY;
  const nMacro = fbm2D(x * 0.025, z * 0.025, 4);
  const nDetail = fbm2D(x * 0.09 + 11.3, z * 0.09 - 5.7, 3);
  const ridge = ridgeNoise2D(x * 0.03, z * 0.03, 3);

  if (x < roadX - 3.2) {
    // Western slope: Mt. Kibune rises upward
    const distWest = roadX - 3.2 - x;
    h = roadY + Math.pow(distWest, 1.16) * 0.44 + nMacro * 3.2 + ridge * 2.1 + nDetail * 0.55;
  } else if (x > riverX + 4.4) {
    // Eastern slope: Mt. Kurama rises steeply from East riverbank
    const distEast = x - (riverX + 4.4);
    h = waterY + 0.9 + Math.pow(distEast, 1.18) * 0.48 + nMacro * 3.4 + ridge * 2.2 + nDetail * 0.5;
  } else {
    // Valley floor between road and river
    const roadBand = 1.0 - smoothBand(2.4, 5.2, Math.abs(x - roadX));
    h = lerp(waterY + 1.05 + nDetail * 0.25, roadY, roadBand);
  }

  // Carve main Kibune River channel
  const distRiver = Math.abs(x - riverX);
  if (distRiver < 6.4) {
    const channelBlend = 1.0 - smoothBand(3.1, 6.2, distRiver);
    const bedY = waterY - 0.95 + nDetail * 0.22;
    h = lerp(h, bedY, channelBlend);
  }

  // Carve Omoi-gawa tributary stream at z ~ -84 flowing West -> East into Kibune River
  if (x < riverX + 1.0 && z > -91 && z < -77) {
    const streamCenterZ = -84.0 + Math.sin(x * 0.12) * 1.1;
    const dzStream = Math.abs(z - streamCenterZ);
    if (dzStream < 4.2) {
      const streamBlend = 1.0 - smoothBand(1.4, 4.0, dzStream);
      const streamSlopeY = lerp(waterY + 0.15, 7.5, clamp((-x + 5) / 40, 0, 1)) - 1.15;
      h = lerp(h, streamSlopeY, streamBlend);
    }
  }

  // Carve Suzuka-dani small ravine north of Hongu (z ~ +2.0)
  if (x < roadX - 1.5 && z > -3.5 && z < 6.5) {
    const dzRavine = Math.abs(z - 1.4);
    if (dzRavine < 3.5) {
      const ravBlend = (1.0 - smoothBand(1.0, 3.4, dzRavine)) * smoothBand(-24, -6, x);
      h = lerp(h, roadY + 1.2, ravBlend * 0.65);
    }
  }

  // Flatten Plateau A: Hongu Main Precinct (x in [-42, -11.5], z in [6.5, 45.5])
  const honguWeight = rectInfluence(x, z, -41.5, -11.8, 7.0, 45.0, 4.8);
  if (honguWeight > 0.001) {
    h = lerp(h, VALLEY_CONFIG.honguY, honguWeight);
  }
  // Raised inner sanctum for Hongu Honden & Gonden
  const honguInnerWeight = rectInfluence(x, z, -33.8, -20.5, 7.8, 15.6, 1.4);
  if (honguInnerWeight > 0.001) {
    h = lerp(h, VALLEY_CONFIG.honguInnerY, honguInnerWeight);
  }

  // Flatten Plateau B: Yui-no-Yashiro / Nakamiya (x in [-36, -15.5], z in [-49.5, -30.5])
  const yuiWeight = rectInfluence(x, z, -35.5, -15.8, -49.0, -31.0, 4.2);
  if (yuiWeight > 0.001) {
    h = lerp(h, VALLEY_CONFIG.yuiY, yuiWeight);
  }

  // Flatten Plateau C: Okumiya Sacred Courtyard (x in [-23.5, +7.5], z in [-167, -116])
  const okuWeight = rectInfluence(x, z, -23.0, 7.2, -166.5, -116.5, 5.5);
  if (okuWeight > 0.001) {
    h = lerp(h, VALLEY_CONFIG.okumiyaY, okuWeight);
  }
  const okuInnerWeight = rectInfluence(x, z, -10.2, -1.8, -158.5, -148.5, 1.3);
  if (okuInnerWeight > 0.001) {
    h = lerp(h, VALLEY_CONFIG.okumiyaInnerY, okuInnerWeight);
  }

  // Flatten Okumiya Cedar Avenue corridor (x ~ -6, z in [-117, -86])
  if (z >= -117 && z <= -85.8) {
    const aveBlend = 1.0 - smoothBand(2.8, 6.0, Math.abs(x - -6.0));
    if (aveBlend > 0.001) {
      h = lerp(h, getRoadY(z), aveBlend);
    }
  }

  // Carve graded earth beds slightly beneath the 3 staircases so steps sit cleanly on ground
  for (const key of Object.keys(STAIR_CORRIDORS)) {
    const sc = STAIR_CORRIDORS[key];
    const proj = projectOntoSegment(x, z, sc.ax, sc.az, sc.bx, sc.bz);
    if (proj.rawT >= -0.04 && proj.rawT <= 1.04 && proj.dist < sc.halfWidth + 2.8) {
      const w = 1.0 - smoothBand(sc.halfWidth * 0.85, sc.halfWidth + 2.6, proj.dist);
      const stairBedY = lerp(sc.ay, sc.by, proj.t) - 0.24;
      h = lerp(h, stairBedY, w);
    }
  }

  return h;
}

// Walkable surface height for First-Person Pilgrimage Mode (includes stairs, bridges & decks)
export function getWalkableHeight(x, z) {
  let h = getTerrainHeight(x, z);

  // Staircases (exact tread ramp)
  for (const key of Object.keys(STAIR_CORRIDORS)) {
    const sc = STAIR_CORRIDORS[key];
    const proj = projectOntoSegment(x, z, sc.ax, sc.az, sc.bx, sc.bz);
    if (proj.rawT >= -0.02 && proj.rawT <= 1.02 && proj.dist <= sc.halfWidth + 0.35) {
      h = Math.max(h, lerp(sc.ay, sc.by, proj.t));
    }
  }

  // Omoi-gawa Bridge deck at x ~ -6, z ~ -84
  if (Math.abs(x - -6.0) < 2.3 && Math.abs(z - -84.0) < 3.6) {
    const arch = Math.cos(((z - -84.0) / 3.6) * (Math.PI * 0.5)) * 0.28;
    h = Math.max(h, 5.95 + arch);
  }

  // Umemiya Bridge deck at z ~ 98 spanning Kibune River
  const rx98 = getRiverCenterX(98.0);
  if (Math.abs(z - 98.0) < 2.2 && x >= rx98 - 11.5 && x <= rx98 + 5.5) {
    const spanT = (x - (rx98 - 11.5)) / 17.0;
    const arch = Math.sin(clamp(spanT, 0, 1) * Math.PI) * 0.45;
    h = Math.max(h, getRoadY(98.0) + arch);
  }

  // Ryusenkaku overhanging pavilion deck
  if (x >= -14.8 && x <= -7.6 && z >= 25.8 && z <= 33.2) {
    h = Math.max(h, VALLEY_CONFIG.honguY + 0.35);
  }

  // Kawadoko decks over Kibune River
  const kawadokoZList = [52.0, 14.0, -24.0];
  for (const kz of kawadokoZList) {
    const kx = getRiverCenterX(kz);
    if (Math.abs(x - kx) < 4.2 && Math.abs(z - kz) < 4.8) {
      h = Math.max(h, getRiverWaterY(kz) + 0.55);
    }
  }

  return h;
}

export function buildValleyTerrain(riverMat, waterfallMat, sharedMaterials) {
  const group = new THREE.Group();
  group.name = 'KibuneValleyTerrain';

  const width = VALLEY_CONFIG.xMax - VALLEY_CONFIG.xMin; // 158m
  const length = VALLEY_CONFIG.zMax - VALLEY_CONFIG.zMin; // 304m
  const segX = 158;
  const segZ = 260;

  const geo = new THREE.PlaneGeometry(width, length, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const centerOffsetX = (VALLEY_CONFIG.xMax + VALLEY_CONFIG.xMin) * 0.5;
  const centerOffsetZ = (VALLEY_CONFIG.zMax + VALLEY_CONFIG.zMin) * 0.5;
  geo.translate(centerOffsetX, 0, centerOffsetZ);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const baseColors = new Float32Array(pos.count * 3);

  const cForest = new THREE.Color(0x283a24);
  const cMoss = new THREE.Color(0x3a5231);
  const cRoad = new THREE.Color(0x636668);
  const cRiverbed = new THREE.Color(0x273033);
  const cShrineGravel = new THREE.Color(0xbabcb5);
  const cCliff = new THREE.Color(0x4a4d4a);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const riverX = getRiverCenterX(z);
    const roadX = getRoadCenterX(z);
    const n = fbm2D(x * 0.14, z * 0.14, 2) * 0.5 + 0.5;

    tmp.copy(cForest).lerp(cMoss, n * 0.65);

    // Shrine gravel terraces
    const inHongu = x >= -41.5 && x <= -11.6 && z >= 6.8 && z <= 45.2;
    const inYui = x >= -35.5 && x <= -15.8 && z >= -49.0 && z <= -31.0;
    const inOkumiya = x >= -23.0 && x <= 7.2 && z >= -166.5 && z <= -116.5;

    if (inHongu || inYui || inOkumiya) {
      tmp.copy(cShrineGravel).offsetHSL(0, 0, (n - 0.5) * 0.06);
    } else if (Math.abs(x - roadX) < 3.1 && z > -118) {
      tmp.copy(cRoad).offsetHSL(0, 0, (n - 0.5) * 0.05);
    } else if (Math.abs(x - riverX) < 5.0) {
      tmp.copy(cRiverbed);
    } else if (x > -12.5 && x < -6.5 && z > 6 && z < 46) {
      tmp.copy(cCliff);
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;

    baseColors[i * 3] = tmp.r;
    baseColors[i * 3 + 1] = tmp.g;
    baseColors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02
  });

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Build continuous meandering Kibune River ribbon mesh
  const riverSegZ = 280;
  const riverSegX = 12;
  const riverGeo = new THREE.PlaneGeometry(9.2, length, riverSegX, riverSegZ);
  riverGeo.rotateX(-Math.PI / 2);
  riverGeo.translate(0, 0, centerOffsetZ);

  const rPos = riverGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const localX = rPos.getX(i);
    const z = rPos.getZ(i);
    const wx = getRiverCenterX(z) + localX;
    const wy = getRiverWaterY(z);
    rPos.setX(i, wx);
    rPos.setY(i, wy);
  }
  riverGeo.computeVertexNormals();
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.renderOrder = 2;
  group.add(riverMesh);

  // Add white-water cascade curtains + weir stone ledges at each stepped weir
  WEIR_Z_POSITIONS.forEach((wz) => {
    const rx = getRiverCenterX(wz);
    const topY = getRiverWaterY(wz - 1.0);
    const botY = getRiverWaterY(wz + 1.2);
    const dropH = Math.max(0.35, topY - botY + 0.12);

    const cascadeGeo = new THREE.PlaneGeometry(8.2, dropH, 8, 2);
    const cascade = new THREE.Mesh(cascadeGeo, waterfallMat);
    cascade.position.set(rx, (topY + botY) * 0.5, wz + 0.15);
    cascade.rotation.x = -0.35;
    cascade.renderOrder = 3;
    group.add(cascade);

    // Mossy weir rocks across the step
    for (let k = -3.8; k <= 3.8; k += 1.25) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45 + Math.abs(Math.sin(k * 3.1)) * 0.22, 1),
        sharedMaterials.kibuneStone
      );
      rock.scale.set(1.3, 0.55, 0.9);
      rock.position.set(rx + k, topY - 0.12, wz - 0.25 + Math.sin(k * 2) * 0.18);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }
  });

  // Build Omoi-gawa (思ひ川) tributary stream ribbon flowing West -> East at z ~ -84
  const omoiSteps = 32;
  const omoiGeo = new THREE.PlaneGeometry(36, 3.0, omoiSteps, 4);
  omoiGeo.rotateX(-Math.PI / 2);
  const oPos = omoiGeo.attributes.position;
  const rxOmoi = getRiverCenterX(-84);
  for (let i = 0; i < oPos.count; i++) {
    const t = (oPos.getX(i) + 18) / 36; // 0 (West mountain) -> 1 (Kibune River)
    const wx = lerp(-24, rxOmoi - 2.0, t);
    const wz = -84.0 + Math.sin(wx * 0.12) * 1.1 + oPos.getZ(i);
    const wy = lerp(7.1, getRiverWaterY(-84) + 0.08, t);
    oPos.setXYZ(i, wx, wy, wz);
  }
  omoiGeo.computeVertexNormals();
  const omoiMesh = new THREE.Mesh(omoiGeo, riverMat);
  omoiMesh.renderOrder = 2;
  group.add(omoiMesh);

  // Function to tint terrain colors dynamically for Winter Snow or Autumn fallen leaves
  function applySeasonTerrainTint(season) {
    const colAttr = geo.attributes.color;
    const snowCol = new THREE.Color(0xeef3f9);
    const autumnFloor = new THREE.Color(0x5c3620);
    const c = new THREE.Color();

    for (let i = 0; i < colAttr.count; i++) {
      c.setRGB(baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2]);
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const riverX = getRiverCenterX(z);
      const inWater = Math.abs(x - riverX) < 4.5;

      if (season === 'winter' && !inWater) {
        const roadX = getRoadCenterX(z);
        const onRoad = Math.abs(x - roadX) < 2.2;
        c.lerp(snowCol, onRoad ? 0.58 : 0.86);
      } else if (season === 'autumn' && !inWater) {
        const noisePatch = fbm2D(x * 0.22, z * 0.22, 2) * 0.5 + 0.5;
        if (noisePatch > 0.54) {
          c.lerp(autumnFloor, (noisePatch - 0.54) * 0.85);
        }
      }
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
  }

  return { group, terrainMesh, terrainMat, applySeasonTerrainTint };
}
