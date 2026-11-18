import * as THREE from 'three';
import { WORLD_BOUNDS, ZONES, ROADS, LAWNS } from '../data/campusData.js';
import { getFacadeTextures, createPlaqueTexture, getGroundTextures } from './proceduralTextures.js';
import { tagLandmark, createPitchedRoof } from './landmarksBuilder.js';

/**
 * Builds Campus Terrain, Lawns, Full Road Network & All Academic / College / Dormitory / Surrounding Buildings
 */
export function buildCampusZones(ctx) {
  buildTerrainAndRoads(ctx);
  buildMainCampusBuildings(ctx);
  buildNorthZoneBuildings(ctx);
  buildEastZoneBuildings(ctx);
  buildSouthZoneBuildings(ctx);
  buildSurroundingUrbanContext(ctx);
}

const sharedRoofSlabMat = new THREE.MeshStandardMaterial({
  color: 0xcfc8ba,
  roughness: 0.78,
  metalness: 0.06,
});

function getRawFacadeMat(ctx, preset, rx = 2, ry = 1) {
  const key = `raw_${preset}_${rx}_${ry}`;
  if (!ctx.facadeMatCache) ctx.facadeMatCache = new Map();
  if (ctx.facadeMatCache.has(key)) return ctx.facadeMatCache.get(key);

  const { map, emissiveMap } = getFacadeTextures(preset, rx, ry);
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    emissive: new THREE.Color(preset === 'dorm-warm' ? 0xffcfa0 : 0xffe2ad),
    emissiveIntensity: 0,
    roughness: preset === 'modern-glass' ? 0.28 : 0.62,
    metalness: preset === 'modern-glass' ? 0.42 : 0.08,
  });
  ctx.emissiveMaterials.push({ mat, maxIntensity: preset === 'dorm-warm' ? 1.05 : 0.88 });
  ctx.facadeMatCache.set(key, mat);
  return mat;
}

function getSharedFacadeMat(ctx, preset, rx = 2, ry = 1) {
  const key = `box_${preset}_${rx}_${ry}`;
  if (!ctx.facadeMatCache) ctx.facadeMatCache = new Map();
  if (ctx.facadeMatCache.has(key)) return ctx.facadeMatCache.get(key);

  const wall = getRawFacadeMat(ctx, preset, rx, ry);
  const boxMats = [wall, wall, sharedRoofSlabMat, sharedRoofSlabMat, wall, wall];
  ctx.facadeMatCache.set(key, boxMats);
  return boxMats;
}

function getSharedCylinderMat(ctx, preset, rx = 2, ry = 1) {
  const wall = getRawFacadeMat(ctx, preset, rx, ry);
  return [wall, sharedRoofSlabMat, sharedRoofSlabMat];
}

/**
 * 1. Base Ground, Zone Pads, Lawns, Asphalt Roads, Lane Markings & Secondary Gates
 */
