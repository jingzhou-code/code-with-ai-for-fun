import * as THREE from 'three';
import { fbm2D, smoothstep, clamp, distToSegment2D, createSeededRandom } from '../utils/noise.js';
import { getArchitecturalMaterials, createBambooRailSegment } from '../utils/archBuilder.js';

export const PLATFORMS = [
  { id: 'sanmonCourt', cx: 67.0, cz: 0.0, rx: 11.5, rz: 14.0, y: 0.0, blend: 5.5 },
  { id: 'sakuraCourt', cx: 50.5, cz: 6.5, rx: 6.2, rz: 6.0, y: 1.15, blend: 4.0 },
  { id: 'teikaMound', cx: 45.5, cz: -6.5, rx: 3.4, rz: 3.4, y: 1.85, blend: 3.2 },
  { id: 'niomonTerrace', cx: 36.0, cz: 0.0, rx: 5.0, rz: 5.8, y: 2.5, blend: 3.8 },
  { id: 'hondoTerrace', cx: -2.2, cz: 1.5, rx: 9.8, rz: 11.8, y: 11.0, blend: 4.5 },
  { id: 'myokendoTerrace', cx: -2.5, cz: 18.5, rx: 9.2, rz: 5.6, y: 11.4, blend: 4.0 },
  { id: 'pondTerrace', cx: -3.8, cz: -17.0, rx: 9.2, rz: 8.6, y: 11.0, blend: 4.2 },
  { id: 'shoinTerrace', cx: -2.0, cz: -26.0, rx: 4.8, rz: 4.4, y: 11.0, blend: 3.5 },
  { id: 'kuriTerrace', cx: 10.2, cz: -26.2, rx: 6.2, rz: 5.8, y: 9.2, blend: 4.2 },
  { id: 'kaisandoTerrace', cx: -18.5, cz: -19.5, rx: 5.2, rz: 5.0, y: 14.8, blend: 4.0 },
  { id: 'tahotoTerrace', cx: -32.0, cz: 4.0, rx: 6.8, rz: 6.8, y: 19.5, blend: 4.5 },
  { id: 'shigureTerrace', cx: -31.2, cz: 21.8, rx: 5.8, rz: 7.2, y: 21.0, blend: 4.2 },
  { id: 'observatoryTerrace', cx: -47.0, cz: -1.0, rx: 5.0, rz: 6.2, y: 26.5, blend: 4.5 }
];

export const PATH_SEGMENTS = [
  // Outer road -> Sanmon
  { ax: 82.0, ay: -0.2, az: 0.0, bx: 64.0, by: 0.0, bz: 0.0, w: 3.8, stair: false },
  // Sanmon -> Niomon gentle flagstone path
  { ax: 64.0, ay: 0.0, az: 0.0, bx: 40.5, by: 2.5, bz: 0.0, w: 3.2, stair: false },
  // Branch to Reception & Exhibition/Weeping Cherry
  { ax: 58.0, ay: 0.45, az: 0.0, bx: 52.0, by: 1.15, bz: 5.8, w: 2.0, stair: false },
  // Iconic Niomon Steep Stone Staircase (44 steps)
  { ax: 31.5, ay: 2.5, az: 0.0, bx: 6.8, by: 11.0, bz: 0.0, w: 3.0, stair: true, steps: 44 },
  // Gentle north return path (Onna-zaka -> Kuri -> Pond)
  { ax: 43.0, ay: 2.1, az: -1.5, bx: 24.0, by: 6.2, bz: -16.5, w: 2.1, stair: false },
  { ax: 24.0, ay: 6.2, az: -16.5, bx: 11.5, by: 9.2, bz: -21.0, w: 2.1, stair: false },
  { ax: 10.5, ay: 9.2, az: -19.5, bx: 4.2, by: 11.0, bz: -11.5, w: 2.0, stair: true, steps: 10 },
  // Hondo plaza -> Shoro & Myoken-do Torii
  { ax: 4.8, ay: 11.0, az: 2.0, bx: 4.8, by: 11.4, bz: 18.5, w: 2.5, stair: false },
  { ax: 5.5, ay: 11.4, az: 18.5, bx: -2.0, by: 11.4, bz: 18.5, w: 2.6, stair: false },
  // Pond garden -> Kaisando steps
  { ax: -9.5, ay: 11.0, az: -14.0, bx: -14.8, by: 14.8, bz: -18.5, w: 1.9, stair: true, steps: 16 },
  // Hondo/Myoken-do -> Tahoto lower & upper flights
  { ax: -9.5, ay: 11.2, az: 9.8, bx: -18.5, by: 15.2, bz: 9.2, w: 2.3, stair: true, steps: 18 },
  { ax: -18.5, ay: 15.2, az: 9.2, bx: -26.2, by: 19.5, bz: 5.0, w: 2.3, stair: true, steps: 18 },
  // Tahoto -> Kasenshi & Shigure-tei moss trail
  { ax: -28.5, ay: 19.5, az: 9.2, bx: -28.8, by: 21.0, bz: 18.5, w: 1.9, stair: true, steps: 8 },
  { ax: -28.8, ay: 21.0, az: 18.5, bx: -28.8, by: 21.0, bz: 25.5, w: 1.9, stair: false },
  // Tahoto -> Summit Observation Deck steps
  { ax: -35.2, ay: 19.5, az: -0.2, bx: -42.8, by: 26.5, bz: -1.0, w: 2.1, stair: true, steps: 26 }
];

