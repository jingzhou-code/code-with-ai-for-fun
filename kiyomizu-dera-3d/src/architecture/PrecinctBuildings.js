import * as THREE from 'three';
import { getTerrainHeight } from '../world/SitePlan.js';
import {
  createCurvedJapaneseRoof,
  createKarahafuCanopy,
  createKoranBalustrade,
  createStoneLantern,
  createCalligraphyPlaque,
  createIshigakiPlatform,
} from './JapaneseRoofBuilder.js';

export function buildAllPrecinctBuildings(materials) {
  const precinct = new THREE.Group();
  precinct.name = 'KiyomizuPrecinctBuildings';

  // Animated handles returned to main loop (bell strike, waterfall streams, pond water)
  const animatedRefs = {
    bellGroup: null,
    shumokuStriker: null,
    bellSwingTimer: 0,
    bellWaveMesh: null,
    waterfallStreams: [],
    waterfallSplashParticles: null,
    pondMeshes: [],
  };

  // Helper to build a standard classical hall quickly with full architectural fidelity
  function createClassicalHall({
    width,
    depth,
    wallH = 4.2,
    roofH = 3.6,
    overhang = 1.5,
    roofStyle = 'irimoya',
    ridgeAxis = 'x',
    roofMat = materials.kawarabuki,
    pillarMat = materials.keyakiPillar,
    wallMat = materials.shikkui,
    veranda = true,
    plinthH = 0.75,
    plaqueText = null,
    frontDir = '+z', // '+z' | '-z' | '-x' | '+x'
  }) {
    const g = new THREE.Group();

    const plinth = createIshigakiPlatform(width + 1.8, depth + 1.8, plinthH, materials.ishigaki, 0.12);
    g.add(plinth);

    const bodyY = plinthH;
    if (veranda) {
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(width + 1.1, 0.18, depth + 1.1),
        materials.hinokiStage
      );
      deck.position.y = bodyY + 0.09;
      deck.receiveShadow = true;
      g.add(deck);
    }

    // Core plaster & timber wall box
    const core = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, wallH, depth - 0.5), wallMat);
    core.position.y = bodyY + wallH * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    g.add(core);

    // Lower timber wainscoting & front wooden lattice doors (桟唐戸 / 格子戸)
    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.42, wallH * 0.42, depth - 0.42),
      materials.machiyaWood
    );
    wainscot.position.y = bodyY + wallH * 0.21;
    g.add(wainscot);

    // Perimeter columns
    const baysX = Math.max(2, Math.round(width / 2.6));
    const baysZ = Math.max(2, Math.round(depth / 2.6));
    for (let ix = 0; ix <= baysX; ix++) {
      for (let iz = 0; iz <= baysZ; iz++) {
        if (ix > 0 && ix < baysX && iz > 0 && iz < baysZ) continue;
        const px = -width * 0.5 + (ix / baysX) * width;
        const pz = -depth * 0.5 + (iz / baysZ) * depth;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, wallH, 10), pillarMat);
        col.position.set(px, bodyY + wallH * 0.5, pz);
        col.castShadow = true;
        g.add(col);
      }
    }

    // Horizontal head beam (頭貫)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.28, 0.26, depth + 0.28), pillarMat);
    beam.position.y = bodyY + wallH - 0.15;
    g.add(beam);

    // Curved Roof
    const roof = createCurvedJapaneseRoof({
      width,
      depth,
      height: roofH,
      overhang,
      style: roofStyle,
      ridgeAxis,
      roofMaterial: roofMat,
      trimMaterial: materials.keyakiDark,
      gableMaterial: materials.shikkui,
      ornamentMaterial: materials.bronzeSorin,
    });
    roof.position.y = bodyY + wallH;
    g.add(roof);

    // Front wooden steps & optional calligraphy plaque
    const stepW = Math.min(3.2, width * 0.4);
    const steps = new THREE.Mesh(new THREE.BoxGeometry(stepW, plinthH, 1.1), materials.paving);
    if (frontDir === '+z') steps.position.set(0, plinthH * 0.5, depth * 0.5 + 1.0);
    else if (frontDir === '-z') steps.position.set(0, plinthH * 0.5, -depth * 0.5 - 1.0);
    else if (frontDir === '-x') {
      steps.rotation.y = Math.PI * 0.5;
      steps.position.set(-width * 0.5 - 1.0, plinthH * 0.5, 0);
    } else if (frontDir === '+x') {
      steps.rotation.y = Math.PI * 0.5;
      steps.position.set(width * 0.5 + 1.0, plinthH * 0.5, 0);
    }
    g.add(steps);

    if (plaqueText) {
      const plaque = createCalligraphyPlaque(plaqueText, 1.55, 0.68);
      if (frontDir === '+z') plaque.position.set(0, bodyY + wallH - 0.55, depth * 0.5 + 0.16);
      else if (frontDir === '-z') {
        plaque.rotation.y = Math.PI;
        plaque.position.set(0, bodyY + wallH - 0.55, -depth * 0.5 - 0.16);
      } else if (frontDir === '-x') {
        plaque.rotation.y = -Math.PI * 0.5;
        plaque.position.set(-width * 0.5 - 0.16, bodyY + wallH - 0.55, 0);
      }
      g.add(plaque);
    }

    return g;
  }

  // =========================================================================
  // 1. NIO-MON (仁王門 / 赤門, 1500) + KOMAINU GUARDIAN LIONS
  // =========================================================================
  const niomon = new THREE.Group();
  niomon.position.set(-101.0, 10.5, 4.0);
  niomon.userData.landmarkId = 'niomon';

  const nioPlinth = createIshigakiPlatform(7.2, 12.2, 0.9, materials.paving, 0.08);
  niomon.add(nioPlinth);

  // Two-story vermilion Romon (5.2m E-W x 10.4m N-S, ridgeAxis = 'z' facing West -X)
  const nioLowerH = 4.9;
  const nioUpperH = 3.3;
  // 12 vermilion pillars (3 bays N-S x 2 bays E-W)
  const nioX = [-2.3, 0, 2.3];
  const nioZ = [-4.8, -1.7, 1.7, 4.8];
  for (const px of nioX) {
    for (const pz of nioZ) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.3, nioLowerH + nioUpperH, 12),
        materials.vermilion
      );
      col.position.set(px, 0.9 + (nioLowerH + nioUpperH) * 0.5, pz);
      col.castShadow = true;
      niomon.add(col);
    }
  }

  // North & South Nio guardian chambers (leaving central bay z in [-1.7, 1.7] open!)
  for (const sideZ of [-3.25, 3.25]) {
    const cage = new THREE.Mesh(new THREE.BoxGeometry(4.3, nioLowerH - 0.4, 2.85), materials.machiyaWood);
    cage.position.set(0, 0.9 + nioLowerH * 0.48, sideZ);
    cage.castShadow = true;
    niomon.add(cage);

    // Stylized Kongorikishi (仁王像 Agyo & Ungyo) muscular vermilion/gold silhouette behind West grille
    const nioStatue = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 1.65, 8), materials.vermilion);
    torso.position.y = 1.65;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), materials.vermilion);
    head.position.y = 2.75;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 6, 16), materials.goldGiboshi);
    halo.rotation.y = Math.PI * 0.5;
    halo.position.set(0.25, 2.65, 0);
    nioStatue.add(torso, head, halo);
    nioStatue.position.set(-1.35, 0.9, sideZ);
    niomon.add(nioStatue);
  }

  // Mid-level腰屋根 skirt & upper story vermilion balustrade + white plaster core
  const nioSkirt = createCurvedJapaneseRoof({
    width: 6.0,
    depth: 11.2,
    height: 1.25,
    overhang: 1.35,
    style: 'yosemune',
    ridgeAxis: 'z',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.vermilion,
  });
  nioSkirt.position.y = 0.9 + nioLowerH - 0.35;
  niomon.add(nioSkirt);

  const nioUpperCore = new THREE.Mesh(new THREE.BoxGeometry(4.4, nioUpperH, 9.4), materials.shikkui);
  nioUpperCore.position.y = 0.9 + nioLowerH + nioUpperH * 0.5;
  nioUpperCore.castShadow = true;
  niomon.add(nioUpperCore);

  const nioUpperTrim = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.45, 9.52), materials.vermilion);
  nioUpperTrim.position.y = 0.9 + nioLowerH + nioUpperH - 0.25;
  niomon.add(nioUpperTrim);

  // Fujiwara no Yukinari's famous 「清水寺」 plaque on West facade
  const kiyomizuPlaque = createCalligraphyPlaque('清水寺', 1.9, 0.95);
  kiyomizuPlaque.rotation.y = -Math.PI * 0.5;
  kiyomizuPlaque.position.set(-2.55, 0.9 + nioLowerH + 0.55, 0);
  niomon.add(kiyomizuPlaque);

  // Monumental Irimoya Cypress-Bark Roof (棟高約14m!)
  const nioRoof = createCurvedJapaneseRoof({
    width: 5.8,
    depth: 11.0,
    height: 5.1,
    overhang: 2.1,
    style: 'irimoya',
    ridgeAxis: 'z',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.keyakiDark,
    gableMaterial: materials.vermilion,
    ornamentMaterial: materials.goldGiboshi,
    thickness: 0.42,
    cornerLift: 0.45,
  });
  nioRoof.position.y = 0.9 + nioLowerH + nioUpperH;
  niomon.add(nioRoof);

  // Pair of Open-Mouthed Komainu (阿阿の狛犬) flanking the foot of Nio-mon grand stairs
  for (const kz of [-0.6, 8.6]) {
    const ped = createIshigakiPlatform(1.5, 1.5, 1.35, materials.ishigaki, 0.08);
    ped.position.set(-114.2, 6.0, kz);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.62), materials.stoneLantern);
    body.position.set(0, 1.82, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.52), materials.stoneLantern);
    head.position.set(-0.22, 2.38, 0);
    ped.add(body, head);
    precinct.add(ped);
  }
  precinct.add(niomon);

  // =========================================================================
  // 2. UMATODOME (馬駐 — Muromachi Horse-Tethering Stable)
  // =========================================================================
  const umatodome = new THREE.Group();
  umatodome.position.set(-100.0, 10.5, -13.2);
  umatodome.userData.landmarkId = 'shoro';
  const umaBase = createIshigakiPlatform(8.4, 4.4, 0.45, materials.paving, 0.05);
  umatodome.add(umaBase);
  for (let ux = -3.6; ux <= 3.6; ux += 2.4) {
    for (const uz of [-1.6, 1.6]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.0, 0.22), materials.machiyaWood);
      p.position.set(ux, 1.95, uz);
      p.castShadow = true;
      umatodome.add(p);
    }
  }
  const umaWall = new THREE.Mesh(new THREE.BoxGeometry(7.3, 2.6, 0.18), materials.machiyaWood);
  umaWall.position.set(0, 1.75, -1.6);
  umatodome.add(umaWall);
  const umaRoof = createCurvedJapaneseRoof({
    width: 8.0,
    depth: 3.8,
    height: 1.85,
    overhang: 1.0,
    style: 'kirizuma',
    roofMaterial: materials.kawarabuki,
    gableMaterial: materials.machiyaWood,
  });
  umaRoof.position.y = 3.45;
  umatodome.add(umaRoof);
  precinct.add(umatodome);

  // =========================================================================
  // 3. SHORO BELL TOWER (鐘楼, 1607 — 6 Vermilion Pillars + Interactive 1478 Bell!)
  // =========================================================================
  const shoro = new THREE.Group();
  shoro.position.set(-83.0, 12.0, -10.2);
  shoro.userData.landmarkId = 'shoro';

  const shoroBase = createIshigakiPlatform(6.8, 6.8, 1.35, materials.ishigaki, 0.16);
  shoro.add(shoroBase);

  // Famous 6-pillar Momoyama support layout
  const shoroPts = [
    [-2.1, -2.1],
    [0, -2.1],
    [2.1, -2.1],
    [-2.1, 2.1],
    [0, 2.1],
    [2.1, 2.1],
  ];
  for (const [px, pz] of shoroPts) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.3, 12), materials.vermilion);
    col.position.set(px, 1.35 + 2.15, pz);
    col.castShadow = true;
    shoro.add(col);
  }
  const shoroFrieze = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.45, 4.6), materials.polychrome);
  shoroFrieze.position.y = 1.35 + 4.15;
  shoro.add(shoroFrieze);

  // Great 1478 Bronze Temple Bell (梵鐘 Bonsho)
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 1.35 + 4.05, 0);
  const bellBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.76, 1.75, 18, 1, true),
    materials.agedBellBronze
  );
  bellBody.position.y = -1.15;
  const bellCrown = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 10), materials.agedBellBronze);
  bellCrown.position.y = -0.32;
  bellPivot.add(bellBody, bellCrown);
  shoro.add(bellPivot);
  animatedRefs.bellGroup = bellPivot;

  // Swinging Wooden Striker Log (撞木 Shumoku)
  const shumoku = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 10), materials.keyakiPillar);
  shumoku.rotation.z = Math.PI * 0.5;
  shumoku.position.set(-1.65, 1.35 + 2.65, 0);
  shoro.add(shumoku);
  animatedRefs.shumokuStriker = shumoku;

  // Expanding Sonic Ripple Ring when Bell is struck!
  const waveGeo = new THREE.RingGeometry(0.8, 1.15, 36);
  waveGeo.rotateX(-Math.PI * 0.5);
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0xf4c76b,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const bellWave = new THREE.Mesh(waveGeo, waveMat);
  bellWave.position.set(0, 1.35 + 2.65, 0);
  shoro.add(bellWave);
  animatedRefs.bellWaveMesh = bellWave;

  const shoroRoof = createCurvedJapaneseRoof({
    width: 5.4,
    depth: 5.4,
    height: 3.3,
    overhang: 1.75,
    style: 'irimoya',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.vermilion,
    gableMaterial: materials.polychrome,
    ornamentMaterial: materials.goldGiboshi,
  });
  shoroRoof.position.y = 1.35 + 4.35;
  shoro.add(shoroRoof);
  precinct.add(shoro);

  // =========================================================================
  // 4. SAI-MON (西門 — 1633 Sunset Meditation Gate with Rear Karahafu)
  // =========================================================================
  const saimon = new THREE.Group();
  saimon.position.set(-77.5, 15.2, 6.0);
  saimon.userData.landmarkId = 'saimon';

  const saiBase = createIshigakiPlatform(6.2, 9.6, 0.85, materials.ishigaki, 0.14);
  saimon.add(saiBase);

  for (const px of [-1.9, 0, 1.9]) {
    for (const pz of [-3.6, -1.2, 1.2, 3.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 4.6, 12), materials.vermilion);
      col.position.set(px, 0.85 + 2.3, pz);
      col.castShadow = true;
      saimon.add(col);
    }
  }
  const saiPoly = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.52, 7.6), materials.polychrome);
  saiPoly.position.y = 0.85 + 4.45;
  saimon.add(saiPoly);

  const saiRail = createKoranBalustrade({
    length: 7.4,
    woodMaterial: materials.vermilion,
    giboshiMaterial: materials.goldGiboshi,
  });
  saiRail.rotation.y = Math.PI * 0.5;
  saiRail.position.set(-2.15, 0.85, 0);
  saimon.add(saiRail);

  const saiRoof = createCurvedJapaneseRoof({
    width: 4.8,
    depth: 8.6,
    height: 3.5,
    overhang: 1.75,
    style: 'kirizuma',
    ridgeAxis: 'z',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.vermilion,
    gableMaterial: materials.polychrome,
    ornamentMaterial: materials.goldGiboshi,
  });
  saiRoof.position.y = 0.85 + 4.65;
  saimon.add(saiRoof);

  // Rear Noki-Karahafu (背面軒唐破風) on East side of Sai-mon!
  const saiKara = createKarahafuCanopy({
    width: 3.8,
    depth: 2.1,
    height: 1.15,
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.goldGiboshi,
  });
  saiKara.rotation.y = Math.PI * 0.5;
  saiKara.position.set(2.4, 0.85 + 4.3, 0);
  saimon.add(saiKara);
  precinct.add(saimon);

  // =========================================================================
  // 5. SANJU-NO-TO (三重塔, 1632 — 30.5m Tall Vermilion Three-Storied Pagoda!)
  // =========================================================================
  const pagoda = buildThreeStoriedPagoda({
    totalTowerBodyH: 21.2,
    sorinH: 8.4,
    baseWidth: 6.8,
    roofMat: materials.kawarabuki,
    pillarMat: materials.vermilion,
    wallMat: materials.shikkui,
    bracketMat: materials.polychrome,
    materials,
  });
  pagoda.position.set(-58.0, 16.6, 13.0);
  pagoda.userData.landmarkId = 'sanjunoto';
  precinct.add(pagoda);

  // =========================================================================
  // 6. ZUIGU-DO (随求堂, 1735), KYO-DO (経堂, 1633) & TAMURA-DO (開山堂, 1633)
  // =========================================================================
  const zuigudo = createClassicalHall({
    width: 11.4,
    depth: 9.8,
    wallH: 4.3,
    roofH: 3.9,
    overhang: 1.65,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiPillar,
    plaqueText: '大随求堂',
    frontDir: '+z',
  });
  const zuiguPorch = createKarahafuCanopy({
    width: 4.2,
    depth: 2.6,
    height: 1.25,
    roofMaterial: materials.kawarabuki,
    trimMaterial: materials.goldGiboshi,
  });
  zuiguPorch.position.set(0, 4.7, 5.4);
  zuigudo.add(zuiguPorch);
  // Big glowing Chochin lantern at Zuigu-do entrance
  const zuiguChochin = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 14, 12),
    materials.lanternGlow
  );
  zuiguChochin.scale.set(0.85, 1.35, 0.85);
  zuiguChochin.position.set(0, 3.85, 5.5);
  zuigudo.add(zuiguChochin);
  zuigudo.position.set(-64.5, 14.2, -13.5);
  zuigudo.userData.landmarkId = 'zuigudo_kyodo';
  precinct.add(zuigudo);

  // Kyo-do (経堂 — 5-bay Sutra Hall next to Sanju-no-to)
  const kyodo = createClassicalHall({
    width: 13.6,
    depth: 9.6,
    wallH: 4.5,
    roofH: 4.1,
    overhang: 1.7,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.vermilion,
    plaqueText: '経堂',
    frontDir: '-z',
  });
  kyodo.position.set(-39.0, 16.8, 11.0);
  kyodo.userData.landmarkId = 'zuigudo_kyodo';
  precinct.add(kyodo);

  // Tamura-do / Kaisan-do (田村堂・開山堂 — 3-bay ornate hall)
  const tamurado = createClassicalHall({
    width: 8.6,
    depth: 8.2,
    wallH: 4.1,
    roofH: 3.6,
    overhang: 1.55,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.vermilion,
    plaqueText: '開山堂',
    frontDir: '-z',
  });
  tamurado.position.set(-23.0, 17.0, 10.2);
  tamurado.userData.landmarkId = 'zuigudo_kyodo';
  precinct.add(tamurado);

  // =========================================================================
  // 7. TODOROKI-MON (轟門), ASAKURA-DO (朝倉堂), KASUGA-SHA & KAIRO (回廊)
  // =========================================================================
  const todorokimon = new THREE.Group();
  todorokimon.position.set(-8.0, 18.0, 2.0);
  todorokimon.userData.landmarkId = 'todorokimon_asakurado';
  const todBase = createIshigakiPlatform(4.8, 7.6, 0.55, materials.paving, 0.08);
  todorokimon.add(todBase);
  for (const px of [-1.5, 0, 1.5]) {
    for (const pz of [-2.8, -0.95, 0.95, 2.8]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 4.1, 10), materials.vermilion);
      col.position.set(px, 0.55 + 2.05, pz);
      col.castShadow = true;
      todorokimon.add(col);
    }
  }
  const todRoof = createCurvedJapaneseRoof({
    width: 4.4,
    depth: 7.4,
    height: 2.9,
    overhang: 1.5,
    style: 'kirizuma',
    ridgeAxis: 'z',
    roofMaterial: materials.kawarabuki,
    trimMaterial: materials.vermilion,
    gableMaterial: materials.shikkui,
  });
  todRoof.position.y = 0.55 + 4.1;
  todorokimon.add(todRoof);
  precinct.add(todorokimon);

  // Covered Wooden Kairo Corridor (回廊) connecting Todoroki-mon Eastward to Hondo West Kuramayose!
  const kairo = new THREE.Group();
  kairo.position.set(-0.8, 18.2, 2.0);
  kairo.userData.landmarkId = 'todorokimon_asakurado';
  const kairoFloor = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.35, 3.8), materials.hinokiStage);
  kairoFloor.position.y = 0.18;
  kairo.add(kairoFloor);
  for (let kx = -5.2; kx <= 5.2; kx += 2.6) {
    for (const kz of [-1.55, 1.55]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 3.3, 8), materials.keyakiPillar);
      col.position.set(kx, 1.85, kz);
      col.castShadow = true;
      kairo.add(col);
    }
  }
  const kairoRoof = createCurvedJapaneseRoof({
    width: 11.8,
    depth: 3.9,
    height: 1.65,
    overhang: 1.0,
    style: 'kirizuma',
    roofMaterial: materials.hiwadabuki,
    gableMaterial: materials.keyakiDark,
  });
  kairoRoof.position.y = 3.5;
  kairo.add(kairoRoof);
  precinct.add(kairo);

  // Asakura-do (朝倉堂 — 5-bay hall North of Kairo)
  const asakurado = createClassicalHall({
    width: 13.0,
    depth: 9.4,
    wallH: 4.2,
    roofH: 3.8,
    overhang: 1.55,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiPillar,
    plaqueText: '朝倉堂',
    frontDir: '+z',
  });
  asakurado.position.set(-7.5, 18.0, -12.5);
  asakurado.userData.landmarkId = 'todorokimon_asakurado';
  precinct.add(asakurado);

  // Kasuga-sha (鎮守堂・春日社 — Muromachi ICP guardian shrine)
  const kasugasha = createClassicalHall({
    width: 4.4,
    depth: 4.2,
    wallH: 3.2,
    roofH: 2.7,
    overhang: 1.25,
    roofStyle: 'irimoya',
    roofMat: materials.hiwadabuki,
    pillarMat: materials.vermilion,
    frontDir: '+z',
  });
  kasugasha.position.set(-19.5, 18.0, -13.5);
  kasugasha.userData.landmarkId = 'todorokimon_asakurado';
  precinct.add(kasugasha);

  // =========================================================================
  // 8. DAIKODO (大講堂・多宝閣), KITA-SOMON, SENTAI SEKIBUTSU & JOJU-IN MOON GARDEN
  // =========================================================================
  const daikodo = new THREE.Group();
  daikodo.position.set(-82.0, 13.5, -44.0);
  // East & West wings + central Tahokaku (多宝閣)
  for (const wx of [-9.5, 9.5]) {
    const wing = createClassicalHall({
      width: 9.0,
      depth: 8.2,
      wallH: 4.2,
      roofH: 3.1,
      roofMat: materials.kawarabuki,
      frontDir: '+z',
    });
    wing.position.set(wx, 0, 0);
    daikodo.add(wing);
  }
  const tahokaku = buildThreeStoriedPagoda({
    totalTowerBodyH: 11.5,
    sorinH: 4.2,
    baseWidth: 6.4,
    tiers: 2,
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiPillar,
    wallMat: materials.shikkui,
    bracketMat: materials.keyakiDark,
    materials,
  });
  daikodo.add(tahokaku);
  precinct.add(daikodo);

  // Kita-Somon Gate (本坊北総門)
  const kitaSomon = createClassicalHall({
    width: 5.2,
    depth: 3.4,
    wallH: 3.4,
    roofH: 2.2,
    roofStyle: 'kirizuma',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiDark,
    frontDir: '+z',
  });
  kitaSomon.position.set(-26.0, 18.2, -26.0);
  kitaSomon.userData.landmarkId = 'jojuin_moon_garden';
  precinct.add(kitaSomon);

  // Sentai Sekibutsu-gun (千体石仏群 — Stepped Stone Buddha Statues with Red Bibs!)
  const sekibutsuGroup = new THREE.Group();
  sekibutsuGroup.position.set(-8.0, 18.6, -34.0);
  sekibutsuGroup.userData.landmarkId = 'jojuin_moon_garden';
  for (let row = 0; row < 4; row++) {
    const stepLedge = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.35, 0.8), materials.ishigaki);
    stepLedge.position.set(0, row * 0.42, -row * 0.85);
    sekibutsuGroup.add(stepLedge);
    for (let col = -4.0; col <= 4.0; col += 0.68) {
      const jizo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.52, 6), materials.stoneLantern);
      jizo.position.set(col, row * 0.42 + 0.42, -row * 0.85);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), materials.stoneLantern);
      head.position.set(col, row * 0.42 + 0.74, -row * 0.85);
      const bib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), materials.redMosen);
      bib.position.set(col, row * 0.42 + 0.52, -row * 0.85 + 0.06);
      sekibutsuGroup.add(jizo, head, bib);
    }
  }
  precinct.add(sekibutsuGroup);

  // Joju-in Honbo & National Place of Scenic Beauty "Tsuki-no-Niwa" (成就院・名勝「月の庭」)
  const jojuin = new THREE.Group();
  jojuin.position.set(-18.0, 19.0, -51.0);
  jojuin.userData.landmarkId = 'jojuin_moon_garden';

  const shoin = createClassicalHall({
    width: 15.6,
    depth: 9.2,
    wallH: 3.9,
    roofH: 3.5,
    overhang: 1.6,
    roofStyle: 'irimoya',
    roofMat: materials.hiwadabuki,
    pillarMat: materials.keyakiDark,
    plaqueText: '成就院',
    frontDir: '-z',
  });
  jojuin.add(shoin);

  // White Tsuiji-bei (築地塀) courtyard wall enclosing Joju-in South & West
  const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(24.0, 2.4, 0.35), materials.shikkui);
  wallSouth.position.set(0, 1.2, 7.2);
  const wallCap = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.32, 0.68), materials.kawarabuki);
  wallCap.position.set(0, 2.5, 7.2);
  jojuin.add(wallSouth, wallCap);

  // Tsuki-no-Niwa Mirror Pond (月の庭 池泉) at world (-18, 18.35, -65) => local (0, -0.65, -14)
  const pondMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1f3a38),
    roughness: 0.08,
    metalness: 0.15,
    reflectivity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const moonPond = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.2, 0.14, 28), pondMat);
  moonPond.scale.set(1.15, 1, 0.68);
  moonPond.position.set(0, -0.58, -14.0);
  moonPond.receiveShadow = true;
  jojuin.add(moonPond);
  animatedRefs.pondMeshes.push(moonPond);

  // Scenic garden boulders (烏帽子石), clipped Karikomi shrubs & Yukimi stone lanterns around Moon Pond
  for (let b = 0; b < 14; b++) {
    const ang = (b / 14) * Math.PI * 2;
    const rx = Math.cos(ang) * 9.2;
    const rz = -14.0 + Math.sin(ang) * 5.6;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + (b % 3) * 0.35, 1), materials.ishigaki);
    rock.scale.set(1.2, 0.7, 1.0);
    rock.position.set(rx, -0.2, rz);
    rock.castShadow = true;
    jojuin.add(rock);
  }
  const moonLantern = createStoneLantern(materials, 0.92);
  moonLantern.position.set(4.8, -0.45, -11.5);
  jojuin.add(moonLantern);
  precinct.add(jojuin);

  // =========================================================================
  // 9. JISHU JINJA SHRINE (地主神社, 1633 — Torii, Polychrome Honden & 18m Love Stones!)
  // =========================================================================
  const jishu = new THREE.Group();
  jishu.position.set(24.0, 23.5, -37.0);
  jishu.userData.landmarkId = 'jishu_shrine';

  // Vibrant Shinto Myojin Torii (明神鳥居) at South entrance of shrine terrace (z = +11.5 => world z = -25.5)
  const torii = new THREE.Group();
  torii.position.set(0, 0, 11.5);
  for (const tx of [-2.2, 2.2]) {
    const tCol = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 5.4, 12), materials.vermilion);
    tCol.position.set(tx, 2.7, 0);
    tCol.castShadow = true;
    torii.add(tCol);
  }
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.32, 0.42), materials.vermilion);
  kasagi.position.y = 5.45;
  const kasagiCap = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.16, 0.48), materials.keyakiDark);
  kasagiCap.position.y = 5.66;
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.24, 0.26), materials.vermilion);
  nuki.position.y = 4.35;
  const jishuPlaque = createCalligraphyPlaque('地主神社', 1.25, 0.75);
  jishuPlaque.position.set(0, 4.9, 0.18);
  torii.add(kasagi, kasagiCap, nuki, jishuPlaque);
  jishu.add(torii);

  // Famous Pair of Love Fortune-Telling Stones (恋占いの石 — spaced 18 meters apart!)
  for (const stoneX of [-9.0, 9.0]) {
    const loveStoneGroup = new THREE.Group();
    loveStoneGroup.position.set(stoneX, 0, 5.5);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), materials.ishigaki);
    boulder.scale.set(1.1, 0.95, 1.1);
    boulder.position.y = 0.52;
    boulder.castShadow = true;
    // Sacred Shimenawa rope ring + white Shide paper zigzags
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 6, 16), materials.goldGiboshi);
    rope.rotation.x = Math.PI * 0.5;
    rope.position.y = 0.62;
    const signPost = createCalligraphyPlaque('恋占石', 0.75, 0.42);
    signPost.position.set(0, 1.35, 0);
    loveStoneGroup.add(boulder, rope, signPost);
    jishu.add(loveStoneGroup);
  }

  // Haiden (拝殿) & Elevated Polychrome Honden (本殿)
  const haiden = createClassicalHall({
    width: 9.4,
    depth: 6.4,
    wallH: 3.8,
    roofH: 3.3,
    roofStyle: 'irimoya',
    roofMat: materials.hiwadabuki,
    pillarMat: materials.vermilion,
    plaqueText: '縁結大社',
    frontDir: '+z',
  });
  haiden.position.set(0, 0, -0.5);
  jishu.add(haiden);

  const honden = createClassicalHall({
    width: 7.6,
    depth: 5.8,
    wallH: 4.1,
    roofH: 3.8,
    plinthH: 1.65,
    roofStyle: 'irimoya',
    roofMat: materials.hiwadabuki,
    pillarMat: materials.vermilion,
    wallMat: materials.polychrome,
    frontDir: '+z',
  });
  honden.position.set(0, 0.4, -7.8);
  jishu.add(honden);
  precinct.add(jishu);

  // =========================================================================
  // 10. SHAKA-DO (釈迦堂), HYAKUTAI JIZO-DO & AMIDA-DO (阿弥陀堂)
  // =========================================================================
  const shakado = createClassicalHall({
    width: 8.8,
    depth: 7.6,
    wallH: 3.9,
    roofH: 3.4,
    roofStyle: 'yosemune',
    roofMat: materials.hiwadabuki,
    pillarMat: materials.keyakiPillar,
    plaqueText: '釈迦堂',
    frontDir: '+z',
  });
  shakado.position.set(60.0, 19.8, -11.5);
  shakado.userData.landmarkId = 'shakado_amidado';
  precinct.add(shakado);

  const jizodo = createClassicalHall({
    width: 4.2,
    depth: 3.8,
    wallH: 3.0,
    roofH: 2.3,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiDark,
    frontDir: '-x',
  });
  jizodo.position.set(65.5, 19.5, -5.0);
  jizodo.userData.landmarkId = 'shakado_amidado';
  precinct.add(jizodo);

  const amidado = createClassicalHall({
    width: 8.6,
    depth: 10.2,
    wallH: 4.1,
    roofH: 3.7,
    roofStyle: 'irimoya',
    ridgeAxis: 'z',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiPillar,
    plaqueText: '阿弥陀堂',
    frontDir: '-x',
  });
  amidado.position.set(71.0, 19.2, 4.0);
  amidado.userData.landmarkId = 'shakado_amidado';
  precinct.add(amidado);

  // =========================================================================
  // 11. OKUNO-IN (奥の院, 1633 — Cliffside Kakezukuri Stage directly above Otowa Falls!)
  // =========================================================================
  const okunoin = new THREE.Group();
  okunoin.userData.landmarkId = 'okunoin';

  const okunoFloorY = 19.0;
  // Kakezukuri cliff substructure under Okuno-in Stage (x: 65.4..72.0, z: 10.8..25.2)
  const okX = [65.6, 67.8, 70.0, 72.2];
  const okZ = [11.0, 13.8, 16.6, 19.4, 22.2, 25.0];
  for (const wx of okX) {
    for (const wz of okZ) {
      const gy = getTerrainHeight(wx, wz);
      const ch = Math.max(0.9, okunoFloorY - 0.16 - gy);
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, ch, 12),
        materials.keyakiPillar
      );
      p.position.set(wx, gy + ch * 0.5, wz);
      p.castShadow = true;
      okunoin.add(p);
    }
  }
  // Penetrating Toshi-nuki beams on Okuno-in's cliff scaffold
  for (const ny of [10.5, 13.0, 15.5, 17.6]) {
    for (const wz of okZ) {
      const gy = getTerrainHeight(66.5, wz);
      if (ny > gy + 0.6) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 0.15), materials.nukiBeam);
        b.position.set(68.9, ny, wz);
        okunoin.add(b);
      }
    }
    const bLong = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 14.8), materials.nukiBeam);
    bLong.position.set(65.6, ny + 0.18, 18.0);
    if (ny > getTerrainHeight(65.6, 18.0) + 0.6) okunoin.add(bLong);
  }

  // Okuno-in Wooden Stage + Main Hall Body facing West (-X) toward National Treasure Hondo!
  const okDeck = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.26, 15.0), materials.hinokiStage);
  okDeck.position.set(72.8, okunoFloorY, 18.0);
  okDeck.receiveShadow = true;
  okDeck.castShadow = true;
  okunoin.add(okDeck);

  const okWestRail = createKoranBalustrade({
    length: 14.6,
    woodMaterial: materials.keyakiDark,
    giboshiMaterial: materials.goldGiboshi,
  });
  okWestRail.rotation.y = Math.PI * 0.5;
  okWestRail.position.set(65.55, okunoFloorY + 0.08, 18.0);
  okunoin.add(okWestRail);

  for (const sz of [10.65, 25.35]) {
    const sRail = createKoranBalustrade({
      length: 5.6,
      woodMaterial: materials.keyakiDark,
      giboshiMaterial: materials.goldGiboshi,
    });
    sRail.position.set(68.3, okunoFloorY + 0.08, sz);
    okunoin.add(sRail);
  }

  const okBody = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.5, 13.4), materials.keyakiDark);
  okBody.position.set(75.5, okunoFloorY + 2.25, 18.0);
  okBody.castShadow = true;
  okunoin.add(okBody);

  const okPlaque = createCalligraphyPlaque('奥之院', 1.6, 0.72);
  okPlaque.rotation.y = -Math.PI * 0.5;
  okPlaque.position.set(71.25, okunoFloorY + 3.9, 18.0);
  okunoin.add(okPlaque);

  const okRoof = createCurvedJapaneseRoof({
    width: 10.6,
    depth: 15.2,
    height: 5.2,
    overhang: 2.15,
    style: 'yosemune',
    ridgeAxis: 'z',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.keyakiDark,
    ornamentMaterial: materials.bronzeSorin,
    thickness: 0.42,
  });
  okRoof.position.set(74.8, okunoFloorY + 4.5, 18.0);
  okunoin.add(okRoof);
  precinct.add(okunoin);

  // =========================================================================
  // 12. OTOWA-NO-TAKI WATERFALL (音羽の滝 — Three Sacred Streams + Taki-no-do + Teahouse!)
  // =========================================================================
  const otowa = new THREE.Group();
  otowa.position.set(58.5, 5.5, 30.0);
  otowa.userData.landmarkId = 'otowa_falls';

  // High stone cliff masonry backing wall beneath Okuno-in
  const cliffMasonry = createIshigakiPlatform(5.2, 10.8, 7.6, materials.ishigaki, 0.14);
  cliffMasonry.position.set(3.2, 0, 0);
  otowa.add(cliffMasonry);

  // Sacred water receiving stone basin (水盤)
  const basinOuter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.62, 7.8), materials.paving);
  basinOuter.position.set(-0.6, 0.31, 0);
  const basinWater = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.52, 7.1), pondMat);
  basinWater.position.set(-0.6, 0.42, 0);
  otowa.add(basinOuter, basinWater);
  animatedRefs.pondMeshes.push(basinWater);

  // Taki-no-do Canopy Pavilion (滝之堂) sheltering visitors drawing the sacred water
  for (const px of [-2.8, 0.8]) {
    for (const pz of [-3.4, 3.4]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 4.4, 10), materials.keyakiPillar);
      p.position.set(px, 2.2, pz);
      p.castShadow = true;
      otowa.add(p);
    }
  }
  const takiRoof = createCurvedJapaneseRoof({
    width: 4.4,
    depth: 7.8,
    height: 2.3,
    overhang: 1.25,
    style: 'kirizuma',
    ridgeAxis: 'z',
    roofMaterial: materials.hiwadabuki,
    gableMaterial: materials.keyakiDark,
  });
  takiRoof.position.set(-1.0, 4.4, 0);
  otowa.add(takiRoof);

  // Three Stone Spouts (三本の筧 Kakei) + Three Animated Crystal Water Streams (金色水・延命水)!
  const streamMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xdcf5ff),
    emissive: new THREE.Color(0x5da9cc),
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.78,
    roughness: 0.08,
    transmission: 0.55,
  });

  for (const sz of [-1.85, 0, 1.85]) {
    const spout = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 0.34), materials.stoneLantern);
    spout.position.set(0.55, 4.05, sz);
    spout.rotation.z = 0.08;
    otowa.add(spout);

    // Parabolic falling stream column
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.32, 3.98, sz),
      new THREE.Vector3(-0.78, 2.45, sz),
      new THREE.Vector3(-0.98, 0.62, sz)
    );
    const streamGeo = new THREE.TubeGeometry(curve, 16, 0.085, 8, false);
    const streamMesh = new THREE.Mesh(streamGeo, streamMat);
    otowa.add(streamMesh);
    animatedRefs.waterfallStreams.push(streamMesh);

    // Long-handled purification ladle (柄杓 Hishaku) resting on rack
    const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), materials.hinokiStage);
    ladle.rotation.z = 0.45;
    ladle.position.set(-2.1, 1.6, sz + 0.4);
    otowa.add(ladle);
  }

  // Splash mist particles in the Otowa basin
  const splashCount = 90;
  const splashPos = new Float32Array(splashCount * 3);
  for (let i = 0; i < splashCount; i++) {
    const streamIdx = i % 3;
    splashPos[i * 3] = -0.98 + (Math.random() - 0.5) * 0.65;
    splashPos[i * 3 + 1] = 0.65 + Math.random() * 1.1;
    splashPos[i * 3 + 2] = (streamIdx - 1) * 1.85 + (Math.random() - 0.5) * 0.65;
  }
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
  const splashPoints = new THREE.Points(
    splashGeo,
    new THREE.PointsMaterial({ color: 0xeaf8ff, size: 0.22, transparent: true, opacity: 0.72 })
  );
  otowa.add(splashPoints);
  animatedRefs.waterfallSplashParticles = splashPoints;

  // Otowa Teahouse (音羽茶屋 — Traditional Red Mosen Benches 床几 & Nodate-gasa Parasols 野点傘!)
  const teahouse = new THREE.Group();
  teahouse.position.set(-10.5, 0, 5.2);
  const teaHut = createClassicalHall({
    width: 7.4,
    depth: 5.2,
    wallH: 3.1,
    roofH: 2.2,
    plinthH: 0.35,
    roofStyle: 'kirizuma',
    roofMat: materials.kawarabuki,
    pillarMat: materials.machiyaWood,
    frontDir: '-z',
  });
  teahouse.add(teaHut);

  for (const bx of [-3.2, 0.8, 4.4]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 1.15), materials.redMosen);
    bench.position.set(bx, 0.24, -4.6);
    bench.castShadow = true;
    // Crimson Japanese Nodate-gasa parasol
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.7, 6), materials.machiyaWood);
    pole.position.set(bx + 0.8, 1.35, -4.6);
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.65, 0.55, 16), materials.vermilion);
    umbrella.position.set(bx + 0.8, 2.65, -4.6);
    teahouse.add(bench, pole, umbrella);
  }
  otowa.add(teahouse);
  precinct.add(otowa);

  // Valley Monuments: Aterui & More Stele (アテルイ・モレの碑) + Benten Pond (弁天池)
  const ateruiGroup = new THREE.Group();
  ateruiGroup.position.set(-22.0, 5.6, 32.5);
  const steleBase = createIshigakiPlatform(3.2, 2.4, 0.65, materials.ishigaki, 0.1);
  const steleStone = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.5, 0.45), materials.stoneLantern);
  steleStone.position.y = 1.9;
  steleStone.castShadow = true;
  ateruiGroup.add(steleBase, steleStone);
  precinct.add(ateruiGroup);

  const bentenPond = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.0, 0.15, 24), pondMat);
  bentenPond.scale.set(1.15, 1, 0.72);
  bentenPond.position.set(-60.0, 5.65, 34.0);
  precinct.add(bentenPond);
  animatedRefs.pondMeshes.push(bentenPond);

  // =========================================================================
  // 13. KOYASU-NO-TO PAGODA (子安塔, 1500 — 15m Cypress-Bark 3-Storied Pagoda) & TAISAN-JI
  // =========================================================================
  const koyasuPagoda = buildThreeStoriedPagoda({
    totalTowerBodyH: 10.6,
    sorinH: 4.4,
    baseWidth: 3.9,
    roofMat: materials.hiwadabuki,
    pillarMat: materials.keyakiPillar,
    wallMat: materials.shikkui,
    bracketMat: materials.keyakiDark,
    materials,
  });
  koyasuPagoda.position.set(18.0, 20.5, 92.0);
  koyasuPagoda.userData.landmarkId = 'koyasu_pagoda';
  precinct.add(koyasuPagoda);

  const taisanji = createClassicalHall({
    width: 7.4,
    depth: 6.6,
    wallH: 3.5,
    roofH: 2.9,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiDark,
    plaqueText: '泰産寺',
    frontDir: '-z',
  });
  taisanji.position.set(6.0, 20.4, 91.5);
  taisanji.userData.landmarkId = 'koyasu_pagoda';
  precinct.add(taisanji);

  // =========================================================================
  // 14. KIYOMIZU-ZAKA APPROACH (清水坂 京町家商店街 + 善光寺堂 + 石灯籠列)
  // =========================================================================
  const zakaGroup = new THREE.Group();
  zakaGroup.name = 'KiyomizuZakaMachiyaStreet';

  // Zenkoji-do (善光寺堂) at North side of stair foot
  const zenkojido = createClassicalHall({
    width: 7.8,
    depth: 6.8,
    wallH: 3.6,
    roofH: 3.1,
    roofStyle: 'irimoya',
    roofMat: materials.kawarabuki,
    pillarMat: materials.keyakiDark,
    plaqueText: '善光寺堂',
    frontDir: '+z',
  });
  zenkojido.position.set(-118.5, getTerrainHeight(-118.5, -5.5), -5.5);
  zenkojido.userData.landmarkId = 'niomon';
  zakaGroup.add(zenkojido);

  // Traditional Higashiyama Kyoto Machiya townhouses lining both sides of Kiyomizu-zaka
  const norenPalette = [0x253f5e, 0x8f2d22, 0x3b5238, 0x5c3d2e];
  let mIdx = 0;
  for (let mx = -168; mx <= -125; mx += 7.4) {
    for (const side of [-1, 1]) {
      const mz = 4.0 + side * 8.2;
      const my = getTerrainHeight(mx, mz);
      const w = 6.9;
      const d = 6.6;
      const h = 5.4 + (mIdx % 3) * 0.45;

      const machiya = new THREE.Group();
      machiya.position.set(mx, my, mz);

      const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.54, d), materials.machiyaWood);
      lowerBody.position.y = h * 0.27;
      lowerBody.castShadow = true;
      lowerBody.receiveShadow = true;

      const upperBody = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.2, h * 0.46, d - 0.5),
        mIdx % 2 === 0 ? materials.shikkui : materials.machiyaWood
      );
      upperBody.position.y = h * 0.77;
      upperBody.castShadow = true;

      // Noren shop curtain (暖簾) + warm glowing eave lantern (軒先提灯)
      const norenMat = new THREE.MeshStandardMaterial({
        color: norenPalette[mIdx % norenPalette.length],
        roughness: 0.9,
      });
      const noren = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 0.85, 0.08), norenMat);
      noren.position.set(0, 2.25, -side * (d * 0.5 + 0.22));

      const shopLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.46, 10),
        materials.lanternGlow
      );
      shopLantern.position.set(w * 0.34, 2.3, -side * (d * 0.5 + 0.38));

      const mRoof = createCurvedJapaneseRoof({
        width: w + 0.2,
        depth: d,
        height: 1.95,
        overhang: 0.95,
        style: 'kirizuma',
        roofMaterial: materials.kawarabuki,
        gableMaterial: materials.shikkui,
      });
      mRoof.position.y = h;

      machiya.add(lowerBody, upperBody, noren, shopLantern, mRoof);
      zakaGroup.add(machiya);
      mIdx++;
    }
  }
  precinct.add(zakaGroup);

  // =========================================================================
  // 15. PRECINCT STONE LANTERNS (石灯籠) ALONG PILGRIMAGE ROUTES
  // =========================================================================
  const lanternCoords = [
    [-113, 0.2], [-113, 7.8], [-104, 0.2], [-104, 7.8],
    [-93, 2.2], [-93, 9.2], [-82, 2.2], [-70, 8.2],
    [-50, 5.2], [-34, 5.2], [-18, 5.2], [-14, -4.5],
    [4, 6.5], [44, 1.5], [53, -3.5], [65, 9.5],
    [49, 26.5], [34, 26.2], [16, 26.2], [-8, 28.0],
    [20, -24.5], [28, -24.5], [15, 86.5], [21, 86.5],
  ];
  for (const [lx, lz] of lanternCoords) {
    const ly = getTerrainHeight(lx, lz);
    const lantern = createStoneLantern(materials, 0.95);
    lantern.position.set(lx, ly, lz);
    precinct.add(lantern);
  }

  // Famous Vermilion Overlook Railings (朱塗りの高欄柵) crowning the Nio-mon & Sai-mon stone terraces!
  const nioSouthFence = createKoranBalustrade({
    length: 17.5,
    woodMaterial: materials.vermilion,
    giboshiMaterial: materials.goldGiboshi,
  });
  nioSouthFence.position.set(-96.0, 10.55, 12.6);
  const pagodaSouthFence = createKoranBalustrade({
    length: 42.0,
    woodMaterial: materials.vermilion,
    giboshiMaterial: materials.goldGiboshi,
  });
  pagodaSouthFence.position.set(-49.0, 16.85, 18.2);
  precinct.add(nioSouthFence, pagodaSouthFence);

  // Temizuya / Chozuya Dragon Water Purification Pavilion (手水舎) before Todoroki-mon!
  const temizuya = new THREE.Group();
  temizuya.position.set(-14.5, 18.0, 6.2);
  temizuya.userData.landmarkId = 'todorokimon_asakurado';
  const temiPad = createIshigakiPlatform(3.6, 3.0, 0.3, materials.paving, 0.05);
  temizuya.add(temiPad);
  for (const px of [-1.35, 1.35]) {
    for (const pz of [-1.05, 1.05]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 2.55, 8), materials.keyakiPillar);
      col.position.set(px, 1.55, pz);
      col.castShadow = true;
      temizuya.add(col);
    }
  }
  const chozubachi = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.68, 1.05), materials.ishigaki);
  chozubachi.position.set(0, 0.64, 0);
  const dragonSpout = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 12, Math.PI), materials.bronzeSorin);
  dragonSpout.position.set(0, 1.12, 0);
  const temiRoof = createCurvedJapaneseRoof({
    width: 3.2,
    depth: 2.6,
    height: 1.45,
    overhang: 0.85,
    style: 'kirizuma',
    roofMaterial: materials.hiwadabuki,
    gableMaterial: materials.keyakiDark,
  });
  temiRoof.position.y = 2.82;
  temizuya.add(chozubachi, dragonSpout, temiRoof);
  precinct.add(temizuya);

  return { group: precinct, animatedRefs };
}

