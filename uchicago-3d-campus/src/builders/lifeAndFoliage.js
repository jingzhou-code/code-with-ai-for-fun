import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS, STREETS_NS, STREETS_EW } from '../data/campusData.js';

function createBotanicalCrownGeometry() {
  const lobes = [
    [0, 0, 0, 3.6, 2.7, 3.5],
    [-1.9, -0.4, 1.1, 2.5, 2.1, 2.4],
    [2.0, -0.3, -1.0, 2.6, 2.1, 2.5],
    [0.8, 0.2, 1.9, 2.4, 2.0, 2.3],
    [-0.7, 1.6, -0.5, 2.6, 2.2, 2.6]
  ];
  const parts = lobes.map(([ox, oy, oz, sx, sy, sz]) => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(sx, sy, sz);
    g.translate(ox, oy, oz);
    return g;
  });
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildLifeAndFoliage(scene, mats) {
  const root = new THREE.Group();
  root.name = 'CampusLifeAndBotanicGarden';
  const rand = seededRand(1890);

  // Helper: check if (x, z) collides with any street or registered landmark footprint
  const isBlocked = (x, z, pad = 4.5) => {
    for (const st of STREETS_NS) {
      const zMin = st.zMin ?? -780;
      const zMax = st.zMax ?? 740;
      if (z >= zMin - 4 && z <= zMax + 4 && Math.abs(x - st.x) < st.width * 0.5 + pad) {
        return true;
      }
    }
    for (const st of STREETS_EW) {
      const xMin = st.xMin ?? -640;
      const xMax = st.xMax ?? 860;
      if (x >= xMin - 4 && x <= xMax + 4 && Math.abs(z - st.z) < st.width * 0.5 + pad) {
        return true;
      }
    }
    for (const lm of LANDMARKS) {
      if (lm.id === 'midway' || lm.id === 'botany_pond') continue;
      const [lx, , lz] = lm.pos;
      const [fw, fd] = lm.footprint;
      if (Math.abs(x - lx) < fw * 0.5 + pad && Math.abs(z - lz) < fd * 0.5 + pad) {
        return true;
      }
    }
    // Keep Botany Pond water & Midway Ice Rink clear
    if (Math.hypot(x - 18, z + 155) < 16) return true;
    if (Math.abs(x - 68) < 35 && Math.abs(z - 310) < 20) return true;
    return false;
  };

  // ============================================================================
  // 1. BOTANIC GARDEN TREES (1,650+ Instanced Trunks + Layered Organic Canopies)
  // ============================================================================
  const treeCoords = [];

  // A. Formal Olmsted Double Allées along the Midway Plaisance (Iconic 4 rows of elms/oaks!)
  for (let x = -590; x <= 665; x += 15) {
    for (const zRow of [226, 246, 374, 394]) {
      if (!isBlocked(x, zRow, 2.5)) {
        treeCoords.push({ x: x + (rand() - 0.5) * 1.5, y: 0, z: zRow, scale: 0.95 + rand() * 0.35 });
      }
    }
  }

  // B. Main Quadrangles Honeylocust, English Oak & Elm Groves
  for (let i = 0; i < 360; i++) {
    const x = -58 + rand() * 170;
    const z = -205 + rand() * 375;
    // Keep central flagpole circle & main axial cross-paths open for vistas
    if (Math.hypot(x - 22, z + 8) < 13) continue;
    if (Math.abs(x - 22) < 4.5 || Math.abs(z + 8) < 5.5) continue;
    if (!isBlocked(x, z, 4.2)) {
      treeCoords.push({ x, y: 0, z, scale: 0.85 + rand() * 0.55 });
    }
  }

  // C. Botany Pond Weeping Willows & Lush Perimeter
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    const bx = 18 + Math.cos(a) * 20;
    const bz = -155 + Math.sin(a) * 13;
    if (!isBlocked(bx, bz, 1.5)) {
      treeCoords.push({ x: bx, y: 0, z: bz, scale: 1.05 + rand() * 0.25 });
    }
  }

  // D. Street Trees & Campus Quads (Crerar, Bartlett, North, East, South, Washington & Jackson Parks)
  for (let i = 0; i < 950; i++) {
    const x = -620 + rand() * 1440;
    const z = -640 + rand() * 1280;
    // Avoid Lake Michigan & lagoons
    if (x > 865) continue;
    if (Math.hypot(x - 795, z + 45) < 74) continue;
    if (Math.hypot(x + 575, z + 95) < 88) continue;
    // Avoid sunken center of Midway so the Olmsted green vista stays open!
    if (z > 252 && z < 368) continue;
    if (!isBlocked(x, z, 5.2)) {
      treeCoords.push({ x, y: 0, z, scale: 0.78 + rand() * 0.62 });
    }
  }

  const treeCount = treeCoords.length;
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.44, 4.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3828', roughness: 0.92 });
  const canopyGeo = createBotanicalCrownGeometry();
  const canopyMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.85,
    metalness: 0.02,
    flatShading: true
  });

  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopyMain = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  const canopyUpper = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(2.3, 1),
    canopyMat,
    treeCount
  );

  trunkMesh.castShadow = true;
  canopyMain.castShadow = true;
  canopyMain.receiveShadow = true;
  canopyUpper.castShadow = true;

  const dummy = new THREE.Object3D();
  const treeSeeds = new Float32Array(treeCount);

  for (let i = 0; i < treeCount; i++) {
    const t = treeCoords[i];
    const s = t.scale;
    treeSeeds[i] = rand();

    dummy.position.set(t.x, t.y + 2.2 * s, t.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, treeSeeds[i] * Math.PI * 2, 0);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x, t.y + 5.9 * s, t.z);
    dummy.scale.set(s * (0.92 + treeSeeds[i] * 0.2), s * 0.95, s * (0.92 + (1 - treeSeeds[i]) * 0.2));
    dummy.rotation.set(0, treeSeeds[i] * Math.PI * 2, 0);
    dummy.updateMatrix();
    canopyMain.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x + (treeSeeds[i] - 0.5) * 1.4, t.y + 8.4 * s, t.z + (0.5 - treeSeeds[i]) * 1.4);
    dummy.scale.set(s * 0.85, s * 0.72, s * 0.85);
    dummy.updateMatrix();
    canopyUpper.setMatrixAt(i, dummy.matrix);
  }

  const PALETTES = {
    autumn: ['#d88227', '#c94a29', '#e3a832', '#9e3623', '#6b8339', '#dfa035'],
    spring: ['#5da346', '#72b856', '#e8a2b8', '#f2d5df', '#4d8f3c', '#82c462'],
    summer: ['#366e2d', '#2d5e27', '#447d38', '#3c7330', '#4f8940', '#295723'],
    winter: ['#cfd8e0', '#dde5ec', '#b8c3cc', '#e5edf2', '#9aa5b0', '#d5dfe8']
  };

  function applySeasonFoliage(season = 'autumn') {
    const pal = PALETTES[season] || PALETTES.autumn;
    const c = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const idx = Math.floor(treeSeeds[i] * pal.length) % pal.length;
      c.set(pal[idx]);
      canopyMain.setColorAt(i, c);
      c.offsetHSL(0.01, 0, 0.04);
      canopyUpper.setColorAt(i, c);
    }
    canopyMain.instanceColor.needsUpdate = true;
    canopyUpper.instanceColor.needsUpdate = true;
  }
  applySeasonFoliage('autumn');

  root.add(trunkMesh, canopyMain, canopyUpper);

  // ============================================================================
  // 2. COLLEGIATE GOTHIC CAMPUS LAMPPOSTS (Instanced Posts + Emissive Lantern Globes)
  // ============================================================================
  const lampPositions = [];
  // Along Main Quad paths
  for (let z = -200; z <= 165; z += 26) {
    lampPositions.push([18.5, z], [25.5, z]);
  }
  for (let x = -68; x <= 116; x += 26) {
    lampPositions.push([x, -12], [x, -4]);
  }
  // Along Ellis Ave, University Ave, Woodlawn Ave, 57th & Midway
  for (let z = -560; z <= 580; z += 44) {
    lampPositions.push([-91, z], [-73, z], [120, z], [246, z]);
  }
  for (let x = -380; x <= 560; x += 48) {
    lampPositions.push([x, 201], [x, 419], [x, -221]);
  }

  const lampCount = lampPositions.length;
  const postMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.16, 4.4, 6),
    mats.miesSteel,
    lampCount
  );
  const lanternMat = mats.registerEmissive(
    new THREE.MeshStandardMaterial({
      color: '#fff4d8',
      emissive: new THREE.Color('#ffbd59'),
      emissiveIntensity: 0.3,
      roughness: 0.2
    }),
    2.8
  );
  const globeMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.32, 8, 8),
    lanternMat,
    lampCount
  );

  for (let i = 0; i < lampCount; i++) {
    const [lx, lz] = lampPositions[i];
    dummy.position.set(lx, 2.2, lz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, 4.55, lz);
    dummy.updateMatrix();
    globeMesh.setMatrixAt(i, dummy.matrix);
  }
  root.add(postMesh, globeMesh);

  // ============================================================================
  // 3. ANIMATED UCHICAGO SHUTTLES, CTA BUSES & CARS + STROLLING QUAD STUDENTS
  // ============================================================================
  const vehicles = [];
  const vehicleGroup = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);

  const routes = [
    { axis: 'z', fixed: -82 + 3.6, min: -680, max: 660, dir: 1, speed: 15 },
    { axis: 'z', fixed: -82 - 3.6, min: -680, max: 660, dir: -1, speed: 14 },
    { axis: 'z', fixed: 255 + 3.5, min: -640, max: 640, dir: 1, speed: 13 },
    { axis: 'z', fixed: 255 - 3.5, min: -640, max: 640, dir: -1, speed: 14 },
    { axis: 'x', fixed: 210 + 3.6, min: -580, max: 720, dir: 1, speed: 17 },
    { axis: 'x', fixed: 210 - 3.6, min: -580, max: 720, dir: -1, speed: 16 },
    { axis: 'x', fixed: 410 + 3.6, min: -580, max: 720, dir: 1, speed: 17 },
    { axis: 'x', fixed: -230 + 3.5, min: -520, max: 640, dir: 1, speed: 13 },
    { axis: 'x', fixed: -650 - 4.2, min: -580, max: 720, dir: -1, speed: 19 }
  ];

  const carColors = ['#800000', '#e8e4dc', '#2c3540', '#800000', '#5a6672', '#b5382a', '#d8d2c5'];
  for (let i = 0; i < 36; i++) {
    const rt = routes[i % routes.length];
    const isShuttle = i % 4 === 0; // Iconic UChicago Maroon Campus Shuttle / CTA Bus!
    const vMat = new THREE.MeshStandardMaterial({
      color: isShuttle ? (i % 8 === 0 ? '#800000' : '#eceae4') : carColors[i % carColors.length],
      roughness: 0.4,
      metalness: 0.35
    });
    const mesh = new THREE.Mesh(bodyGeo, vMat);
    const len = isShuttle ? 10.5 : 4.4;
    const wid = isShuttle ? 2.6 : 1.9;
    const hgt = isShuttle ? 3.1 : 1.5;

    if (rt.axis === 'z') {
      mesh.scale.set(wid, hgt, len);
    } else {
      mesh.scale.set(len, hgt, wid);
    }
    mesh.castShadow = true;
    const t = rt.min + rand() * (rt.max - rt.min);
    mesh.position.set(
      rt.axis === 'x' ? t : rt.fixed,
      hgt * 0.5 + 0.14,
      rt.axis === 'z' ? t : rt.fixed
    );
    vehicleGroup.add(mesh);
    vehicles.push({ mesh, rt, pos: t, hgt });
  }
  root.add(vehicleGroup);

  // Strolling Students on the Main Quadrangle Cobblestone Paths
  const walkers = [];
  const walkerPaths = [
    [[-72, -8], [118, -8]],
    [[22, -205], [22, 165]],
    [[-50, 46], [22, -8]],
    [[85, -178], [22, -8]],
    [[56, -206], [56, -8]],
    [[-34, 152], [90, 152]]
  ];
  const studentGeo = new THREE.CapsuleGeometry(0.32, 1.05, 4, 8);
  for (let i = 0; i < 64; i++) {
    const path = walkerPaths[i % walkerPaths.length];
    const coatColor = i % 3 === 0 ? '#800000' : i % 3 === 1 ? '#2b394a' : '#78624c';
    const m = new THREE.Mesh(
      studentGeo,
      new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.8 })
    );
    m.castShadow = true;
    root.add(m);
    walkers.push({
      mesh: m,
      p0: path[0],
      p1: path[1],
      t: rand(),
      dir: rand() > 0.5 ? 1 : -1,
      speed: 0.018 + rand() * 0.014,
      phase: rand() * Math.PI * 2
    });
  }

  // ============================================================================
  // 4. SEASONAL ATMOSPHERIC PARTICLES (Falling Autumn Leaves / Winter Snow / Petals)
  // ============================================================================
  const pCount = 700;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = -280 + rand() * 680;
    pPositions[i * 3 + 1] = 2 + rand() * 85;
    pPositions[i * 3 + 2] = -360 + rand() * 860;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: '#e08b2f',
    size: 1.35,
    transparent: true,
    opacity: 0.82
  });
  const particles = new THREE.Points(pGeo, pMat);
  root.add(particles);

  let currentSeason = 'autumn';
  function setSeason(season) {
    currentSeason = season;
    applySeasonFoliage(season);
    if (season === 'winter') {
      pMat.color.set('#ffffff');
      pMat.size = 1.45;
      pMat.opacity = 0.88;
      particles.visible = true;
    } else if (season === 'autumn') {
      pMat.color.set('#df8328');
      pMat.size = 1.35;
      pMat.opacity = 0.8;
      particles.visible = true;
    } else if (season === 'spring') {
      pMat.color.set('#f5c2d4');
      pMat.size = 1.15;
      pMat.opacity = 0.72;
      particles.visible = true;
    } else {
      particles.visible = false;
    }
  }

  function update(dt, elapsed, flagMesh) {
    // Animate traffic
    for (const v of vehicles) {
      v.pos += v.rt.dir * v.rt.speed * dt;
      if (v.pos > v.rt.max) v.pos = v.rt.min;
      if (v.pos < v.rt.min) v.pos = v.rt.max;
      if (v.rt.axis === 'x') {
        v.mesh.position.x = v.pos;
      } else {
        v.mesh.position.z = v.pos;
      }
    }

    // Animate walking UChicago students
    for (const w of walkers) {
      w.t += w.dir * w.speed * dt;
      if (w.t > 1) {
        w.t = 1;
        w.dir = -1;
      } else if (w.t < 0) {
        w.t = 0;
        w.dir = 1;
      }
      const x = w.p0[0] + (w.p1[0] - w.p0[0]) * w.t;
      const z = w.p0[1] + (w.p1[1] - w.p0[1]) * w.t;
      w.mesh.position.set(x, 0.92 + Math.abs(Math.sin(elapsed * 7 + w.phase)) * 0.08, z);
    }

    // Animate waving UChicago Maroon Flag on Main Quad Flagpole
    if (flagMesh) {
      const posAttr = flagMesh.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const factor = (vx + 2.8) / 5.6;
        posAttr.setZ(i, Math.sin(elapsed * 4.2 - factor * 4.5) * 0.42 * factor);
      }
      posAttr.needsUpdate = true;
    }

    // Animate seasonal falling leaves / snow
    if (particles.visible) {
      const arr = pGeo.attributes.position.array;
      const fallSpeed = currentSeason === 'winter' ? 7.5 : 5.2;
      for (let i = 0; i < pCount; i++) {
        arr[i * 3 + 1] -= fallSpeed * dt;
        arr[i * 3] += Math.sin(elapsed * 1.4 + i) * 2.2 * dt;
        if (arr[i * 3 + 1] < 0.5) {
          arr[i * 3 + 1] = 75 + (i % 15);
        }
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  }

  scene.add(root);
  return { root, setSeason, update, treeCount };
}