export const POND_SPEC = {
  cx: -4.2,
  cz: -15.5,
  rx: 5.4,
  rz: 3.9,
  waterY: 10.72,
  bedY: 10.02
};

function evalNaturalOguraSlope(x, z) {
  // East (+X > 64) opens onto the gentle Sagano plain; West (-X < 64) climbs Mount Ogura
  let h = 0;
  if (x >= 64) {
    const dx = x - 64;
    h = -smoothstep(0, 55, dx) * 2.4;
  } else {
    const climb = 64 - x; // 0 at Sanmon, 100 at x=-36, 155 at x=-91
    // Carefully calibrated curve matching real Jōjakkō-ji elevations:
    // climb=28 (Niomon x=36) -> ~2.6m
    // climb=66 (Hondo x=-2) -> ~11.0m
    // climb=96 (Tahoto x=-32) -> ~19.5m
    // climb=111 (Observatory x=-47) -> ~26.5m
    h = Math.pow(climb / 24.0, 1.52) * 3.1;
  }

  // Natural enveloping valley shoulders on far North & South flanks ("塀のない寺" cradled by Mt. Ogura)
  const flankDist = Math.max(0, Math.abs(z) - 28);
  h += Math.pow(flankDist / 16, 1.35) * 1.9 * smoothstep(78, 35, x);

  // Subtle organic mountain undulation
  const n1 = fbm2D(x * 0.022 + 3.1, z * 0.022 - 1.7, 4) * 2.6;
  const n2 = fbm2D(x * 0.08 - 5.4, z * 0.08 + 2.3, 3) * 0.55;
  const plainDamp = smoothstep(84, 52, x);
  return h + (n1 + n2) * plainDamp;
}

export function getPathInfluence(x, z) {
  let bestWeight = 0;
  let blendedY = 0;
  let weightSum = 0;
  let onStair = false;

  for (let i = 0; i < PATH_SEGMENTS.length; i++) {
    const seg = PATH_SEGMENTS[i];
    const { dist, t } = distToSegment2D(x, z, seg.ax, seg.az, seg.bx, seg.bz);
    const halfW = seg.w * 0.5;
    if (dist < halfW + 2.4) {
      const w = 1 - smoothstep(halfW * 0.85, halfW + 2.4, dist);
      const segY = seg.ay + (seg.by - seg.ay) * t;
      blendedY += segY * w;
      weightSum += w;
      if (w > bestWeight) {
        bestWeight = w;
        if (seg.stair && dist < halfW + 0.35) onStair = true;
      }
    }
  }

  return {
    weight: clamp(bestWeight, 0, 1),
    y: weightSum > 0 ? blendedY / weightSum : 0,
    onStair
  };
}