// Reusable Multi-Tiered Japanese Pagoda Builder (Sanju-no-to 30.5m, Koyasu-no-to 15m, Tahokaku)
function buildThreeStoriedPagoda({
  totalTowerBodyH = 21.0,
  sorinH = 8.4,
  baseWidth = 6.8,
  tiers = 3,
  roofMat,
  pillarMat,
  wallMat,
  bracketMat,
  materials,
}) {
  const g = new THREE.Group();

  const podiumH = baseWidth * 0.22;
  const podium = createIshigakiPlatform(baseWidth + 2.8, baseWidth + 2.8, podiumH, materials.ishigaki, 0.14);
  g.add(podium);

  let curY = podiumH;
  const tierH = totalTowerBodyH / tiers;

  for (let t = 0; t < tiers; t++) {
    const scale = 1.0 - t * 0.13;
    const w = baseWidth * scale;
    const storyWallH = tierH * 0.62;
    const storyRoofH = tierH * 0.46;

    // Core white plaster wall + vermilion pillar frame
    const core = new THREE.Mesh(new THREE.BoxGeometry(w, storyWallH, w), wallMat);
    core.position.y = curY + storyWallH * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    g.add(core);

    // 12 perimeter vermilion columns per story (3x3 bay grid)
    for (let i = 0; i <= 3; i++) {
      for (let j = 0; j <= 3; j++) {
        if (i > 0 && i < 3 && j > 0 && j < 3) continue;
        const px = -w * 0.5 + (i / 3) * w;
        const pz = -w * 0.5 + (j / 3) * w;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15 * scale, 0.17 * scale, storyWallH, 8),
          pillarMat
        );
        col.position.set(px, curY + storyWallH * 0.5, pz);
        col.castShadow = true;
        g.add(col);
      }
    }

    // Polychrome Kumimono bracket frieze (極彩色斗栱) under each tier's eaves
    const kumimono = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.55, storyWallH * 0.24, w + 0.55),
      bracketMat
    );
    kumimono.position.y = curY + storyWallH * 0.9;
    g.add(kumimono);

    // Upper story perimeter balcony & Koran balustrade
    if (t > 0) {
      const balc = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.18, w + 1.3), pillarMat);
      balc.position.y = curY + 0.08;
      g.add(balc);
    }

    // Deeply projecting square pagoda roof (宝形造) with upturned corners!
    const roof = createCurvedJapaneseRoof({
      width: w,
      depth: w,
      height: storyRoofH,
      overhang: w * 0.44,
      style: 'pagoda',
      roofMaterial: roofMat,
      trimMaterial: pillarMat,
      ornamentMaterial: materials.bronzeSorin,
      thickness: 0.28,
      soriStrength: 0.25,
      cornerLift: 0.46 * scale,
    });
    roof.position.y = curY + storyWallH;
    g.add(roof);

    curY += tierH * 0.94;
  }

  // Tall Bronze Sorin Spire (相輪: 露盤・伏鉢・九輪・水煙・宝珠)
  const sorinBaseY = curY + tierH * 0.14;
  const roban = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth * 0.22, 0.45, baseWidth * 0.22),
    materials.bronzeSorin
  );
  roban.position.y = sorinBaseY;
  const spireShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.2, sorinH, 12),
    materials.bronzeSorin
  );
  spireShaft.position.y = sorinBaseY + sorinH * 0.5;
  spireShaft.castShadow = true;
  g.add(roban, spireShaft);

  // Nine Sacred Rings (九輪 Kurin)
  for (let r = 0; r < 9; r++) {
    const frac = r / 9;
    const ringR = (0.46 - frac * 0.16) * (baseWidth / 6.8);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringR, 0.045, 6, 16),
      materials.goldGiboshi
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = sorinBaseY + sorinH * (0.16 + frac * 0.52);
    g.add(ring);
  }

  // Suien flame finial & Hoju sacred jewel at summit
  const hoju = new THREE.Mesh(
    new THREE.SphereGeometry(0.28 * (baseWidth / 6.8), 12, 10),
    materials.goldGiboshi
  );
  hoju.position.y = sorinBaseY + sorinH * 0.95;
  g.add(hoju);

  return g;
}