function buildTerrainAndRoads(ctx) {
  const { grassTex } = getGroundTextures();

  // Outer Shanghai Yangpu urban ground plane
  const worldW = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 500;
  const worldD = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 500;
  const basePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW, worldD),
    new THREE.MeshStandardMaterial({ color: 0x222b26, roughness: 0.95 })
  );
  basePlane.rotation.x = -Math.PI / 2;
  basePlane.position.set(30, -0.05, 40);
  basePlane.receiveShadow = true;
  ctx.scene.add(basePlane);

  // 4 Campus Zone Turf Grounds
  ZONES.forEach((zone) => {
    const zw = zone.bounds.x2 - zone.bounds.x1;
    const zd = zone.bounds.z2 - zone.bounds.z1;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(zw, zd),
      new THREE.MeshStandardMaterial({
        map: grassTex,
        color: zone.groundColor,
        roughness: 0.9,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((zone.bounds.x1 + zone.bounds.x2) / 2, 0.02, (zone.bounds.z1 + zone.bounds.z2) / 2);
    mesh.receiveShadow = true;
    ctx.scene.add(mesh);
  });

  // Signature Lawns
  LAWNS.forEach((lawn) => {
    if (lawn.oval) return; // Handled in Heritage Quarter
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(lawn.w, lawn.d),
      new THREE.MeshStandardMaterial({
        map: grassTex,
        color: 0x4c8a4f,
        roughness: 0.86,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(lawn.x, 0.05, lawn.z);
    mesh.receiveShadow = true;
    if (lawn.name === '光华楼大草坪') {
      tagLandmark(mesh, 'guanghua-lawn');
    }
    ctx.scene.add(mesh);
  });

  // Road Network
  const urbanRoadMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.86 });
  const boulevardMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.84 });
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x4b4f54, roughness: 0.88 });
  const medianMat = new THREE.MeshStandardMaterial({ color: 0x2f6335, roughness: 0.9 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xd9d4c7 });

  ROADS.forEach((r) => {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    const cx = (r.x1 + r.x2) / 2;
    const cz = (r.z1 + r.z2) / 2;
    const angle = Math.atan2(dz, dx);

    const mat =
      r.type === 'urban-arterial'
        ? urbanRoadMat
        : r.type === 'urban-street'
          ? urbanRoadMat
          : r.type === 'campus-boulevard'
            ? boulevardMat
            : pathMat;

    const yLevel = r.type === 'urban-arterial' ? 0.09 : r.type === 'urban-street' ? 0.08 : 0.07;

    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(len, r.width), mat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = -angle;
    roadMesh.position.set(cx, yLevel, cz);
    roadMesh.receiveShadow = true;
    ctx.scene.add(roadMesh);

    // Sidewalk curbs & dashed center lines for major roads
    if (r.type === 'urban-arterial') {
      // Green central median on Handan Rd (leaving clean intersection gaps at X=-195, 0, +172, +435)
      [
        { x: -320, len: 185 },
        { x: -96, len: 145 },
        { x: 86, len: 128 },
        { x: 304, len: 215 },
      ].forEach((seg) => {
        const med = new THREE.Mesh(new THREE.BoxGeometry(seg.len, 0.35, 1.8), medianMat);
        med.position.set(seg.x, 0.25, cz);
        ctx.scene.add(med);
      });
      // Dashed lane markings
      for (let lx = r.x1 + 20; lx < r.x2 - 20; lx += 18) {
        [-8.5, 8.5].forEach((offZ) => {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.28), stripeMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(lx, 0.11, cz + offZ);
          ctx.scene.add(dash);
        });
      }
    } else if (r.type === 'urban-street') {
      const steps = Math.floor(len / 20);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.22), stripeMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = -angle;
        dash.position.set(r.x1 + dx * t, 0.1, r.z1 + dz * t);
        ctx.scene.add(dash);
      }
    }
  });

  // Zebra Crosswalks (斑马线) at Main Gate, Guoquan Rd, Guoshun Rd, and Guoding Rd East Gate
  const zebraCrossings = [
    { x: 0, z: 198, span: 28, acrossZ: true },
    { x: -195, z: 198, span: 28, acrossZ: true },
    { x: 172, z: 198, span: 28, acrossZ: true },
    { x: 435, z: 52, span: 15, acrossZ: false },
    { x: -195, z: 350, span: 13, acrossZ: false },
  ];
  zebraCrossings.forEach((zc) => {
    const count = Math.floor(zc.span / 1.9);
    for (let i = 0; i < count; i++) {
      const offset = -zc.span / 2 + 1.0 + i * 1.9;
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(zc.acrossZ ? 5.2 : 0.72, zc.acrossZ ? 0.72 : 4.6),
        stripeMat
      );
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(
        zc.acrossZ ? zc.x : zc.x + offset,
        0.115,
        zc.acrossZ ? zc.z + offset : zc.z
      );
      ctx.scene.add(bar);
    }
  });

  // Guanghua Great Lawn & Denghui Lawn Stepping-Stone Paths & Student Reading/Guitar Circles
  const steppingMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c6, roughness: 0.85 });
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const stepStone = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.08, 8), steppingMat);
    stepStone.position.set(292 + t * 80, 0.08, 62 + Math.sin(t * Math.PI) * 34);
    ctx.scene.add(stepStone);
  }
  const blanketColors = [0xd96b52, 0x4f84b8, 0xe3b857];
  [
    [316, 86],
    [348, 102],
    [-272, -16],
  ].forEach(([bx, bz], idx) => {
    const blanket = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.8),
      new THREE.MeshStandardMaterial({ color: blanketColors[idx % 3], roughness: 0.9 })
    );
    blanket.rotation.x = -Math.PI / 2;
    blanket.rotation.z = idx * 0.5;
    blanket.position.set(bx, 0.11, bz);
    ctx.scene.add(blanket);
    for (let p = 0; p < 3; p++) {
      const a = (p / 3) * Math.PI * 2 + idx;
      const student = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.45, 4, 8),
        new THREE.MeshStandardMaterial({ color: p === 0 ? 0xf2ede4 : p === 1 ? 0x2d4e7c : 0x9b3732 })
      );
      student.position.set(bx + Math.cos(a) * 1.05, 0.45, bz + Math.sin(a) * 0.95);
      ctx.scene.add(student);
    }
  });

  // Secondary Campus Gates (国顺路南门 X=168,Z=176; 国权路南门 X=-185,Z=176; 国定路本部东门 X=424,Z=52)
  const gateStone = new THREE.MeshStandardMaterial({ color: 0xdcd7cb, roughness: 0.65 });
  [
    { x: 168, z: 176, rotY: 0 },
    { x: -185, z: 176, rotY: 0 },
    { x: 424, z: 52, rotY: Math.PI / 2 },
  ].forEach((g) => {
    const sg = new THREE.Group();
    sg.position.set(g.x, 0, g.z);
    sg.rotation.y = g.rotY;
    [-6, 6].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.8, 1.6), gateStone);
      pier.position.set(px, 2.4, 0);
      sg.add(pier);
    });
    ctx.scene.add(sg);
  });
}

