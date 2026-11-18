import * as THREE from 'three';
import { createSeededRandom } from '../utils/noise.js';
import {
  getMomijiClusterTexture,
  getSingleMomijiLeafTexture,
  getBambooLeafSprayTexture,
  getTimberTextures
} from '../utils/textures.js';
import { getGroundHeight, isWalkwayOrBuildingZone, POND_SPEC } from './terrain.js';
import { getArchitecturalMaterials } from '../utils/archBuilder.js';

export function buildBotanicalWorld(scene) {
  const root = new THREE.Group();
  root.name = 'JojakkojiBotanicalWorld';

  const rng = createSeededRandom(202611);
  const windUniform = { value: 0 };

  // ============================================================================
  // 1. Generate 225 Japanese Maple Trees (いろは紅葉) — Hero Corridor + Mountain
  // ============================================================================
  const mapleTrees = [];

  // Hero maples arching over Sanmon -> Niomon -> 44-Step Staircase -> Hondo -> Pond -> Tahoto -> Shigure-tei
  const heroCoords = [
    // Sanmon approach frame
    [68.0, -4.6, 1.15], [67.5, 4.8, 1.1], [59.5, -3.5, 1.1], [54.0, -3.8, 1.2],
    [47.5, 3.6, 1.15], [43.5, -4.2, 1.25], [40.2, 4.4, 1.15],
    // Iconic Niomon 44-Step Stone Staircase "Red Cloud Tunnel" (仁王門石段 紅葉の雲海)!
    [32.5, -3.3, 1.22], [31.8, 3.4, 1.25],
    [28.2, -2.9, 1.28], [27.6, 3.1, 1.24],
    [24.0, -3.1, 1.32], [23.4, 2.9, 1.3],
    [19.8, -3.2, 1.26], [19.2, 3.2, 1.34],
    [15.4, -2.9, 1.3],  [14.8, 3.0, 1.28],
    [11.0, -3.3, 1.25], [10.6, 3.4, 1.22],
    [7.4, -4.6, 1.18],  [7.2, 4.8, 1.2],
    // Hondo, Shoro & Myoken-do courtyards
    [3.8, 6.6, 1.15], [-2.2, 8.8, 1.22], [5.8, 14.2, 1.18],
    [-1.2, 14.5, 1.15], [-10.8, 13.8, 1.25], [-12.5, 7.2, 1.28],
    // Pond Viewing Garden (池泉庭園) overhanging maples!
    [1.6, -12.6, 1.2], [0.4, -18.5, 1.24], [-8.8, -13.2, 1.25],
    [-10.2, -20.5, 1.22], [-4.5, -21.2, 1.12], [5.5, -18.5, 1.18],
    // Kaisando & North Slope
    [-14.2, -14.2, 1.15], [-22.5, -15.5, 1.22], [-15.5, -24.5, 1.18],
    // Climb to Tahoto & Tahoto Framing Maples (重要文化財・多宝塔と紅葉)!
    [-15.2, 12.6, 1.22], [-21.5, 12.2, 1.26], [-24.8, 1.2, 1.2],
    [-26.5, 9.2, 1.28], [-35.8, 9.8, 1.25], [-36.5, -1.8, 1.22],
    [-28.5, -2.8, 1.18],
    // Kasenshi & Shigure-tei poetic maples
    [-26.5, 16.2, 1.18], [-26.2, 22.8, 1.24], [-34.8, 22.2, 1.2],
    // Below Summit Observation Deck (creating the sea of crimson below the viewpoint!)
    [-39.5, 3.5, 1.25], [-40.8, -5.2, 1.22], [-42.2, 6.8, 1.2]
  ];

  heroCoords.forEach(([hx, hz, s]) => {
    mapleTrees.push({
      x: hx,
      z: hz,
      y: getGroundHeight(hx, hz),
      scale: s * (0.94 + rng() * 0.14),
      leanToPath: Math.abs(hz) < 4.2 && hx > 7 && hx < 34 ? -Math.sign(hz) * 0.28 : (rng() - 0.5) * 0.14,
      hueSeed: rng()
    });
  });

  // Scatter 175 more Japanese maples organically across Mt. Ogura slopes
  let attempts = 0;
  while (mapleTrees.length < 225 && attempts < 2400) {
    attempts++;
    const x = -60 + rng() * 134;
    const z = (rng() - 0.5) * 86;
    // Leave southern bamboo zone mostly to bamboo (with occasional border maples)
    if (z > 27 && x < 25 && rng() > 0.22) continue;
    if (isWalkwayOrBuildingZone(x, z, 1.65)) continue;

    // Avoid overlapping too tightly with existing maples
    let tooClose = false;
    for (let i = 0; i < mapleTrees.length; i++) {
      if (Math.hypot(x - mapleTrees[i].x, z - mapleTrees[i].z) < 3.4) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    mapleTrees.push({
      x,
      z,
      y: getGroundHeight(x, z),
      scale: 0.82 + rng() * 0.58,
      leanToPath: (rng() - 0.5) * 0.18,
      hueSeed: rng()
    });
  }

  // Build Instanced Trunks/Branches + Instanced 7-Lobe Maple Foliage Cards!
  const barkTex = getTimberTextures('hinoki');
  const trunkMat = new THREE.MeshStandardMaterial({
    map: barkTex.map,
    color: 0x524438,
    roughness: 0.92
  });

  // Each maple gets 1 main trunk + 3 spreading limbs = 4 cylinder instances; and 16 foliage cluster cards!
  const limbGeo = new THREE.CylinderGeometry(0.085, 0.19, 1.0, 7);
  limbGeo.translate(0, 0.5, 0);
  const limbInst = new THREE.InstancedMesh(limbGeo, trunkMat, mapleTrees.length * 4);
  limbInst.castShadow = true;
  limbInst.receiveShadow = true;

  const momijiTex = getMomijiClusterTexture();
  const leafMat = new THREE.MeshStandardMaterial({
    map: momijiTex,
    alphaTest: 0.36,
    side: THREE.DoubleSide,
    roughness: 0.72,
    metalness: 0.02
  });

  // Inject gentle mountain breeze vertex sway into foliage shader!
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float breeze = sin(uTime * 1.45 + worldInstancePos.x * 0.22 + worldInstancePos.z * 0.19) * 0.09
                      + cos(uTime * 2.6 + worldInstancePos.y * 0.4) * 0.035;
         transformed.x += breeze * (position.y + 0.6);
         transformed.z += breeze * 0.65 * (position.x + 0.4);`
      );
  };

  // Crossed curved foliage cluster geometry (2 intersecting planes per cluster for full 3D volume from every angle!)
  const p1 = new THREE.PlaneGeometry(2.35, 2.35);
  const p2 = new THREE.PlaneGeometry(2.35, 2.35);
  p2.rotateY(Math.PI * 0.48);
  p2.rotateX(0.28);
  const clusterGeo = mergeTwoBufferGeometries(p1, p2);

  const clustersPerTree = 14;
  const totalClusters = mapleTrees.length * clustersPerTree;
  const leafInst = new THREE.InstancedMesh(clusterGeo, leafMat, totalClusters);
  leafInst.castShadow = true;
  leafInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const clusterMeta = []; // Store hueSeed & heightFactor for instant seasonal switching!

  let limbIdx = 0;
  let clusterIdx = 0;

  mapleTrees.forEach((tree) => {
    const hTrunk = 2.6 * tree.scale;
    // Main trunk
    dummy.position.set(tree.x, tree.y - 0.15, tree.z);
    dummy.rotation.set(tree.leanToPath, rng() * Math.PI * 2, (rng() - 0.5) * 0.14);
    dummy.scale.set(tree.scale, hTrunk, tree.scale);
    dummy.updateMatrix();
    limbInst.setMatrixAt(limbIdx++, dummy.matrix);

    const topX = tree.x + (rng() - 0.5) * 0.25;
    const topY = tree.y + hTrunk * 0.86;
    const topZ = tree.z + Math.sin(tree.leanToPath) * hTrunk * 0.85;

    // 3 primary spreading boughs
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2 + rng() * 0.6;
      const tilt = 0.52 + rng() * 0.34;
      const bLen = (1.9 + rng() * 1.1) * tree.scale;

      dummy.position.set(topX, topY, topZ);
      dummy.rotation.set(
        Math.sin(ba) * tilt + tree.leanToPath * 0.6,
        0,
        -Math.cos(ba) * tilt
      );
      dummy.scale.set(tree.scale * 0.55, bLen, tree.scale * 0.55);
      dummy.updateMatrix();
      limbInst.setMatrixAt(limbIdx++, dummy.matrix);
    }

    // 14 layered cloud-like Momiji branchlet clusters per tree!
    for (let c = 0; c < clustersPerTree; c++) {
      const layer = c / clustersPerTree;
      const rad = (0.7 + Math.sin(layer * Math.PI) * 2.35) * tree.scale;
      const ang = c * 2.39996 + tree.hueSeed * 6.28; // Golden angle spiral!
      const cx = topX + Math.cos(ang) * rad;
      const cz = topZ + Math.sin(ang) * rad + Math.sin(tree.leanToPath) * 0.9;
      const cy = topY + (0.4 + layer * 2.45 + (rng() - 0.5) * 0.45) * tree.scale;

      dummy.position.set(cx, cy, cz);
      dummy.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.5);
      const cs = (0.78 + rng() * 0.48) * tree.scale;
      dummy.scale.set(cs, cs * 0.88, cs);
      dummy.updateMatrix();
      leafInst.setMatrixAt(clusterIdx, dummy.matrix);

      clusterMeta.push({
        treeHue: tree.hueSeed,
        localVar: rng(),
        sunExposure: layer // upper canopy turns deeper crimson faster!
      });
      clusterIdx++;
    }
  });

  limbInst.instanceMatrix.needsUpdate = true;
  leafInst.instanceMatrix.needsUpdate = true;
  root.add(limbInst);
  root.add(leafInst);

  // ============================================================================
  // 2. Famous Weeping Cherry Tree (枝垂桜 Shidarezakura) in Exhibition Courtyard!
  // ============================================================================
  const sakuraGroup = new THREE.Group();
  const sx = 51.2;
  const sz = 4.6;
  const sy = getGroundHeight(sx, sz);
  sakuraGroup.position.set(sx, sy, sz);

  const sTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 3.4, 9), trunkMat);
  sTrunk.position.y = 1.65;
  sTrunk.rotation.z = 0.08;
  sTrunk.castShadow = true;
  sakuraGroup.add(sTrunk);

  const sakuraMat = new THREE.MeshStandardMaterial({
    map: momijiTex,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.7
  });
  const sakuraClusters = new THREE.InstancedMesh(clusterGeo, sakuraMat, 28);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + rng() * 0.3;
    const r = 0.6 + (i % 4) * 0.78;
    const droop = (i % 4) * 0.52;
    dummy.position.set(Math.cos(a) * r, 3.8 - droop, Math.sin(a) * r);
    dummy.rotation.set(0.3, a, 0.2);
    const sc = 0.72 + rng() * 0.35;
    dummy.scale.set(sc, sc * 1.15, sc);
    dummy.updateMatrix();
    sakuraClusters.setMatrixAt(i, dummy.matrix);
  }
  sakuraClusters.instanceMatrix.needsUpdate = true;
  sakuraGroup.add(sakuraClusters);
  root.add(sakuraGroup);

  // ============================================================================
  // 3. Shiki-Momiji (敷き紅葉) — 2,600 Fallen Maple Leaves on Velvet Moss & Steps!
  // ============================================================================
  const singleLeafTex = getSingleMomijiLeafTexture();
  const fallenMat = new THREE.MeshStandardMaterial({
    map: singleLeafTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.8
  });
  const fallenGeo = new THREE.PlaneGeometry(0.24, 0.24);
  fallenGeo.rotateX(-Math.PI * 0.5);

  const fallenCount = 2600;
  const fallenInst = new THREE.InstancedMesh(fallenGeo, fallenMat, fallenCount);
  const fallenMeta = [];
  for (let i = 0; i < fallenCount; i++) {
    // Concentrate near maple corridors (Sanmon -> Niomon -> Steps -> Hondo -> Pond -> Tahoto -> Shigure-tei)
    let fx, fz;
    if (i < 1600) {
      const ref = mapleTrees[i % heroCoords.length];
      const ang = rng() * Math.PI * 2;
      const dist = Math.pow(rng(), 0.65) * 5.2;
      fx = ref.x + Math.cos(ang) * dist;
      fz = ref.z + Math.sin(ang) * dist;
    } else {
      fx = -48 + rng() * 116;
      fz = (rng() - 0.5) * 54;
    }
    const fy = getGroundHeight(fx, fz) + 0.035;
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set((rng() - 0.5) * 0.22, rng() * Math.PI * 2, (rng() - 0.5) * 0.22);
    const fs = 0.7 + rng() * 0.85;
    dummy.scale.set(fs, fs, fs);
    dummy.updateMatrix();
    fallenInst.setMatrixAt(i, dummy.matrix);
    fallenMeta.push(rng());
  }
  fallenInst.instanceMatrix.needsUpdate = true;
  root.add(fallenInst);

  // ============================================================================
  // 4. Ogurayama Mōsō Bamboo Grove (小倉山竹林 — South Hillside & Shigure-tei)
  // ============================================================================
  const bambooCount = 290;
  const culmGeo = new THREE.CylinderGeometry(0.055, 0.078, 1.0, 7);
  culmGeo.translate(0, 0.5, 0);
  const culmMat = new THREE.MeshStandardMaterial({
    color: 0x5c7c3e,
    roughness: 0.42,
    metalness: 0.06
  });
  culmMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float bend = sin(uTime * 1.15 + wp.x * 0.18 + wp.z * 0.21) * 0.045 * position.y * position.y;
         transformed.x += bend;
         transformed.z += bend * 0.6;`
      );
  };

  const bambooSprayTex = getBambooLeafSprayTexture();
  const bambooLeafMat = new THREE.MeshStandardMaterial({
    map: bambooSprayTex,
    color: 0x6c8e46,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.72
  });
  const bSprayGeo = mergeTwoBufferGeometries(
    new THREE.PlaneGeometry(1.75, 1.75),
    new THREE.PlaneGeometry(1.75, 1.75).rotateY(Math.PI * 0.5)
  );

  const culmInst = new THREE.InstancedMesh(culmGeo, culmMat, bambooCount);
  culmInst.castShadow = true;
  const bLeafInst = new THREE.InstancedMesh(bSprayGeo, bambooLeafMat, bambooCount * 3);

  const cCol = new THREE.Color();
  let bIdx = 0;
  let blIdx = 0;
  for (let i = 0; i < bambooCount * 3 && bIdx < bambooCount; i++) {
    const bx = -46 + rng() * 92;
    const bz = 24.5 + rng() * 34; // Authentic southern bamboo slope bordering Jōjakkō-ji!
    if (isWalkwayOrBuildingZone(bx, bz, 1.3)) continue;

    const by = getGroundHeight(bx, bz);
    const bh = 8.5 + rng() * 5.8;

    dummy.position.set(bx, by - 0.15, bz);
    dummy.rotation.set((rng() - 0.5) * 0.09, rng() * Math.PI * 2, (rng() - 0.5) * 0.09);
    dummy.scale.set(1, bh, 1);
    dummy.updateMatrix();
    culmInst.setMatrixAt(bIdx, dummy.matrix);

    const shade = 0.75 + rng() * 0.42;
    cCol.setRGB(0.36 * shade, 0.52 * shade, 0.24 * shade);
    culmInst.setColorAt(bIdx, cCol);

    for (let k = 0; k < 3; k++) {
      dummy.position.set(
        bx + (rng() - 0.5) * 0.8,
        by + bh * (0.68 + k * 0.14),
        bz + (rng() - 0.5) * 0.8
      );
      dummy.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.5);
      const ls = 1.05 + rng() * 0.55;
      dummy.scale.set(ls, ls, ls);
      dummy.updateMatrix();
      bLeafInst.setMatrixAt(blIdx++, dummy.matrix);
    }
    bIdx++;
  }
  culmInst.count = bIdx;
  bLeafInst.count = blIdx;
  culmInst.instanceMatrix.needsUpdate = true;
  if (culmInst.instanceColor) culmInst.instanceColor.needsUpdate = true;
  bLeafInst.instanceMatrix.needsUpdate = true;
  root.add(culmInst);
  root.add(bLeafInst);

  // ============================================================================
  // 5. Tall Kitayama/Ogura Sugi Cedars (北山杉・山杉) Framing Upper Mountain Ridge
  // ============================================================================
  const cedarCount = 140;
  const cedarTrunkInst = new THREE.InstancedMesh(limbGeo, trunkMat, cedarCount);
  const coneGeo = new THREE.ConeGeometry(1.85, 5.2, 7);
  const cedarFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x243d29,
    roughness: 0.9
  });
  const cedarConeInst = new THREE.InstancedMesh(coneGeo, cedarFoliageMat, cedarCount * 3);
  cedarConeInst.castShadow = true;

  let cCount = 0;
  for (let i = 0; i < 400 && cCount < cedarCount; i++) {
    // Upper western crest (-88..-36) & far northern flank (-68..-30)
    const isWest = rng() > 0.35;
    const cx = isWest ? -88 + rng() * 50 : -55 + rng() * 110;
    const cz = isWest ? (rng() - 0.5) * 125 : -32 - rng() * 36;
    if (isWalkwayOrBuildingZone(cx, cz, 3.0)) continue;
    // Keep eastern view corridor from Observatory clear!
    if (cx > -45 && Math.abs(cz) < 22) continue;

    const cy = getGroundHeight(cx, cz);
    const ch = 10.5 + rng() * 7.5;
    dummy.position.set(cx, cy - 0.2, cz);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(1.3, ch * 0.75, 1.3);
    dummy.updateMatrix();
    cedarTrunkInst.setMatrixAt(cCount, dummy.matrix);

    for (let t = 0; t < 3; t++) {
      const s = (1 - t * 0.22) * (0.85 + rng() * 0.35);
      dummy.position.set(cx, cy + ch * (0.45 + t * 0.2), cz);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.set(s, s * 1.15, s);
      dummy.updateMatrix();
      cedarConeInst.setMatrixAt(cCount * 3 + t, dummy.matrix);
    }
    cCount++;
  }
  cedarTrunkInst.count = cCount;
  cedarConeInst.count = cCount * 3;
  cedarTrunkInst.instanceMatrix.needsUpdate = true;
  cedarConeInst.instanceMatrix.needsUpdate = true;
  root.add(cedarTrunkInst);
  root.add(cedarConeInst);

  // ============================================================================
  // 6. Chisen-kansho-shiki Pond Water Shader + Rocks + Nishikigoi + Ogura Deer!
  // ============================================================================
  const pondSystem = buildPondAndGardenLife(rng, windUniform);
  root.add(pondSystem.group);

  // ============================================================================
  // Seasonal Color Engine (Autumn Momiji / Summer Ao-Momiji / Spring Sakura / Winter Snow)
  // ============================================================================
  const autumnPalette = [
    new THREE.Color(0xb81d18), // Deep velvet crimson (濃紅)
    new THREE.Color(0xe03422), // Kyoto scarlet (真紅)
    new THREE.Color(0xf05c22), // Vermilion persimmon (朱紅)
    new THREE.Color(0xf29b24), // Golden amber (琥珀)
    new THREE.Color(0xe8c12c), // Maple gold (山吹黄)
    new THREE.Color(0x5b7d2e)  // Shaded inner moss-olive (残緑)
  ];
  const summerPalette = [
    new THREE.Color(0x2d6e2c),
    new THREE.Color(0x3f8834),
    new THREE.Color(0x569e3d),
    new THREE.Color(0x6fb347),
    new THREE.Color(0x285c28)
  ];
  const springPalette = [
    new THREE.Color(0x5da146),
    new THREE.Color(0x76b856),
    new THREE.Color(0x94c969),
    new THREE.Color(0xd68996),
    new THREE.Color(0x4b873b)
  ];
  const winterPalette = [
    new THREE.Color(0xdde4ec),
    new THREE.Color(0xc8d0d8),
    new THREE.Color(0x9a7b6c),
    new THREE.Color(0xeef3f8)
  ];

  function applySeason(season = 'autumn') {
    const tmp = new THREE.Color();
    const pal =
      season === 'summer'
        ? summerPalette
        : season === 'spring'
        ? springPalette
        : season === 'winter'
        ? winterPalette
        : autumnPalette;

    for (let i = 0; i < totalClusters; i++) {
      const m = clusterMeta[i];
      if (season === 'autumn') {
        // Blend tree's inherent hue with canopy sun exposure so crowns blaze crimson & lower boughs glow amber-green!
        const score = m.treeHue * 0.65 + (1 - m.sunExposure) * 0.25 + m.localVar * 0.1;
        const idx = Math.min(pal.length - 2, Math.floor(score * (pal.length - 1)));
        const frac = score * (pal.length - 1) - idx;
        tmp.copy(pal[idx]).lerp(pal[idx + 1], frac);
      } else {
        const idx = Math.floor(((m.treeHue + m.localVar * 0.4) % 1) * pal.length);
        tmp.copy(pal[idx]);
      }
      leafInst.setColorAt(i, tmp);
    }
    leafInst.instanceColor.needsUpdate = true;

    // Weeping Cherry tree (枝垂桜): full sakura bloom in Spring, crimson-amber in Autumn, lush green in Summer, snow in Winter!
    for (let i = 0; i < 28; i++) {
      if (season === 'spring') tmp.setHex(i % 3 === 0 ? 0xf6ccd7 : 0xf2b5c6);
      else if (season === 'autumn') tmp.setHex(i % 2 === 0 ? 0xd45b2a : 0xe08f2c);
      else if (season === 'summer') tmp.setHex(0x3f8235);
      else tmp.setHex(0xe8eef5);
      sakuraClusters.setColorAt(i, tmp);
    }
    sakuraClusters.instanceColor.needsUpdate = true;

    // Fallen Shiki-momiji carpet
    fallenInst.visible = season === 'autumn' || season === 'spring';
    if (fallenInst.visible) {
      for (let i = 0; i < fallenCount; i++) {
        const r = fallenMeta[i];
        if (season === 'spring') {
          tmp.setHex(r > 0.5 ? 0xf3c4d0 : 0xe59fb0);
        } else {
          tmp.setHex(r < 0.45 ? 0xa81f1b : r < 0.8 ? 0xd6451f : 0xdf9b24);
        }
        fallenInst.setColorAt(i, tmp);
      }
      fallenInst.instanceColor.needsUpdate = true;
    }

    cedarFoliageMat.color.setHex(season === 'winter' ? 0x3b5244 : 0x243d29);
    bambooLeafMat.color.setHex(season === 'winter' ? 0x7d966c : 0x6c8e46);
  }

  applySeason('autumn');
  scene.add(root);

  return {
    root,
    applySeason,
    update(elapsed, dt) {
      windUniform.value = elapsed;
      pondSystem.update(elapsed, dt);
    }
  };
}

