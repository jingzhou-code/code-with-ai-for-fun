import * as THREE from 'three';
import {
  getGuanghuaTextures,
  getFacadeTextures,
  createPlaqueTexture,
  getGroundTextures,
} from './proceduralTextures.js';

/**
 * Helper to tag a Group or Mesh hierarchy with a landmarkId for 3D raycast picking
 */
export function tagLandmark(object3d, landmarkId) {
  object3d.userData.landmarkId = landmarkId;
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.userData.landmarkId = landmarkId;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object3d;
}

/**
 * Creates a classic Chinese / Jiangnan pitched or hip roof
 */
export function createPitchedRoof(width, depth, height, color = 0x363b42, overhang = 1.4) {
  const shape = new THREE.Shape();
  const hw = (width + overhang * 2) / 2;
  const hd = (depth + overhang * 2) / 2;

  const geom = new THREE.ConeGeometry(1, height, 4);
  geom.rotateY(Math.PI / 4);
  geom.scale(hw * Math.SQRT2, 1, hd * Math.SQRT2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.08,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = height / 2;
  return mesh;
}

/**
 * 1. GUANGHUA TOWERS COMPLEX (光华楼：东西双子主塔、15F星空球体、东西辅楼、台阶广场与风洞流场)
 */
export function buildGuanghuaComplex(ctx) {
  const group = new THREE.Group();
  group.position.set(332, 0, -42);

  const { map, emissiveMap } = getGuanghuaTextures();
  const { plazaTex } = getGroundTextures();

  const towerMat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    emissive: new THREE.Color(0xffdfa8),
    emissiveIntensity: 0,
    roughness: 0.42,
    metalness: 0.25,
  });
  ctx.emissiveMaterials.push({ mat: towerMat, maxIntensity: 1.15 });

  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0xdad0c0,
    roughness: 0.65,
    metalness: 0.06,
  });

  const glassDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0x88c4e8,
    emissive: new THREE.Color(0xffcf86),
    emissiveIntensity: 0.08,
    roughness: 0.12,
    metalness: 0.15,
    transmission: 0.55,
    transparent: true,
    opacity: 0.86,
  });
  ctx.emissiveMaterials.push({ mat: glassDomeMat, maxIntensity: 1.35, baseIntensity: 0.06 });

  // Forecourt Granite Plaza & Monumental South Steps
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(132, 1.2, 86),
    new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.8 })
  );
  plaza.position.set(0, 0.6, 8);
  group.add(plaza);

  for (let s = 0; s < 6; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(56 - s * 2.2, 0.48, 28 - s * 2.2),
      graniteMat
    );
    step.position.set(0, 1.2 + s * 0.48, 22 - s * 1.1);
    group.add(step);
  }

  const roofSlabMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.78 });
  const towerBoxMat = [towerMat, towerMat, roofSlabMat, roofSlabMat, towerMat, towerMat];

  // Twin 30-Story Main Towers (West = 文史哲, East = 数理)
  const towerOffsets = [-21, 21];
  towerOffsets.forEach((tx) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0, -4);

    // Main shaft (floors 1–26, height 118m)
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(26, 118, 28), towerBoxMat);
    shaft.position.y = 59;
    tGroup.add(shaft);

    // Vertical Art-Deco granite corner & center pilasters
    const pilasterPos = [-13, -6.5, 0, 6.5, 13];
    pilasterPos.forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 124, 29.4), graniteMat);
      pier.position.set(px, 62, 0);
      tGroup.add(pier);
    });

    // Setback Art-Deco Crown Tiers (118m -> 139.5m)
    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 23), towerBoxMat);
    tier1.position.y = 123;
    tGroup.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(17, 7.5, 18), graniteMat);
    tier2.position.y = 131.75;
    tGroup.add(tier2);

    const lanternCrown = new THREE.Mesh(new THREE.BoxGeometry(11.5, 5, 12), glassDomeMat);
    lanternCrown.position.y = 138;
    tGroup.add(lanternCrown);

    // Spire reaching 142m!
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.65, 6.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xe6dfd3, metalness: 0.7, roughness: 0.25 })
    );
    spire.position.y = 142.2;
    tGroup.add(spire);

    // Red Aviation Warning Beacon at Y = 145.5
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), beaconMat);
    beacon.position.y = 145.5;
    tGroup.add(beacon);
    ctx.beacons.push(beacon);

    group.add(tGroup);
  });

  // Central 15-Story Connecting Bridge (Floors 1–15, Y = 0..66m)
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 64, 22), towerBoxMat);
  bridge.position.set(0, 32, -4);
  group.add(bridge);

  // Grand Entrance Portal Archway
  const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(20, 16, 26), graniteMat);
  portalFrame.position.set(0, 8, 4);
  group.add(portalFrame);

  const plaqueMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 3.4),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('光 華 樓', 'GUANGHUA TOWERS', 'gate') })
  );
  plaqueMesh.position.set(0, 13.2, 17.15);
  group.add(plaqueMesh);

  // Iconic 15th-Floor Transparent Geodesic Glass Sphere Atrium ("星空球体咖啡厅")
  const sphereRadius = 9.2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, 24, 20), glassDomeMat);
  dome.position.set(0, 71, -2);
  group.add(dome);

  const domeWire = new THREE.Mesh(
    new THREE.SphereGeometry(sphereRadius + 0.12, 14, 10),
    new THREE.MeshStandardMaterial({
      color: 0xd8dee6,
      wireframe: true,
      metalness: 0.65,
      roughness: 0.3,
    })
  );
  domeWire.position.copy(dome.position);
  group.add(domeWire);

  // Symmetrical 8-Story West & East Sub-buildings (西辅楼 & 东辅楼)
  const wingTex = getFacadeTextures('beige-louver', 3, 2);
  const wingMat = new THREE.MeshStandardMaterial({
    map: wingTex.map,
    emissiveMap: wingTex.emissiveMap,
    emissive: new THREE.Color(0xffe0a6),
    emissiveIntensity: 0,
    roughness: 0.55,
  });
  ctx.emissiveMaterials.push({ mat: wingMat, maxIntensity: 0.95 });
  const wingBoxMat = [wingMat, wingMat, roofSlabMat, roofSlabMat, wingMat, wingMat];

  [-48, 48].forEach((wx) => {
    const sign = Math.sign(wx);
    const wingA = new THREE.Mesh(new THREE.BoxGeometry(24, 32, 46), wingBoxMat);
    wingA.position.set(wx, 16, 8);
    group.add(wingA);

    const wingLink = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 18), wingBoxMat);
    wingLink.position.set(wx - sign * 14, 11, -4);
    group.add(wingLink);

    // Colonnade overhang facing central plaza
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 48), graniteMat);
    cornice.position.set(wx, 32.8, 8);
    group.add(cornice);
  });

  // Toggleable "光华风洞" (Guanghua Wind Tunnel) 3D Streamlines
  const windGroup = new THREE.Group();
  windGroup.visible = false;
  const windRibbons = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const baseY = 4 + (i % 7) * 9.5;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * (18 + (i % 3) * 14), baseY, -56),
      new THREE.Vector3(side * (9 + (i % 2) * 8), baseY + 3, -12),
      new THREE.Vector3(side * (14 + (i % 4) * 10), baseY - 2, 30),
      new THREE.Vector3(side * (26 + (i % 3) * 16), Math.max(2.5, baseY - 5), 88),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.36, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0x9be7ff : 0xd6f5ff,
      transparent: true,
      opacity: 0.55,
    });
    const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
    windGroup.add(ribbon);
    windRibbons.push({ mesh: ribbon, phase: i * 0.65, baseY });
  }
  group.add(windGroup);
  ctx.windTunnel = { group: windGroup, ribbons: windRibbons };

  tagLandmark(group, 'guanghua-towers');
  ctx.scene.add(group);
}

