import * as THREE from 'three';
import { STREETS_NS, STREETS_EW } from '../data/campusData.js';
import { createStaggFieldTexture } from '../materials/proceduralTextures.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function buildTerrainAndGrid(scene, mats, registerHitTarget) {
  const root = new THREE.Group();
  root.name = 'TerrainAndStreetGrid';

  // 1. Base regional ground plane
  const worldGround = new THREE.Mesh(
    new THREE.PlaneGeometry(4200, 4200),
    new THREE.MeshStandardMaterial({ color: '#3d463a', roughness: 0.96 })
  );
  worldGround.rotation.x = -Math.PI * 0.5;
  worldGround.position.y = -0.18;
  worldGround.receiveShadow = true;
  root.add(worldGround);

  // Core Hyde Park lush lawn base
  const campusLawn = new THREE.Mesh(new THREE.PlaneGeometry(1560, 1560), mats.quadGrass);
  campusLawn.rotation.x = -Math.PI * 0.5;
  campusLawn.position.set(110, -0.05, -20);
  campusLawn.receiveShadow = true;
  root.add(campusLawn);

  // 2. Lake Michigan & Promontory Point on the Eastern Horizon
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(2400, 4200), mats.waterMat);
  lake.rotation.x = -Math.PI * 0.5;
  lake.position.set(2080, -0.08, -100);
  root.add(lake);

  // Shoreline limestone revetment + Promontory Point peninsula
  const shoreline = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
  shoreline.scale.set(24, 1.4, 3400);
  shoreline.position.set(885, 0.4, -100);
  root.add(shoreline);

  const promontory = new THREE.Mesh(new THREE.CylinderGeometry(85, 92, 1.8, 24), mats.quadGrass);
  promontory.position.set(955, 0.5, -520);
  root.add(promontory);

  // Museum of Science and Industry (1893 Palace of Fine Arts) classical copper dome vista in Jackson Park!
  const msiGroup = new THREE.Group();
  msiGroup.position.set(785, 0, -230);
  const msiBase = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  msiBase.scale.set(62, 18, 128);
  msiBase.position.y = 9;
  msiGroup.add(msiBase);
  const msiDome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.copperPatina
  );
  msiDome.position.y = 18;
  msiGroup.add(msiDome);
  root.add(msiGroup);

  // Jackson Park Lagoon east of Stony Island
  const jpLagoon = new THREE.Mesh(new THREE.CircleGeometry(68, 32), mats.waterMat);
  jpLagoon.rotation.x = -Math.PI * 0.5;
  jpLagoon.position.set(795, 0.02, -45);
  root.add(jpLagoon);

  // Washington Park Lagoon west of Cottage Grove
  const wpLagoon = new THREE.Mesh(new THREE.CircleGeometry(82, 32), mats.waterMat);
  wpLagoon.rotation.x = -Math.PI * 0.5;
  wpLagoon.position.set(-575, 0.02, -95);
  root.add(wpLagoon);

  // 3. Distant Downtown Chicago Loop Skyline to the North (-Z)
  const skyline = buildChicagoSkyline(mats);
  skyline.position.set(40, 0, -1950);
  root.add(skyline);

  // 4. Street Grid (Sidewalks + Asphalt Roadways + Median Markings)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#c4beb2', roughness: 0.9 });
  const lineMat = new THREE.MeshBasicMaterial({ color: '#d8be68' });

  for (const st of STREETS_NS) {
    const zMin = st.zMin ?? -780;
    const zMax = st.zMax ?? 740;
    const len = zMax - zMin;
    const cz = (zMin + zMax) * 0.5;

    const sw = new THREE.Mesh(UNIT_BOX, sidewalkMat);
    sw.scale.set(st.width + 5.6, 0.16, len);
    sw.position.set(st.x, 0.02, cz);
    sw.receiveShadow = true;
    root.add(sw);

    const rd = new THREE.Mesh(UNIT_BOX, mats.asphalt);
    rd.scale.set(st.width, 0.18, len);
    rd.position.set(st.x, 0.05, cz);
    rd.receiveShadow = true;
    root.add(rd);

    if (st.major) {
      const centerLine = new THREE.Mesh(UNIT_BOX, lineMat);
      centerLine.scale.set(0.24, 0.2, len);
      centerLine.position.set(st.x, 0.06, cz);
      root.add(centerLine);
    }
  }

  for (const st of STREETS_EW) {
    const xMin = st.xMin ?? -640;
    const xMax = st.xMax ?? 860;
    const len = xMax - xMin;
    const cx = (xMin + xMax) * 0.5;

    const sw = new THREE.Mesh(UNIT_BOX, sidewalkMat);
    sw.scale.set(len, 0.16, st.width + 5.6);
    sw.position.set(cx, 0.02, st.z);
    sw.receiveShadow = true;
    root.add(sw);

    const rd = new THREE.Mesh(UNIT_BOX, mats.asphalt);
    rd.scale.set(len, 0.18, st.width);
    rd.position.set(cx, 0.05, st.z);
    rd.receiveShadow = true;
    root.add(rd);

    if (st.major) {
      const centerLine = new THREE.Mesh(UNIT_BOX, lineMat);
      centerLine.scale.set(len, 0.2, 0.24);
      centerLine.position.set(cx, 0.06, st.z);
      root.add(centerLine);
    }
  }

  // 5. Olmsted's Midway Plaisance (Sunken Boulevard Bowls between E 59th & E 60th)
  const midwayGroup = new THREE.Group();
  const midwaySegments = [
    [-610, -445],
    [-415, -95],
    [-68, 118],
    [140, 244],
    [268, 370],
    [392, 534],
    [558, 675]
  ];

  for (const [x0, x1] of midwaySegments) {
    const segW = x1 - x0;
    const cx = (x0 + x1) * 0.5;

    // Outer upper tree-lined parkway strips
    for (const zStrip of [235, 385]) {
      const strip = new THREE.Mesh(UNIT_BOX, mats.midwayGrass);
      strip.scale.set(segW, 0.3, 30);
      strip.position.set(cx, 0.12, zStrip);
      strip.receiveShadow = true;
      midwayGroup.add(strip);
    }

    // Sunken central lawn "chasm" panel
    const sunken = new THREE.Mesh(UNIT_BOX, mats.midwayGrass);
    sunken.scale.set(segW - 6, 0.25, 108);
    sunken.position.set(cx, -1.25, 310);
    sunken.receiveShadow = true;
    midwayGroup.add(sunken);

    // Sloped grassy embankments on North & South edges of sunken bowl
    for (const side of [-1, 1]) {
      const slope = new THREE.Mesh(UNIT_BOX, mats.midwayGrass);
      slope.scale.set(segW - 4, 0.25, 14);
      slope.position.set(cx, -0.55, 310 + side * 59);
      slope.rotation.x = side * 0.11;
      slope.receiveShadow = true;
      midwayGroup.add(slope);
    }
  }

  // Midway Ice Skating Rink & Warming House (between Ellis & University)
  const rinkPad = new THREE.Mesh(
    UNIT_BOX,
    new THREE.MeshStandardMaterial({ color: '#d7ecf7', roughness: 0.12, metalness: 0.35 })
  );
  rinkPad.scale.set(58, 0.3, 30);
  rinkPad.position.set(68, -1.05, 310);
  midwayGroup.add(rinkPad);

  const rinkBoards = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  rinkBoards.scale.set(60, 1.1, 32);
  rinkBoards.position.set(68, -0.9, 310);
  midwayGroup.add(rinkBoards);

  const warmingHouse = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  warmingHouse.scale.set(22, 5.2, 11);
  warmingHouse.position.set(24, 2.6, 310);
  warmingHouse.castShadow = true;
  midwayGroup.add(warmingHouse);

  registerHitTarget(midwayGroup, 'midway');
  root.add(midwayGroup);

  // 6. Main Quadrangles Pedestrian Cobblestone Network, Flagpole & C Bench
  const quadPaths = new THREE.Group();
  const addPath = (x1, z1, x2, z2, width = 3.6) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const p = new THREE.Mesh(UNIT_BOX, mats.cobblestone);
    p.scale.set(width, 0.14, len);
    p.position.set((x1 + x2) * 0.5, 0.06, (z1 + z2) * 0.5);
    p.rotation.y = Math.atan2(dx, dz);
    p.receiveShadow = true;
    quadPaths.add(p);
  };

  // E 58th Street Pedestrian Promenade across Main Quad (Cobb/Levi Gate -> Rosenwald/Ryerson -> University Ave)
  addPath(-76, -8, 122, -8, 7.2);
  // Central North-South Axis (Hull Gate -> Flagpole -> Harper Quad)
  addPath(22, -215, 22, 170, 5.4);
  // Classic Diagonal Quad Paths converging on Flagpole Circle (22, -8)
  addPath(-54, 48, 22, -8, 3.4);
  addPath(-54, -62, 22, -8, 3.4);
  addPath(88, 44, 22, -8, 3.4);
  addPath(86, -182, 22, -8, 3.4);
  addPath(56, -212, 56, -8, 3.6); // Cobb Gate walk
  addPath(-38, 152, 92, 152, 4.2); // Harper / Classics / Social Science walk

  // Central Flagpole Plaza & Waving UChicago Maroon Flag
  const flagRing = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.5, 0.24, 32), mats.cobblestone);
  flagRing.position.set(22, 0.08, -8);
  flagRing.receiveShadow = true;
  quadPaths.add(flagRing);

  const flagGarden = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.5, 0.34, 24), mats.quadGrass);
  flagGarden.position.set(22, 0.14, -8);
  quadPaths.add(flagGarden);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, 24, 12),
    new THREE.MeshStandardMaterial({ color: '#e6e4dc', metalness: 0.7, roughness: 0.25 })
  );
  pole.position.set(22, 12, -8);
  pole.castShadow = true;
  quadPaths.add(pole);

  const flagGeo = new THREE.PlaneGeometry(5.6, 3.4, 14, 6);
  const flagMesh = new THREE.Mesh(flagGeo, mats.maroonBanner);
  flagMesh.position.set(24.8, 22, -8);
  flagMesh.castShadow = true;
  flagMesh.name = 'UChicagoFlag';
  quadPaths.add(flagMesh);

  // The Iconic "C Bench" in front of Cobb Hall
  const cBench = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.55, 8, 20, Math.PI * 1.15),
    mats.limestoneTrim
  );
  cBench.rotation.x = Math.PI * 0.5;
  cBench.rotation.z = -Math.PI * 0.55;
  cBench.position.set(-48, 0.55, 56);
  quadPaths.add(cBench);

  root.add(quadPaths);

  // 7. Botany Pond & Stone Footbridge inside Hull Court
  const botanyGroup = new THREE.Group();
  botanyGroup.position.set(18, 0, -155);

  const pondWater = new THREE.Mesh(new THREE.CircleGeometry(15.5, 28), mats.waterMat);
  pondWater.scale.set(1.45, 0.85, 1);
  pondWater.rotation.x = -Math.PI * 0.5;
  pondWater.position.y = 0.09;
  botanyGroup.add(pondWater);

  // Stone pond rim boulders
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), mats.limestoneDark);
    rock.scale.set(1.3, 0.55, 1.0);
    rock.position.set(Math.cos(a) * 22.2, 0.25, Math.sin(a) * 13.0);
    botanyGroup.add(rock);
  }

  // Lily pads on Botany Pond
  const lilyMat = new THREE.MeshStandardMaterial({ color: '#3b7d3b', roughness: 0.7 });
  for (const [lx, lz] of [[-8, -3], [-6, 2], [9, -2], [11, 3], [5, -5], [-11, 1]]) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 12), lilyMat);
    pad.position.set(lx, 0.13, lz);
    botanyGroup.add(pad);
  }

  // Historic arched stone footbridge across Botany Pond
  const bridge = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  bridge.scale.set(4.2, 1.2, 15.5);
  bridge.position.set(0, 1.15, 0);
  bridge.castShadow = true;
  botanyGroup.add(bridge);

  registerHitTarget(botanyGroup, 'botany_pond');
  root.add(botanyGroup);

  // 8. Amos Alonzo Stagg Field (North Campus at 55th & Cottage Grove/Ellis)
  const staggGroup = new THREE.Group();
  staggGroup.position.set(-255, 0, -545);

  // Oval terracotta 400m running track
  const trackOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(64, 64, 0.16, 40),
    new THREE.MeshStandardMaterial({ color: '#a84434', roughness: 0.85 })
  );
  trackOuter.scale.set(1.35, 1, 0.88);
  trackOuter.position.y = 0.04;
  trackOuter.receiveShadow = true;
  staggGroup.add(trackOuter);

  // Football turf with UChicago Maroon endzones
  const turf = new THREE.Mesh(
    new THREE.PlaneGeometry(116, 62),
    new THREE.MeshStandardMaterial({ map: createStaggFieldTexture(), roughness: 0.88 })
  );
  turf.rotation.x = -Math.PI * 0.5;
  turf.position.y = 0.14;
  turf.receiveShadow = true;
  staggGroup.add(turf);

  // North Home Grandstand Bleachers & Press Box
  for (let tier = 0; tier < 6; tier++) {
    const row = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    row.scale.set(84, 1.3 * (tier + 1), 2.6);
    row.position.set(0, 0.65 * (tier + 1), -42 - tier * 2.5);
    row.castShadow = true;
    row.receiveShadow = true;
    staggGroup.add(row);
  }
  const pressBox = new THREE.Mesh(UNIT_BOX, mats.maroonBanner);
  pressBox.scale.set(22, 4.5, 4.2);
  pressBox.position.set(0, 10.2, -55);
  staggGroup.add(pressBox);

  // 4 Stadium Light Towers
  for (const [tx, tz] of [[-62, -46], [62, -46], [-62, 46], [62, 46]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 28, 8), mats.miesSteel);
    mast.position.set(tx, 14, tz);
    staggGroup.add(mast);
    const head = new THREE.Mesh(
      UNIT_BOX,
      mats.registerEmissive(
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: new THREE.Color('#fff1d0'),
          emissiveIntensity: 0.4
        }),
        2.4
      )
    );
    head.scale.set(4.5, 2.2, 1.2);
    head.position.set(tx, 28, tz);
    staggGroup.add(head);
  }

  registerHitTarget(staggGroup, 'stagg_field');
  root.add(staggGroup);

  scene.add(root);
  return { root, flagMesh };
}