export function getGroundHeight(x, z) {
  let h = evalNaturalOguraSlope(x, z);

  // Blend temple terraces
  for (let i = 0; i < PLATFORMS.length; i++) {
    const p = PLATFORMS[i];
    const nx = (x - p.cx) / p.rx;
    const nz = (z - p.cz) / p.rz;
    // Rounded-box Chebychev/Euclidean hybrid distance so terraces feel architectural
    const d = Math.hypot(nx, nz) * 0.72 + Math.max(Math.abs(nx), Math.abs(nz)) * 0.28;
    const edgeOuter = 1.0 + p.blend / Math.min(p.rx, p.rz);
    if (d < edgeOuter) {
      const w = 1 - smoothstep(0.92, edgeOuter, d);
      h = h * (1 - w) + p.y * w;
    }
  }

  // Carve Chisen-kansho-shiki pond basin north of Hondo
  const pnx = (x - POND_SPEC.cx) / POND_SPEC.rx;
  const pnz = (z - POND_SPEC.cz) / POND_SPEC.rz;
  const pondWarp = fbm2D(x * 0.25, z * 0.25, 2) * 0.22;
  const pd = Math.hypot(pnx, pnz) + pondWarp;
  if (pd < 1.25) {
    const pw = 1 - smoothstep(0.68, 1.22, pd);
    h = h * (1 - pw) + POND_SPEC.bedY * pw;
  }

  // Blend walkways & stone staircases cleanly
  const pathInfo = getPathInfluence(x, z);
  if (pathInfo.weight > 0.001) {
    h = h * (1 - pathInfo.weight) + pathInfo.y * pathInfo.weight;
  }

  return h;
}

export function isWalkwayOrBuildingZone(x, z, pad = 1.0) {
  // Used by tree/foliage scatterer to keep paths, stairs, pond, and building footprints clear!
  for (const seg of PATH_SEGMENTS) {
    const { dist } = distToSegment2D(x, z, seg.ax, seg.az, seg.bx, seg.bz);
    if (dist < seg.w * 0.5 + pad) return true;
  }

  const pnx = (x - POND_SPEC.cx) / (POND_SPEC.rx + pad);
  const pnz = (z - POND_SPEC.cz) / (POND_SPEC.rz + pad);
  if (Math.hypot(pnx, pnz) < 1.05) return true;

  // Building core footprints
  const footprints = [
    { cx: 64.0, cz: 0.0, rx: 3.6, rz: 4.5 },     // Sanmon
    { cx: 56.5, cz: 4.6, rx: 3.2, rz: 2.8 },     // Reception
    { cx: 50.0, cz: 8.5, rx: 4.5, rz: 3.8 },     // Exhibition Hall
    { cx: 36.0, cz: 0.0, rx: 4.6, rz: 5.4 },     // Niomon
    { cx: -5.5, cz: 0.0, rx: 7.8, rz: 8.8 },     // Hondo
    { cx: 1.5, cz: 10.5, rx: 3.8, rz: 3.8 },     // Shoro Belfry
    { cx: -6.5, cz: 18.5, rx: 6.2, rz: 4.6 },    // Myoken-do
    { cx: 1.5, cz: 18.5, rx: 2.5, rz: 2.5 },     // Myoken Torii
    { cx: -2.0, cz: -25.8, rx: 5.5, rz: 4.8 },   // Shoin
    { cx: 10.2, cz: -26.2, rx: 6.2, rz: 5.8 },   // Kuri
    { cx: -5.2, cz: -16.0, rx: 1.6, rz: 9.5 },   // Watari-roka corridor
    { cx: -18.5, cz: -19.5, rx: 4.6, rz: 4.4 },  // Kaisando
    { cx: -32.0, cz: 4.0, rx: 5.8, rz: 5.8 },    // Tahoto
    { cx: -31.5, cz: 19.0, rx: 3.8, rz: 3.4 },   // Kasenshi
    { cx: -31.0, cz: 24.5, rx: 3.6, rz: 3.4 },   // Shigure-tei ruins
    { cx: -47.0, cz: -1.0, rx: 4.8, rz: 5.6 }    // Observatory deck
  ];

  for (const fp of footprints) {
    if (Math.abs(x - fp.cx) < fp.rx + pad * 0.6 && Math.abs(z - fp.cz) < fp.rz + pad * 0.6) {
      return true;
    }
  }
  return false;
}