/**
 * 2. Main Campus (本部) Academic, Science, Dining & Renzhong College Buildings
 */
function buildMainCampusBuildings(ctx) {
  const stoneTrim = new THREE.MeshStandardMaterial({ color: 0xdad2c3, roughness: 0.68 });

  // --- 理科图书馆 (Science Library at X=-108, Z=82) ---
  const sciLib = new THREE.Group();
  sciLib.position.set(-108, 0, 82);
  const libMat = getSharedFacadeMat(ctx, 'beige-louver', 3, 1);

  const libMain = new THREE.Mesh(new THREE.BoxGeometry(68, 16.5, 16), libMat);
  libMain.position.set(0, 8.25, 8);
  sciLib.add(libMain);
  const libNorth = new THREE.Mesh(new THREE.BoxGeometry(62, 18.5, 14), libMat);
  libNorth.position.set(0, 9.25, -8);
  sciLib.add(libNorth);
  const libLink = new THREE.Mesh(new THREE.BoxGeometry(22, 15, 12), libMat);
  libLink.position.set(0, 7.5, 0);
  sciLib.add(libLink);
  // South Entrance Canopy facing Wangdao Rd + Chen Wangdao Statue in front!
  const libCanopy = new THREE.Mesh(new THREE.BoxGeometry(18, 1.0, 5.5), stoneTrim);
  libCanopy.position.set(0, 5.5, 18);
  sciLib.add(libCanopy);
  const libSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 2.0),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('理科圖書館', 'SCIENCE LIBRARY', 'modern') })
  );
  libSign.position.set(0, 14.5, 16.1);
  sciLib.add(libSign);

  // Chen Wangdao Statue on Wangdao Rd lawn south-east of Science Library
  const cwdBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), stoneTrim);
  cwdBase.position.set(34, 1.1, 18);
  sciLib.add(cwdBase);
  const cwdBronze = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.58, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b533b, metalness: 0.65, roughness: 0.35 })
  );
  cwdBronze.position.set(34, 3.4, 18);
  sciLib.add(cwdBronze);

  tagLandmark(sciLib, 'science-library');
  ctx.scene.add(sciLib);

  // --- 第一教学楼 (一教 at X=-108, Z=18) ---
  const j1 = buildCourtyardAcademic(ctx, -108, 18, 58, 22, 16.5, 'beige-louver', false);
  tagLandmark(j1, 'teaching-1');
  ctx.scene.add(j1);

  // --- 第二教学楼 (二教 at X=98, Z=80) ---
  const j2 = buildCourtyardAcademic(ctx, 98, 80, 60, 24, 16, 'beige-louver', true);
  tagLandmark(j2, 'teaching-2');
  ctx.scene.add(j2);

  // --- 第三教学楼 (三教 at X=102, Z=16) + Famous "三教校猫" Easter Egg! ---
  const j3 = buildCourtyardAcademic(ctx, 102, 16, 64, 32, 19.5, 'red-brick', true);
  const j3Sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.8),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('第三教學樓', 'TEACHING NO. 3', 'modern') })
  );
  j3Sign.position.set(0, 16.5, 16.15);
  j3.add(j3Sign);

  // Cute stylized ginger & tuxedo Fudan Campus Cats lounging by Sanjiao South Steps!
  const catColors = [0xe08b3e, 0xf5f2eb];
  catColors.forEach((col, idx) => {
    const cat = new THREE.Group();
    cat.position.set(-6 + idx * 12, 0.45, 18.2);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.52, 6, 10),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })
    );
    body.rotation.z = Math.PI / 2;
    cat.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })
    );
    head.position.set(0.42, 0.18, 0);
    cat.add(head);
    j3.add(cat);
  });

  tagLandmark(j3, 'teaching-3');
  ctx.scene.add(j3);

  // --- 第四教学楼 (四教 at X=-108, Z=-86) ---
  const j4 = buildCourtyardAcademic(ctx, -108, -86, 62, 28, 20, 'red-brick', true);
  tagLandmark(j4, 'teaching-4');
  ctx.scene.add(j4);

  // --- 立人生物楼 (Liren Biology at X=102, Z=-32) ---
  const liren = buildCourtyardAcademic(ctx, 102, -32, 58, 22, 20, 'red-brick', false);
  tagLandmark(liren, 'liren-bio');
  ctx.scene.add(liren);

  // --- 化学楼 & 化学西楼 (X=-115, Z=-30) ---
  const chemGroup = new THREE.Group();
  chemGroup.position.set(-115, 0, -30);
  const chemEast = buildCourtyardAcademic(ctx, 22, 0, 38, 20, 19.5, 'classic-physics', false);
  const chemWest = buildCourtyardAcademic(ctx, -24, 0, 34, 20, 18.5, 'beige-louver', false);
  chemGroup.add(chemEast, chemWest);
  // Add Xingye Optics Lab nearby (-152, -86)
  const optics = buildCourtyardAcademic(ctx, -38, -56, 28, 20, 17, 'beige-louver', false);
  chemGroup.add(optics);
  tagLandmark(chemGroup, 'chemistry-complex');
  ctx.scene.add(chemGroup);

  // --- 逸夫楼、遗传学楼、科学楼、生物二楼、计算中心群 (Northern Main Campus Z=-95..-132) ---
  const northSciGroup = new THREE.Group();
  northSciGroup.position.set(-45, 0, -125);
  [
    { dx: -58, dz: 0, w: 44, d: 22, h: 24, p: 'beige-louver' }, // 逸夫楼
    { dx: 0, dz: 24, w: 42, d: 18, h: 19, p: 'red-brick' }, // 遗传学楼
    { dx: 52, dz: 24, w: 46, d: 18, h: 20, p: 'classic-physics' }, // 科学楼
    { dx: 62, dz: -2, w: 48, d: 20, h: 21, p: 'beige-louver' }, // 材料与抹云楼
    { dx: 138, dz: 0, w: 46, d: 22, h: 22, p: 'modern-glass' }, // 生命科学二楼 / 微电子楼
    { dx: 245, dz: -2, w: 48, d: 22, h: 20, p: 'beige-louver' }, // 袁成英计算机楼 / 计算中心
  ].forEach((b) => {
    northSciGroup.add(buildCourtyardAcademic(ctx, b.dx, b.dz, b.w, b.d, b.h, b.p, false));
  });
  tagLandmark(northSciGroup, 'yifu-building');
  ctx.scene.add(northSciGroup);

  // --- 逸夫科技楼 (Octagonal Stepped Granite & Blue Glass at X=238, Z=136) & 叶耀珍楼 (X=196, Z=136) ---
  const yfTechGroup = new THREE.Group();
  yfTechGroup.position.set(238, 0, 136);
  const glassCylMat = getSharedCylinderMat(ctx, 'modern-glass', 2, 1);
  const octBase = new THREE.Mesh(new THREE.CylinderGeometry(17, 18, 16, 8), glassCylMat);
  octBase.position.y = 8;
  yfTechGroup.add(octBase);
  const octMid = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 8, 8), glassCylMat);
  octMid.position.y = 20;
  yfTechGroup.add(octMid);
  const octCrown = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 4.5, 8), stoneTrim);
  octCrown.position.y = 26.2;
  yfTechGroup.add(octCrown);
  // Ye Yaozhen Building right beside it
  const yyz = buildCourtyardAcademic(ctx, -44, 0, 32, 22, 21, 'modern-glass', false);
  yfTechGroup.add(yyz);
  tagLandmark(yfTechGroup, 'yifu-tech');
  ctx.scene.add(yfTechGroup);

  // --- 旦苑餐厅 (Danyuan Cafeteria at X=222, Z=22) ---
  const danyuan = new THREE.Group();
  danyuan.position.set(222, 0, 22);
  const dyMat = getSharedFacadeMat(ctx, 'beige-louver', 2, 1);
  const dyBody = new THREE.Mesh(new THREE.BoxGeometry(42, 14.5, 30), dyMat);
  dyBody.position.y = 7.25;
  danyuan.add(dyBody);
  const dyAtrium = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 15.5, 20, 1, false, 0, Math.PI),
    getSharedCylinderMat(ctx, 'modern-glass', 1, 1)
  );
  dyAtrium.position.set(0, 7.75, 13);
  danyuan.add(dyAtrium);
  const dySign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 1.8),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('旦苑餐廳', 'DANYUAN DINING', 'modern') })
  );
  dySign.position.set(0, 13.2, 15.6);
  danyuan.add(dySign);
  tagLandmark(danyuan, 'danyuan-dining');
  ctx.scene.add(danyuan);

  // --- 本部任重书院学生宿舍群 (1–7号青砖坡顶楼群 at X=210, Z=-35) ---
  const rzGroup = new THREE.Group();
  rzGroup.position.set(210, 0, -35);
  const rzMat = getSharedFacadeMat(ctx, 'heritage-grey', 3, 2);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const dx = -19 + col * 38;
      const dz = -24 + row * 22;
      const dorm = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 11.5), rzMat);
      dorm.position.set(dx, 8, dz);
      rzGroup.add(dorm);
      const roof = createPitchedRoof(31, 12.5, 3.0, 0x3b424a, 0.8);
      roof.position.set(dx, 16, dz);
      rzGroup.add(roof);
    }
  }
  tagLandmark(rzGroup, 'renzhong-dorms');
  ctx.scene.add(rzGroup);
}

