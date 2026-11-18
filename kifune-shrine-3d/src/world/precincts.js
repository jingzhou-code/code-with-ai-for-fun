import * as THREE from 'three';
import { VALLEY_CONFIG } from '../data/landmarks.js';
import {
  getRiverCenterX,
  getRiverWaterY,
  getRoadCenterX,
  getRoadY,
  getTerrainHeight,
  STAIR_CORRIDORS
} from './terrain.js';
import {
  createMyojinTorii,
  createKasugaLantern,
  createStoneToro,
  createShinmonGate,
  createHaiden,
  createHonden,
  createRyusenkaku,
  createTemizuya,
  createMizuuraYuniwa,
  createSacredHorsesAndEma,
  createMusubibumiRack,
  createHokora,
  createShrinePavilionBuilding,
  createKawadokoAndRyokan,
  createJapaneseBridge,
  createShimenawa
} from './architecture.js';
import {
  createSacredKatsuraTree,
  createAioiNoSugi,
  createRenriNoSugi,
  createAmatsuIwasakaGarden,
  createAmaNoIwafune,
  createFunagataIshi,
  createStoneStele
} from './nature.js';

// Helper to build a continuous stone staircase between two 3D endpoints
function buildStoneStaircase({
  ax, ay, az,
  bx, by, bz,
  stepCount = 84,
  width = 3.6,
  isLogSteps = false,
  materials,
  snowRegistry
}) {
  const group = new THREE.Group();
  const dx = bx - ax;
  const dz = bz - az;
  const dy = by - ay;
  const horizLen = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const stepDepth = horizLen / stepCount;
  const stepRise = dy / stepCount;

  const stepGeo = new THREE.BoxGeometry(width, Math.max(0.22, stepRise * 1.9), stepDepth * 1.18);
  const stepMat = isLogSteps ? materials.agedWood : materials.stoneStep;
  const instSteps = new THREE.InstancedMesh(stepGeo, stepMat, stepCount);
  instSteps.castShadow = true;
  instSteps.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    // Subtle natural stone irregularity
    const jitter = Math.sin(i * 4.7) * 0.015;
    dummy.position.set(
      ax + dx * t,
      ay + dy * t - stepRise * 0.35,
      az + dz * t
    );
    dummy.rotation.set(0, yaw + jitter * 0.2, 0);
    dummy.updateMatrix();
    instSteps.setMatrixAt(i, dummy.matrix);
  }
  group.add(instSteps);

  // Sloped mossy stone side kerbs flanking the staircase
  const total3DLen = Math.hypot(horizLen, dy);
  const slopePitch = Math.atan2(dy, horizLen);
  const px = -dz / horizLen;
  const pz = dx / horizLen;

  for (const side of [-1, 1]) {
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.58, total3DLen + 0.6),
      materials.ishigaki
    );
    kerb.position.set(
      (ax + bx) * 0.5 + px * side * (width * 0.5 + 0.24),
      (ay + by) * 0.5 + 0.08,
      (az + bz) * 0.5 + pz * side * (width * 0.5 + 0.24)
    );
    kerb.rotation.order = 'YXZ';
    kerb.rotation.y = yaw;
    kerb.rotation.x = -slopePitch;
    kerb.castShadow = true;
    kerb.receiveShadow = true;
    group.add(kerb);

    if (snowRegistry) {
      const snowKerb = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.09, total3DLen + 0.5),
        materials.snowCap
      );
      snowKerb.position.copy(kerb.position);
      snowKerb.position.y += 0.31;
      snowKerb.rotation.copy(kerb.rotation);
      snowKerb.visible = false;
      group.add(snowKerb);
      snowRegistry.push(snowKerb);
    }
  }

  return { group, yaw, px, pz };
}

