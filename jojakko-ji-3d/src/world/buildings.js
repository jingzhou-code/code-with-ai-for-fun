import * as THREE from 'three';
import {
  getArchitecturalMaterials,
  createCurvedJapaneseRoof,
  createStonePodium,
  createStoneLantern
} from '../utils/archBuilder.js';
import {
  getShojiTextures,
  createCalligraphyPlaqueTexture
} from '../utils/textures.js';
import { getGroundHeight } from './terrain.js';

export function buildAllTempleStructures(scene) {
  const root = new THREE.Group();
  root.name = 'JojakkojiArchitecture';

  const mats = getArchitecturalMaterials();
  const shojiTex = getShojiTextures();
  const shojiMat = new THREE.MeshStandardMaterial({
    map: shojiTex.map,
    emissiveMap: shojiTex.emissiveMap,
    emissive: new THREE.Color(0xffb457),
    emissiveIntensity: 0.15,
    roughness: 0.85
  });

  const snowOverlays = []; // Toggled visible in winter season!
  const lanternLightPositions = [];
  const interactivePickables = [];

  function addSnowLayer(parent, w, d, y, thickness = 0.09) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mats.snowCap);
    m.position.y = y;
    m.visible = false;
    parent.add(m);
    snowOverlays.push(m);
  }

  function tagLandmark(obj, landmarkId) {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.userData.landmarkId = landmarkId;
      }
    });
    interactivePickables.push(obj);
  }

  // ============================================================================
  // ① 山門 (Sanmon — Late Edo Yakuimon Gate in Sumi-Black Lattice Timber)
  // ============================================================================
  const sanmon = buildSanmonGate(mats, addSnowLayer);
  sanmon.position.set(64.0, getGroundHeight(64.0, 0.0), 0.0);
  sanmon.rotation.y = Math.PI * 0.5; // Front faces +X (East)
  tagLandmark(sanmon, 'sanmon');
  root.add(sanmon);

  // Temple Entrance Stone Pillar ("小倉山 常寂光寺") & Bamboo Fence (黒穂垣)
  const entranceStele = buildStoneStele('小倉山常寂光寺', 2.45, 0.42, mats);
  entranceStele.position.set(67.2, getGroundHeight(67.2, -3.4), -3.4);
  entranceStele.rotation.y = Math.PI * 0.5;
  root.add(entranceStele);

  const outerFences = buildEntranceBambooWalls(mats);
  root.add(outerFences);

  // Reception Pavilion (拝観受付) & Exhibition Hall (展示場) & Teika Sanso Stele
  const reception = buildSmallPavilion({
    width: 4.4,
    depth: 3.4,
    wallH: 2.35,
    plaqueText: '拝観受付',
    mats,
    shojiMat
  });
  reception.position.set(56.5, getGroundHeight(56.5, 4.6), 4.6);
  reception.rotation.y = Math.PI; // Faces north toward the approach path
  root.add(reception);

  const exhibition = buildSmallPavilion({
    width: 6.4,
    depth: 4.6,
    wallH: 2.6,
    plaqueText: '展示場',
    mats,
    shojiMat
  });
  exhibition.position.set(50.0, getGroundHeight(50.0, 8.8), 8.8);
  exhibition.rotation.y = Math.PI * 0.85;
  root.add(exhibition);

  const teikaStele = buildStoneStele('定家山荘跡', 1.75, 0.36, mats);
  teikaStele.position.set(45.5, getGroundHeight(45.5, -6.5), -6.5);
  teikaStele.rotation.y = 0.45;
  root.add(teikaStele);

  // ============================================================================
  // ② 仁王門 (Niōmon — 1345 Nanbokuchō Gate, Mossy Kayabuki Thatch, Nio & Waraji)
  // ============================================================================
  const niomon = buildNiomonGate(mats, addSnowLayer);
  niomon.position.set(36.0, 2.5, 0.0);
  niomon.rotation.y = Math.PI * 0.5; // Passage along X, facing +X East
  tagLandmark(niomon, 'niomon');
  root.add(niomon);

  // ============================================================================
  // ④ 本堂 (Hondō — Relocated Fushimi-Momoyama Castle Guest Hall)
  // ============================================================================
  const hondo = buildHondoMainHall(mats, shojiMat, addSnowLayer);
  hondo.position.set(-5.5, 11.0, 0.0);
  hondo.rotation.y = Math.PI * 0.5; // Faces +X East straight down the stone steps
  tagLandmark(hondo, 'hondo');
  root.add(hondo);

  // ============================================================================
  // ⑤ 鐘楼 (Shōrō — 1642 Belfry with Interactive 1973 Ōshikichō Bronze Bell)
  // ============================================================================
  const shoroController = buildShoroBelfry(mats, addSnowLayer);
  shoroController.group.position.set(1.5, 11.0, 10.5);
  tagLandmark(shoroController.group, 'shoro');
  shoroController.group.traverse((c) => {
    if (c.isMesh) c.userData.isBell = true;
  });
  root.add(shoroController.group);

  // ============================================================================
  // ⑥ 酉の妙見堂 & 石鳥居 & 江戸商家石灯籠 (Myōken-dō Shrine Complex)
  // ============================================================================
  const myokendo = buildMyokendoComplex(mats, shojiMat, lanternLightPositions, addSnowLayer);
  myokendo.position.set(-6.5, 11.4, 18.5);
  tagLandmark(myokendo, 'myokendo');
  root.add(myokendo);

  // ============================================================================
  // ⑦ 北庭園：渡り廊下・書院・庫裏・五重石塔・鹿威し・開山堂
  // ============================================================================
  const northCompound = buildNorthGardenStructures(mats, shojiMat, addSnowLayer);
  tagLandmark(northCompound, 'pond');
  root.add(northCompound);

  // ============================================================================
  // ⑧ 多宝塔「並尊閣」（国指定重要文化財 1620, 12m Tall, Hiwadabuki & Kamebara）
  // ============================================================================
  const tahoto = buildTahotoPagoda(mats, addSnowLayer);
  tahoto.position.set(-32.0, 19.5, 4.0);
  tahoto.rotation.y = Math.PI * 0.5; // Faces +X East overlooking Kyoto
  tagLandmark(tahoto, 'tahoto');
  root.add(tahoto);

  // Poet Kinoshita Chōshōshi monument west of Tahoto
  const choshoshiStele = buildStoneStele('長嘯子歌塚', 1.55, 0.34, mats);
  choshoshiStele.position.set(-36.8, getGroundHeight(-36.8, 9.2), 9.2);
  choshoshiStele.rotation.y = 1.2;
  root.add(choshoshiStele);

  // ============================================================================
  // ⑨ 歌仙祠（謌僊祠）& 時雨亭跡 & 野点席（床几・朱傘）
  // ============================================================================
  const shigureGroup = buildKasenshiAndShiguretei(mats, shojiMat, addSnowLayer);
  tagLandmark(shigureGroup, 'shiguretei');
  root.add(shigureGroup);

  // ============================================================================
  // ⑩ 山頂展望台 (Summit Observation Deck Overlooking Tahōtō & Kyoto)
  // ============================================================================
  const observatory = buildObservationDeck(mats);
  observatory.position.set(-47.0, 26.5, -1.0);
  tagLandmark(observatory, 'observatory');
  root.add(observatory);

  // ============================================================================
  // Temple Stone Lanterns (春日灯籠 & 雪見灯籠) Illuminating Paths at Dusk/Night
  // ============================================================================
  const lanternCoords = [
    { x: 61.5, z: -2.4, style: 'kasuga', s: 0.95 },
    { x: 48.0, z: -2.3, style: 'kasuga', s: 0.95 },
    { x: 40.8, z: 2.6, style: 'kasuga', s: 1.0 },
    { x: 30.2, z: -2.3, style: 'kasuga', s: 0.92 },
    { x: 22.0, z: 2.3, style: 'kasuga', s: 0.92 },
    { x: 13.5, z: -2.3, style: 'kasuga', s: 0.92 },
    { x: 4.5, z: -4.2, style: 'kasuga', s: 1.05 },
    { x: 4.5, z: 4.2, style: 'kasuga', s: 1.05 },
    { x: -1.8, z: -12.2, style: 'yukimi', s: 1.05 }, // Pond shore Yukimi-doro!
    { x: -7.2, z: -13.5, style: 'yukimi', s: 0.95 },
    { x: -16.0, z: -17.0, style: 'kasuga', s: 0.9 }, // Kaisando
    { x: -26.2, z: 1.2, style: 'kasuga', s: 1.0 },   // Tahoto front
    { x: -26.2, z: 6.8, style: 'kasuga', s: 1.0 },
    { x: -28.2, z: 17.5, style: 'kasuga', s: 0.9 },  // Kasenshi
    { x: -43.5, z: -3.8, style: 'kasuga', s: 0.92 }  // Observatory
  ];

  lanternCoords.forEach((lc) => {
    const y = getGroundHeight(lc.x, lc.z);
    const lantern = createStoneLantern(lc.style, lc.s);
    lantern.position.set(lc.x, y, lc.z);
    root.add(lantern);
    lanternLightPositions.push(
      new THREE.Vector3(lc.x, y + (lc.style === 'yukimi' ? 0.78 : 1.48) * lc.s, lc.z)
    );
  });

  scene.add(root);

  return {
    root,
    shojiMat,
    lanternGlowMat: mats.lanternGlow,
    lanternLightPositions,
    interactivePickables,
    triggerBellStrike: shoroController.strike,
    updateAnimations: shoroController.update,
    setWinterSnow(enabled) {
      snowOverlays.forEach((m) => {
        m.visible = enabled;
      });
    }
  };
}