export function buildTerrainWorld(scene) {
  const root = new THREE.Group();
  root.name = 'OgurayamaTerrain';
  const mats = getArchitecturalMaterials();

  // 1. High-resolution sculpted Mount Ogura mesh (-98..+102 in X, -75..+75 in Z)
  const sizeX = 200;
  const sizeZ = 150;
  const segX = 220;
  const segZ = 165;
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ, segX, segZ);
  geo.rotateX(-Math.PI * 0.5);

  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  // Store base semantic weights so seasons (Autumn shiki-momiji / Summer emerald moss / Winter snow) can recolor smoothly!
  const terrainMeta = new Float32Array(count * 4); // [pathWeight, mossWeight, slopeRockWeight, LeafCarpetSeed]

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i) + 2; // centered slightly east
    const z = pos.getZ(i);
    pos.setX(i, x);

    const y = getGroundHeight(x, z);
    pos.setY(i, y);

    const pathInfo = getPathInfluence(x, z);
    const nMoss = fbm2D(x * 0.14 + 9.2, z * 0.14 - 4.1, 3) * 0.5 + 0.5;
    const nLeaf = fbm2D(x * 0.22 - 3.7, z * 0.22 + 8.5, 3) * 0.5 + 0.5;

    // Moss thrives across the shaded temple zone (-55 < x < 65, -35 < z < 35)
    const templeZone = smoothstep(74, 58, x) * smoothstep(-75, -45, x) * (1 - smoothstep(26, 48, Math.abs(z)));
    const mossW = clamp((0.42 + nMoss * 0.68) * (0.35 + templeZone * 0.65) * (1 - pathInfo.weight), 0, 1);

    // Check pond bed
    const pnx = (x - POND_SPEC.cx) / POND_SPEC.rx;
    const pnz = (z - POND_SPEC.cz) / POND_SPEC.rz;
    const isPondBed = Math.hypot(pnx, pnz) < 1.05 ? 1 : 0;

    terrainMeta[i * 4 + 0] = pathInfo.weight;
    terrainMeta[i * 4 + 1] = mossW;
    terrainMeta[i * 4 + 2] = isPondBed;
    terrainMeta[i * 4 + 3] = nLeaf * templeZone;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    bumpMap: mats.stoneWall.bumpMap,
    bumpScale: 0.045,
    roughness: 0.93,
    metalness: 0.01
  });

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  function applySeasonColors(season = 'autumn') {
    const colAttr = geo.attributes.color;
    const cPath = new THREE.Color();
    const cMoss = new THREE.Color();
    const cSoil = new THREE.Color();
    const cAccent = new THREE.Color();
    const tmp = new THREE.Color();

    if (season === 'autumn') {
      cPath.setHex(0x88857c);
      cMoss.setHex(0x3a6428);     // Deep velvet Kyoto Sugi-goke emerald moss
      cSoil.setHex(0x463a2a);
      cAccent.setHex(0x9e281b);   // Shiki-momiji fallen crimson carpet tint
    } else if (season === 'summer') {
      cPath.setHex(0x7c8076);
      cMoss.setHex(0x2f6e24);     // Rich rain-kissed summer moss
      cSoil.setHex(0x394528);
      cAccent.setHex(0x4d8a32);
    } else if (season === 'spring') {
      cPath.setHex(0x8c897f);
      cMoss.setHex(0x46742e);
      cSoil.setHex(0x4a422f);
      cAccent.setHex(0xd89aa6);   // Subtle fallen sakura petal blush near courtyard
    } else {
      // Winter snow-dusted Zen silence
      cPath.setHex(0x9da4ab);
      cMoss.setHex(0x495f42);
      cSoil.setHex(0xdce3ea);
      cAccent.setHex(0xf1f5f9);
    }

    for (let i = 0; i < count; i++) {
      const pw = terrainMeta[i * 4 + 0];
      const mw = terrainMeta[i * 4 + 1];
      const pondW = terrainMeta[i * 4 + 2];
      const leafSeed = terrainMeta[i * 4 + 3];

      tmp.copy(cSoil).lerp(cMoss, mw);

      if (season === 'autumn' && leafSeed > 0.34 && pw < 0.5) {
        const shiki = smoothstep(0.34, 0.72, leafSeed) * 0.58;
        tmp.lerp(cAccent, shiki);
      } else if (season === 'winter') {
        const snowPatch = smoothstep(0.18, 0.58, leafSeed + (1 - pw) * 0.28) * 0.82;
        tmp.lerp(cAccent, snowPatch);
      } else if (season === 'spring' && leafSeed > 0.52) {
        tmp.lerp(cAccent, (leafSeed - 0.52) * 0.32);
      }

      if (pw > 0.01) {
        tmp.lerp(cPath, pw * 0.88);
      }
      if (pondW > 0.5) {
        tmp.setHex(0x232b24);
      }

      colAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    colAttr.needsUpdate = true;
  }

  applySeasonColors('autumn');

  // 2. Instanced Granite Stair Steps & Flagstone Nobedan Paving!
  const stepBoxes = [];
  const rng = createSeededRandom(1616);

  for (const seg of PATH_SEGMENTS) {
    if (seg.stair) {
      const nSteps = seg.steps || 20;
      const dx = seg.bx - seg.ax;
      const dz = seg.bz - seg.az;
      const yaw = Math.atan2(dx, dz);
      const horizLen = Math.hypot(dx, dz);
      const tread = horizLen / nSteps;
      const rise = Math.abs(seg.by - seg.ay) / nSteps;

      for (let s = 0; s < nSteps; s++) {
        const t = (s + 0.5) / nSteps;
        const sx = seg.ax + dx * t;
        const sz = seg.az + dz * t;
        const sy = seg.ay + (seg.by - seg.ay) * t;
        stepBoxes.push({
          x: sx + (rng() - 0.5) * 0.04,
          y: sy - rise * 0.35,
          z: sz + (rng() - 0.5) * 0.04,
          w: seg.w * (0.94 + rng() * 0.08),
          h: rise + 0.16,
          d: tread * 1.18,
          yaw: yaw + (rng() - 0.5) * 0.025,
          tint: 0.86 + rng() * 0.24
        });
      }
    } else {
      // Flagstone paving slabs (石畳・延段)
      const dx = seg.bx - seg.ax;
      const dz = seg.bz - seg.az;
      const yaw = Math.atan2(dx, dz);
      const len = Math.hypot(dx, dz);
      const slabs = Math.max(4, Math.floor(len / 0.82));
      for (let s = 0; s < slabs; s++) {
        const t = (s + 0.5) / slabs;
        const sx = seg.ax + dx * t;
        const sz = seg.az + dz * t;
        const sy = getGroundHeight(sx, sz);
        stepBoxes.push({
          x: sx + (rng() - 0.5) * 0.14,
          y: sy - 0.02,
          z: sz + (rng() - 0.5) * 0.14,
          w: seg.w * (0.78 + rng() * 0.16),
          h: 0.09,
          d: 0.72 + rng() * 0.16,
          yaw: yaw + (rng() - 0.5) * 0.04,
          tint: 0.84 + rng() * 0.28
        });
      }
    }
  }

  const stepGeo = new THREE.BoxGeometry(1, 1, 1);
  const stepInst = new THREE.InstancedMesh(stepGeo, mats.granite, stepBoxes.length);
  stepInst.castShadow = true;
  stepInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();
  stepBoxes.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, b.yaw, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    stepInst.setMatrixAt(idx, dummy.matrix);
    cTmp.setRGB(b.tint * 0.96, b.tint * 0.98, b.tint * 0.93);
    stepInst.setColorAt(idx, cTmp);
  });
  stepInst.instanceMatrix.needsUpdate = true;
  stepInst.instanceColor.needsUpdate = true;
  root.add(stepInst);

  // 3. Bamboo Kekkai Handrails flanking the iconic stone steps!
  const railsGroup = new THREE.Group();
  // Both sides of the main Niomon -> Hondo staircase (with mid-landing break)
  for (const side of [-1, 1]) {
    const zOff = side * 1.72;
    railsGroup.add(createBambooRailSegment(31.2, getGroundHeight(31.2, zOff), zOff, 19.5, getGroundHeight(19.5, zOff), zOff, 0.68));
    railsGroup.add(createBambooRailSegment(18.2, getGroundHeight(18.2, zOff), zOff, 7.2, getGroundHeight(7.2, zOff), zOff, 0.68));
  }
  // Along outer Sanmon -> Niomon moss border (low kekkai)
  for (const side of [-1, 1]) {
    const zOff = side * 1.95;
    railsGroup.add(createBambooRailSegment(61.5, getGroundHeight(61.5, zOff), zOff, 41.5, getGroundHeight(41.5, zOff), zOff, 0.36));
  }
  // Along Tahoto upper steps
  railsGroup.add(createBambooRailSegment(-10.2, 11.2, 11.1, -18.5, 15.2, 10.5, 0.68));
  railsGroup.add(createBambooRailSegment(-18.5, 15.2, 10.5, -26.0, 19.5, 6.3, 0.68));
  // Along Observatory steps
  railsGroup.add(createBambooRailSegment(-35.2, 19.5, 1.0, -42.8, 26.5, 0.2, 0.68));
  root.add(railsGroup);

  // 4. Mossy Ishigaki Retaining Walls supporting major hillside terraces!
  const ishigakiSpecs = [
    // East retaining wall below Hondo & Shoro terrace (divided north/south of main stairs)
    { x: 5.8, y: 8.6, z: -6.8, w: 2.2, h: 4.8, d: 10.5 },
    { x: 5.8, y: 8.8, z: 7.5, w: 2.2, h: 4.4, d: 11.2 },
    // East retaining wall below Tahoto Important Cultural Property terrace
    { x: -25.4, y: 16.9, z: 0.2, w: 2.4, h: 5.2, d: 7.4 },
    // Retaining wall below Summit Observation Deck
    { x: -42.2, y: 23.8, z: -2.2, w: 2.2, h: 5.4, d: 9.8 },
    // Retaining wall below Kaisando
    { x: -13.8, y: 12.6, z: -20.0, w: 1.8, h: 4.2, d: 7.5 }
  ];
  ishigakiSpecs.forEach((s) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mats.stoneWall);
    wall.position.set(s.x, s.y, s.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
  });

  // 5. Distant Sagano Plain, Katsura River, Togetsukyō & Kyoto / Higashiyama Panorama (+X East)
  const vista = buildKyotoPanoramaVista();
  root.add(vista);

  scene.add(root);

  return {
    root,
    terrainMesh,
    applySeasonColors
  };
}