/**
 * 3. North Zone (北区): Beiyuan Cafeteria, 30+ Graduate Apartments, International Student Twin Towers & River Labs
 */
function buildNorthZoneBuildings(ctx) {
  // --- 北苑学生餐厅 (Beiyuan Cafeteria at X=-285, Z=-282) ---
  const byGroup = new THREE.Group();
  byGroup.position.set(-285, 0, -282);
  const byMat = getSharedFacadeMat(ctx, 'beige-louver', 2, 1);
  const byBody = new THREE.Mesh(new THREE.BoxGeometry(52, 12.5, 32), byMat);
  byBody.position.y = 6.25;
  byGroup.add(byBody);
  const byCurve = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 13, 24),
    getSharedCylinderMat(ctx, 'modern-glass', 2, 1)
  );
  byCurve.scale.set(1.3, 1, 0.65);
  byCurve.position.set(0, 6.5, 13);
  byGroup.add(byCurve);
  const byRoof = createPitchedRoof(54, 34, 3.2, 0xb5573b, 1.2);
  byRoof.position.y = 12.5;
  byGroup.add(byRoof);
  const bySign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 1.9),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('北苑餐廳', 'BEIYUAN CAFETERIA', 'modern') })
  );
  bySign.position.set(0, 11.2, 23.8);
  byGroup.add(bySign);
  tagLandmark(byGroup, 'beiyuan-dining');
  ctx.scene.add(byGroup);

  // North Triangle Area & Environmental / Modern Physics / Advanced Materials Labs (North bank of river Z=-220)
  [
    { x: -225, z: -275, w: 32, d: 20, h: 12, p: 'red-brick' }, // 北区三角地商业与文博楼
    { x: -135, z: -220, w: 48, d: 20, h: 20, p: 'modern-glass' }, // 环境科学与工程系 / 先材楼
    { x: -235, z: -218, w: 42, d: 18, h: 17, p: 'beige-louver' }, // 现代物理研究所
  ].forEach((b) => {
    ctx.scene.add(buildCourtyardAcademic(ctx, b.x, b.z, b.w, b.d, b.h, b.p, false));
  });

  // --- 北区研究生公寓矩阵 (28 blocks with cream walls + terracotta-orange pitched roofs) & 留学生双塔 ---
  const aptGroup = new THREE.Group();
  aptGroup.position.set(-360, 0, -420);
  const dormMat = getSharedFacadeMat(ctx, 'dorm-warm', 2, 1);
  const intlMat = getSharedFacadeMat(ctx, 'beige-louver', 2, 3);

  // 4 rows × 6 columns of 6-story graduate apartment blocks
  const colXs = [-145, -92, -40, 38, 92, 145];
  const rowZs = [-76, -30, 16, 62];
  rowZs.forEach((rz, rIdx) => {
    colXs.forEach((cx, cIdx) => {
      // Leave space in NW corner (rIdx <= 1, cIdx === 0) for tall International Student Twin Towers!
      if (rIdx <= 1 && cIdx === 0) return;
      const w = 36;
      const d = 12.5;
      const h = 18.5;
      const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dormMat);
      blk.position.set(cx, h / 2, rz);
      aptGroup.add(blk);
      const roof = createPitchedRoof(w + 1, d + 1, 3.4, 0xba5b3c, 0.9);
      roof.position.set(cx, h, rz);
      aptGroup.add(roof);
    });
  });

  // Northwest 16-Story Foreign Student Dormitory & Asian Youth Center Twin Towers (留学生公寓)
  [
    [-142, -68],
    [-142, -26],
  ].forEach(([tx, tz]) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(26, 52, 18), intlMat);
    tower.position.set(tx, 26, tz);
    aptGroup.add(tower);
    const crown = createPitchedRoof(27, 19, 4.5, 0xaf5336, 1.0);
    crown.position.set(tx, 52, tz);
    aptGroup.add(crown);
  });

  tagLandmark(aptGroup, 'north-apartments');
  ctx.scene.add(aptGroup);
}