/**
 * 2. CENTRAL AXIS (邯郸路220号正校门、毛主席像、国旗坪、恒隆物理楼)
 */
export function buildCentralAxis(ctx) {
  const { plazaTex } = getGroundTextures();
  const plazaMat = new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.82 });
  const lightStoneMat = new THREE.MeshStandardMaterial({ color: 0xe5e2da, roughness: 0.58 });
  const whiteMarbleMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.38 });

  // --- A. 邯郸路220号正校门 (Main Gate at X=0, Z=174) ---
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, 174);

  const gatePlaza = new THREE.Mesh(new THREE.BoxGeometry(58, 0.3, 18), plazaMat);
  gatePlaza.position.y = 0.15;
  gateGroup.add(gatePlaza);

  // Main horizontal cantilevered lintel (iconic Fudan Main Gate silhouette)
  const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(36, 2.3, 4.2), lightStoneMat);
  mainBeam.position.set(0, 8.6, 0);
  gateGroup.add(mainBeam);

  // Top thin cap cornice
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.45, 4.8), whiteMarbleMat);
  topCap.position.set(0, 9.95, 0);
  gateGroup.add(topCap);

  // Supporting piers (2 main central-side piers + 2 outer pedestrian portal piers)
  [-15.5, -9.2, 9.2, 15.5].forEach((px, idx) => {
    const w = idx === 1 || idx === 2 ? 2.4 : 1.8;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(w, 7.6, 3.2), lightStoneMat);
    pier.position.set(px, 3.8, 0);
    gateGroup.add(pier);
  });

  // Mao Zedong's "復旦大學" Calligraphy Plaque (South & North sides)
  const gateSignTex = createPlaqueTexture('復 旦 大 學', '', 'gate');
  const signSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(13.5, 2.05),
    new THREE.MeshBasicMaterial({ map: gateSignTex })
  );
  signSouth.position.set(0, 8.6, 2.14);
  gateGroup.add(signSouth);

  const signNorth = signSouth.clone();
  signNorth.rotation.y = Math.PI;
  signNorth.position.set(0, 8.6, -2.14);
  gateGroup.add(signNorth);

  // Guardhouse & 220 Handan Rd bronze plate pier
  const guardBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.6, 4.5), lightStoneMat);
  guardBox.position.set(-20.5, 1.8, -1.5);
  gateGroup.add(guardBox);

  tagLandmark(gateGroup, 'main-gate');
  ctx.scene.add(gateGroup);

  // --- B. 毛主席像 (Chairman Mao Statue at X=0, Z=84, Total Height = 12.26m) ---
  const maoGroup = new THREE.Group();
  maoGroup.position.set(0, 0, 84);

  const maoPlaza = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 24), plazaMat);
  maoPlaza.position.y = 0.175;
  maoGroup.add(maoPlaza);

  // Evergreen flowerbed ring
  const flowerBed = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.65, 13),
    new THREE.MeshStandardMaterial({ color: 0x2a5430, roughness: 0.9 })
  );
  flowerBed.position.y = 0.5;
  maoGroup.add(flowerBed);

  // 5.16m White Granite Pedestal
  const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.16, 7.6), lightStoneMat);
  baseStep1.position.y = 1.1;
  maoGroup.add(baseStep1);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.0, 3.4), whiteMarbleMat);
  pedestal.position.y = 3.68;
  maoGroup.add(pedestal);

  // 7.1m Sculpted White Standing Figure (Overcoat silhouette facing South +Z)
  const figureGroup = new THREE.Group();
  figureGroup.position.y = 5.68;

  // Lower overcoat & legs
  const coatLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 1.12, 3.4, 14),
    whiteMarbleMat
  );
  coatLower.scale.set(1, 1, 0.72);
  coatLower.position.y = 1.7;
  figureGroup.add(coatLower);

  // Torso & shoulders with clasped-hands-behind-back posture
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.88, 2.3, 14), whiteMarbleMat);
  torso.scale.set(1.08, 1, 0.72);
  torso.position.y = 4.45;
  figureGroup.add(torso);

  // Clasped arms subtle volume at back (-Z)
  const armsBack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.5, 0.55), whiteMarbleMat);
  armsBack.position.set(0, 4.1, -0.42);
  figureGroup.add(armsBack);

  // Head (uncapped, facing South)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 16), whiteMarbleMat);
  head.scale.set(0.92, 1.12, 0.96);
  head.position.y = 6.28;
  figureGroup.add(head);

  maoGroup.add(figureGroup);
  tagLandmark(maoGroup, 'mao-statue');
  ctx.scene.add(maoGroup);

  // --- C. 国旗坪 (National Flag Square at X=0, Z=24) ---
  const flagGroup = new THREE.Group();
  flagGroup.position.set(0, 0, 24);

  const flagPlaza = new THREE.Mesh(new THREE.BoxGeometry(38, 0.4, 28), plazaMat);
  flagPlaza.position.y = 0.2;
  flagGroup.add(flagPlaza);

  const flagPodium = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.1, 7.5), whiteMarbleMat);
  flagPodium.position.y = 0.75;
  flagGroup.add(flagPodium);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.22, 22, 12),
    new THREE.MeshStandardMaterial({ color: 0xe0e5ec, metalness: 0.85, roughness: 0.2 })
  );
  pole.position.y = 11.5;
  flagGroup.add(pole);

  // Vertex-Animated Red Flag
  const flagGeo = new THREE.PlaneGeometry(4.8, 3.2, 18, 10);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xd62420,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(2.45, 20.6, 0);
  flagGroup.add(flagMesh);
  ctx.animatedFlag = { mesh: flagMesh, basePos: flagGeo.attributes.position.array.slice() };

  tagLandmark(flagGroup, 'flag-square');
  ctx.scene.add(flagGroup);

  // --- D. 恒隆物理楼 (Hang Lung Physics Building at X=0, Z=-28) ---
  const physGroup = new THREE.Group();
  physGroup.position.set(0, 0, -28);

  const physTex = getFacadeTextures('classic-physics', 3, 1);
  const physMat = new THREE.MeshStandardMaterial({
    map: physTex.map,
    emissiveMap: physTex.emissiveMap,
    emissive: new THREE.Color(0xffdfa6),
    emissiveIntensity: 0,
    roughness: 0.58,
  });
  ctx.emissiveMaterials.push({ mat: physMat, maxIntensity: 0.9 });
  const physBoxMat = [physMat, physMat, lightStoneMat, lightStoneMat, physMat, physMat];

  // Main horizontal symmetrical body
  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(76, 22, 24), physBoxMat);
  mainWing.position.y = 11;
  physGroup.add(mainWing);

  // Stepped central tower (31m)
  const centerTower = new THREE.Mesh(new THREE.BoxGeometry(22, 30, 27), physBoxMat);
  centerTower.position.y = 15;
  physGroup.add(centerTower);

  const topCrown = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xd9cebc, roughness: 0.65 })
  );
  topCrown.position.y = 32;
  physGroup.add(topCrown);

  // Grand South Entrance Portico Columns
  const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 6), lightStoneMat);
  porticoRoof.position.set(0, 9.5, 15);
  physGroup.add(porticoRoof);
  [-7, -2.4, 2.4, 7].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 9, 12), lightStoneMat);
    col.position.set(cx, 4.5, 17);
    physGroup.add(col);
  });

  const physSign = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 2.2),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('恒隆物理樓', 'HANG LUNG PHYSICS', 'modern') })
  );
  physSign.position.set(0, 11.4, 13.6);
  physGroup.add(physSign);

  tagLandmark(physGroup, 'hang-lung-physics');
  ctx.scene.add(physGroup);

  // --- E. 复旦校训墙 (“博学而笃志，切问而近思” along Guanghua Avenue at X=46, Z=43) ---
  const mottoGroup = new THREE.Group();
  mottoGroup.position.set(46, 0, 43);
  const mottoBase = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.55, 2.2), lightStoneMat);
  mottoBase.position.y = 0.275;
  mottoGroup.add(mottoBase);
  const mottoWall = new THREE.Mesh(
    new THREE.BoxGeometry(18.8, 3.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.62 })
  );
  mottoWall.position.y = 2.05;
  mottoGroup.add(mottoWall);
  const mottoFace = new THREE.Mesh(
    new THREE.PlaneGeometry(17.2, 2.35),
    new THREE.MeshBasicMaterial({
      map: createPlaqueTexture('博學而篤志  切問而近思', 'FUDAN MOTTO · 1905', 'gate'),
    })
  );
  mottoFace.position.set(0, 2.1, 0.57);
  mottoGroup.add(mottoFace);
  ctx.scene.add(mottoGroup);
}