function buildKyotoPanoramaVista() {
  const vista = new THREE.Group();
  vista.name = 'SaganoKyotoVista';
  const rng = createSeededRandom(794); // Heian-kyō 794 AD

  // Broad Sagano & Kyoto Basin floor extending East (+X: 95..480)
  const plainGeo = new THREE.PlaneGeometry(420, 560, 32, 32);
  plainGeo.rotateX(-Math.PI * 0.5);
  const plainMat = new THREE.MeshStandardMaterial({
    color: 0x4b5842,
    roughness: 0.96,
    metalness: 0.0
  });
  const plain = new THREE.Mesh(plainGeo, plainMat);
  plain.position.set(295, -2.5, 0);
  plain.receiveShadow = true;
  vista.add(plain);

  // Katsura / Ōi River (大堰川・桂川) curving gracefully through Arashiyama to the Southeast
  const riverShape = new THREE.Shape();
  riverShape.moveTo(145, 190);
  riverShape.bezierCurveTo(165, 110, 195, 55, 225, -45);
  riverShape.bezierCurveTo(245, -120, 275, -190, 305, -260);
  riverShape.lineTo(327, -260);
  riverShape.bezierCurveTo(297, -190, 267, -120, 247, -45);
  riverShape.bezierCurveTo(217, 55, 187, 110, 165, 190);
  riverShape.closePath();

  const riverGeo = new THREE.ShapeGeometry(riverShape, 24);
  riverGeo.rotateX(Math.PI * 0.5);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x5c7d92,
    roughness: 0.22,
    metalness: 0.55
  });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.position.y = -2.32;
  vista.add(river);

  // Miniature Togetsukyō Bridge (渡月橋) spanning the Ōi River in the distance!
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.9, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xa68967, roughness: 0.8 })
  );
  bridge.position.set(198, -1.9, 72);
  bridge.rotation.y = -0.35;
  vista.add(bridge);

  // Hundreds of distant Sagano & Kyoto city Machiya / temple rooftops (seen from Observation Deck!)
  const houseCount = 420;
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  const houseMat = new THREE.MeshStandardMaterial({
    color: 0x52565e,
    roughness: 0.85,
    metalness: 0.1
  });
  const houses = new THREE.InstancedMesh(houseGeo, houseMat, houseCount);
  const d = new THREE.Object3D();
  const hc = new THREE.Color();
  for (let i = 0; i < houseCount; i++) {
    const hx = 108 + Math.pow(rng(), 0.85) * 265;
    const hz = (rng() - 0.5) * 360;
    const w = 3.2 + rng() * 5.8;
    const dep = 3.0 + rng() * 5.2;
    const h = 2.2 + rng() * (hx > 220 ? 5.5 : 2.8);
    d.position.set(hx, -2.5 + h * 0.5, hz);
    d.rotation.set(0, (rng() > 0.8 ? 0.25 : 0), 0);
    d.scale.set(w, h, dep);
    d.updateMatrix();
    houses.setMatrixAt(i, d.matrix);
    const v = 0.28 + rng() * 0.26;
    hc.setRGB(v * 1.02, v * 1.0, v * 1.05);
    houses.setColorAt(i, hc);
  }
  houses.instanceMatrix.needsUpdate = true;
  houses.instanceColor.needsUpdate = true;
  vista.add(houses);

  // Distant Mountain Ranges: Arashiyama (South), Higashiyama 36 Peaks & Mt. Hiei (Far East), Kitayama (North)
  const mountainRanges = [
    // Arashiyama across Togetsukyō (South-Southeast)
    { cx: 165, cz: 175, w: 220, h: 48, d: 95, color: 0x3f5446 },
    // Kitayama / Kinugasa hills (North-Northeast)
    { cx: 195, cz: -190, w: 260, h: 56, d: 105, color: 0x445852 },
    // Higashiyama & Daimonji-yama & Mt. Hiei framing the far eastern horizon of Kyoto Basin!
    { cx: 455, cz: 40, w: 120, h: 68, d: 460, color: 0x5c6e7e },
    { cx: 485, cz: -115, w: 130, h: 96, d: 240, color: 0x67798b } // Mt. Hiei (比叡山) peak to NE!
  ];

  mountainRanges.forEach((m, idx) => {
    const mGeo = new THREE.PlaneGeometry(m.w, m.d, 28, 28);
    mGeo.rotateX(-Math.PI * 0.5);
    const mp = mGeo.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const lx = mp.getX(i) / (m.w * 0.5);
      const lz = mp.getZ(i) / (m.d * 0.5);
      const env = Math.max(0, 1 - (lx * lx * 0.85 + lz * lz * 0.85));
      const ridge = (fbm2D(lx * 2.4 + idx * 5, lz * 2.4, 4) * 0.5 + 0.65) * Math.pow(env, 1.35) * m.h;
      mp.setY(i, ridge - 3.0);
    }
    mGeo.computeVertexNormals();
    const mMesh = new THREE.Mesh(
      mGeo,
      new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.95, metalness: 0.0 })
    );
    mMesh.position.set(m.cx, 0, m.cz);
    vista.add(mMesh);
  });

  return vista;
}