/**
 * 4. East Zone (东区): Zhide College Dormitories, Arts Education Center & School of Journalism
 */
function buildEastZoneBuildings(ctx) {
  // --- 东区志德书院学生宿舍群 (13–19号楼 + 艺教中心 + 国际文化交流学院 at X=538, Z=-48) ---
  const zdDormGroup = new THREE.Group();
  zdDormGroup.position.set(538, 0, -48);
  const dormMat = getSharedFacadeMat(ctx, 'dorm-warm', 2, 1);

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const dx = -44 + c * 88;
      const dz = -64 + r * 36;
      const blk = new THREE.Mesh(new THREE.BoxGeometry(44, 18, 13), dormMat);
      blk.position.set(dx, 9, dz);
      zdDormGroup.add(blk);
      const roof = createPitchedRoof(45, 14, 3.2, 0x9c4638, 0.8);
      roof.position.set(dx, 18, dz);
      zdDormGroup.add(roof);
    }
  }
  // Arts Education Center (艺教中心) in the courtyard
  const artsHall = buildCourtyardAcademic(ctx, 0, 62, 42, 24, 15, 'red-brick', false);
  zdDormGroup.add(artsHall);

  tagLandmark(zdDormGroup, 'zhide-dorms');
  ctx.scene.add(zdDormGroup);

  // --- 新闻学院大楼群 (蔡冠深大楼/复宣酒店高塔、屠海鸣图书馆、办公楼 at X=535, Z=118) ---
  const jGroup = new THREE.Group();
  jGroup.position.set(535, 0, 118);

  // Fuxuan Hotel / Choi Koon Shum 16-story Tower
  const fxTower = new THREE.Mesh(
    new THREE.BoxGeometry(28, 62, 24),
    getSharedFacadeMat(ctx, 'modern-glass', 2, 2)
  );
  fxTower.position.set(-42, 31, 18);
  jGroup.add(fxTower);

  // Journalism Teaching & Broadcast Studio Courtyard + Tu Haiming Library
  const jTeaching = buildCourtyardAcademic(ctx, 18, -12, 62, 34, 21, 'red-brick', true);
  jGroup.add(jTeaching);
  const thmLib = buildCourtyardAcademic(ctx, 22, 32, 44, 20, 16, 'beige-louver', false);
  jGroup.add(thmLib);

  const jSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 2.0),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('復旦新聞學院', 'SCHOOL OF JOURNALISM', 'modern') })
  );
  jSign.rotation.y = -Math.PI / 2;
  jSign.position.set(-56.2, 12, 18);
  jGroup.add(jSign);

  tagLandmark(jGroup, 'journalism-school');
  ctx.scene.add(jGroup);
}