/**
 * 3. WEST CAMPUS HISTORIC HERITAGE QUARTER (登辉环路、相辉堂、子彬院小白宫、校史馆奕柱堂、寒冰馆、景莱堂、1921老校门、18号线复旦站)
 */
export function buildHeritageQuarter(ctx) {
  // --- A. 登辉环路 (Denghui Oval Ring Road around Xianghui Lawn X=-275, Z=-18) ---
  const ringShape = new THREE.Shape();
  ringShape.absellipse(0, 0, 46, 54, 0, Math.PI * 2, false, 0);
  const holePath = new THREE.Path();
  holePath.absellipse(0, 0, 38, 46, 0, Math.PI * 2, true, 0);
  ringShape.holes.push(holePath);

  const ringGeo = new THREE.ShapeGeometry(ringShape, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ringRoad = new THREE.Mesh(
    ringGeo,
    new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.88 })
  );
  ringRoad.position.set(-275, 0.08, -18);
  ringRoad.receiveShadow = true;
  ctx.scene.add(ringRoad);

  // Inner oval emerald Denghui Lawn
  const lawnGeo = new THREE.CircleGeometry(1, 40);
  lawnGeo.rotateX(-Math.PI / 2);
  lawnGeo.scale(38, 1, 46);
  const denghuiLawn = new THREE.Mesh(
    lawnGeo,
    new THREE.MeshStandardMaterial({ map: getGroundTextures().grassTex, color: 0x4b874e, roughness: 0.9 })
  );
  denghuiLawn.position.set(-275, 0.09, -18);
  denghuiLawn.receiveShadow = true;
  ctx.scene.add(denghuiLawn);

  // --- B. 相辉堂 (Xianghui Hall — White Stucco, Black Double-Pitched Roof, Crimson Doors/Windows & North Hall) ---
  const xhGroup = new THREE.Group();
  xhGroup.position.set(-275, 0, -92);

  const whiteStucco = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.72 });
  const crimsonWood = new THREE.MeshStandardMaterial({
    color: 0x932320,
    emissive: new THREE.Color(0xffb86c),
    emissiveIntensity: 0,
    roughness: 0.5,
  });
  ctx.emissiveMaterials.push({ mat: crimsonWood, maxIntensity: 0.55 });

  // Historic South Auditorium (1947)
  const southHall = new THREE.Mesh(new THREE.BoxGeometry(30, 10.5, 34), whiteStucco);
  southHall.position.set(0, 5.25, 10);
  xhGroup.add(southHall);

  // Signature Double-Broken / Clerestory Black Tile Roof (二层破屋面)
  const lowerRoof = createPitchedRoof(31, 35, 3.6, 0x2c3036, 1.2);
  lowerRoof.position.set(0, 10.5, 10);
  xhGroup.add(lowerRoof);

  const upperClerestory = new THREE.Mesh(new THREE.BoxGeometry(18, 2.6, 26), whiteStucco);
  upperClerestory.position.set(0, 12.2, 10);
  xhGroup.add(upperClerestory);

  const upperRoof = createPitchedRoof(19, 27, 3.2, 0x25282e, 1.0);
  upperRoof.position.set(0, 13.5, 10);
  xhGroup.add(upperRoof);

  // South Gable Pediment & Bridge-like Exterior Staircase (桥形外楼梯)
  const frontGable = new THREE.Mesh(new THREE.BoxGeometry(16, 11.2, 3), whiteStucco);
  frontGable.position.set(0, 5.6, 27.5);
  xhGroup.add(frontGable);

  const bridgeTerrace = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 4.2), whiteStucco);
  bridgeTerrace.position.set(0, 2.1, 30.2);
  xhGroup.add(bridgeTerrace);

  // Twin side exterior stair ramps
  [-7.5, 7.5].forEach((sx) => {
    const stairRamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 6.5), whiteStucco);
    stairRamp.position.set(sx, 2.1, 29.8);
    stairRamp.rotation.z = sx < 0 ? -0.45 : 0.45;
    xhGroup.add(stairRamp);
  });

  // Crimson Windows & Triple Auditorium Doors
  [-3.8, 0, 3.8].forEach((dx) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.6, 0.4), crimsonWood);
    door.position.set(dx, 6.0, 29.1);
    xhGroup.add(door);
  });
  for (let wz = -3; wz <= 21; wz += 6) {
    [-15.1, 15.1].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 2.2), crimsonWood);
      win.position.set(wx, 6.2, wz);
      xhGroup.add(win);
    });
  }

  // Zhou Gucheng's "相輝堂" Plaque
  const xhPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 1.7),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('相 輝 堂', '1947', 'heritage') })
  );
  xhPlaque.position.set(0, 9.6, 29.12);
  xhGroup.add(xhPlaque);

  // Newly Expanded North Hall (2023 相辉堂北堂)
  const northHall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 26), whiteStucco);
  northHall.position.set(0, 6, -22);
  xhGroup.add(northHall);
  const northRoof = createPitchedRoof(37, 27, 4.2, 0x2b2f36, 1.2);
  northRoof.position.set(0, 12, -22);
  xhGroup.add(northRoof);

  tagLandmark(xhGroup, 'xianghui-hall');
  ctx.scene.add(xhGroup);

  // 复旦烈士纪念雕塑广场 (East of Xianghui Hall at X=-240, Z=-84)
  const martyrGroup = new THREE.Group();
  martyrGroup.position.set(-240, 0, -84);
  const martyrPad = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 8.2, 0.35, 24),
    new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.78 })
  );
  martyrPad.position.y = 0.18;
  martyrGroup.add(martyrPad);
  const martyrStele = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 5.4, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xedeae2, roughness: 0.45 })
  );
  martyrStele.position.y = 2.85;
  martyrStele.rotation.z = -0.06;
  martyrGroup.add(martyrStele);
  ctx.scene.add(martyrGroup);

  // --- C. 子彬院 ("小白宫" Zibin Building, 1925, X=-214, Z=-12, facing West onto Denghui Lawn) ---
  const zbGroup = new THREE.Group();
  zbGroup.position.set(-214, 0, -12);

  const zbStone = new THREE.MeshStandardMaterial({ color: 0xe3dfd6, roughness: 0.62 });
  const zbTex = getFacadeTextures('beige-louver', 2, 1);
  const zbWallMat = new THREE.MeshStandardMaterial({
    map: zbTex.map,
    emissiveMap: zbTex.emissiveMap,
    color: 0xeae6dc,
    emissive: new THREE.Color(0xffdca0),
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  ctx.emissiveMaterials.push({ mat: zbWallMat, maxIntensity: 0.75 });

  // T-shaped 3-story body (oriented facing West -X toward Denghui Lawn)
  const zbMain = new THREE.Mesh(new THREE.BoxGeometry(18, 12.5, 38), zbWallMat);
  zbMain.position.set(3, 6.25, 0);
  zbGroup.add(zbMain);

  const zbCenterProject = new THREE.Mesh(new THREE.BoxGeometry(10, 13, 15), zbWallMat);
  zbCenterProject.position.set(-6, 6.5, 0);
  zbGroup.add(zbCenterProject);

  // Red Tile Pitched Roof + Classical Triangular Pediment (三角形山花)
  const zbRoof = createPitchedRoof(19, 39, 4.2, 0x9c4136, 1.1);
  zbRoof.position.set(3, 12.5, 0);
  zbGroup.add(zbRoof);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.6, 4), zbStone);
  pediment.rotation.y = Math.PI / 4;
  pediment.scale.set(0.6, 1, 1.25);
  pediment.position.set(-8, 14.5, 0);
  zbGroup.add(pediment);

  // Iconic Semicircular White-House Ionic Column Portico & 2F Balustrade Terrace!
  const porticoBase = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.8, 0.8, 20, 1, false, Math.PI, Math.PI),
    zbStone
  );
  porticoBase.position.set(-10.5, 0.4, 0);
  zbGroup.add(porticoBase);

  const porticoDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.6, 0.7, 20, 1, false, Math.PI, Math.PI),
    zbStone
  );
  porticoDeck.position.set(-10.5, 5.4, 0);
  zbGroup.add(porticoDeck);

  // 6 Ionic Columns along semicircular arc
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI + (i / 5) * Math.PI;
    const cx = -10.5 + Math.sin(angle) * 4.9;
    const cz = Math.cos(angle) * 4.9;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 4.8, 12), zbStone);
    col.position.set(cx, 2.9, cz);
    zbGroup.add(col);
  }

  tagLandmark(zbGroup, 'zibin-building');
  ctx.scene.add(zbGroup);

  // --- D. 校史馆 / 奕柱堂 (1921 Henry Murphy Chinese Classical Flying-Eave Hall, X=-235, Z=74) ---
  const yzGroup = new THREE.Group();
  yzGroup.position.set(-235, 0, 74);

  const greyBrickTex = getFacadeTextures('heritage-grey', 2, 1);
  const yzMat = new THREE.MeshStandardMaterial({
    map: greyBrickTex.map,
    emissiveMap: greyBrickTex.emissiveMap,
    emissive: new THREE.Color(0xffd796),
    emissiveIntensity: 0,
    roughness: 0.72,
  });
  ctx.emissiveMaterials.push({ mat: yzMat, maxIntensity: 0.8 });

  const yzBody = new THREE.Mesh(new THREE.BoxGeometry(30, 9.5, 19), yzMat);
  yzBody.position.y = 4.75;
  yzGroup.add(yzBody);

  // White classical corner pilasters
  [
    [-15, -9.5],
    [15, -9.5],
    [-15, 9.5],
    [15, 9.5],
  ].forEach(([px, pz]) => {
    const pil = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 9.6, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xefece4 })
    );
    pil.position.set(px, 4.8, pz);
    yzGroup.add(pil);
  });

  // Double-eave upturned青瓦歇山顶
  const eaveLower = createPitchedRoof(33.5, 22.5, 2.4, 0x2f3a40, 2.0);
  eaveLower.position.y = 9.3;
  yzGroup.add(eaveLower);

  const eaveUpper = createPitchedRoof(27, 16.5, 4.2, 0x29343a, 1.5);
  eaveUpper.position.y = 11.2;
  yzGroup.add(eaveUpper);

  const yzPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.5),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('奕 柱 堂', '校史館 1921', 'heritage') })
  );
  yzPlaque.position.set(0, 7.5, -9.6);
  yzPlaque.rotation.y = Math.PI;
  yzGroup.add(yzPlaque);

  tagLandmark(yzGroup, 'yizhu-museum');
  ctx.scene.add(yzGroup);

  // --- E. 寒冰馆 (1925, 3-story with north tower & red roof, X=-214, Z=-52) ---
  const hbGroup = new THREE.Group();
  hbGroup.position.set(-214, 0, -52);
  const hbBody = new THREE.Mesh(new THREE.BoxGeometry(32, 11.5, 15), zbWallMat);
  hbBody.position.y = 5.75;
  hbGroup.add(hbBody);
  const hbRoof = createPitchedRoof(33, 16, 3.8, 0x9b3e33, 1.1);
  hbRoof.position.y = 11.5;
  hbGroup.add(hbRoof);
  const hbTower = new THREE.Mesh(new THREE.BoxGeometry(9, 15.5, 9), zbWallMat);
  hbTower.position.set(0, 7.75, -5.5);
  hbGroup.add(hbTower);
  const hbTowerRoof = createPitchedRoof(10, 10, 3.2, 0x9b3e33, 0.9);
  hbTowerRoof.position.set(0, 15.5, -5.5);
  hbGroup.add(hbTowerRoof);
  tagLandmark(hbGroup, 'hanbing-guan');
  ctx.scene.add(hbGroup);

  // --- F. 景莱堂(博物馆)、简公堂、相伯堂 (West of Denghui Ring, X=-336, Z=-32) ---
  const museumGroup = new THREE.Group();
  museumGroup.position.set(-336, 0, -32);
  [-26, 0, 26].forEach((mz, idx) => {
    const w = idx === 0 ? 28 : 24;
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, 9.5, 15), yzMat);
    bldg.position.set(0, 4.75, mz);
    museumGroup.add(bldg);
    const roof = createPitchedRoof(w + 1, 16, 3.4, idx === 0 ? 0x353b42 : 0x8d3d33, 1.1);
    roof.position.set(0, 9.5, mz);
    museumGroup.add(roof);
  });
  tagLandmark(museumGroup, 'jinglai-museum');
  ctx.scene.add(museumGroup);

  // --- G. 1921江湾仿古木制老校门 (X=-176, Z=152) ---
  const oldGate = new THREE.Group();
  oldGate.position.set(-176, 0, 152);
  const darkTimber = new THREE.MeshStandardMaterial({ color: 0x3a261e, roughness: 0.75 });
  [-6.2, -2.5, 2.5, 6.2].forEach((px, i) => {
    const h = i === 1 || i === 2 ? 8.2 : 6.6;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, h, 10), darkTimber);
    post.position.set(px, h / 2, 0);
    oldGate.add(post);
  });
  const centerRoof = createPitchedRoof(6.8, 3.2, 2.1, 0x2a2f35, 1.0);
  centerRoof.position.set(0, 7.8, 0);
  oldGate.add(centerRoof);
  [-4.4, 4.4].forEach((sx) => {
    const sideRoof = createPitchedRoof(4.2, 2.6, 1.6, 0x2a2f35, 0.7);
    sideRoof.position.set(sx, 6.2, 0);
    oldGate.add(sideRoof);
  });
  const oldPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.35),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('復 旦 大 學', '1921', 'heritage') })
  );
  oldPlaque.position.set(0, 6.8, 0.35);
  oldGate.add(oldPlaque);
  const oldPlaqueBack = oldPlaque.clone();
  oldPlaqueBack.rotation.y = Math.PI;
  oldPlaqueBack.position.z = -0.35;
  oldGate.add(oldPlaqueBack);
  tagLandmark(oldGate, 'old-gate-1921');
  ctx.scene.add(oldGate);

  // --- H. 上海地铁18号线复旦大学站 (Red-Brick Arch Pavilion at X=-382, Z=-42) ---
  const metroGroup = new THREE.Group();
  metroGroup.position.set(-382, 0, -42);
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x9b4438, roughness: 0.74 });
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(24, 8.2, 15), brickMat);
  pavilion.position.y = 4.1;
  metroGroup.add(pavilion);
  const metroCap = new THREE.Mesh(
    new THREE.BoxGeometry(25.4, 0.9, 16.4),
    new THREE.MeshStandardMaterial({ color: 0xdad3c5 })
  );
  metroCap.position.y = 8.5;
  metroGroup.add(metroCap);
  // Three glazed entrance arches facing East (+X into campus)
  [-4.5, 0, 4.5].forEach((az) => {
    const archGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 5.8, 3.2),
      new THREE.MeshStandardMaterial({
        color: 0x2b4b63,
        emissive: 0xffdca4,
        emissiveIntensity: 0.25,
        roughness: 0.2,
      })
    );
    archGlass.position.set(12.05, 3.0, az);
    metroGroup.add(archGlass);
  });
  const metroSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 2.1),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('复旦大学站', '18号线 · 2号口', 'modern') })
  );
  metroSign.rotation.y = Math.PI / 2;
  metroSign.position.set(12.2, 7.1, 0);
  metroGroup.add(metroSign);
  tagLandmark(metroGroup, 'metro-line18');
  ctx.scene.add(metroGroup);
}