function buildSanmonGate(mats, addSnowLayer) {
  // Local coords: width along X, depth along Z; rotated +90° in world so +Z local -> +X East
  const g = new THREE.Group();

  // Foundation stones (礎石)
  const postCoords = [
    [-2.1, 0.35], [2.1, 0.35],   // Main heavy square posts (本柱)
    [-2.1, -1.05], [2.1, -1.05]  // Rear Yakuimon support posts (控柱)
  ];
  postCoords.forEach(([px, pz], idx) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 8), mats.granite);
    base.position.set(px, 0.09, pz);
    g.add(base);

    const isMain = idx < 2;
    const postSize = isMain ? 0.32 : 0.24;
    const post = new THREE.Mesh(new THREE.BoxGeometry(postSize, 3.65, postSize), mats.sumiTimber);
    post.position.set(px, 1.88, pz);
    post.castShadow = true;
    post.receiveShadow = true;
    g.add(post);
  });

  // Heavy Kasagi / Kabuki horizontal tie beam & Yakuimon crossbeams (男梁・女梁)
  const kabuki = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.34, 0.34), mats.sumiTimber);
  kabuki.position.set(0, 3.35, 0.35);
  kabuki.castShadow = true;
  g.add(kabuki);

  for (const sx of [-2.1, 2.1]) {
    const obari = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 2.55), mats.sumiTimber);
    obari.position.set(sx, 3.55, -0.2);
    obari.castShadow = true;
    g.add(obari);
  }

  // Signature open sumi-black rectangular lattice doors (角柱の格子扉), swung partly inward to welcome visitors
  for (const side of [-1, 1]) {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 1.92, 0.22, 0.35);
    doorPivot.rotation.y = side * 1.15; // Opened inward!

    const doorW = 1.82;
    const doorH = 2.85;
    // Outer frame
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.12, 0.1), mats.sumiTimber);
    topBar.position.set(-side * doorW * 0.5, doorH, 0);
    doorPivot.add(topBar);
    const botBar = topBar.clone();
    botBar.position.y = 0.08;
    doorPivot.add(botBar);
    const midBar = topBar.clone();
    midBar.position.y = doorH * 0.45;
    doorPivot.add(midBar);

    // Vertical square timber lattice bars (widely spaced so approach is visible!)
    for (let i = 0; i <= 6; i++) {
      const bx = -side * (i / 6) * doorW;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.075, doorH, 0.085), mats.sumiTimber);
      bar.position.set(bx, doorH * 0.5, 0);
      bar.castShadow = true;
      doorPivot.add(bar);
    }
    g.add(doorPivot);
  }

  // Side lattice袖塀 wings
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.35, 0.14), mats.sumiTimber);
    wing.position.set(side * 2.95, 1.22, 0.35);
    wing.castShadow = true;
    g.add(wing);

    const wingCap = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.18, 0.55), mats.kawara);
    wingCap.position.set(side * 2.95, 2.46, 0.35);
    g.add(wingCap);
  }

  // Plaque "常寂光寺"
  const plaqueTex = createCalligraphyPlaqueTexture('常寂光寺', { subtitle: '小倉山', bg: '#161311' });
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.58, 0.08),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5 })
  );
  plaque.position.set(0, 3.42, 0.55);
  g.add(plaque);

  // Kirizuma Kawara Tiled Roof
  const roof = createCurvedJapaneseRoof({
    width: 6.4,
    depth: 4.1,
    height: 1.45,
    style: 'kirizuma',
    roofType: 'kawara',
    sori: 0.24,
    cornerLift: 0.16
  });
  roof.position.set(0, 3.72, -0.2);
  g.add(roof);
  addSnowLayer(g, 5.8, 3.6, 4.45, 0.08);

  return g;
}

function buildEntranceBambooWalls(mats) {
  const g = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x4b4334, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = side * (4.2 + i * 2.6);
      const y = getGroundHeight(64.2, z);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.65, 2.55), fenceMat);
      panel.position.set(64.2, y + 0.82, z);
      panel.castShadow = true;
      panel.receiveShadow = true;
      g.add(panel);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 1.82, 8), mats.sumiTimber);
      post.position.set(64.2, y + 0.9, z + side * 1.25);
      g.add(post);
    }
  }
  return g;
}