/**
 * 5. South Zone (南区): Xide College Dorms, Crowne Plaza, Economics/Liberal Arts/5&6 Teaching, Liberal Arts Library, Jiuyuan & FDSM Management
 */
function buildSouthZoneBuildings(ctx) {
  const dormMat = getSharedFacadeMat(ctx, 'dorm-warm', 2, 1);

  // --- A. 南区希德书院公寓群 (一期、二期、三期) & 南区食堂 (X=-265, Z=310 + southern blocks) ---
  const xideGroup = new THREE.Group();
  xideGroup.position.set(-265, 0, 310);

  // Northern cluster (between Handan Rd Z=225 and Zhengda North Rd Z=355)
  const northBlocks = [
    [35, -62],
    [35, -30],
    [35, 2],
    [35, 32],
    [-28, -30],
    [-28, 2],
    [-28, 32],
  ];
  northBlocks.forEach(([bx, bz]) => {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(38, 18.5, 13), dormMat);
    blk.position.set(bx, 9.25, bz);
    xideGroup.add(blk);
    const roof = createPitchedRoof(39, 14, 3.2, 0x9e4336, 0.8);
    roof.position.set(bx, 18.5, bz);
    xideGroup.add(roof);
  });

  // Southern Xide cluster (east of Zhengda Gym, between X=-255..-208, Z=390..565)
  for (let sz = 85; sz <= 245; sz += 32) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(38, 18.5, 13), dormMat);
    blk.position.set(35, 9.25, sz);
    xideGroup.add(blk);
    const roof = createPitchedRoof(39, 14, 3.2, 0x9e4336, 0.8);
    roof.position.set(35, 18.5, sz);
    xideGroup.add(roof);
  }

  // 南区食堂 (South Cafeteria at relative X=35, Z=62 -> world X=-230, Z=372)
  const southCafe = buildCourtyardAcademic(ctx, 32, 68, 44, 24, 13.5, 'red-brick', false);
  xideGroup.add(southCafe);

  tagLandmark(xideGroup, 'xide-dorms');
  ctx.scene.add(xideGroup);

  // --- B. 复旦皇冠假日酒店 (Crowne Plaza Fudan, Handan Rd 199) & 美国研究中心 (X=-365, Z=272) ---
  const cpGroup = new THREE.Group();
  cpGroup.position.set(-365, 0, 272);
  const cpGlass = getSharedFacadeMat(ctx, 'modern-glass', 3, 2);

  // Curved luxury hotel tower + conference podium
  const cpTower1 = new THREE.Mesh(new THREE.BoxGeometry(54, 46, 20), cpGlass);
  cpTower1.rotation.y = 0.16;
  cpTower1.position.set(-14, 23, -8);
  cpGroup.add(cpTower1);
  const cpTower2 = new THREE.Mesh(new THREE.BoxGeometry(42, 38, 18), cpGlass);
  cpTower2.rotation.y = -0.18;
  cpTower2.position.set(22, 19, 2);
  cpGroup.add(cpTower2);
  // Center for American Studies (美研中心) near Guoquan Rd
  const cas = buildCourtyardAcademic(ctx, 135, -24, 36, 22, 16, 'red-brick', false);
  cpGroup.add(cas);

  tagLandmark(cpGroup, 'crowne-plaza');
  ctx.scene.add(cpGroup);

  // --- C. 经济学院 (国权路600号)、文科大楼、五教、六教 (X=-95, Z=295) ---
  const econGroup = new THREE.Group();
  econGroup.position.set(-95, 0, 295);

  // School of Economics (国权路600号 + 泛海楼) facing Guoquan Rd
  const econBldg = buildCourtyardAcademic(ctx, -56, -8, 42, 54, 28, 'classic-physics', true);
  econGroup.add(econBldg);

  // 文科大楼 (10-story iconic Liberal Arts Tower at relative X=22, Z=-42)
  const laTower = new THREE.Mesh(
    new THREE.BoxGeometry(54, 40, 22),
    getSharedFacadeMat(ctx, 'classic-physics', 3, 2)
  );
  laTower.position.set(22, 20, -42);
  econGroup.add(laTower);

  // 第五教学楼 (五教) & 第六教学楼 (六教) south of Liberal Arts Tower
  const j5 = buildCourtyardAcademic(ctx, 24, 14, 58, 24, 19, 'beige-louver', false);
  const j6 = buildCourtyardAcademic(ctx, 24, 78, 58, 24, 19, 'red-brick', false);
  econGroup.add(j5, j6);

  tagLandmark(econGroup, 'econ-liberal-arts');
  ctx.scene.add(econGroup);

  // --- D. 文科图书馆 (Liberal Arts Library at X=88, Z=278) ---
  const laLibGroup = new THREE.Group();
  laLibGroup.position.set(88, 0, 278);
  const laLibMain = buildCourtyardAcademic(ctx, 0, 0, 68, 42, 22, 'red-brick', true);
  laLibGroup.add(laLibMain);
  const laLibSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 2.0),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('文科圖書館', 'LIBERAL ARTS LIBRARY', 'modern') })
  );
  laLibSign.rotation.y = -Math.PI / 2;
  laLibSign.position.set(-34.2, 16, 0);
  laLibGroup.add(laLibSign);
  tagLandmark(laLibGroup, 'liberal-arts-library');
  ctx.scene.add(laLibGroup);

  // --- E. 玖园爱国主义教育建筑群 (国顺路650弄：陈望道旧居《共产党宣言》展示馆、苏步青旧居、谈家桢旧居 at X=102, Z=362) ---
  const jyGroup = new THREE.Group();
  jyGroup.position.set(102, 0, 362);
  const villaWall = new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.72 });
  [
    [-22, -10], // 陈望道旧居
    [6, -10], // 苏步青旧居
    [30, -8], // 谈家桢旧居
    [-14, 14],
    [18, 14],
  ].forEach(([vx, vz], idx) => {
    const villa = new THREE.Group();
    villa.position.set(vx, 0, vz);
    const body = new THREE.Mesh(new THREE.BoxGeometry(15, 10.2, 11), villaWall);
    body.position.y = 5.1;
    villa.add(body);
    const roof = createPitchedRoof(16.2, 12.2, 3.4, idx === 0 ? 0xa3362c : 0x8f3e34, 0.9);
    roof.position.y = 10.2;
    villa.add(roof);
    jyGroup.add(villa);
  });
  tagLandmark(jyGroup, 'jiuyuan-heritage');
  ctx.scene.add(jyGroup);

  // --- F. 管理学院国顺院区 (李达三楼、史带楼、思源教授楼 at X=255, Z=298) ---
  const fdsmGroup = new THREE.Group();
  fdsmGroup.position.set(255, 0, 298);
  const glassMat = getSharedFacadeMat(ctx, 'modern-glass', 2, 2);
  const brickMat = getSharedFacadeMat(ctx, 'red-brick', 2, 2);

  // 李达三楼 (Li Dasan Tower — 11F high-rise facing Guoshun Rd)
  const lds = new THREE.Mesh(new THREE.BoxGeometry(32, 44, 28), glassMat);
  lds.position.set(-38, 22, -26);
  fdsmGroup.add(lds);

  // 史带楼 (Starr Building — large modern glass & terracotta atrium complex)
  const starr = new THREE.Mesh(new THREE.BoxGeometry(58, 36, 38), glassMat);
  starr.position.set(22, 18, -14);
  fdsmGroup.add(starr);

  // 思源教授楼 (Siyuan Building)
  const siyuan = new THREE.Mesh(new THREE.BoxGeometry(48, 28, 22), brickMat);
  siyuan.position.set(-22, 14, 34);
  fdsmGroup.add(siyuan);

  const fdsmSign = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 2.2),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture('復旦管理學院', 'SCHOOL OF MANAGEMENT', 'modern') })
  );
  fdsmSign.rotation.y = -Math.PI / 2;
  fdsmSign.position.set(-54.2, 12, -26);
  fdsmGroup.add(fdsmSign);

  tagLandmark(fdsmGroup, 'fdsm-management');
  ctx.scene.add(fdsmGroup);

  // Additional South Zone Faculty Apartments & Fudan Affiliated High School context (SE of Zhengsu Rd)
  const extraSouth = [
    [-95, 465, 52, 16, 20],
    [-95, 515, 52, 16, 20],
    [88, 455, 64, 24, 22],
    [245, 455, 72, 28, 24],
  ];
  extraSouth.forEach(([ex, ez, ew, ed, eh]) => {
    ctx.scene.add(buildCourtyardAcademic(ctx, ex, ez, ew, ed, eh, 'dorm-warm', false));
  });
}