/**
 * 4. GARDENS & WATERWAYS (走马塘河道、本北高速桥、燕园世纪钟、曦园荷花池)
 */
export function buildGardensAndWater(ctx) {
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e5663,
    roughness: 0.14,
    metalness: 0.12,
    reflectivity: 0.85,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
  });
  ctx.waterMaterial = waterMat;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbcb7ad, roughness: 0.8 });

  // --- A. 走马塘校园支流河道 (Meandering East-West along Z ≈ -192) ---
  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-620, 0.06, -196),
    new THREE.Vector3(-420, 0.06, -190),
    new THREE.Vector3(-240, 0.06, -195),
    new THREE.Vector3(-120, 0.06, -189),
    new THREE.Vector3(60, 0.06, -194),
    new THREE.Vector3(260, 0.06, -188),
    new THREE.Vector3(460, 0.06, -193),
    new THREE.Vector3(680, 0.06, -190),
  ]);
  const riverPts = riverCurve.getPoints(80);
  for (let i = 0; i < riverPts.length - 1; i++) {
    const p1 = riverPts[i];
    const p2 = riverPts[i + 1];
    const len = p1.distanceTo(p2) + 0.8;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(len, 14), waterMat);
    seg.rotation.x = -Math.PI / 2;
    seg.position.set((p1.x + p2.x) / 2, 0.07, (p1.z + p2.z) / 2);
    seg.rotation.z = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
    seg.receiveShadow = true;
    ctx.scene.add(seg);
  }

  // Campus River Bridges including Legendary "本北高速" Bridge (X=-185, Z=-192)
  const bridgeXs = [-345, -185, 168, 435];
  bridgeXs.forEach((bx) => {
    const bGroup = new THREE.Group();
    const bw = bx === 435 ? 20 : 10.5;
    bGroup.position.set(bx, 0, -192);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.9, 20), stoneMat);
    deck.position.y = 0.75;
    bGroup.add(deck);
    [-bw / 2 + 0.4, bw / 2 - 0.4].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 20), stoneMat);
      rail.position.set(rx, 1.6, 0);
      bGroup.add(rail);
    });
    if (bx === -185) {
      const bbSign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 1.2),
        new THREE.MeshBasicMaterial({ map: createPlaqueTexture('本北通道', '本北高速', 'modern') })
      );
      bbSign.position.set(6.2, 2.2, 9);
      bGroup.add(bbSign);
      tagLandmark(bGroup, 'benbei-expressway');
    }
    ctx.scene.add(bGroup);
  });

  // --- B. 燕园与世纪钟 (Yanyuan Garden at X=-112, Z=142) ---
  const yanGroup = new THREE.Group();
  yanGroup.position.set(-112, 0, 142);

  // Curving Jiangnan pond
  const yanPond1 = new THREE.Mesh(new THREE.CircleGeometry(16, 28), waterMat);
  yanPond1.rotation.x = -Math.PI / 2;
  yanPond1.scale.set(1.7, 0.85, 1);
  yanPond1.position.set(-8, 0.11, 6);
  yanGroup.add(yanPond1);

  const yanPond2 = new THREE.Mesh(new THREE.CircleGeometry(12, 24), waterMat);
  yanPond2.rotation.x = -Math.PI / 2;
  yanPond2.scale.set(1.5, 0.8, 1);
  yanPond2.position.set(18, 0.11, 8);
  yanGroup.add(yanPond2);

  // Arched Jiangnan Stone Bridge
  const yanBridge = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 3.2), stoneMat);
  yanBridge.position.set(6, 1.0, 7);
  yanGroup.add(yanBridge);

  // Taihu Rockery & Cascade (假山叠水)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x76756f, roughness: 0.92 });
  [
    [-26, 2.2, 10, 3.6],
    [-22, 3.2, 12, 4.4],
    [-18, 1.8, 11, 2.8],
  ].forEach(([rx, ry, rz, s]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), rockMat);
    rock.position.set(rx, ry, rz);
    yanGroup.add(rock);
  });

  // 世纪钟亭 (Century Bell Pavilion + Bronze Bell)
  const bellPavilion = new THREE.Group();
  bellPavilion.position.set(32, 0, -4);
  const pavBase = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.8, 6), stoneMat);
  pavBase.position.y = 0.4;
  bellPavilion.add(pavBase);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 4.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c2822 })
    );
    col.position.set(Math.cos(a) * 3.8, 2.7, Math.sin(a) * 3.8);
    bellPavilion.add(col);
  }
  const pavRoof = new THREE.Mesh(
    new THREE.ConeGeometry(5.6, 2.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2c343b, roughness: 0.7 })
  );
  pavRoof.position.y = 6.3;
  bellPavilion.add(pavRoof);
  // Bronze Century Bell
  const bronzeBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.25, 2.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x9b7a3c, metalness: 0.75, roughness: 0.32 })
  );
  bronzeBell.position.y = 3.4;
  bellPavilion.add(bronzeBell);
  yanGroup.add(bellPavilion);

  // 南轩 (2-story historic garden lodge in Yanyuan)
  const nanxuan = new THREE.Mesh(
    new THREE.BoxGeometry(13, 7.2, 9),
    new THREE.MeshStandardMaterial({ color: 0xe6e1d5, roughness: 0.7 })
  );
  nanxuan.position.set(-38, 3.6, -6);
  yanGroup.add(nanxuan);
  const nxRoof = createPitchedRoof(14, 10, 2.6, 0x333940, 0.9);
  nxRoof.position.set(-38, 7.2, -6);
  yanGroup.add(nxRoof);

  // Jiangnan Whitewashed Wall & Moon Gate (粉墙黛瓦月洞门)
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-9, 0);
  wallShape.lineTo(9, 0);
  wallShape.lineTo(9, 3.4);
  wallShape.lineTo(-9, 3.4);
  wallShape.closePath();
  const moonHole = new THREE.Path();
  moonHole.absarc(0, 1.55, 1.25, 0, Math.PI * 2, true);
  wallShape.holes.push(moonHole);
  const moonWallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.45, bevelEnabled: false });
  const moonWall = new THREE.Mesh(
    moonWallGeo,
    new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.75 })
  );
  moonWall.position.set(-14, 0, -14);
  yanGroup.add(moonWall);
  const wallTileCap = new THREE.Mesh(
    new THREE.BoxGeometry(18.6, 0.35, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x2d333a, roughness: 0.7 })
  );
  wallTileCap.position.set(-14, 3.55, -13.78);
  yanGroup.add(wallTileCap);

  tagLandmark(yanGroup, 'yanyuan-garden');
  ctx.scene.add(yanGroup);

  // --- C. 曦园 (Xiyuan Garden — Circular Lotus Pond, Zigzag Bridge & Hexagonal Pavilion at X=102, Z=142) ---
  const xiGroup = new THREE.Group();
  xiGroup.position.set(102, 0, 142);

  // Signature Circular Lotus Pond (圆形荷花池)
  const lotusPond = new THREE.Mesh(new THREE.CircleGeometry(19, 36), waterMat);
  lotusPond.rotation.x = -Math.PI / 2;
  lotusPond.position.set(-4, 0.11, 2);
  xiGroup.add(lotusPond);

  // Stone pond rim
  const pondRim = new THREE.Mesh(new THREE.TorusGeometry(19.2, 0.45, 8, 40), stoneMat);
  pondRim.rotation.x = Math.PI / 2;
  pondRim.position.set(-4, 0.25, 2);
  xiGroup.add(pondRim);

  // Lotus Pads & Pink Blossoms
  const padGeo = new THREE.CircleGeometry(0.85, 10);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2f753b, roughness: 0.8 });
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf28da8, roughness: 0.5 });
  for (let i = 0; i < 28; i++) {
    const r = 3.5 + ((i * 7.3) % 13.5);
    const theta = i * 2.399;
    const lx = -4 + Math.cos(theta) * r;
    const lz = 2 + Math.sin(theta) * r;
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(lx, 0.15, lz);
    xiGroup.add(pad);
    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 7), lotusMat);
      flower.position.set(lx, 0.35, lz);
      xiGroup.add(flower);
    }
  }

  // Zigzag Jiangnan Stone Bridge (九曲石桥)
  const bridgeSeg1 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 2.4), stoneMat);
  bridgeSeg1.position.set(-10, 0.55, 2);
  bridgeSeg1.rotation.y = 0.25;
  xiGroup.add(bridgeSeg1);
  const bridgeSeg2 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 2.4), stoneMat);
  bridgeSeg2.position.set(2, 0.55, 2);
  bridgeSeg2.rotation.y = -0.25;
  xiGroup.add(bridgeSeg2);

  // 曦园六角亭
  const xiPavilion = bellPavilion.clone();
  // Remove bronze bell inside clone
  xiPavilion.children.pop();
  xiPavilion.position.set(22, 0, -4);
  xiGroup.add(xiPavilion);

  // 谢希德老校长铜像 (President Xie Xide Bronze Statue overlooking Xiyuan Lotus Pond)
  const xiePlinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.0, 2.1), stoneMat);
  xiePlinth.position.set(-20, 1.0, -16);
  xiGroup.add(xiePlinth);
  const xieBronze = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.54, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x72593e, metalness: 0.68, roughness: 0.34 })
  );
  xieBronze.position.set(-20, 3.1, -16);
  xiGroup.add(xieBronze);
  const xieHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x72593e, metalness: 0.68, roughness: 0.34 })
  );
  xieHead.position.set(-20, 4.42, -16);
  xiGroup.add(xieHead);

  tagLandmark(xiGroup, 'xiyuan-garden');
  ctx.scene.add(xiGroup);
}