function buildNiomonGate(mats, addSnowLayer) {
  // Oldest structure on temple grounds (1345–1349), moved 1616. Famous mossy Kayabuki thatched roof!
  const g = new THREE.Group();

  // Left & Right Stone Podiums leaving central stone-flagged walkway open!
  for (const side of [-1, 1]) {
    const podium = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.48, 4.4), mats.granite);
    podium.position.set(side * 2.75, 0.24, 0);
    podium.castShadow = true;
    podium.receiveShadow = true;
    g.add(podium);
  }

  // 8 Main Round Pillars (八脚門 Hakkyakumon: 4 columns across X [-4.0, -1.42, 1.42, 4.0] × 3 rows along Z [-1.85, 0, 1.85])
  const colX = [-3.95, -1.42, 1.42, 3.95];
  const colZ = [-1.85, 0, 1.85];
  colX.forEach((cx) => {
    colZ.forEach((cz) => {
      // Skip middle row inside central passage? No, cx=±1.42 flanks the 2.84m central passage cleanly!
      const soseki = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.14, 10), mats.mossyGranite);
      soseki.position.set(cx, 0.48, cz);
      g.add(soseki);

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 3.85, 12), mats.hinoki);
      pillar.position.set(cx, 2.4, cz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      g.add(pillar);
    });
  });

  // Tie beams (頭貫・飛貫) & Bracket complexes
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.28, 3.95), mats.hinoki);
  topBeam.position.set(0, 4.22, 0);
  g.add(topBeam);

  // Left & Right Guardian Alcoves + Unkei-attributed 7-shaku Niō Statues + Devotional Straw Waraji!
  for (const side of [-1, 1]) {
    const chamberX = side * 2.68;
    // Rear & outer wooden board walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.3, 0.12), mats.hinoki);
    backWall.position.set(chamberX, 2.15, -1.82);
    g.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.3, 3.65), mats.hinoki);
    sideWall.position.set(side * 3.92, 2.15, 0);
    g.add(sideWall);

    // Front wooden protective grille (金剛柵)
    for (let b = -4; b <= 4; b++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.9, 0.05), mats.sumiTimber);
      bar.position.set(chamberX + b * 0.26, 1.95, 1.82);
      g.add(bar);
    }

    // Sculpted Agyō (right, crimson-ochre) & Ungyō (left, bronze-ochre) Niō Guardian Statue (2.1m tall!)
    const nio = buildSculptedNioStatue(side > 0);
    nio.position.set(chamberX, 0.52, -0.15);
    nio.rotation.y = -side * 0.22; // Slightly angled toward passing pilgrims
    g.add(nio);

    // Offerings of Giant Woven Straw Sandals (大わらじ) hung on front pillars/lattice for leg & back healing!
    const waraji = buildStrawWaraji(0.95);
    waraji.position.set(side * 1.52, 2.15, 2.06);
    g.add(waraji);

    const smallWaraji = buildStrawWaraji(0.55);
    smallWaraji.position.set(chamberX + side * 0.65, 1.65, 1.92);
    g.add(smallWaraji);
  }

  // Thick Mossy Kayabuki Thatched Irimoya Roof (境内最古・茅葺屋根)
  const roof = createCurvedJapaneseRoof({
    width: 10.6,
    depth: 7.2,
    height: 3.35,
    style: 'irimoya',
    roofType: 'kayabuki',
    thickness: 0.68,
    sori: 0.18,
    cornerLift: 0.16,
    ridgeRatio: 0.46
  });
  roof.position.set(0, 4.35, 0);
  g.add(roof);
  addSnowLayer(g, 9.4, 6.2, 5.85, 0.12);

  return g;
}

function buildSculptedNioStatue(isAgyo) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isAgyo ? 0x8b3a2b : 0x6e472f,
    roughness: 0.72,
    metalness: 0.08
  });
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x3b493e,
    roughness: 0.82
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc49c48,
    roughness: 0.4,
    metalness: 0.7
  });

  // Rock pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.28, 8), robeMat);
  ped.position.y = 0.14;
  g.add(ped);

  // Dynamic legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.88, 8), bodyMat);
    leg.position.set(s * 0.24, 0.68, s * 0.08);
    leg.rotation.z = -s * 0.14;
    leg.castShadow = true;
    g.add(leg);
  }

  // Armored dhoti skirt (裳)
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.62, 9), robeMat);
  skirt.position.y = 0.96;
  g.add(skirt);

  // Muscular torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.25, 0.72, 10), bodyMat);
  torso.position.y = 1.48;
  torso.rotation.z = isAgyo ? 0.08 : -0.08;
  torso.castShadow = true;
  g.add(torso);

  // Head + topknot (髻 Motodori)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), bodyMat);
  head.position.set(0, 2.02, 0.05);
  g.add(head);
  const topknot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 8), bodyMat);
  topknot.position.set(0, 2.26, 0.02);
  g.add(topknot);

  // Raised Vajra arm & fierce downward palm
  const raisedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.75, 8), bodyMat);
  raisedArm.position.set(isAgyo ? 0.42 : -0.42, 1.85, 0.18);
  raisedArm.rotation.z = isAgyo ? -0.68 : 0.68;
  raisedArm.rotation.x = -0.35;
  g.add(raisedArm);

  // Golden Vajra (金剛杵)
  const vajra = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6), goldMat);
  vajra.position.set(isAgyo ? 0.62 : -0.62, 2.18, 0.3);
  vajra.rotation.z = 0.4;
  g.add(vajra);

  const lowArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.72, 8), bodyMat);
  lowArm.position.set(isAgyo ? -0.42 : 0.42, 1.38, 0.22);
  lowArm.rotation.z = isAgyo ? 0.45 : -0.45;
  lowArm.rotation.x = 0.45;
  g.add(lowArm);

  // Celestial billowing scarf halo (天衣 Tenne)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 6, 16, Math.PI * 1.25), goldMat);
  halo.position.set(0, 1.75, -0.14);
  halo.rotation.z = -Math.PI * 0.12;
  g.add(halo);

  return g;
}

function buildStrawWaraji(scale = 1.0) {
  const mats = getArchitecturalMaterials();
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.48, 4, 10), mats.strawWaraji);
  sole.scale.set(1, 1, 0.28);
  sole.castShadow = true;
  g.add(sole);

  const strapMat = new THREE.MeshStandardMaterial({ color: 0x9b3126, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const hanao = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), strapMat);
    hanao.position.set(s * 0.06, 0.05, 0.06);
    hanao.rotation.z = s * 0.32;
    g.add(hanao);
  }
  g.scale.setScalar(scale);
  return g;
}