/**
 * 6. Subtle Low-Key Urban Skyline Context (Wujiaochang / SUFE North / Handan West)
 * Gives authentic urban horizon framing without distracting from Fudan Handan Campus
 */
function buildSurroundingUrbanContext(ctx) {
  const urbanMat = new THREE.MeshStandardMaterial({
    color: 0x2c3644,
    roughness: 0.85,
    metalness: 0.15,
  });

  const blocks = [
    // East toward Wujiaochang (五角场方向城市天际线: 合生汇/百联/凯悦方向远景)
    [760, 120, 52, 52, 95],
    [780, 240, 58, 48, 118],
    [740, 340, 46, 46, 72],
    [730, -40, 48, 54, 64],
    // North across Wudong Rd (上海财经大学方向)
    [-380, -595, 64, 28, 26],
    [-250, -595, 58, 28, 32],
    [-110, -595, 62, 26, 24],
    [120, -585, 70, 32, 34],
    // West of Wuchuan Rd / Handan Rd
    [-640, 95, 46, 56, 58],
    [-640, 285, 48, 54, 66],
    [-635, -120, 44, 48, 42],
  ];

  blocks.forEach(([x, z, w, d, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), urbanMat);
    b.position.set(x, h / 2, z);
    b.receiveShadow = true;
    ctx.scene.add(b);
  });
}