function buildPondAndGardenLife(rng, windUniform) {
  const group = new THREE.Group();
  const mats = getArchitecturalMaterials();

  // 1. Reflective Pond Water Surface with Rippling Shader!
  const pondGeo = new THREE.CircleGeometry(1.0, 40);
  pondGeo.rotateX(-Math.PI * 0.5);
  pondGeo.scale(POND_SPEC.rx * 0.96, 1, POND_SPEC.rz * 0.96);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x223833,
    roughness: 0.12,
    metalness: 0.68,
    transparent: true,
    opacity: 0.88
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(position.x * 2.8 + uTime * 1.9) * 0.012
                        + cos(position.z * 3.3 - uTime * 1.5) * 0.012;`
      );
  };

  const waterMesh = new THREE.Mesh(pondGeo, waterMat);
  waterMesh.position.set(POND_SPEC.cx, POND_SPEC.waterY, POND_SPEC.cz);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // 2. Mossy Garden Boulders (景石 Keiseki) framing the pond shoreline & central turtle islet (亀島)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rx = POND_SPEC.rx * (0.88 + rng() * 0.18);
    const rz = POND_SPEC.rz * (0.88 + rng() * 0.18);
    const bx = POND_SPEC.cx + Math.cos(a) * rx;
    const bz = POND_SPEC.cz + Math.sin(a) * rz;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.38 + rng() * 0.42, 1),
      i % 2 === 0 ? mats.mossyGranite : mats.granite
    );
    rock.scale.set(1.2, 0.65, 1.0);
    rock.position.set(bx, POND_SPEC.waterY + 0.05, bz);
    rock.rotation.set(rng(), rng(), rng());
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // Central Turtle Rock Islet (亀島)
  const islet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), mats.mossyGranite);
  islet.scale.set(1.4, 0.48, 0.95);
  islet.position.set(POND_SPEC.cx - 0.8, POND_SPEC.waterY + 0.08, POND_SPEC.cz - 0.3);
  group.add(islet);

  // 3. Five Graceful Nishikigoi Carp Swimming in the Pond!
  const koiColors = [0xd94426, 0xf2f0eb, 0xe69f24, 0xc92c1d, 0xf08532];
  const kois = [];
  for (let k = 0; k < 5; k++) {
    const koiGrp = new THREE.Group();
    const kMat = new THREE.MeshStandardMaterial({ color: koiColors[k], roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 8), kMat);
    body.rotation.x = Math.PI * 0.5;
    koiGrp.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), kMat);
    tail.rotation.x = -Math.PI * 0.5;
    tail.position.z = -0.19;
    koiGrp.add(tail);

    group.add(koiGrp);
    kois.push({
      mesh: koiGrp,
      tail,
      phase: k * 1.25,
      speed: 0.26 + k * 0.04,
      rx: 1.8 + (k % 3) * 0.75,
      rz: 1.25 + (k % 2) * 0.65
    });
  }

  // 4. Two Poetic Mount Ogura Deer (小倉山の牡鹿・牝鹿 — Waka Poetry Symbol of Jōjakkō-ji!)
  // Quietly resting/grazing in the mossy maple glade between Tahōtō & Kasenshi (-35.2, z: 14.5)
  const deerPair = [];
  const deerSpecs = [
    { x: -35.2, z: 14.6, yaw: 0.85, stag: true },
    { x: -36.4, z: 16.0, yaw: 1.35, stag: false }
  ];
  const furMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.88 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.75 });

  deerSpecs.forEach((ds) => {
    const dGrp = new THREE.Group();
    const dy = getGroundHeight(ds.x, ds.z);
    dGrp.position.set(ds.x, dy, ds.z);
    dGrp.rotation.y = ds.yaw;

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 6, 10), furMat);
    torso.rotation.x = Math.PI * 0.5;
    torso.position.y = 0.72;
    torso.castShadow = true;
    dGrp.add(torso);

    for (const lx of [-0.12, 0.12]) {
      for (const lz of [-0.26, 0.26]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.68, 6), furMat);
        leg.position.set(lx, 0.34, lz);
        leg.castShadow = true;
        dGrp.add(leg);
      }
    }

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.82, 0.32);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.42, 8), furMat);
    neck.position.set(0, 0.18, 0.08);
    neck.rotation.x = 0.35;
    neckPivot.add(neck);

    const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.18, 5, 8), furMat);
    head.rotation.x = Math.PI * 0.45;
    head.position.set(0, 0.36, 0.2);
    neckPivot.add(head);

    if (ds.stag) {
      for (const s of [-1, 1]) {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.38, 5), antlerMat);
        antler.position.set(s * 0.09, 0.56, 0.12);
        antler.rotation.z = -s * 0.38;
        antler.rotation.x = -0.2;
        neckPivot.add(antler);
      }
    }

    dGrp.add(neckPivot);
    group.add(dGrp);
    deerPair.push({ neckPivot, phase: ds.stag ? 0 : 2.1 });
  });

  function update(elapsed) {
    // Swim Nishikigoi along smooth Lissajous curves
    kois.forEach((k) => {
      const t = elapsed * k.speed + k.phase;
      const nx = POND_SPEC.cx + Math.cos(t) * k.rx;
      const nz = POND_SPEC.cz + Math.sin(t * 1.5) * k.rz;
      const dx = -Math.sin(t) * k.rx;
      const dz = Math.cos(t * 1.5) * 1.5 * k.rz;
      k.mesh.position.set(nx, POND_SPEC.waterY - 0.09, nz);
      k.mesh.rotation.y = Math.atan2(dx, dz);
      k.tail.rotation.y = Math.sin(elapsed * 7.5 + k.phase) * 0.32;
    });

    // Gentle deer head nod / look
    deerPair.forEach((d) => {
      d.neckPivot.rotation.x = Math.sin(elapsed * 0.75 + d.phase) * 0.14;
      d.neckPivot.rotation.y = Math.cos(elapsed * 0.48 + d.phase) * 0.18;
    });
  }

  return { group, update };
}

function mergeTwoBufferGeometries(g1, g2) {
  const out = new THREE.BufferGeometry();
  const p1 = g1.attributes.position.array;
  const p2 = g2.attributes.position.array;
  const n1 = g1.attributes.normal.array;
  const n2 = g2.attributes.normal.array;
  const u1 = g1.attributes.uv.array;
  const u2 = g2.attributes.uv.array;

  const pos = new Float32Array(p1.length + p2.length);
  pos.set(p1, 0);
  pos.set(p2, p1.length);

  const norm = new Float32Array(n1.length + n2.length);
  norm.set(n1, 0);
  norm.set(n2, n1.length);

  const uv = new Float32Array(u1.length + u2.length);
  uv.set(u1, 0);
  uv.set(u2, u1.length);

  const i1 = g1.index.array;
  const i2 = g2.index.array;
  const vOffset = p1.length / 3;
  const idx = new Uint16Array(i1.length + i2.length);
  idx.set(i1, 0);
  for (let i = 0; i < i2.length; i++) idx[i1.length + i] = i2[i] + vOffset;

  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