function buildHondoMainHall(mats, shojiMat, addSnowLayer) {
  // Relocated Fushimi-Momoyama Castle Guest Hall (慶長年間移築・昭和7年平瓦葺改修)
  const g = new THREE.Group();

  const w = 13.8; // along Z in world (since rotated +90°)
  const d = 10.6; // along X in world

  // Stone foundation podium
  const podium = createStonePodium(w + 1.4, 0.85, d + 1.4, 0.05);
  g.add(podium);

  // Raised Engawa veranda deck (縁側)
  const veranda = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.18, d + 0.6), mats.engawa);
  veranda.position.y = 1.32;
  veranda.castShadow = true;
  veranda.receiveShadow = true;
  g.add(veranda);

  // Support posts under veranda & perimeter wooden Kōran balustrade (高欄)
  for (let ix = -3; ix <= 3; ix++) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), mats.hinoki);
      post.position.set(ix * 2.1, 1.05, sz * (d * 0.5 + 0.1));
      g.add(post);
    }
  }

  // Front wooden Kōran railing (with central opening for stairs)
  for (const side of [-1, 1]) {
    const railLen = w * 0.5 - 1.55;
    const railX = side * (1.55 + railLen * 0.5);
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.09), mats.hinoki);
    topRail.position.set(railX, 1.88, d * 0.5 + 0.2);
    g.add(topRail);
    const midRail = topRail.clone();
    midRail.position.y = 1.62;
    g.add(midRail);
  }
  for (const side of [-1, 1]) {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, d + 0.4), mats.hinoki);
    sideRail.position.set(side * (w * 0.5 + 0.2), 1.88, 0);
    g.add(sideRail);
  }

  // Core Sanctuary Hall (母屋 Moya): Momoyama Shoin elegance — white Shikkui + glowing Shōji/Shitomido bays + dark cedar wainscot
  const moyaW = w - 2.0;
  const moyaD = d - 2.2;
  const wallH = 3.55;

  const moyaCore = new THREE.Mesh(new THREE.BoxGeometry(moyaW - 0.1, wallH, moyaD - 0.1), mats.shikkui);
  moyaCore.position.y = 1.41 + wallH * 0.5;
  moyaCore.castShadow = true;
  moyaCore.receiveShadow = true;
  g.add(moyaCore);

  // Front & side Shōji / Kōshi sliding bays
  const frontShoji = new THREE.Mesh(new THREE.BoxGeometry(moyaW - 1.2, wallH * 0.78, 0.08), shojiMat);
  frontShoji.position.set(0, 1.41 + wallH * 0.44, moyaD * 0.5 + 0.02);
  g.add(frontShoji);

  // Perimeter round hinoki columns (5×4 bay grid)
  for (let i = 0; i <= 5; i++) {
    const cx = -moyaW * 0.5 + (i / 5) * moyaW;
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, wallH + 0.15, 10), mats.hinoki);
      col.position.set(cx, 1.41 + wallH * 0.5, sz * moyaD * 0.5);
      col.castShadow = true;
      g.add(col);
    }
  }
  for (let j = 1; j < 4; j++) {
    const cz = -moyaD * 0.5 + (j / 4) * moyaD;
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, wallH + 0.15, 10), mats.hinoki);
      col.position.set(sx * moyaW * 0.5, 1.41 + wallH * 0.5, cz);
      g.add(col);
    }
  }

  // Front Wooden Stairs (木階 Kizahashi) + Kōhai (向拝) Entrance Canopy
  for (let s = 0; s < 6; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.21, 0.34), mats.hinoki);
    step.position.set(0, 0.22 + s * 0.2, d * 0.5 + 1.85 - s * 0.28);
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }
  for (const sx of [-1.55, 1.55]) {
    const kohaiPillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.35, 0.22), mats.hinoki);
    kohaiPillar.position.set(sx, 2.05, d * 0.5 + 1.65);
    kohaiPillar.castShadow = true;
    g.add(kohaiPillar);

    // Brass hanging lantern (釣灯籠 Tsuri-dōrō)
    const tsuri = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 6), mats.lanternGlow);
    tsuri.position.set(sx * 0.72, 3.32, d * 0.5 + 1.25);
    g.add(tsuri);
    const tsuriCap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.16, 6), mats.bronzePatina);
    tsuriCap.position.set(sx * 0.72, 3.52, d * 0.5 + 1.25);
    g.add(tsuriCap);
  }

  // Saisen-bako (賽銭箱 Offering Box)
  const saisen = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.68, 0.82), mats.hinoki);
  saisen.position.set(0, 1.72, d * 0.5 - 0.12);
  saisen.castShadow = true;
  g.add(saisen);

  // Calligraphy Plaque "御祈祷処" (by Lady Jōshōin of Fushimi-no-miya)
  const plaqueTex = createCalligraphyPlaqueTexture('御祈祷処', {
    subtitle: '伏見常照院宮御筆',
    bg: '#151210',
    border: '#cba34b',
    ink: '#f0d896'
  });
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.72, 0.09),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.45 })
  );
  plaque.position.set(0, 4.18, moyaD * 0.5 + 0.18);
  plaque.rotation.x = 0.12;
  g.add(plaque);

  // Kōhai front porch canopy
  const kohaiRoof = createCurvedJapaneseRoof({
    width: 4.4,
    depth: 2.6,
    height: 0.85,
    style: 'kirizuma',
    roofType: 'kawara',
    sori: 0.25,
    cornerLift: 0.12
  });
  kohaiRoof.position.set(0, 3.68, d * 0.5 + 1.05);
  g.add(kohaiRoof);

  // Grand Single-Story Hira-gawara Irimoya Main Roof (1932 restoration)
  const mainRoof = createCurvedJapaneseRoof({
    width: w + 3.4,
    depth: d + 3.2,
    height: 4.15,
    style: 'irimoya',
    roofType: 'kawara',
    sori: 0.3,
    cornerLift: 0.28,
    ridgeRatio: 0.45
  });
  mainRoof.position.set(0, 4.92, 0);
  g.add(mainRoof);
  addSnowLayer(g, w + 2.4, d + 2.2, 6.75, 0.1);

  return g;
}

function buildShoroBelfry(mats, addSnowLayer) {
  // Built 1642 by 4th Abbot Nissen; 1973 Ōshikichō acoustically designed bronze bell
  const g = new THREE.Group();

  const podium = createStonePodium(4.8, 1.15, 4.8, 0.09);
  g.add(podium);

  // 4 Inward-leaning pillars (転び柱)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 3.55, 12), mats.hinoki);
      col.position.set(sx * 1.52, 2.85, sz * 1.52);
      col.rotation.z = sx * 0.045;
      col.rotation.x = -sz * 0.045;
      col.castShadow = true;
      col.receiveShadow = true;
      g.add(col);
    }
  }

  // Tie beams
  const tie = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.26, 3.45), mats.hinoki);
  tie.position.y = 4.42;
  g.add(tie);

  // Acoustically Tuned Bronze Bonshō Bell (梵鐘)
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 4.35, 0);

  // Ryūzu dragon hanger
  const ryuzu = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 8, 12), mats.bronzePatina);
  ryuzu.position.y = -0.18;
  bellPivot.add(ryuzu);

  // Main bronze bell profile via LatheGeometry
  const bellPts = [
    new THREE.Vector2(0.0, -0.26),
    new THREE.Vector2(0.38, -0.32),
    new THREE.Vector2(0.52, -0.58),
    new THREE.Vector2(0.58, -1.15),
    new THREE.Vector2(0.64, -1.78),
    new THREE.Vector2(0.54, -1.82),
    new THREE.Vector2(0.49, -1.2)
  ];
  const bellGeo = new THREE.LatheGeometry(bellPts, 24);
  const bellMesh = new THREE.Mesh(bellGeo, mats.bronzePatina);
  bellMesh.castShadow = true;
  bellPivot.add(bellMesh);

  // Tsukiza lotus strike boss (撞座)
  const tsukiza = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 12), mats.goldAccent);
  tsukiza.rotation.z = Math.PI * 0.5;
  tsukiza.position.set(0.59, -1.42, 0);
  bellPivot.add(tsukiza);
  g.add(bellPivot);

  // Suspended Wooden Shumoku Striker Log (撞木) along +X side!
  const shumokuPivot = new THREE.Group();
  shumokuPivot.position.set(1.38, 4.25, 0);

  for (const rz of [-0.36, 0.36]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 6), mats.sumiTimber);
    chain.position.set(rz, -0.68, 0);
    shumokuPivot.add(chain);
  }
  const strikerLog = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.48, 10), mats.redwood);
  strikerLog.rotation.z = Math.PI * 0.5;
  strikerLog.position.set(0, -1.38, 0);
  strikerLog.castShadow = true;
  shumokuPivot.add(strikerLog);

  // Pull rope hanging down for visitors
  const pullRope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6), mats.strawWaraji);
  pullRope.position.set(0.45, -1.95, 0);
  shumokuPivot.add(pullRope);
  g.add(shumokuPivot);

  // Expanding golden sound-wave ring when struck!
  const waveGeo = new THREE.RingGeometry(0.7, 0.92, 48);
  waveGeo.rotateX(-Math.PI * 0.5);
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0xf4c96b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const soundWave = new THREE.Mesh(waveGeo, waveMat);
  soundWave.position.set(0, 2.9, 0);
  g.add(soundWave);

  // Belfry Curved Irimoya Kawara Roof
  const roof = createCurvedJapaneseRoof({
    width: 6.2,
    depth: 6.2,
    height: 2.35,
    style: 'irimoya',
    roofType: 'kawara',
    sori: 0.3,
    cornerLift: 0.24
  });
  roof.position.y = 4.55;
  g.add(roof);
  addSnowLayer(g, 5.2, 5.2, 5.65, 0.09);

  // Strike physics animation state
  let strikeTime = -999;

  function strike() {
    strikeTime = 0;
  }

  function update(dt) {
    if (strikeTime < 0) return;
    strikeTime += dt;

    // 0.0 -> 0.42s: pull back (+X); 0.42 -> 0.58s: swing into bell (-X impact at t=0.58s!); >0.58s: damped oscillation
    if (strikeTime < 0.42) {
      const p = Math.sin((strikeTime / 0.42) * Math.PI * 0.5);
      shumokuPivot.position.x = 1.38 + p * 0.52;
    } else if (strikeTime < 0.58) {
      const p = (strikeTime - 0.42) / 0.16;
      shumokuPivot.position.x = 1.9 - p * p * 0.72;
    } else {
      const tPost = strikeTime - 0.58;
      const damp = Math.exp(-tPost * 1.8);
      shumokuPivot.position.x = 1.38 + Math.cos(tPost * 5.2) * 0.22 * damp;
      bellPivot.rotation.z = -Math.sin(tPost * 6.8) * 0.055 * Math.exp(-tPost * 0.85);

      // Visual acoustic ripple expanding over Mt. Ogura
      if (tPost < 3.6) {
        const rp = tPost / 3.6;
        const s = 1 + rp * 22;
        soundWave.scale.set(s, s, s);
        waveMat.opacity = (1 - rp) * (1 - rp) * 0.65;
      } else {
        waveMat.opacity = 0;
      }

      if (tPost > 7.5) {
        strikeTime = -999;
        shumokuPivot.position.x = 1.38;
        bellPivot.rotation.z = 0;
        waveMat.opacity = 0;
      }
    }
  }

  return { group: g, strike, update };
}