/**
 * Builds recognizable Chicago Loop skyline silhouette far on the Northern horizon
 * (Willis/Sears Tower, 875 N Michigan/Hancock, Aon Center, Prudential, Lakefront towers)
 */
function buildChicagoSkyline(mats) {
  const g = new THREE.Group();
  const skyMat = mats.registerEmissive(
    new THREE.MeshStandardMaterial({
      color: '#465466',
      emissive: new THREE.Color('#ffd596'),
      emissiveIntensity: 0.15,
      roughness: 0.45,
      metalness: 0.6
    }),
    0.65
  );

  // Willis (Sears) Tower stepped massing + twin antennas
  const willis = new THREE.Group();
  willis.position.set(-140, 0, 0);
  for (const [w, h, d, x, z] of [
    [52, 165, 52, 0, 0],
    [36, 225, 52, 0, 0],
    [36, 275, 36, 0, 0],
    [22, 320, 36, -6, 0]
  ]) {
    const m = new THREE.Mesh(UNIT_BOX, skyMat);
    m.scale.set(w, h, d);
    m.position.set(x, h * 0.5, z);
    willis.add(m);
  }
  for (const ax of [-8, 8]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 65, 6), mats.limestoneTrim);
    ant.position.set(ax - 6, 352, 0);
    willis.add(ant);
  }
  g.add(willis);

  // Aon Center
  const aon = new THREE.Mesh(UNIT_BOX, skyMat);
  aon.scale.set(44, 248, 44);
  aon.position.set(65, 124, 40);
  g.add(aon);

  // 875 N Michigan (John Hancock) tapered obelisk + twin spires
  const hancock = new THREE.Mesh(new THREE.CylinderGeometry(18, 30, 240, 4), skyMat);
  hancock.rotation.y = Math.PI * 0.25;
  hancock.position.set(195, 120, -60);
  g.add(hancock);
  for (const hx of [-6, 6]) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 56, 6), mats.limestoneTrim);
    sp.position.set(195 + hx, 268, -60);
    g.add(sp);
  }

  // Supporting Downtown Chicago skyline cluster
  const cluster = [
    [-260, 110, 38], [-210, 145, 42], [-80, 160, 40], [-30, 190, 36],
    [15, 155, 44], [120, 185, 38], [155, 140, 36], [250, 130, 42],
    [310, 105, 38], [-320, 95, 36]
  ];
  for (const [x, h, w] of cluster) {
    const b = new THREE.Mesh(UNIT_BOX, skyMat);
    b.scale.set(w, h, w * 0.85);
    b.position.set(x, h * 0.5, (Math.abs(x) % 90) - 45);
    g.add(b);
  }

  return g;
}