/**
 * 5. SPORTS ARENAS, URBAN ARTERIALS, HANDAN RD TUNNEL & OVERPASSES
 */
export function buildArenasAndUrbanContext(ctx) {
  const { courtTex } = getGroundTextures();

  // --- A. 正大体育馆 (Zhengda / Chia Tai Gymnasium at X=-318, Z=448) ---
  const zdGroup = new THREE.Group();
  zdGroup.position.set(-318, 0, 448);

  // Sloped glass-and-aluminum elliptical arena bowl
  const bowlMat = new THREE.MeshStandardMaterial({
    color: 0x3b5368,
    emissive: new THREE.Color(0xffdfa8),
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.45,
  });
  ctx.emissiveMaterials.push({ mat: bowlMat, maxIntensity: 0.65 });

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(43, 37, 13.5, 40), bowlMat);
  bowl.scale.set(1.08, 1, 0.84);
  bowl.position.y = 6.75;
  zdGroup.add(bowl);

  // Iconic Elliptical White Tensile Membrane Dome
  const domeGeo = new THREE.SphereGeometry(44, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const membraneMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f9,
    emissive: new THREE.Color(0xfff0d4),
    emissiveIntensity: 0,
    roughness: 0.42,
    metalness: 0.1,
  });
  ctx.emissiveMaterials.push({ mat: membraneMat, maxIntensity: 0.28 });

  const zdDome = new THREE.Mesh(domeGeo, membraneMat);
  zdDome.scale.set(1.1, 0.56, 0.86);
  zdDome.position.y = 8.5;
  zdGroup.add(zdDome);

  // 7 External Metallic Silver Space-Frame Arch Ribs
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xd0d7e0, metalness: 0.72, roughness: 0.28 });
  for (let i = -3; i <= 3; i++) {
    const zOff = i * 9.2;
    const spanScale = Math.sqrt(Math.max(0.25, 1 - (zOff / 38) ** 2));
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(45 * spanScale, 0.55, 8, 36, Math.PI),
      ribMat
    );
    arch.scale.set(1.06, 0.62, 1);
    arch.position.set(0, 8.2, zOff);
    zdGroup.add(arch);
  }

  // Grand East Entrance Canopy & Sign
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 28), ribMat);
  canopy.position.set(45, 8.5, 0);
  zdGroup.add(canopy);
  const zdSign = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 2.6),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('正大體育館', 'ZHENGDA GYMNASIUM', 'modern') })
  );
  zdSign.rotation.y = Math.PI / 2;
  zdSign.position.set(52.1, 9.2, 0);
  zdGroup.add(zdSign);

  tagLandmark(zdGroup, 'zhengda-gym');
  ctx.scene.add(zdGroup);

  // --- B. 南区400米标准田径运动场 & 游泳馆 (X=-448, Z=468) ---
  const stadiumGroup = buildTrackField(-448, 468, true);
  // Add South Swimming Pool Hall adjacent at (-385, 545)
  const poolHall = new THREE.Mesh(
    new THREE.BoxGeometry(42, 11, 28),
    new THREE.MeshStandardMaterial({ color: 0xd6e2eb, roughness: 0.45, metalness: 0.2 })
  );
  poolHall.position.set(52, 5.5, 76);
  stadiumGroup.add(poolHall);
  tagLandmark(stadiumGroup, 'south-stadium');
  ctx.scene.add(stadiumGroup);

  // --- C. 北区体育馆 & 北区运动场 + 球场矩阵 (X=-435, Z=-285) ---
  const northGymGroup = new THREE.Group();
  northGymGroup.position.set(-435, 0, -285);

  const ngBase = new THREE.Mesh(new THREE.BoxGeometry(58, 12, 44), bowlMat);
  ngBase.position.y = 6;
  northGymGroup.add(ngBase);

  // Barrel-Vaulted Silver Roof
  const barrelGeo = new THREE.CylinderGeometry(24, 24, 60, 28, 1, false, 0, Math.PI);
  barrelGeo.rotateZ(Math.PI / 2);
  const barrelRoof = new THREE.Mesh(barrelGeo, ribMat);
  barrelRoof.scale.set(1, 0.45, 0.96);
  barrelRoof.position.y = 11.5;
  northGymGroup.add(barrelRoof);

  tagLandmark(northGymGroup, 'north-gym');
  ctx.scene.add(northGymGroup);

  // North Track & Field (smaller training pitch south/west of North Gym at X=-455, Z=-375 -> wait: keep south of -328 or west at X=-495, Z=-285? Wait: North Apartments are Z=-345..-510, so let's place North Basketball/Tennis Courts & Pitch at X=-445, Z=-218.. wait river is -192, 北区中路 is -245! Let's place North Sports Courts right beside North Gym at X=-365..-495, Z=-222 & X=-505, Z=-285!)
  const courtPositions = [
    // North Zone courts
    [-382, -285],
    [-382, -264],
    [-502, -275],
    [-502, -298],
    // Main Campus courts (near Renzhong Dorms & East side)
    [212, -108],
    [244, -108],
    // South Zone courts (near Zhengda Gym)
    [-318, 512],
    [-286, 512],
    [-350, 512],
  ];
  const courtMat = new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.82 });
  courtPositions.forEach(([cx, cz]) => {
    const court = new THREE.Mesh(new THREE.PlaneGeometry(28, 17), courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(cx, 0.12, cz);
    court.receiveShadow = true;
    ctx.scene.add(court);
  });

  // --- D. 邯郸路中环地道出入口 & 两座跨邯郸路人行天桥 (Z = 198) ---
  buildHandanTunnelAndBridges(ctx);
}