function buildMyokendoComplex(mats, shojiMat, lanternLightPositions, addSnowLayer) {
  // Tori-no-Myōken Bosatsu (洛陽十二支妙見・酉): Stone Torii + 4 Edo Merchant Lanterns + Tamagaki + Haiden & Honden
  const g = new THREE.Group();

  // Haiden (拝殿 Worship Hall, front) + Honden (本殿 Sanctuary, rear)
  const hallGroup = new THREE.Group();
  hallGroup.rotation.y = Math.PI * 0.5; // Faces +X East

  const podium = createStonePodium(6.6, 0.68, 5.6, 0.05);
  hallGroup.add(podium);

  const haidenCore = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.95, 4.4), mats.hinoki);
  haidenCore.position.y = 0.68 + 1.48;
  haidenCore.castShadow = true;
  hallGroup.add(haidenCore);

  const frontScreen = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.25, 0.08), shojiMat);
  frontScreen.position.set(0, 1.85, 2.23);
  hallGroup.add(frontScreen);

  // Sacred purple-and-white Maku curtain (幕) across top eave of Myōken-dō
  const makuMat = new THREE.MeshStandardMaterial({ color: 0x4b2e59, roughness: 0.85 });
  const maku = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.52, 0.12), makuMat);
  maku.position.set(0, 3.18, 2.38);
  hallGroup.add(maku);

  // Pair of warm Chōchin paper lanterns (提灯) hanging in front of Myōken-dō
  for (const sx of [-1.45, 1.45]) {
    const chochin = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 8, 12), mats.lanternGlow);
    chochin.position.set(sx, 2.55, 2.58);
    hallGroup.add(chochin);
  }

  const plaqueTex = createCalligraphyPlaqueTexture('北辰妙見大菩薩', {
    subtitle: '洛陽十二支・酉の妙見',
    bg: '#1c1412'
  });
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.56, 0.08),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.45 })
  );
  plaque.position.set(0, 3.45, 2.48);
  hallGroup.add(plaque);

  const haidenRoof = createCurvedJapaneseRoof({
    width: 8.0,
    depth: 6.8,
    height: 2.35,
    style: 'irimoya',
    roofType: 'kawara',
    sori: 0.28,
    cornerLift: 0.2
  });
  haidenRoof.position.y = 3.65;
  hallGroup.add(haidenRoof);
  addSnowLayer(hallGroup, 7.0, 5.8, 4.75, 0.09);

  // Rear elevated Honden sanctuary
  const honden = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 3.0), mats.redwood);
  honden.position.set(0, 2.3, -3.5);
  honden.castShadow = true;
  hallGroup.add(honden);

  const hondenRoof = createCurvedJapaneseRoof({
    width: 4.8,
    depth: 4.4,
    height: 1.85,
    style: 'kirizuma',
    roofType: 'kawara',
    sori: 0.32,
    cornerLift: 0.22
  });
  hondenRoof.position.set(0, 3.72, -3.5);
  hallGroup.add(hondenRoof);
  g.add(hallGroup);

  // Stone Torii Gate (石鳥居 donated 1850s) at +8.0m East of Myōken-dō (world x = +1.5, z = 18.5)
  const torii = buildStoneTorii(mats);
  torii.position.set(8.0, 0, 0);
  torii.rotation.y = Math.PI * 0.5;
  g.add(torii);

  // 1933 Donated Stone Tamagaki Fence (玉垣) flanking courtyard
  for (const sz of [-3.6, 3.6]) {
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), mats.granite);
      post.position.set(2.8 + i * 0.95, 0.48, sz);
      g.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.14), mats.granite);
    rail.position.set(5.2, 0.78, sz);
    g.add(rail);
  }

  // 4 Edo Merchant-Donated Stone Lanterns (1845: 大黒屋・松屋・夷屋・尾張屋) inside & outside Torii!
  const merchantOffsets = [
    [6.1, -1.65], [6.1, 1.65],
    [9.8, -1.65], [9.8, 1.65]
  ];
  merchantOffsets.forEach(([ox, oz]) => {
    const l = createStoneLantern('kasuga', 1.02);
    l.position.set(ox, 0, oz);
    g.add(l);
    lanternLightPositions.push(new THREE.Vector3(-6.5 + ox, 11.4 + 1.52, 18.5 + oz));
  });

  return g;
}

function buildStoneTorii(mats) {
  const g = new THREE.Group();
  for (const sx of [-1.52, 1.52]) {
    const daiishi = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 10), mats.mossyGranite);
    daiishi.position.set(sx, 0.12, 0);
    g.add(daiishi);

    const hashira = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 3.55, 12), mats.granite);
    hashira.position.set(sx, 1.9, 0);
    hashira.rotation.z = sx > 0 ? 0.03 : -0.03;
    hashira.castShadow = true;
    g.add(hashira);
  }

  // Nuki lower lintel
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.2, 0.18), mats.granite);
  nuki.position.y = 2.98;
  nuki.castShadow = true;
  g.add(nuki);

  // Curved Kasagi top lintel
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.26, 0.3), mats.granite);
  kasagi.position.y = 3.68;
  kasagi.castShadow = true;
  g.add(kasagi);

  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.3), mats.granite);
    tip.position.set(sx * 2.42, 3.75, 0);
    tip.rotation.z = sx * 0.16;
    g.add(tip);
  }

  //gakuzuka tablet "妙見宮"
  const gakuzukaTex = createCalligraphyPlaqueTexture('妙見宮', { vertical: true, bg: '#181512' });
  const gakuzuka = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.72, 0.12),
    new THREE.MeshStandardMaterial({ map: gakuzukaTex, roughness: 0.5 })
  );
  gakuzuka.position.set(0, 3.34, 0.08);
  g.add(gakuzuka);

  return g;
}