export function buildAllKifunePrecincts({
  materials,
  springMat,
  waterfallMat,
  snowRegistry,
  foliageRegistry
}) {
  const root = new THREE.Group();
  root.name = 'KifuneShrineComplete';

  const glowMeshes = [];
  const lanternLights = [];
  const interactiveTargets = [];
  const suzuBells = {};

  function addWarmLight(x, y, z, distance = 26, baseIntensity = 6.2, color = 0xff9436) {
    const light = new THREE.PointLight(color, baseIntensity, distance, 1.15);
    light.position.set(x, y, z);
    root.add(light);
    lanternLights.push({ light, baseIntensity });
    return light;
  }

  // ============================================================================
  // ZONE 1: SOUTHERN APPROACH, UMEMIYA BRIDGE, HOTARU-IWA & KAWADOKO RYOKAN STREET
  // ============================================================================
  const zone1 = new THREE.Group();
  zone1.name = 'Zone1_ValleyApproachAndKawadoko';
  root.add(zone1);

  // Umemiya Bridge (梅宮橋) at z = 98
  const rx98 = getRiverCenterX(98.0);
  const umemiyaBridge = createJapaneseBridge({
    span: 13.5,
    width: 3.5,
    archHeight: 0.5,
    isVermilion: true,
    alongX: true,
    materials
  });
  umemiyaBridge.position.set(rx98 - 2.2, getRoadY(98.0), 98.0);
  zone1.add(umemiyaBridge);

  // Umemiya-sha (梅宮社) & Shiraishi-sha (白石社)
  const umemiyaSha = createHokora({ scale: 0.85, isVermilion: false, materials, snowRegistry });
  umemiyaSha.position.set(getRoadCenterX(99.5) - 3.6, getRoadY(99.5) + 0.1, 99.5);
  umemiyaSha.rotation.y = Math.PI * 0.5;
  zone1.add(umemiyaSha);

  const shiraishiSha = createHokora({ scale: 0.82, isVermilion: false, materials, snowRegistry });
  shiraishiSha.position.set(getRoadCenterX(83.5) - 3.4, getRoadY(83.5) + 0.1, 83.5);
  shiraishiSha.rotation.y = Math.PI * 0.5;
  zone1.add(shiraishiSha);

  // Hotaru-iwa (蛍岩 — Sacred Firefly Boulder) by Kibune River at z = 91
  const hotaruIwa = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.15, 1),
    materials.mossRock
  );
  hotaruIwa.scale.set(1.3, 0.92, 1.15);
  hotaruIwa.position.set(getRiverCenterX(91.0) + 2.8, getRiverWaterY(91.0) + 0.9, 91.0);
  hotaruIwa.castShadow = true;
  zone1.add(hotaruIwa);

  // 3 Iconic Kawadoko Platforms + Traditional Kyoto Ryokan over Kibune River!
  const kawadokoConfigs = [
    { z: 52.0, sign: '右源太川床' },
    { z: 14.0, sign: '貴船ひろ文' },
    { z: -24.0, sign: '左源太茶屋' }
  ];
  kawadokoConfigs.forEach((cfg) => {
    const kx = getRiverCenterX(cfg.z);
    const ky = getRiverWaterY(cfg.z) + 0.52;
    const kw = createKawadokoAndRyokan({
      deckWidth: 7.4,
      deckLength: 9.2,
      materials,
      snowRegistry,
      glowMeshes,
      ryokanEastSide: true,
      signText: cfg.sign
    });
    kw.position.set(kx, ky, cfg.z);
    zone1.add(kw);
    addWarmLight(kx, ky + 2.0, cfg.z, 26, 6.0, 0xff9f48);
  });

  // Street Kasuga lanterns along Kibune riverside road (especially illuminated during Momiji festival!)
  for (let sz = 88; sz >= -62; sz -= 15) {
    if (sz > 64 && sz < 76) continue; // Keep clear of Ni-no-Torii front
    const lx = getRoadCenterX(sz) + 2.45;
    const ly = getRoadY(sz);
    const roadLantern = createKasugaLantern({
      scale: 0.88,
      materials,
      snowRegistry,
      glowMeshes
    });
    roadLantern.position.set(lx, ly, sz);
    zone1.add(roadLantern);
  }

  // ============================================================================
  // ZONE 2: OMOTESANDO 84 STONE STEPS, 37 KASUGA LANTERNS & HONGU MAIN PRECINCT
  // ============================================================================
  const zone2 = new THREE.Group();
  zone2.name = 'Zone2_HonguAndOmotesando';
  root.add(zone2);

  const scOmote = STAIR_CORRIDORS.omotesando;
  const stairsResult = buildStoneStaircase({
    ax: scOmote.ax,
    ay: scOmote.ay,
    az: scOmote.az,
    bx: scOmote.bx,
    by: scOmote.by,
    bz: scOmote.bz,
    stepCount: 84,
    width: 3.7,
    materials,
    snowRegistry
  });
  zone2.add(stairsResult.group);

  // Ni-no-Torii (二ノ鳥居) + Tall Granite Shrine Pillar at the foot of Omotesando!
  const niNoTorii = createMyojinTorii({
    width: 4.9,
    height: 6.3,
    pillarRadius: 0.24,
    plaqueText: '貴船神社',
    materials,
    snowRegistry
  });
  niNoTorii.position.set(scOmote.ax + 0.65, scOmote.ay - 0.05, scOmote.az + 0.85);
  niNoTorii.rotation.y = stairsResult.yaw + Math.PI;
  zone2.add(niNoTorii);

  const mainShrineStele = createStoneStele({
    text: '貴布禰総本宮貴船神社',
    tall: true,
    materials
  });
  mainShrineStele.position.set(scOmote.ax + 3.45, scOmote.ay - 0.05, scOmote.az - 0.75);
  mainShrineStele.rotation.y = stairsResult.yaw + Math.PI;
  zone2.add(mainShrineStele);

  // EXACT 37 Vermilion Wooden Kasuga-doro Lanterns lining BOTH sides of Omotesando!
  // (19 along the Northeast side + 18 along the Southwest side = 37 Kasuga-doro!)
  const sDx = scOmote.bx - scOmote.ax;
  const sDz = scOmote.bz - scOmote.az;
  const sDy = scOmote.by - scOmote.ay;

  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const side = sideIdx === 0 ? 1 : -1;
    const countOnSide = sideIdx === 0 ? 19 : 18;
    for (let i = 0; i < countOnSide; i++) {
      const t = (i + 0.65) / (countOnSide + 0.3);
      const lx = scOmote.ax + sDx * t + stairsResult.px * side * 2.32;
      const lz = scOmote.az + sDz * t + stairsResult.pz * side * 2.32;
      const ly = scOmote.ay + sDy * t - 0.06;

      const lantern = createKasugaLantern({
        scale: 0.94,
        materials,
        snowRegistry,
        glowMeshes
      });
      lantern.position.set(lx, ly, lz);
      lantern.rotation.y = stairsResult.yaw;
      zone2.add(lantern);
    }
  }

  // 4 Pooled Warm Lantern PointLights bathing the entire 84-step lantern corridor & Momiji tunnel!
  for (const lt of [0.12, 0.38, 0.64, 0.9]) {
    addWarmLight(
      scOmote.ax + sDx * lt,
      scOmote.ay + sDy * lt + 2.6,
      scOmote.az + sDz * lt,
      26.0,
      8.5,
      0xff9238
    );
  }

  // Shirahige-sha (白髭社) on a mossy stone terrace ledge outside the East lantern row
  const shT = 0.28;
  const shX = scOmote.ax + sDx * shT + stairsResult.px * 3.85;
  const shZ = scOmote.az + sDz * shT + stairsResult.pz * 3.85;
  const shGroundY = getTerrainHeight(shX, shZ);
  const shPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.8, 2.1),
    materials.ishigaki
  );
  shPlinth.position.set(shX, shGroundY - 0.55, shZ);
  shPlinth.rotation.y = stairsResult.yaw;
  shPlinth.castShadow = true;
  shPlinth.receiveShadow = true;
  zone2.add(shPlinth);

  const shirahigeSha = createHokora({ scale: 0.88, isVermilion: false, materials, snowRegistry });
  shirahigeSha.position.set(shX, shGroundY + 0.35, shZ);
  shirahigeSha.rotation.y = stairsResult.yaw - Math.PI * 0.5;
  zone2.add(shirahigeSha);

  // Towering Mossy Ishigaki Castle/Shrine Retaining Walls supporting the Hongu Plateau!
  const eastCliffWall = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 8.6, 38.5),
    materials.ishigaki
  );
  eastCliffWall.position.set(-11.6, VALLEY_CONFIG.honguY - 4.3, 25.8);
  eastCliffWall.rotation.z = -0.1; // Authentic castle batter slope (Nori)
  eastCliffWall.castShadow = true;
  eastCliffWall.receiveShadow = true;
  zone2.add(eastCliffWall);

  const southCliffWall = new THREE.Mesh(
    new THREE.BoxGeometry(22.0, 6.8, 2.4),
    materials.ishigaki
  );
  southCliffWall.position.set(-32.2, VALLEY_CONFIG.honguY - 3.4, 45.2);
  southCliffWall.receiveShadow = true;
  zone2.add(southCliffWall);

  // Inner Honden/Gonden Sanctuary Retaining Wall (御神水湧出の石垣)
  const innerSanctumWall = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 1.55, 9.2),
    materials.ishigaki
  );
  innerSanctumWall.position.set(-27.2, VALLEY_CONFIG.honguY + 0.76, 11.6);
  innerSanctumWall.castShadow = true;
  innerSanctumWall.receiveShadow = true;
  zone2.add(innerSanctumWall);

  // Minamimon / Shinmon (南門) aligned squarely at the top of the 84 steps!
  const minamimon = createShinmonGate({
    width: 6.0,
    depth: 3.2,
    height: 4.1,
    isVermilion: false,
    plaqueText: '貴船宮',
    materials,
    snowRegistry,
    glowMeshes
  });
  minamimon.position.set(-21.5, VALLEY_CONFIG.honguY, 44.6);
  minamimon.rotation.y = stairsResult.yaw + Math.PI;
  zone2.add(minamimon);

  // Hongu Sacred 400-Year Katsura Tree (御神木「桂」) right inside Minamimon!
  const honguKatsura = createSacredKatsuraTree({
    height: 26.5,
    trunkCount: 9,
    seed: 400,
    materials,
    foliageRegistry
  });
  honguKatsura.position.set(-15.6, VALLEY_CONFIG.honguY, 39.6);
  zone2.add(honguKatsura);

  // Sorei-sha (祖霊社) & Temizuya (手水舎)
  const soreiSha = createHokora({ scale: 1.02, isVermilion: false, materials, snowRegistry });
  soreiSha.position.set(-15.0, VALLEY_CONFIG.honguY, 34.4);
  soreiSha.rotation.y = -Math.PI * 0.5;
  zone2.add(soreiSha);

  const honguTemizuya = createTemizuya({ materials, snowRegistry });
  honguTemizuya.position.set(-20.2, VALLEY_CONFIG.honguY, 32.8);
  zone2.add(honguTemizuya);

  // Ryusenkaku (龍船閣) overhanging cliffside rest & observation pavilion!
  const ryusenkaku = createRyusenkaku({
    cliffDrop: 7.4,
    materials,
    snowRegistry,
    glowMeshes
  });
  ryusenkaku.position.set(-11.2, VALLEY_CONFIG.honguY, 28.8);
  zone2.add(ryusenkaku);
  addWarmLight(-11.4, VALLEY_CONFIG.honguY + 3.1, 28.8, 15, 2.1, 0xffa347);

  // Sacred Black & White Horse Statues (神馬像 — Birthplace of Ema) facing Ryusenkaku!
  const sacredHorses = createSacredHorsesAndEma({ materials });
  sacredHorses.position.set(-16.5, VALLEY_CONFIG.honguY, 26.2);
  sacredHorses.rotation.y = -0.35;
  zone2.add(sacredHorses);

  // Grand Kiso-Hinoki Hongu Haiden (本宮拝殿) facing South (+Z)!
  const honguHaidenObj = createHaiden({
    width: 10.4,
    depth: 7.2,
    height: 4.35,
    woodMat: materials.hinoki,
    materials,
    snowRegistry,
    glowMeshes
  });
  honguHaidenObj.group.position.set(-24.5, VALLEY_CONFIG.honguY, 20.6);
  zone2.add(honguHaidenObj.group);
  suzuBells.hongu = { bell: honguHaidenObj.suzuBell, rope: honguHaidenObj.suzuRope };
  addWarmLight(-24.5, VALLEY_CONFIG.honguY + 3.8, 22.8, 18, 2.7, 0xffaa4f);

  interactiveTargets.push({
    type: 'pray',
    shrineId: 'hongu',
    label: '本宮 参拝（二礼二拍手一礼）',
    position: new THREE.Vector3(-24.5, VALLEY_CONFIG.honguY + 1.8, 25.2)
  });

  // Hongu Honden (本宮本殿) & Gonden (権殿) on raised inner sanctum behind Haiden!
  const honguHonden = createHonden({
    width: 5.6,
    depth: 4.4,
    height: 3.9,
    woodMat: materials.hinoki,
    chigi: true,
    katsuogiCount: 5,
    withFence: true,
    materials,
    snowRegistry
  });
  honguHonden.position.set(-24.5, VALLEY_CONFIG.honguInnerY, 11.6);
  zone2.add(honguHonden);

  const honguGonden = createHonden({
    width: 4.4,
    depth: 3.6,
    height: 3.3,
    woodMat: materials.hinoki,
    chigi: true,
    katsuogiCount: 4,
    withFence: false,
    materials,
    snowRegistry
  });
  honguGonden.position.set(-31.2, VALLEY_CONFIG.honguInnerY, 11.6);
  zone2.add(honguGonden);

  // Goshinsui & Mizuura-Yuniwa (御神水・水占齋庭) right at the sacred spring stone wall!
  const mizuuraObj = createMizuuraYuniwa({ springMat, materials });
  mizuuraObj.group.position.set(-17.4, VALLEY_CONFIG.honguY, 17.2);
  zone2.add(mizuuraObj.group);

  interactiveTargets.push({
    type: 'mizuura',
    label: '水占齋庭（水占みくじを浮かべる）',
    position: new THREE.Vector3(-17.0, VALLEY_CONFIG.honguY + 1.1, 17.2)
  });

  // Shamusho / Juyosho (社務所・授与所) & Saikan (斎館)
  const shamusho = createShrinePavilionBuilding({
    width: 4.8,
    depth: 9.8,
    height: 3.4,
    hasCounter: true,
    materials,
    snowRegistry,
    glowMeshes
  });
  shamusho.position.set(-36.2, VALLEY_CONFIG.honguY, 26.5);
  zone2.add(shamusho);

  const saikan = createShrinePavilionBuilding({
    width: 4.6,
    depth: 6.4,
    height: 3.2,
    hasCounter: false,
    materials,
    snowRegistry,
    glowMeshes
  });
  saikan.position.set(-37.8, VALLEY_CONFIG.honguY, 37.5);
  zone2.add(saikan);

  // Mirei Shigemori's Stone Boat Garden: Sekitei "Amatsu-Iwasaka" (石庭「天津磐境」)
  const amatsuIwasaka = createAmatsuIwasakaGarden({ materials });
  amatsuIwasaka.position.set(-36.8, VALLEY_CONFIG.honguY + 0.02, 13.4);
  zone2.add(amatsuIwasaka);

  // Courtyard Kasuga lanterns around Hongu
  const honguLanternCoords = [
    [-28.2, 27.5], [-20.8, 27.5], [-28.2, 34.5], [-17.5, 21.5]
  ];
  for (const [lx, lz] of honguLanternCoords) {
    const cl = createKasugaLantern({ scale: 0.92, materials, snowRegistry, glowMeshes });
    cl.position.set(lx, VALLEY_CONFIG.honguY, lz);
    zone2.add(cl);
  }

  // Kita-sando North Exit Staircase + Suzuka Bridge + Kita-Torii + Auxiliary Shrines (牛一社・川尾社・鈴鹿社)
  const scKita = STAIR_CORRIDORS.kitasando;
  const kitaStairs = buildStoneStaircase({
    ax: scKita.ax,
    ay: scKita.ay,
    az: scKita.az,
    bx: scKita.bx,
    by: scKita.by,
    bz: scKita.bz,
    stepCount: 42,
    width: 2.8,
    materials,
    snowRegistry
  });
  zone2.add(kitaStairs.group);

  const kitaTorii = createMyojinTorii({
    width: 3.8,
    height: 4.8,
    pillarRadius: 0.19,
    plaqueText: '貴船神社',
    materials,
    snowRegistry
  });
  kitaTorii.position.set(scKita.ax + 0.4, scKita.ay, scKita.az - 0.5);
  kitaTorii.rotation.y = kitaStairs.yaw + Math.PI;
  zone2.add(kitaTorii);

  // Suzuka-dani small waterfall & auxiliary shrines near North Gate
  const suzukaCascade = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), waterfallMat);
  suzukaCascade.position.set(-14.5, 7.2, 3.2);
  suzukaCascade.rotation.y = 0.45;
  zone2.add(suzukaCascade);

  const gyuichiSha = createHokora({ scale: 0.85, materials, snowRegistry });
  gyuichiSha.position.set(-16.5, VALLEY_CONFIG.honguY, 7.6);
  zone2.add(gyuichiSha);

  const kawaoSha = createHokora({ scale: 0.85, materials, snowRegistry });
  kawaoSha.position.set(-5.8, getRoadY(-2.0) + 0.8, -2.0);
  kawaoSha.rotation.y = Math.PI * 0.4;
  zone2.add(kawaoSha);

  // ============================================================================
  // ZONE 3: YUI-NO-YASHIRO / NAKAMIYA (結社・中宮 — SHRINE OF BONDS & LOVE)
  // ============================================================================
  const zone3 = new THREE.Group();
  zone3.name = 'Zone3_YuiNoYashiro';
  root.add(zone3);

  const scYui = STAIR_CORRIDORS.yuiSteps;
  const yuiStairs = buildStoneStaircase({
    ax: scYui.ax,
    ay: scYui.ay,
    az: scYui.az,
    bx: scYui.bx,
    by: scYui.by,
    bz: scYui.bz,
    stepCount: 34,
    width: 2.9,
    isLogSteps: true,
    materials,
    snowRegistry
  });
  zone3.add(yuiStairs.group);

  const yuiTorii = createMyojinTorii({
    width: 3.9,
    height: 4.9,
    pillarRadius: 0.19,
    plaqueText: '結社',
    materials,
    snowRegistry
  });
  yuiTorii.position.set(scYui.ax - 0.8, scYui.ay + 0.1, scYui.az);
  yuiTorii.rotation.y = Math.PI * 0.5;
  zone3.add(yuiTorii);

  const yuiSignStele = createStoneStele({ text: '結社', tall: true, materials });
  yuiSignStele.position.set(scYui.ax + 0.6, scYui.ay, scYui.az + 2.4);
  yuiSignStele.rotation.y = Math.PI * 0.5;
  zone3.add(yuiSignStele);

  // Yui-no-Yashiro Retaining Wall
  const yuiWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.4, 19.5), materials.ishigaki);
  yuiWall.position.set(-15.5, VALLEY_CONFIG.yuiY - 2.2, -39.8);
  zone3.add(yuiWall);

  // Yui-no-Yashiro Honden / Haisho (結社本殿) enshrining Iwanagahime-no-mikoto
  const yuiHonden = createHonden({
    width: 5.2,
    depth: 4.2,
    height: 3.6,
    woodMat: materials.hinoki,
    chigi: true,
    katsuogiCount: 4,
    withFence: true,
    materials,
    snowRegistry
  });
  yuiHonden.position.set(-26.0, VALLEY_CONFIG.yuiY, -44.2);
  zone3.add(yuiHonden);
  addWarmLight(-25.5, VALLEY_CONFIG.yuiY + 3.2, -39.5, 16, 2.3, 0xff9f46);

  // Saisen offering box in front of Yui-no-Yashiro
  const yuiSaisen = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.68, 0.75), materials.hinoki);
  yuiSaisen.position.set(-26.0, VALLEY_CONFIG.yuiY + 0.34, -40.8);
  yuiSaisen.castShadow = true;
  zone3.add(yuiSaisen);

  interactiveTargets.push({
    type: 'pray',
    shrineId: 'yui',
    label: '結社（中宮）参拝・良縁祈願',
    position: new THREE.Vector3(-26.0, VALLEY_CONFIG.yuiY + 1.5, -39.8)
  });

  // Ama-no-Iwafune (天乃磐船 — 6-ton Natural Boat-Shaped Kibune Stone!)
  const amaNoIwafune = createAmaNoIwafune({ materials });
  amaNoIwafune.position.set(-19.5, VALLEY_CONFIG.yuiY, -35.2);
  amaNoIwafune.rotation.y = 0.42;
  zone3.add(amaNoIwafune);

  // Pale-green Musubibumi Racks (薄緑色の結び文掛け)
  const musubiRack1 = createMusubibumiRack({ materials });
  musubiRack1.group.position.set(-22.0, VALLEY_CONFIG.yuiY, -39.5);
  musubiRack1.group.rotation.y = -0.3;
  zone3.add(musubiRack1.group);

  const musubiRack2 = createMusubibumiRack({ materials });
  musubiRack2.group.position.set(-30.0, VALLEY_CONFIG.yuiY, -39.5);
  musubiRack2.group.rotation.y = 0.3;
  zone3.add(musubiRack2.group);

  interactiveTargets.push({
    type: 'musubibumi',
    label: '結び文を結び所に結ぶ',
    position: new THREE.Vector3(-22.0, VALLEY_CONFIG.yuiY + 1.3, -39.5)
  });

  // Izumi Shikibu Waka Monument (和泉式部歌碑) & Matsuo Iwao Haiku Monument
  const izumiStele = createStoneStele({ text: '和泉式部歌碑', tall: false, materials });
  izumiStele.position.set(-30.6, VALLEY_CONFIG.yuiY, -34.8);
  izumiStele.rotation.y = 0.55;
  zone3.add(izumiStele);

  const matsuoStele = createStoneStele({ text: '葛の花句碑', tall: false, materials });
  matsuoStele.scale.setScalar(0.78);
  matsuoStele.position.set(-18.5, VALLEY_CONFIG.yuiY, -42.5);
  matsuoStele.rotation.y = -0.6;
  zone3.add(matsuoStele);

  // Sacred 400-year Katsura Tree of Nakamiya (結社の御神木「桂」)
  const yuiKatsura = createSacredKatsuraTree({
    height: 23.5,
    trunkCount: 8,
    seed: 888,
    materials,
    foliageRegistry
  });
  yuiKatsura.position.set(-32.8, VALLEY_CONFIG.yuiY, -45.0);
  zone3.add(yuiKatsura);

  // Kasuga lanterns at Yui-no-Yashiro
  for (const lx of [-23.5, -28.5]) {
    const yl = createKasugaLantern({ scale: 0.9, materials, snowRegistry, glowMeshes });
    yl.position.set(lx, VALLEY_CONFIG.yuiY, -37.2);
    zone3.add(yl);
  }

  // ============================================================================
  // ZONE 4: AIOI-NO-SUGI, FUTATSU-YASHIRO, OMOI-GAWA BRIDGE & CEDAR AVENUE
  // ============================================================================
  const zone4 = new THREE.Group();
  zone4.name = 'Zone4_AioiAndOmoigawa';
  root.add(zone4);

  // 1,000-Year Fused Twin Cedars: Aioi-no-Sugi (相生の杉)
  const aioiNoSugi = createAioiNoSugi({ materials });
  aioiNoSugi.position.set(-8.2, getRoadY(-68.0) - 0.1, -68.0);
  aioiNoSugi.rotation.y = 0.35;
  zone4.add(aioiNoSugi);

  // Futatsu-yashiro: Twin Shrines Hayashida-sha (林田社) & Kisaichi-sha (私市社)
  for (const offsetZ of [-1.0, 1.0]) {
    const twin = createHokora({ scale: 0.86, materials, snowRegistry });
    twin.position.set(-12.2, getRoadY(-73.5) + 0.45, -73.5 + offsetZ);
    twin.rotation.y = Math.PI * 0.5;
    zone4.add(twin);
  }

  // Omoi-gawa Bridge (思ひ川橋) + San-no-Torii (奥宮鳥居)
  const omoiBridge = createJapaneseBridge({
    span: 7.4,
    width: 3.8,
    archHeight: 0.36,
    isVermilion: true,
    alongX: false,
    materials
  });
  omoiBridge.position.set(-6.0, 5.92, -84.0);
  zone4.add(omoiBridge);
  addWarmLight(-6.0, 7.6, -82.0, 15, 2.0, 0xff9438);

  const okumiyaTorii = createMyojinTorii({
    width: 4.5,
    height: 5.7,
    pillarRadius: 0.22,
    plaqueText: '奥宮',
    materials,
    snowRegistry
  });
  okumiyaTorii.position.set(-6.0, 5.88, -79.2);
  zone4.add(okumiyaTorii);

  // Stone Toro lanterns flanking Okumiya Cedar Avenue & 4.5m purple Tsutsumiga-iwa boulder!
  for (let az = -89; az >= -111; az -= 7.2) {
    for (const side of [-1, 1]) {
      const toro = createStoneToro({ scale: 0.92, materials, snowRegistry, glowMeshes });
      toro.position.set(-6.0 + side * 2.85, getRoadY(az), az);
      zone4.add(toro);
    }
  }

  const tsutsumigaIwa = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.35, 1),
    new THREE.MeshStandardMaterial({ color: 0x574c61, roughness: 0.78 })
  );
  tsutsumigaIwa.scale.set(1.15, 1.48, 1.05);
  tsutsumigaIwa.position.set(-10.8, getRoadY(-101.0) + 1.8, -101.0);
  tsutsumigaIwa.castShadow = true;
  zone4.add(tsutsumigaIwa);

  // ============================================================================
  // ZONE 5: OKUMIYA — INNER SANCTUARY, FUNAGATA-ISHI & RYUKETSU DRAGON HOLE (奥宮)
  // ============================================================================
  const zone5 = new THREE.Group();
  zone5.name = 'Zone5_Okumiya';
  root.add(zone5);

  // Okumiya Temizuya outside gate
  const okuTemizuya = createTemizuya({ materials, snowRegistry });
  okuTemizuya.position.set(-10.8, VALLEY_CONFIG.okumiyaY - 0.05, -113.8);
  zone5.add(okuTemizuya);

  // Vivid Vermilion Okumiya Shinmon (奥宮神門) contrasting against primeval cedars!
  const okumiyaShinmon = createShinmonGate({
    width: 6.2,
    depth: 3.4,
    height: 4.3,
    isVermilion: true,
    plaqueText: '奥宮',
    materials,
    snowRegistry,
    glowMeshes
  });
  okumiyaShinmon.position.set(-6.0, VALLEY_CONFIG.okumiyaY, -118.0);
  zone5.add(okumiyaShinmon);
  addWarmLight(-6.0, VALLEY_CONFIG.okumiyaY + 3.6, -118.0, 16, 2.4, 0xff8d32);

  // Renri-no-Sugi (連理の杉 — Fused Cedar & Maple) + Hiyoshi-sha (日吉社) on left inside gate!
  const renriNoSugi = createRenriNoSugi({ materials, foliageRegistry });
  renriNoSugi.position.set(-16.2, VALLEY_CONFIG.okumiyaY, -125.8);
  zone5.add(renriNoSugi);

  const hiyoshiSha = createHokora({ scale: 1.05, isVermilion: false, materials, snowRegistry });
  hiyoshiSha.position.set(-14.2, VALLEY_CONFIG.okumiyaY, -123.5);
  hiyoshiSha.rotation.y = Math.PI * 0.45;
  zone5.add(hiyoshiSha);

  // Suikazura-sha (吸葛社)
  const suikazuraSha = createHokora({ scale: 0.92, isVermilion: false, materials, snowRegistry });
  suikazuraSha.position.set(-17.0, VALLEY_CONFIG.okumiyaY, -135.2);
  suikazuraSha.rotation.y = Math.PI * 0.5;
  zone5.add(suikazuraSha);

  // Funagata-ishi (船形石 / 御船型石 — 10m Mossy Stone Boat Mound concealing Yellow Boat!)
  const funagataIshi = createFunagataIshi({ materials });
  funagataIshi.position.set(-17.4, VALLEY_CONFIG.okumiyaY, -145.5);
  funagataIshi.rotation.y = Math.PI * 0.46;
  zone5.add(funagataIshi);

  // Okumiya Haiden / Maiden (奥宮拝殿 — Solemn Weathered Hinoki Forest Pavilion!)
  const okuHaidenObj = createHaiden({
    width: 9.2,
    depth: 6.8,
    height: 4.1,
    woodMat: materials.agedWood,
    materials,
    snowRegistry,
    glowMeshes
  });
  okuHaidenObj.group.position.set(-6.0, VALLEY_CONFIG.okumiyaY, -137.5);
  zone5.add(okuHaidenObj.group);
  suzuBells.okumiya = { bell: okuHaidenObj.suzuBell, rope: okuHaidenObj.suzuRope };
  addWarmLight(-6.0, VALLEY_CONFIG.okumiyaY + 3.6, -135.0, 18, 2.4, 0xffa64c);

  interactiveTargets.push({
    type: 'pray',
    shrineId: 'okumiya',
    label: '奥宮 参拝（龍穴神域・心願成就）',
    position: new THREE.Vector3(-6.0, VALLEY_CONFIG.okumiyaY + 1.8, -132.8)
  });

  // Okumiya Honden (奥宮本殿) standing directly atop Japan's Sacred Ryuketsu (龍穴)!
  const okuInnerPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.85, 10.2),
    materials.ishigaki
  );
  okuInnerPlatform.position.set(-6.0, VALLEY_CONFIG.okumiyaY + 0.42, -153.5);
  okuInnerPlatform.receiveShadow = true;
  zone5.add(okuInnerPlatform);

  const okuHonden = createHonden({
    width: 5.2,
    depth: 4.2,
    height: 3.8,
    woodMat: materials.agedWood,
    chigi: true,
    katsuogiCount: 5,
    withFence: true,
    materials,
    snowRegistry
  });
  okuHonden.position.set(-6.0, VALLEY_CONFIG.okumiyaInnerY, -153.5);
  zone5.add(okuHonden);

  // Suzuichi-sha (鈴市社) on West side of Okumiya Honden
  const suzuichiSha = createHokora({ scale: 0.95, materials, snowRegistry });
  suzuichiSha.position.set(-14.2, VALLEY_CONFIG.okumiyaY, -153.5);
  zone5.add(suzuichiSha);

  // Gonchi (権地 — Sacred Shimenawa-Roped Plot beside Okumiya Honden!)
  const gonchiGroup = new THREE.Group();
  gonchiGroup.position.set(2.4, VALLEY_CONFIG.okumiyaY, -152.5);
  const gonchiBed = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.14, 6.2),
    materials.rakedGravel
  );
  gonchiBed.position.y = 0.07;
  gonchiGroup.add(gonchiBed);

  for (const sx of [-2.4, 2.4]) {
    for (const sz of [-2.9, 2.9]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.85, 0.14), materials.hinoki);
      p.position.set(sx, 0.92, sz);
      gonchiGroup.add(p);
    }
  }
  const frontRope = createShimenawa({ length: 4.8, thickness: 0.08, shideCount: 4, materials });
  frontRope.position.set(0, 1.48, 2.9);
  gonchiGroup.add(frontRope);
  zone5.add(gonchiGroup);

  // Stone Toro lanterns around Okumiya courtyard
  for (const [tx, tz] of [[-10.2, -129.5], [-1.8, -129.5], [-10.5, -145.5], [-1.5, -145.5]]) {
    const t = createStoneToro({ scale: 0.98, materials, snowRegistry, glowMeshes });
    t.position.set(tx, VALLEY_CONFIG.okumiyaY, tz);
    zone5.add(t);
  }

  // Helper to dynamically tie a physical 3D pale-green Musubibumi knot onto Yui-no-Yashiro's rack!
  function addMusubibumiKnot() {
    const rack = Math.random() > 0.5 ? musubiRack1.knotsContainer : musubiRack2.knotsContainer;
    const knot = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.28, 0.025),
      materials.musubibumiGreen
    );
    knot.position.set(
      (Math.random() - 0.5) * 2.1,
      0.58 + Math.floor(Math.random() * 4) * 0.31,
      0.02
    );
    knot.rotation.z = (Math.random() - 0.5) * 0.35;
    rack.add(knot);
  }

  return {
    root,
    glowMeshes,
    lanternLights,
    interactiveTargets,
    suzuBells,
    floatingSlips: mizuuraObj.floatingSlips,
    addMusubibumiKnot
  };
}