function buildTrackField(x, z, withStand = true) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Procedural Stadium Canvas (Red 8-lane oval + striped soccer pitch)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#365e38';
  ctx.fillRect(0, 0, 512, 768);

  // Outer red oval track
  ctx.fillStyle = '#a84236';
  ctx.beginPath();
  ctx.roundRect(46, 46, 420, 676, 210);
  ctx.fill();

  // White lane lines
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 2;
  for (let l = 0; l < 6; l++) {
    const inset = 54 + l * 10;
    ctx.beginPath();
    ctx.roundRect(inset, inset, 512 - inset * 2, 768 - inset * 2, 256 - inset);
    ctx.stroke();
  }

  // Inner striped emerald soccer turf
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(118, 148, 276, 472, 120);
  ctx.clip();
  for (let sy = 148; sy < 620; sy += 34) {
    ctx.fillStyle = ((sy - 148) / 34) % 2 === 0 ? '#2f7a3e' : '#398948';
    ctx.fillRect(118, sy, 276, 34);
  }
  ctx.restore();

  // Soccer field markings
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(142, 184, 228, 400);
  ctx.beginPath();
  ctx.moveTo(142, 384);
  ctx.lineTo(370, 384);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 384, 38, 0, Math.PI * 2);
  ctx.stroke();

  const trackTex = new THREE.CanvasTexture(canvas);
  trackTex.colorSpace = THREE.SRGBColorSpace;
  trackTex.anisotropy = 8;

  const fieldMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(108, 166),
    new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.85 })
  );
  fieldMesh.rotation.x = -Math.PI / 2;
  fieldMesh.position.y = 0.12;
  fieldMesh.receiveShadow = true;
  group.add(fieldMesh);

  if (withStand) {
    const standMat = new THREE.MeshStandardMaterial({ color: 0xdedad0, roughness: 0.7 });
    for (let t = 0; t < 5; t++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(10 - t * 1.6, 1.3, 86), standMat);
      tier.position.set(-54 - t * 0.8, 0.65 + t * 1.3, 0);
      group.add(tier);
    }
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.7, 90),
      new THREE.MeshStandardMaterial({ color: 0xeef2f7, metalness: 0.25, roughness: 0.35 })
    );
    canopy.rotation.z = -0.18;
    canopy.position.set(-55, 11.5, 0);
    group.add(canopy);

    // 4 Stadium Floodlight Towers
    [
      [-48, -68],
      [48, -68],
      [-48, 68],
      [48, 68],
    ].forEach(([lx, lz]) => {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.55, 24, 8),
        new THREE.MeshStandardMaterial({ color: 0xbac4cf, metalness: 0.6 })
      );
      mast.position.set(lx, 12, lz);
      group.add(mast);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 2.2, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xfff8e6 })
      );
      head.position.set(lx, 24, lz);
      head.lookAt(x, 0, z);
      group.add(head);
    });
  }

  return group;
}