function buildNorthGardenStructures(mats, shojiMat, addSnowLayer) {
  const g = new THREE.Group();

  // 1. Covered Wooden Watari-rōka Corridor connecting Hondo (-5.5, 11.0, -6.8) to Shoin (-2.0, 11.0, -25.8)
  const corridor = new THREE.Group();
  const corLen = 16.5;
  const corDeck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, corLen), mats.engawa);
  corDeck.position.set(-5.2, 11.95, -15.2);
  corDeck.castShadow = true;
  corridor.add(corDeck);

  for (let i = 0; i <= 6; i++) {
    const cz = -7.0 - (i / 6) * corLen;
    const baseY = getGroundHeight(-5.2, cz);
    for (const sx of [-0.82, 0.82]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 11.95 - baseY + 2.2, 8), mats.hinoki);
      post.position.set(-5.2 + sx, baseY + (14.15 - baseY) * 0.5, cz);
      post.castShadow = true;
      corridor.add(post);
    }
  }
  const corRoofZ = createCurvedJapaneseRoof({
    width: corLen + 1.2,
    depth: 2.8,
    height: 0.78,
    style: 'kirizuma',
    roofType: 'kawara',
    sori: 0.2,
    cornerLift: 0.08
  });
  corRoofZ.rotation.y = Math.PI * 0.5;
  corRoofZ.position.set(-5.2, 14.1, -15.2);
  corridor.add(corRoofZ);
  g.add(corridor);

  // 2. Shoin (書院 Study & Garden Viewing Hall) at (-2.0, 11.0, -25.8) facing South onto Pond!
  const shoin = buildSmallPavilion({
    width: 8.6,
    depth: 6.4,
    wallH: 2.95,
    plaqueText: '書院',
    mats,
    shojiMat
  });
  shoin.position.set(-2.0, 11.0, -25.8);
  g.add(shoin);
  addSnowLayer(shoin, 9.2, 7.0, 4.95, 0.09);

  // 3. Kuri (庫裏 Monks' Quarters — Iconic Kyoto White Shikkui Gable with Dark Timber Grid) at (10.2, 9.2, -26.2)
  const kuri = new THREE.Group();
  kuri.position.set(10.2, 9.2, -26.2);
  kuri.rotation.y = Math.PI * 0.5; // Gable faces +X East!

  const kuriPodium = createStonePodium(9.4, 0.65, 10.6, 0.04);
  kuri.add(kuriPodium);

  const kuriBody = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.2, 9.8), mats.shikkui);
  kuriBody.position.y = 0.65 + 2.1;
  kuriBody.castShadow = true;
  kuriBody.receiveShadow = true;
  kuri.add(kuriBody);

  // Crisp Sumi-black Kigumi timber framing on East white gable wall
  for (let i = -3; i <= 3; i++) {
    const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.2, 0.12), mats.sumiTimber);
    vBeam.position.set(i * 1.35, 2.75, 4.92);
    kuri.add(vBeam);
  }
  for (const hy of [1.6, 2.9, 4.15]) {
    const hBeam = new THREE.Mesh(new THREE.BoxGeometry(8.65, 0.14, 0.12), mats.sumiTimber);
    hBeam.position.set(0, hy, 4.92);
    kuri.add(hBeam);
  }
  const kuriShoji = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.3, 0.1), shojiMat);
  kuriShoji.position.set(0, 1.85, 4.94);
  kuri.add(kuriShoji);

  // Tsuma-iri Kirizuma roof (ridge runs along local Z -> East-West!)
  const kuriRoof = createCurvedJapaneseRoof({
    width: 11.8,
    depth: 10.6,
    height: 3.1,
    style: 'irimoya',
    roofType: 'kawara',
    sori: 0.25,
    cornerLift: 0.2
  });
  kuriRoof.rotation.y = Math.PI * 0.5;
  kuriRoof.position.y = 4.82;
  kuri.add(kuriRoof);
  addSnowLayer(kuri, 9.6, 10.6, 6.4, 0.1);
  g.add(kuri);

  // 4. Five-Story Granite Pagoda (五重石塔 Gojū-no-sekitō) beside Pond Garden!
  const goju = new THREE.Group();
  const gx = -8.4;
  const gz = -18.2;
  goju.position.set(gx, getGroundHeight(gx, gz), gz);
  let curY = 0.2;
  const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 0.95), mats.mossyGranite);
  baseBlock.position.y = 0.2;
  goju.add(baseBlock);
  curY = 0.4;

  for (let tier = 0; tier < 5; tier++) {
    const s = 1 - tier * 0.11;
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.56 * s, 0.36 * s, 0.56 * s), mats.granite);
    core.position.y = curY + 0.18 * s;
    core.castShadow = true;
    goju.add(core);
    curY += 0.36 * s;

    const eave = new THREE.Mesh(new THREE.ConeGeometry(0.76 * s, 0.26 * s, 4), mats.mossyGranite);
    eave.rotation.y = Math.PI * 0.25;
    eave.position.y = curY + 0.12 * s;
    eave.castShadow = true;
    goju.add(eave);
    curY += 0.24 * s;
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.65, 8), mats.granite);
  spire.position.y = curY + 0.32;
  goju.add(spire);
  g.add(goju);

  // 5. Tsukubai & Bamboo Kakei Water Spout (蹲踞・筧) at pond edge (-1.2, y, -11.8)
  const tsukubai = new THREE.Group();
  tsukubai.position.set(-1.2, getGroundHeight(-1.2, -11.8), -11.8);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.42, 10), mats.mossyGranite);
  basin.position.y = 0.21;
  tsukubai.add(basin);
  const waterTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x385854, roughness: 0.1, metalness: 0.6 })
  );
  waterTop.rotation.x = -Math.PI * 0.5;
  waterTop.position.y = 0.43;
  tsukubai.add(waterTop);

  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x6b7c46, roughness: 0.55 });
  const kakeiPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.85, 8), bambooMat);
  kakeiPost.position.set(0.32, 0.42, -0.15);
  tsukubai.add(kakeiPost);
  const kakeiSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), bambooMat);
  kakeiSpout.rotation.z = 1.25;
  kakeiSpout.position.set(0.12, 0.68, -0.06);
  tsukubai.add(kakeiSpout);
  g.add(tsukubai);

  // 6. Kaisandō (開山堂 — Founder's Hall, 2004) & Priest Nippo's Tomb at (-18.5, 14.8, -19.5)
  const kaisando = buildSmallPavilion({
    width: 6.4,
    depth: 5.8,
    wallH: 3.1,
    plaqueText: '開山堂',
    roofStyle: 'hogyo',
    mats,
    shojiMat
  });
  kaisando.position.set(-18.5, 14.8, -19.5);
  kaisando.rotation.y = Math.PI * 0.5;
  g.add(kaisando);
  addSnowLayer(kaisando, 6.8, 6.2, 5.2, 0.09);

  // Priest Nippo Memorial Stupa beside Kaisandō
  const nippoTomb = buildStoneStele('一道院日法上人墓', 1.85, 0.36, mats);
  nippoTomb.position.set(-20.2, getGroundHeight(-20.2, -23.5), -23.5);
  nippoTomb.rotation.y = Math.PI * 0.5;
  g.add(nippoTomb);

  return g;
}