/**
 * Reusable Courtyard / H-Wing Academic Building Generator
 */
function buildCourtyardAcademic(ctx, x, z, w, d, h, preset, courtyard = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const wallMat = getSharedFacadeMat(ctx, preset, Math.max(1, Math.round(w / 24)), 1);
  const roofTrim = new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 0.75 });

  if (!courtyard) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    main.position.y = h / 2;
    group.add(main);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 1.0, d + 1.2), roofTrim);
    parapet.position.y = h + 0.5;
    group.add(parapet);
  } else {
    // U / O Courtyard layout with front/back wings and side links
    const wingD = Math.min(10.5, d * 0.34);
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, wingD), wallMat);
    front.position.set(0, h / 2, d / 2 - wingD / 2);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h + 1.8, wingD), wallMat);
    back.position.set(0, (h + 1.8) / 2, -d / 2 + wingD / 2);

    const sideW = Math.min(10, w * 0.22);
    const innerD = d - wingD * 2 + 1;
    const left = new THREE.Mesh(new THREE.BoxGeometry(sideW, h, innerD), wallMat);
    left.position.set(-w / 2 + sideW / 2, h / 2, 0);
    const right = new THREE.Mesh(new THREE.BoxGeometry(sideW, h, innerD), wallMat);
    right.position.set(w / 2 - sideW / 2, h / 2, 0);

    group.add(front, back, left, right);

    const parapetF = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.9, wingD + 1), roofTrim);
    parapetF.position.set(0, h + 0.45, d / 2 - wingD / 2);
    const parapetB = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.9, wingD + 1), roofTrim);
    parapetB.position.set(0, h + 2.25, -d / 2 + wingD / 2);
    group.add(parapetF, parapetB);
  }

  group.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return group;
}
