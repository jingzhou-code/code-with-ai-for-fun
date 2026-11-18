import * as THREE from 'three';
import { getTerrainHeight } from '../world/SitePlan.js';
import {
  createCurvedJapaneseRoof,
  createKarahafuCanopy,
  createKoranBalustrade,
  createCalligraphyPlaque,
} from './JapaneseRoofBuilder.js';

// National Treasure Hondo (国宝 本堂, 1633) & Stage of Kiyomizu (清水の舞台)
// Exact Architectural Features:
// - Footprint: ~36m wide (East-West) x ~31m deep (North-South including stage & wings)
// - Floor Level: y = 18.5m; Cliff floor directly in front of stage: y = 5.2m (~13.3m drop!)
// - Substructure: 18 primary monumental Zelkova pillars under stage (front 6 are 16-sided columns)
//   + 121 cliff/undercroft support posts = 139 total substructure pillars!
// - 6 horizontal tiers of penetrating Toshi-nuki (通し貫) beams with mortise wedges (楔) & wooden rain-caps (雨除け小傘)
export function buildHondoAndKakezukuriStage(materials) {
  const root = new THREE.Group();
  root.name = 'NationalTreasureHondo';
  root.userData.landmarkId = 'hondo_stage';

  const centerX = 24.0;
  const floorY = 18.5;

  const xrayShellMeshes = [];
  const primaryPillarMeshes = [];
  const nukiBeamMeshes = [];

  // =========================================================================
  // 1. KAKEZUKURI (懸造り) 139-PILLAR NAIL-FREE SUBSTRUCTURE ON THE CLIFF
  // =========================================================================
  const kakezukuriGroup = new THREE.Group();
  kakezukuriGroup.name = 'KakezukuriSubstructure';
  kakezukuriGroup.userData.landmarkId = 'kakezukuri_understage';
  root.add(kakezukuriGroup);

  // Structural column grid in world X and Z:
  // 15 X-axes across the 35m width: central 6 axes [14.2, 18.12, 22.04, 25.96, 29.88, 33.8] support the Stage!
  // Outer left 4 axes [6.8, 9.0, 11.2, 12.9] & outer right 5 axes [35.1, 36.8, 39.0, 40.2, 41.4] support Wings & Mokoshi!
  const xCols = [6.8, 9.0, 11.2, 12.9, 14.2, 18.12, 22.04, 25.96, 29.88, 33.8, 35.1, 36.8, 38.6, 40.0, 41.2];
  // 11 Z-rows from z = -1.5 (transition from flat Shodo bedrock to sloped Gejin) out to z = 19.0 (front edge of Stage & Wings)
  const zRows = [-1.2, 1.0, 3.2, 5.4, 7.6, 9.6, 11.5, 13.9, 16.4, 17.8, 19.0];

  // Determine which (colIdx, rowIdx) positions belong to the Hondo + Wings + Convex Stage footprint (total = 139 posts!)
  const pillarNodes = [];
  for (let r = 0; r < zRows.length; r++) {
    const wz = zRows[r];
    for (let c = 0; c < xCols.length; c++) {
      const wx = xCols[c];
      const inStageCols = c >= 4 && c <= 9; // 6 columns x 3 front rows = 18 Primary Stage Pillars!
      const inWestWing = c <= 3;
      const inEastWing = c >= 10;

      // In front of main hall eaves (z > 11.5):
      // - Stage extends to row 10 (z = 19.0), skipping row 9 on inner stage so 6x3 = 18 stage pillars!
      // - Wings extend to z = 17.8 (row 9), skipping row 10 on outer edges so the Stage juts out in convex 凸型!
      if (wz > 11.6) {
        if (inStageCols && r === 9) continue; // Keep exact 3 front rows (r = 7, 8, 10) => 6 * 3 = 18 primary stage pillars!
        if ((inWestWing || inEastWing) && r === 10) continue;
        // Trim corner/intermediate wing posts so total substructure post count = exact 139!
        if ((c === 1 || c === 12 || c === 13) && (r === 8 || r === 9)) continue;
        if (r === 9 && (c === 3 || c === 10 || c === 14)) continue;
      }
      if (r === 0 && (c === 1 || c === 13)) continue;

      const groundY = getTerrainHeight(wx, wz);
      const colHeight = Math.max(0.85, floorY - 0.18 - groundY);
      const isPrimaryStage18 = inStageCols && r >= 7;
      const isFrontSix16Sided = inStageCols && r === 10;

      pillarNodes.push({
        c,
        r,
        wx,
        wz,
        groundY,
        topY: floorY - 0.18,
        colHeight,
        isPrimaryStage18,
        isFrontSix16Sided,
      });
    }
  }

  // Instantiate pillars & stepped cliff stone foundation boulders (礎石 Soseki)
  const sosekiGeo = new THREE.DodecahedronGeometry(0.52, 1);
  sosekiGeo.scale(1.25, 0.52, 1.25);

  for (const p of pillarNodes) {
    // 16-sided geometry for the famous 6 front Zelkova giants, 12-sided for the other 12 stage pillars, 8-sided/square for inner posts
    const radiusTop = p.isFrontSix16Sided ? 0.34 : p.isPrimaryStage18 ? 0.3 : 0.21;
    const radiusBot = radiusTop * 1.08;
    const radialSegs = p.isFrontSix16Sided ? 16 : p.isPrimaryStage18 ? 12 : 8;

    const colGeo = new THREE.CylinderGeometry(radiusTop, radiusBot, p.colHeight, radialSegs);
    const colMesh = new THREE.Mesh(colGeo, materials.keyakiPillar);
    colMesh.position.set(p.wx, p.groundY + p.colHeight * 0.5, p.wz);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    colMesh.userData.landmarkId = 'kakezukuri_understage';
    kakezukuriGroup.add(colMesh);

    if (p.isPrimaryStage18) {
      primaryPillarMeshes.push(colMesh);
    }

    // Stone foundation pad (礎石) anchored into the cliff rock
    const soseki = new THREE.Mesh(sosekiGeo, materials.ishigaki);
    soseki.position.set(p.wx, p.groundY + 0.08, p.wz);
    soseki.rotation.y = (p.c * 1.7 + p.r * 2.3) % Math.PI;
    soseki.receiveShadow = true;
    kakezukuriGroup.add(soseki);
  }

  // Build the 6 horizontal tiers of penetrating Toshi-nuki (通し貫) tie-beams + rain-caps (雨除け小傘)!
  const nukiElevations = [7.4, 9.3, 11.2, 13.1, 15.0, 16.9];
  const nodeMap = new Map();
  for (const p of pillarNodes) {
    nodeMap.set(`${p.c}_${p.r}`, p);
  }

  const rainCapGeo = new THREE.BoxGeometry(1, 0.055, 0.32);

  for (const ny of nukiElevations) {
    // East-West Toshi-nuki beams along each Z-row
    for (let r = 0; r < zRows.length; r++) {
      const activeInRow = [];
      for (let c = 0; c < xCols.length; c++) {
        const node = nodeMap.get(`${c}_${r}`);
        if (node && ny > node.groundY + 0.65 && ny < node.topY - 0.3) {
          activeInRow.push(node);
        } else if (activeInRow.length >= 2) {
          addNukiSpan(activeInRow[0], activeInRow[activeInRow.length - 1], ny, 'x');
          activeInRow.length = 0;
        } else {
          activeInRow.length = 0;
        }
      }
      if (activeInRow.length >= 2) {
        addNukiSpan(activeInRow[0], activeInRow[activeInRow.length - 1], ny, 'x');
      }
    }

    // North-South Toshi-nuki beams along each X-column
    for (let c = 0; c < xCols.length; c++) {
      const activeInCol = [];
      for (let r = 0; r < zRows.length; r++) {
        const node = nodeMap.get(`${c}_${r}`);
        if (node && ny > node.groundY + 0.65 && ny < node.topY - 0.3) {
          activeInCol.push(node);
        } else if (activeInCol.length >= 2) {
          addNukiSpan(activeInCol[0], activeInCol[activeInCol.length - 1], ny + 0.22, 'z');
          activeInCol.length = 0;
        } else {
          activeInCol.length = 0;
        }
      }
      if (activeInCol.length >= 2) {
        addNukiSpan(activeInCol[0], activeInCol[activeInCol.length - 1], ny + 0.22, 'z');
      }
    }
  }

  function addNukiSpan(nStart, nEnd, beamY, axis) {
    const protrude = 0.42; // Protruding mortise ends locked with wooden wedges (楔)!
    if (axis === 'x') {
      const len = Math.abs(nEnd.wx - nStart.wx) + protrude * 2;
      const cx = (nStart.wx + nEnd.wx) * 0.5;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.24, 0.16), materials.nukiBeam);
      beam.position.set(cx, beamY, nStart.wz);
      beam.castShadow = true;
      beam.receiveShadow = true;
      kakezukuriGroup.add(beam);
      nukiBeamMeshes.push(beam);

      // Tiny sloped wooden rain-shedding roof cap (雨除けの小傘) on exposed outer stage Nuki beams!
      if (nStart.wz >= 11.5) {
        const cap = new THREE.Mesh(rainCapGeo, materials.keyakiDark);
        cap.scale.set(len + 0.1, 1, 1);
        cap.position.set(cx, beamY + 0.15, nStart.wz);
        cap.rotation.x = 0.16;
        kakezukuriGroup.add(cap);
      }
    } else {
      const len = Math.abs(nEnd.wz - nStart.wz) + protrude * 2;
      const cz = (nStart.wz + nEnd.wz) * 0.5;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, len), materials.nukiBeam);
      beam.position.set(nStart.wx, beamY, cz);
      beam.castShadow = true;
      beam.receiveShadow = true;
      kakezukuriGroup.add(beam);
      nukiBeamMeshes.push(beam);
    }
  }

  // Heavy floor girders (大引・根太) directly supporting the Stage & Hall deck at y = floorY - 0.16
  for (let i = 0; i < xCols.length; i++) {
    const wx = xCols[i];
    const zMax = i >= 4 && i <= 9 ? 19.3 : 18.0;
    const len = zMax - -1.5;
    const girder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, len), materials.keyakiDark);
    girder.position.set(wx, floorY - 0.22, (-1.5 + zMax) * 0.5);
    girder.castShadow = true;
    kakezukuriGroup.add(girder);
    nukiBeamMeshes.push(girder);
  }

  // =========================================================================
  // 2. CONVEX HINOKI WOODEN STAGE (清水の舞台 — 166枚檜板 + 水勾配 + 高欄)
  // =========================================================================
  const stageGroup = new THREE.Group();
  stageGroup.name = 'KiyomizuStageDeck';
  root.add(stageGroup);

  // Main Hall + Mokoshi floor slab (x: 6.2..41.8, z: -11.2..11.6)
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(35.6, 0.28, 22.8), materials.hinokiStage);
  mainDeck.position.set(centerX, floorY, 0.2);
  mainDeck.receiveShadow = true;
  mainDeck.castShadow = true;
  stageGroup.add(mainDeck);
  xrayShellMeshes.push({ mesh: mainDeck, origMat: materials.hinokiStage });

  // Central protruding Stage of Kiyomizu (x: 13.4..34.6 => 21.2m wide, z: 11.6..19.35 => ~190㎡!)
  // Subtle forward rainwater drainage camber (水勾配) just like the real 1633 stage!
  const centralStageDeck = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.26, 7.85), materials.hinokiStage);
  centralStageDeck.position.set(centerX, floorY - 0.02, 15.48);
  centralStageDeck.rotation.x = 0.012;
  centralStageDeck.receiveShadow = true;
  centralStageDeck.castShadow = true;
  stageGroup.add(centralStageDeck);
  xrayShellMeshes.push({ mesh: centralStageDeck, origMat: materials.hinokiStage });

  // West & East Wing Pavilion (楽舎 / 翼廊) decks
  for (const wingX of [10.0, 38.0]) {
    const wingDeck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.26, 6.5), materials.hinokiStage);
    wingDeck.position.set(wingX, floorY, 14.8);
    wingDeck.receiveShadow = true;
    wingDeck.castShadow = true;
    stageGroup.add(wingDeck);
  }

  // Koran Balustrades (高欄 + 擬宝珠) around the cantilevered Stage & Verandas
  const frontRail = createKoranBalustrade({
    length: 21.2,
    woodMaterial: materials.keyakiDark,
    giboshiMaterial: materials.goldGiboshi,
  });
  frontRail.position.set(centerX, floorY + 0.08, 19.32);
  stageGroup.add(frontRail);

  for (const sideSign of [-1, 1]) {
    const sideRail = createKoranBalustrade({
      length: 1.5,
      postSpacing: 1.5,
      woodMaterial: materials.keyakiDark,
      giboshiMaterial: materials.goldGiboshi,
    });
    sideRail.rotation.y = Math.PI * 0.5;
    sideRail.position.set(centerX + sideSign * 10.58, floorY + 0.08, 18.6);
    stageGroup.add(sideRail);
  }

  // East & West veranda railings
  for (const sideX of [6.3, 41.7]) {
    const vRail = createKoranBalustrade({
      length: 21.6,
      woodMaterial: materials.keyakiDark,
      giboshiMaterial: materials.goldGiboshi,
    });
    vRail.rotation.y = Math.PI * 0.5;
    vRail.position.set(sideX, floorY + 0.08, 0.2);
    stageGroup.add(vRail);
  }

  // =========================================================================
  // 3. MAIN HALL SUPERSTRUCTURE (内々陣・外陣・蔀戸・厨子3基・翼廊2棟・車寄)
  // =========================================================================
  const hallGroup = new THREE.Group();
  root.add(hallGroup);

  const wallHeight = 5.6;

  // Inner Sanctuary (内々陣 Shodo, northern half z: -9.8 .. +1.8) enclosed with dark timber & white plaster panels
  const shodoCore = new THREE.Mesh(new THREE.BoxGeometry(28.4, wallHeight, 11.4), materials.keyakiDark);
  shodoCore.position.set(centerX, floorY + wallHeight * 0.5, -4.0);
  shodoCore.castShadow = true;
  shodoCore.receiveShadow = true;
  hallGroup.add(shodoCore);
  xrayShellMeshes.push({ mesh: shodoCore, origMat: materials.keyakiDark });

  // White plaster upper frieze on North/East/West walls
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(28.6, 1.35, 11.6), materials.shikkui);
  frieze.position.set(centerX, floorY + wallHeight - 0.8, -4.0);
  hallGroup.add(frieze);
  xrayShellMeshes.push({ mesh: frieze, origMat: materials.shikkui });

  // Three Sacred Gilded Zushi Shrines (国宝附指定・厨子三基: 千手観音・毘沙門天・地蔵菩薩) visible inside!
  for (const offset of [-5.2, 0, 5.2]) {
    const zushi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.1, 1.9), materials.keyakiDark);
    body.position.y = 1.55;
    const goldDoors = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 0.08), materials.goldGiboshi);
    goldDoors.position.set(0, 1.55, 0.96);
    const zRoof = createCurvedJapaneseRoof({
      width: 2.9,
      depth: 2.4,
      height: 1.05,
      overhang: 0.45,
      style: 'irimoya',
      roofMaterial: materials.hiwadabuki,
      trimMaterial: materials.goldGiboshi,
    });
    zRoof.position.y = 3.1;
    zushi.add(body, goldDoors, zRoof);
    zushi.position.set(centerX + offset, floorY + 0.25, -2.6);
    hallGroup.add(zushi);
  }

  // Hanging Sanctuary Votive Lanterns (釣灯籠) along the open Outer Hall (外陣 Raido)
  for (let lx = 12; lx <= 36; lx += 4.8) {
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), materials.lanternGlow);
    lantern.position.set(lx, floorY + 4.15, 5.4);
    hallGroup.add(lantern);
  }

  // Round Aged Keyaki Pillars of the Open Outer Hall (外陣独立柱, z: 2.0 .. 10.4)
  for (const px of [8.2, 12.2, 16.2, 20.1, 24.0, 27.9, 31.8, 35.8, 39.8]) {
    for (const pz of [2.4, 6.4, 10.2]) {
      const hCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.3, wallHeight, 12),
        materials.keyakiPillar
      );
      hCol.position.set(px, floorY + wallHeight * 0.5, pz);
      hCol.castShadow = true;
      hCol.receiveShadow = true;
      hallGroup.add(hCol);
    }
  }

  // Raised Horizontal Shitomido Lattice Shutters (吊り蔀戸) under the South outer hall eaves
  for (let sx = 14.2; sx <= 33.8; sx += 3.92) {
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 1.55), materials.machiyaWood);
    shutter.position.set(sx, floorY + 4.55, 10.9);
    shutter.rotation.x = -0.15;
    hallGroup.add(shutter);
  }

  // Official Plaque 「大悲閣」 + Giant Bronze Waniguchi Gong (大鰐口) + Braided Rope + Saisen-bako Offering Box!
  const hondoPlaque = createCalligraphyPlaque('大悲閣', 2.4, 0.95);
  hondoPlaque.position.set(centerX, floorY + 4.85, 10.45);
  hallGroup.add(hondoPlaque);

  const waniguchi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.18, 20),
    materials.goldGiboshi
  );
  waniguchi.rotation.x = Math.PI * 0.5;
  waniguchi.position.set(centerX, floorY + 3.85, 10.35);
  const gongRope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.04, 2.55, 8),
    materials.redMosen
  );
  gongRope.position.set(centerX, floorY + 2.45, 10.35);
  const saisenBako = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.88, 1.25),
    materials.keyakiDark
  );
  saisenBako.position.set(centerX, floorY + 0.56, 9.6);
  saisenBako.castShadow = true;
  hallGroup.add(waniguchi, gongRope, saisenBako);

  // =========================================================================
  // 4. MONUMENTAL YOSEMUNE HIWADABUKI ROOF + MOKOSHI + EAST/WEST WINGS + KURAMAYOSE
  // =========================================================================
  // Lower Mokoshi pent roof skirt (裳階屋根) around perimeter
  const mokoshiRoof = createCurvedJapaneseRoof({
    width: 35.2,
    depth: 22.0,
    height: 2.35,
    overhang: 2.1,
    style: 'yosemune',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.keyakiDark,
    ornamentMaterial: materials.bronzeSorin,
    thickness: 0.42,
    soriStrength: 0.16,
    cornerLift: 0.32,
  });
  mokoshiRoof.position.set(centerX, floorY + 4.55, 0.2);
  hallGroup.add(mokoshiRoof);
  collectRoofMeshes(mokoshiRoof, xrayShellMeshes);

  // Grand Yosemune Cypress-Bark Main Roof (国宝本堂 大屋根 — 寄棟造・檜皮葺)
  const grandMainRoof = createCurvedJapaneseRoof({
    width: 31.6,
    depth: 18.8,
    height: 9.4,
    overhang: 2.9,
    style: 'yosemune',
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.keyakiDark,
    ornamentMaterial: materials.bronzeSorin,
    thickness: 0.56,
    soriStrength: 0.24,
    cornerLift: 0.52,
  });
  grandMainRoof.position.set(centerX, floorY + 6.05, -0.3);
  hallGroup.add(grandMainRoof);
  collectRoofMeshes(grandMainRoof, xrayShellMeshes);

  // West & East Projecting Wing Pavilions (西楽舎・東楽舎 — 入母屋造・妻入) flanking the Stage!
  for (const wingX of [10.0, 38.0]) {
    const wingGroup = new THREE.Group();
    // Open pavilion corner pillars & lattice railings
    for (const dx of [-2.7, 0, 2.7]) {
      for (const dz of [12.0, 14.8, 17.4]) {
        const wCol = new THREE.Mesh(
          new THREE.CylinderGeometry(0.21, 0.23, 4.3, 10),
          materials.keyakiPillar
        );
        wCol.position.set(wingX + dx, floorY + 2.15, dz);
        wCol.castShadow = true;
        wingGroup.add(wCol);
      }
    }
    const wingRail = createKoranBalustrade({
      length: 5.8,
      woodMaterial: materials.keyakiDark,
      giboshiMaterial: materials.goldGiboshi,
    });
    wingRail.position.set(wingX, floorY + 0.08, 17.75);
    wingGroup.add(wingRail);

    // Tsumairi (ridgeAxis = 'z') Irimoya cypress-bark roof facing South over the cliff!
    const wingRoof = createCurvedJapaneseRoof({
      width: 6.2,
      depth: 7.4,
      height: 3.6,
      overhang: 1.55,
      style: 'irimoya',
      ridgeAxis: 'z',
      roofMaterial: materials.hiwadabuki,
      trimMaterial: materials.keyakiDark,
      gableMaterial: materials.shikkui,
      ornamentMaterial: materials.goldGiboshi,
      thickness: 0.38,
    });
    wingRoof.position.set(wingX, floorY + 4.25, 14.5);
    wingGroup.add(wingRoof);
    collectRoofMeshes(wingRoof, xrayShellMeshes);

    hallGroup.add(wingGroup);
  }

  // West Kuramayose Entrance Porch (西面車寄) connecting with the Kairo corridor from Todoroki-mon
  const kuramayose = createKarahafuCanopy({
    width: 5.2,
    depth: 3.4,
    height: 1.45,
    roofMaterial: materials.hiwadabuki,
    trimMaterial: materials.goldGiboshi,
  });
  kuramayose.rotation.y = -Math.PI * 0.5;
  kuramayose.position.set(5.4, floorY + 4.15, 2.0);
  hallGroup.add(kuramayose);

  // Architectural X-Ray Inspection Toggle (懸造透視モード)
  function setXRayMode(enabled) {
    for (const item of xrayShellMeshes) {
      item.mesh.material = enabled ? materials.xrayGhostRoof : item.origMat;
    }
    for (const pMesh of primaryPillarMeshes) {
      pMesh.material = enabled ? materials.xrayPrimaryPillar : materials.keyakiPillar;
    }
    for (const bMesh of nukiBeamMeshes) {
      bMesh.material = enabled ? materials.xrayNukiBeam : materials.nukiBeam;
    }
  }

  return {
    group: root,
    pillarCount: pillarNodes.length,
    primaryStagePillarCount: primaryPillarMeshes.length,
    setXRayMode,
  };
}

function collectRoofMeshes(group, targetList) {
  group.traverse((child) => {
    if (child.isMesh && child.userData.isRoofShell) {
      targetList.push({ mesh: child, origMat: child.material });
    }
  });
}