function buildTahotoPagoda(mats, addSnowLayer) {
  // Important Cultural Property (国指定重要文化財, August 1620):
  // Height ~12.2m, 方三間 square lower story + white Kamebara + circular upper core + Hiwadabuki roofs + bronze Sōrin!
  const g = new THREE.Group();

  // 1. Stone Podium (基壇) + Front Stone Steps
  const podium = createStonePodium(6.6, 0.88, 6.6, 0.05);
  g.add(podium);

  for (let s = 0; s < 5; s++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.32), mats.granite);
    st.position.set(0, 0.1 + s * 0.17, 3.45 + (4 - s) * 0.28);
    st.castShadow = true;
    g.add(st);
  }

  // 2. Lower Square Story (下層・方三間: 4.8m × 4.8m) + Engawa Veranda
  const veranda = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 5.6), mats.engawa);
  veranda.position.y = 0.96;
  veranda.castShadow = true;
  g.add(veranda);

  const lowerH = 2.78;
  const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(4.56, lowerH, 4.56), mats.shikkui);
  lowerWall.position.y = 1.04 + lowerH * 0.5;
  lowerWall.castShadow = true;
  lowerWall.receiveShadow = true;
  g.add(lowerWall);

  // 3×3 Bay Round Hinoki Columns + Wooden Paneled Doors (唐戸) & Renji-mado Windows (連子窓)
  const bayCoords = [-2.3, -0.78, 0.78, 2.3];
  for (const bx of bayCoords) {
    for (const bz of [-2.3, 2.3]) {
      const col1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, lowerH + 0.1, 10), mats.hinoki);
      col1.position.set(bx, 1.04 + lowerH * 0.5, bz);
      col1.castShadow = true;
      g.add(col1);

      const col2 = col1.clone();
      col2.position.set(bz, 1.04 + lowerH * 0.5, bx);
      g.add(col2);
    }
  }

  // Central double wooden doors & side Renji-mado lattice windows on all 4 sides
  for (let face = 0; face < 4; face++) {
    const faceGrp = new THREE.Group();
    faceGrp.rotation.y = (face * Math.PI) * 0.5;

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.15, 0.09), mats.hinoki);
    door.position.set(0, 2.12, 2.3);
    faceGrp.add(door);

    for (const sx of [-1.54, 1.54]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.25, 0.09), mats.redwood);
      win.position.set(sx, 2.35, 2.3);
      faceGrp.add(win);
    }
    g.add(faceGrp);
  }

  // Imperial Calligraphy Plaque "並尊閣" (by Retired Emperor Reigen!) on East Front
  const heisonTex = createCalligraphyPlaqueTexture('並尊閣', {
    vertical: true,
    bg: '#1c1510',
    border: '#d2ac54',
    ink: '#f5df9c'
  });
  const heisonPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 1.08, 0.09),
    new THREE.MeshStandardMaterial({ map: heisonTex, roughness: 0.4 })
  );
  heisonPlaque.position.set(0, 3.42, 2.52);
  heisonPlaque.rotation.x = 0.14;
  g.add(heisonPlaque);

  // 3. Lower Sweeping Hiwadabuki Roof (with central opening for Kamebara dome!)
  const lowerRoof = createCurvedJapaneseRoof({
    width: 8.6,
    depth: 8.6,
    height: 1.55,
    style: 'hogyo',
    roofType: 'hiwadabuki',
    sori: 0.34,
    cornerLift: 0.28,
    openCenterRadius: 2.05
  });
  lowerRoof.position.y = 3.82;
  g.add(lowerRoof);
  addSnowLayer(g, 7.6, 7.6, 4.35, 0.09);

  // 4. White Shikkui Kamebara ("亀腹" Turtle-Belly Mound — Signature of a Tahōtō!)
  const kamebaraGeo = new THREE.SphereGeometry(2.38, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.44);
  const kamebara = new THREE.Mesh(kamebaraGeo, mats.kamebara);
  kamebara.scale.set(1.0, 0.62, 1.0);
  kamebara.position.y = 4.22;
  kamebara.castShadow = true;
  kamebara.receiveShadow = true;
  g.add(kamebara);

  // 5. Cylindrical Upper Core (円形上層) + Kōran Balustrade (高欄) + Multi-stepped Masugumi Brackets
  const upperCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.54, 1.88, 24), mats.hinoki);
  upperCyl.position.y = 5.95;
  upperCyl.castShadow = true;
  g.add(upperCyl);

  // White plaster upper band (白漆喰円筒壁)
  const upperWhite = new THREE.Mesh(new THREE.CylinderGeometry(1.49, 1.51, 0.92, 24), mats.kamebara);
  upperWhite.position.y = 5.98;
  g.add(upperWhite);

  // Circular/Square Balustrade wrapping base of upper cylinder
  const koranBase = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 0.14, 16), mats.hinoki);
  koranBase.position.y = 5.42;
  g.add(koranBase);
  const koranRail = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.045, 8, 24), mats.redwood);
  koranRail.rotation.x = Math.PI * 0.5;
  koranRail.position.y = 5.82;
  g.add(koranRail);

  // Stepped bracket ring (四手先組物風) flaring out to support upper pyramidal roof
  for (let tier = 0; tier < 3; tier++) {
    const r = 1.65 + tier * 0.34;
    const masu = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.18, r, 0.22, 16), mats.hinoki);
    masu.position.y = 6.72 + tier * 0.22;
    g.add(masu);
  }

  // 6. Upper Pyramidal Hōgyō Hiwadabuki Cypress-Bark Roof (宝形造・檜皮葺)
  const upperRoof = createCurvedJapaneseRoof({
    width: 7.5,
    depth: 7.5,
    height: 2.35,
    style: 'hogyo',
    roofType: 'hiwadabuki',
    sori: 0.42,
    cornerLift: 0.34
  });
  upperRoof.position.y = 7.28;
  g.add(upperRoof);
  addSnowLayer(g, 6.2, 6.2, 8.15, 0.08);

  // Corner wind-bells (風鐸 Fūtaku) hanging from the 4 upturned corners of Tahōtō!
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const futaku = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 6), mats.bronzePatina);
      futaku.position.set(sx * 3.55, 7.42, sz * 3.55);
      g.add(futaku);
    }
  }

  // 7. Tall Bronze Sōrin Spire (相輪: 露盤・伏鉢・請花・九輪・水煙・竜車・宝珠) reaching ~13.0m total!
  const sorin = new THREE.Group();
  sorin.position.y = 9.58;

  const roban = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.76), mats.bronzePatina);
  roban.position.y = 0.12;
  sorin.add(roban);

  const fukubachi = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.bronzePatina);
  fukubachi.position.y = 0.24;
  sorin.add(fukubachi);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 3.45, 12), mats.bronzePatina);
  shaft.position.y = 1.85;
  shaft.castShadow = true;
  sorin.add(shaft);

  // Nine Sacred Rings (九輪 Kurin)
  for (let r = 0; r < 9; r++) {
    const rad = 0.27 - r * 0.008;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.028, 6, 18), mats.goldAccent);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = 0.72 + r * 0.21;
    sorin.add(ring);
  }

  // Suien (水煙) 4-way flame filigree near top
  for (let f = 0; f < 4; f++) {
    const suien = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.03), mats.goldAccent);
    suien.position.y = 2.92;
    suien.rotation.y = (f * Math.PI) * 0.25;
    sorin.add(suien);
  }

  // Ryūsha & Sacred Hōju Jewel (宝珠)
  const hoju = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 12), mats.goldAccent);
  hoju.position.y = 3.55;
  sorin.add(hoju);

  g.add(sorin);
  return g;
}