function buildHandanTunnelAndBridges(ctx) {
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9fa5ad, roughness: 0.82 });
  const darkPortalMat = new THREE.MeshBasicMaterial({ color: 0x0b0f17 });
  const bridgeBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2f5e8f,
    metalness: 0.35,
    roughness: 0.45,
  });

  // West & East Middle Ring Tunnel Portals (中环线邯郸路地道)
  [-470, 515].forEach((tx, idx) => {
    const dir = idx === 0 ? 1 : -1;
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0, 198);

    // Retaining walls flanking central express lanes
    [-6.8, 6.8].forEach((wz) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(72, 3.6, 1.1), concreteMat);
      wall.position.set(0, 1.8, wz);
      tGroup.add(wall);
    });

    // Tunnel roof cap & dark portal mouth facing away from Fudan Main Gate
    const cap = new THREE.Mesh(new THREE.BoxGeometry(28, 1.2, 14.8), concreteMat);
    cap.position.set(dir * 24, 3.8, 0);
    tGroup.add(cap);

    const portalMouth = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 3.4), darkPortalMat);
    portalMouth.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    portalMouth.position.set(dir * 10, 1.8, 0);
    tGroup.add(portalMouth);

    // Overhead Shanghai Blue Highway Gantry
    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 18), concreteMat);
    gantryBeam.position.set(-dir * 18, 7.2, 0);
    tGroup.add(gantryBeam);
    [-8.5, 8.5].forEach((gz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 7.4, 8), concreteMat);
      post.position.set(-dir * 18, 3.7, gz);
      tGroup.add(post);
    });
    const hwySign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.6),
      new THREE.MeshBasicMaterial({
        map: createPlaqueTexture('中环路 · 邯郸路地道', 'MIDDLE RING TUNNEL', 'highway'),
        side: THREE.DoubleSide,
      })
    );
    hwySign.rotation.y = Math.PI / 2;
    hwySign.position.set(-dir * 18, 7.6, 0);
    tGroup.add(hwySign);

    ctx.scene.add(tGroup);
  });

  // Two Iconic Handan Road Pedestrian Overpasses (国权路西天桥 X=-172 & 国顺路东天桥 X=+148)
  [-172, 148].forEach((ox) => {
    const opGroup = new THREE.Group();
    opGroup.position.set(ox, 0, 198);

    const span = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 42), bridgeBlueMat);
    span.position.y = 6.2;
    opGroup.add(span);

    // Translucent glass parapets
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xb9d8ef,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
    });
    [-2.1, 2.1].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.25, 42), railMat);
      rail.position.set(rx, 7.2, 0);
      opGroup.add(rail);
    });

    // Support piers & dual access stairs
    [-19, 19].forEach((pz) => {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6.2, 12), concreteMat);
      pier.position.set(0, 3.1, pz);
      opGroup.add(pier);

      const stair = new THREE.Mesh(new THREE.BoxGeometry(11, 0.8, 2.8), bridgeBlueMat);
      stair.position.set(6.5, 3.2, pz + Math.sign(pz) * 1.8);
      stair.rotation.z = -0.52;
      opGroup.add(stair);
    });

    ctx.scene.add(opGroup);
  });
}