function buildKasenshiAndShiguretei(mats, shojiMat, addSnowLayer) {
  const g = new THREE.Group();

  // 1. Kasenshi (歌仙祠 / 謌僊祠, 1890/1994) enshrining Fujiwara Teika & Fujiwara Ietaka
  const kasenshi = new THREE.Group();
  kasenshi.position.set(-31.5, 21.0, 19.0);
  kasenshi.rotation.y = Math.PI * 0.5;

  const podium = createStonePodium(4.4, 0.52, 3.8, 0.05);
  kasenshi.add(podium);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.55, 3.0), mats.hinoki);
  body.position.y = 0.52 + 1.28;
  body.castShadow = true;
  kasenshi.add(body);

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.08), shojiMat);
  doors.position.set(0, 1.65, 1.52);
  kasenshi.add(doors);

  // Tomioka Tessai Calligraphy Plaque "謌僊祠"
  const tessaiTex = createCalligraphyPlaqueTexture('謌僊祠', {
    subtitle: '富岡鐵齋筆',
    bg: '#1c1712',
    border: '#b89448'
  });
  const tessaiPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.48, 0.07),
    new THREE.MeshStandardMaterial({ map: tessaiTex, roughness: 0.45 })
  );
  tessaiPlaque.position.set(0, 2.82, 1.58);
  kasenshi.add(tessaiPlaque);

  const roof = createCurvedJapaneseRoof({
    width: 5.4,
    depth: 4.8,
    height: 1.75,
    style: 'irimoya',
    roofType: 'hiwadabuki',
    sori: 0.32,
    cornerLift: 0.22
  });
  roof.position.y = 3.05;
  kasenshi.add(roof);
  addSnowLayer(kasenshi, 4.6, 4.1, 3.85, 0.08);
  g.add(kasenshi);

  // 2. Shigure-tei Ruins (時雨亭跡: Ancient Hermitage Foundation Stones + Stone Monument + Nodate Bench & Red Wagasa)
  const shigure = new THREE.Group();
  shigure.position.set(-31.0, 21.0, 24.5);

  // Low mossy stone border outlining the old hermitage footprint
  const curb = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 4.4), mats.mossyGranite);
  curb.position.y = 0.05;
  curb.receiveShadow = true;
  shigure.add(curb);

  // Historic pillar foundation stones (礎石跡)
  for (const sx of [-1.5, 0, 1.5]) {
    for (const sz of [-1.5, 0, 1.5]) {
      const soseki = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 9), mats.granite);
      soseki.position.set(sx, 0.14, sz);
      soseki.castShadow = true;
      shigure.add(soseki);
    }
  }

  // Carved Stone Stele "時雨亭跡"
  const stele = buildStoneStele('時雨亭跡', 1.88, 0.38, mats);
  stele.position.set(-1.65, 0.08, -1.75);
  stele.rotation.y = Math.PI * 0.45;
  shigure.add(stele);

  // Poetic Kyoto Nodate Tea Bench (緋毛氈床几) + Vermilion Wagasa Parasol (野点傘) beside bamboo & maples!
  const benchGroup = new THREE.Group();
  benchGroup.position.set(2.3, 0, 2.2);
  const redClothMat = new THREE.MeshStandardMaterial({ color: 0xa6241d, roughness: 0.88 });
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.95), redClothMat);
  benchTop.position.y = 0.45;
  benchTop.castShadow = true;
  benchGroup.add(benchTop);
  for (const lz of [-0.75, 0.75]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.1), mats.sumiTimber);
    leg.position.set(0, 0.21, lz);
    benchGroup.add(leg);
  }

  // Tall Vermilion Wagasa Parasol
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.55, 8), mats.sumiTimber);
  pole.position.set(-0.35, 1.28, -0.85);
  pole.castShadow = true;
  benchGroup.add(pole);

  const wagasa = new THREE.Mesh(
    new THREE.ConeGeometry(1.48, 0.46, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xb5261e, roughness: 0.65, side: THREE.DoubleSide })
  );
  wagasa.position.set(-0.35, 2.42, -0.85);
  wagasa.castShadow = true;
  benchGroup.add(wagasa);

  shigure.add(benchGroup);
  g.add(shigure);

  return g;
}

function buildObservationDeck(mats) {
  // Summit Observation Deck at (-47.0, 26.5, -1.0) looking East over Tahōtō & Kyoto Basin!
  const g = new THREE.Group();

  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, 9.6), mats.engawa);
  deck.position.y = 0.11;
  deck.receiveShadow = true;
  g.add(deck);

  // Protective wooden railings along East (+X) & North/South edges so visitors gaze safely over the cliff
  const postPositions = [
    [3.4, -4.5], [3.4, -2.25], [3.4, 0], [3.4, 2.25], [3.4, 4.5],
    [1.2, -4.5], [-1.2, -4.5],
    [1.2, 4.5], [-1.2, 4.5]
  ];
  postPositions.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), mats.hinoki);
    post.position.set(px, 0.62, pz);
    post.castShadow = true;
    g.add(post);
  });

  const eastRailTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 9.15), mats.hinoki);
  eastRailTop.position.set(3.4, 1.08, 0);
  g.add(eastRailTop);
  const eastRailMid = eastRailTop.clone();
  eastRailMid.position.y = 0.68;
  g.add(eastRailMid);

  for (const sz of [-4.5, 4.5]) {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.09, 0.12), mats.hinoki);
    sideRail.position.set(1.1, 1.08, sz);
    g.add(sideRail);
  }

  // Kyoto Panorama Guide Signboard (嵯峨野・京都市街展望案内板)
  const guideTex = createCalligraphyPlaqueTexture('嵯峨野・京都市街展望', {
    subtitle: '眼下：多宝塔 ｜ 正面：嵯峨野・京都盆地・東山連峰・比叡山',
    bg: '#231b15',
    border: '#a98544',
    ink: '#f0dfba'
  });
  const guideBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.56, 0.06),
    new THREE.MeshStandardMaterial({ map: guideTex, roughness: 0.55 })
  );
  guideBoard.position.set(3.25, 1.16, 2.2);
  guideBoard.rotation.y = -Math.PI * 0.5;
  guideBoard.rotation.z = 0.42;
  g.add(guideBoard);

  // Two wooden rest benches for pilgrims admiring the view
  for (const bz of [-2.3, 2.3]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 2.2), mats.hinoki);
    bench.position.set(-1.2, 0.54, bz);
    bench.castShadow = true;
    g.add(bench);
    for (const lz of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.44, 0.12), mats.sumiTimber);
      leg.position.set(-1.2, 0.32, bz + lz);
      g.add(leg);
    }
  }

  return g;
}

function buildSmallPavilion({ width, depth, wallH, plaqueText, roofStyle = 'irimoya', mats, shojiMat }) {
  const g = new THREE.Group();

  const podium = createStonePodium(width + 0.7, 0.45, depth + 0.7, 0.04);
  g.add(podium);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.14, depth + 0.4), mats.engawa);
  deck.position.y = 0.52;
  g.add(deck);

  const core = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, wallH, depth - 0.5), mats.shikkui);
  core.position.y = 0.59 + wallH * 0.5;
  core.castShadow = true;
  core.receiveShadow = true;
  g.add(core);

  const shoji = new THREE.Mesh(new THREE.BoxGeometry(width - 1.3, wallH * 0.76, 0.08), shojiMat);
  shoji.position.set(0, 0.59 + wallH * 0.45, (depth - 0.5) * 0.5 + 0.02);
  g.add(shoji);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.13, wallH + 0.1, 8),
        mats.hinoki
      );
      col.position.set(sx * (width - 0.5) * 0.5, 0.59 + wallH * 0.5, sz * (depth - 0.5) * 0.5);
      g.add(col);
    }
  }

  if (plaqueText) {
    const pTex = createCalligraphyPlaqueTexture(plaqueText, { bg: '#1b1612' });
    const pMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.44, 0.06),
      new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5 })
    );
    pMesh.position.set(0, 0.59 + wallH - 0.32, (depth - 0.5) * 0.5 + 0.08);
    g.add(pMesh);
  }

  const roof = createCurvedJapaneseRoof({
    width: width + 1.9,
    depth: depth + 1.9,
    height: wallH * 0.62,
    style: roofStyle,
    roofType: 'kawara',
    sori: 0.28,
    cornerLift: 0.18
  });
  roof.position.y = 0.59 + wallH;
  g.add(roof);

  return g;
}

function buildStoneStele(text, height = 1.8, width = 0.38, mats) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(width * 1.65, 0.26, width * 1.55), mats.mossyGranite);
  ped.position.y = 0.13;
  ped.castShadow = true;
  g.add(ped);

  const tex = createCalligraphyPlaqueTexture(text, {
    vertical: true,
    bg: '#7d7f78',
    border: '#666862',
    ink: '#1f211e'
  });
  const pillarMats = [
    mats.granite,
    mats.granite,
    mats.granite,
    mats.granite,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 }),
    mats.granite
  ];
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, height, width * 0.78), pillarMats);
  shaft.position.y = 0.26 + height * 0.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);
  return g;
}
