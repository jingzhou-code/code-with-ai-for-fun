import * as THREE from 'three';

function tagBuilding(root, id) {
  root.userData.buildingId = id;
  root.traverse((o) => {
    o.userData.buildingId = id;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

/**
 * 1. THEODORE M. HESBURGH LIBRARY + "WORD OF LIFE" ("TOUCHDOWN JESUS") + REFLECTING POOL + MOSES STATUE
 */
function buildHesburghLibrary(materials, lakeShaderMat) {
  const root = new THREE.Group();
  root.position.set(405, 0, 55);

  // 2-story expansive granite & brick podium (104m x 72m x 9.5m)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(104, 9.5, 72), materials.ndBuffBrick);
  podium.position.y = 4.75;
  root.add(podium);

  const podiumCoping = new THREE.Mesh(new THREE.BoxGeometry(106, 1.1, 74), materials.limestone);
  podiumCoping.position.y = 9.8;
  root.add(podiumCoping);

  // Entrance Glass Colonnades (South & West)
  const southGlass = new THREE.Mesh(new THREE.BoxGeometry(42, 7.2, 2.2), materials.glassGreenhouse);
  southGlass.position.set(0, 4.0, 36.2);
  root.add(southGlass);

  // 14-Story Modernist Tower (48m wide x 32m deep, rising to 64m)
  const tower = new THREE.Mesh(new THREE.BoxGeometry(48, 54, 32), materials.limestone);
  tower.position.set(0, 9.5 + 27, 0);
  root.add(tower);

  // Buff-brick vertical pier cladding on East, West, North & South flanks
  const brickCore = new THREE.Mesh(new THREE.BoxGeometry(46.8, 52.5, 30.8), materials.ndBuffBrick);
  brickCore.position.set(0, 9.5 + 26.5, 0);
  root.add(brickCore);

  // Vertical stone fins on East & West facades
  for (let z = -13; z <= 13; z += 4.3) {
    for (const side of [-24.2, 24.2]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 52, 0.9), materials.limestone);
      fin.position.set(side, 36, z);
      root.add(fin);
    }
  }

  // ICONIC "WORD OF LIFE" ("TOUCHDOWN JESUS") STONE MOSAIC ON SOUTH FACADE (+Z facing ND Stadium!)
  // Real dimensions: 40.8m tall x 20.7m wide
  const muralFrame = new THREE.Mesh(new THREE.BoxGeometry(22.4, 43.2, 0.9), materials.limestone);
  muralFrame.position.set(0, 34.5, 16.05);
  root.add(muralFrame);

  const muralPlane = new THREE.Mesh(new THREE.PlaneGeometry(20.8, 41.4), materials.wordOfLife);
  muralPlane.position.set(0, 34.5, 16.56);
  root.add(muralPlane);

  // Penthouse mechanical crown
  const crown = new THREE.Mesh(new THREE.BoxGeometry(28, 3.2, 18), materials.limestone);
  crown.position.set(0, 65.0, 0);
  root.add(crown);

  // HESBURGH REFLECTING POOL (Directly South of Touchdown Jesus!)
  const poolRim = new THREE.Mesh(new THREE.BoxGeometry(54, 0.9, 36), materials.limestone);
  poolRim.position.set(0, 0.45, 76);
  root.add(poolRim);

  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(50, 32, 16, 16), lakeShaderMat);
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.position.set(0, 0.96, 76);
  root.add(poolWater);

  // "FIRST DOWN MOSES" STATUE outside West Entrance (-66, 0, +10 relative -> world (339, 0, 65))
  const mosesPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 3.2), materials.limestone);
  mosesPedestal.position.set(-66, 1.4, 10);
  root.add(mosesPedestal);

  const mosesBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 3.8, 10), materials.bronzeStatue);
  mosesBody.position.set(-66, 4.7, 10);
  root.add(mosesBody);
  const mosesHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), materials.bronzeStatue);
  mosesHead.position.set(-66, 6.9, 10);
  root.add(mosesHead);
  // Iconic right arm pointing "#1 / First Down" straight to the sky!
  const mosesArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 8), materials.bronzeStatue);
  mosesArm.position.set(-65.45, 7.6, 10);
  root.add(mosesArm);

  tagBuilding(root, 'hesburgh-library');
  return root;
}

/**
 * 2. CLARKE MEMORIAL FOUNTAIN ("STONEHENGE") — Fieldhouse Mall (242, 68)
 */
function buildClarkeFountain(materials, lakeShaderMat) {
  const root = new THREE.Group();
  root.position.set(242, 0, 68);

  const basinRim = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 15.5, 0.85, 32), materials.limestone);
  basinRim.position.y = 0.42;
  root.add(basinRim);

  const water = new THREE.Mesh(new THREE.CircleGeometry(13.6, 32), lakeShaderMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.88;
  root.add(water);

  // Central granite sphere fountain
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.65, 20, 16), materials.boulderRock);
  sphere.position.y = 1.9;
  root.add(sphere);

  // 4 Indiana Limestone Trilithon Arches (N, S, E, W)
  for (let i = 0; i < 4; i++) {
    const archGrp = new THREE.Group();
    archGrp.rotation.y = (i * Math.PI) / 2;
    const dist = 10.8;

    const colL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 6.2, 1.7), materials.limestone);
    colL.position.set(-2.3, 3.3, dist);
    const colR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 6.2, 1.7), materials.limestone);
    colR.position.set(2.3, 3.3, dist);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.45, 2.0), materials.limestone);
    lintel.position.set(0, 7.1, dist);

    archGrp.add(colL, colR, lintel);
    root.add(archGrp);
  }

  tagBuilding(root, 'clarke-fountain');
  return root;
}

/**
 * 3. SOUTH DINING HALL ("SDH" — 1927 Medieval Guildhall / "Hogwarts") at (-125, 388)
 */
function buildSouthDiningHall(materials) {
  const root = new THREE.Group();
  root.position.set(-125, 0, 388);

  // Twin Parallel Medieval Great Halls (North & South Refectories)
  for (const dz of [-10.5, 10.5]) {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(84, 14.5, 17.5), materials.ndWarmGothicBrick);
    hall.position.set(0, 7.25, dz);
    root.add(hall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(13.2, 8.2, 4), materials.slateRoof);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(4.5, 1, 0.95);
    roof.position.set(0, 18.6, dz);
    root.add(roof);
  }

  // Limestone Gothic Buttresses & Glowing Leaded Mullion Windows along North Facade (facing South Quad)
  for (let x = -36; x <= 36; x += 9) {
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 15.2, 1.6), materials.limestone);
    buttress.position.set(x, 7.6, -19.5);
    root.add(buttress);

    if (Math.abs(x) > 6 && x < 36) {
      const tallWin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 8.8, 0.4), materials.stainedGlass);
      tallWin.position.set(x + 4.5, 8.2, -19.35);
      root.add(tallWin);
    }
  }

  // Central Tudor-Gothic Crenellated Entrance Tower
  const centerTower = new THREE.Mesh(new THREE.BoxGeometry(14, 22.5, 14), materials.limestone);
  centerTower.position.set(0, 11.25, -16);
  root.add(centerTower);

  // 4 Corner Turrets on Entrance Tower
  for (const cx of [-6.8, 6.8]) {
    for (const cz of [-22.8, -9.2]) {
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 25.5, 8), materials.limestone);
      tur.position.set(cx, 12.75, cz);
      root.add(tur);
    }
  }

  tagBuilding(root, 'south-dining-hall');
  return root;
}

/**
 * 4. BOND HALL (Italian Renaissance Limestone Palace + Concert Steps) at (-212, 242)
 */
function buildBondHall(materials) {
  const root = new THREE.Group();
  root.position.set(-212, 0, 242);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(48, 2.8, 34), materials.limestone);
  plinth.position.y = 1.4;
  root.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(44, 14.5, 30), materials.limestone);
  body.position.y = 2.8 + 7.25;
  root.add(body);

  // Famous Concert-on-the-Steps Grand Staircase & Ionic Colonnade (Facing East toward Main Quad)
  for (let s = 0; s < 5; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(8 - s * 1.3, 0.56, 22 - s * 0.6), materials.limestone);
    step.position.set(25.5 - s * 0.65, 0.28 + s * 0.56, 0);
    root.add(step);
  }
  for (let z = -8; z <= 8; z += 4) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 11.5, 14), materials.limestone);
    col.position.set(22.6, 8.6, z);
    root.add(col);
  }

  // Classical Rotunda Drum & Copper Renaissance Dome
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.2, 4.2, 24), materials.limestone);
  drum.position.y = 19.2;
  root.add(drum);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materials.verdigrisCopper
  );
  dome.scale.set(1, 0.62, 1);
  dome.position.y = 21.0;
  root.add(dome);

  tagBuilding(root, 'bond-hall');
  return root;
}

/**
 * 5. O'SHAUGHNESSY HALL ("O'SHAG" — East Terminus of South Quad) at (196, 338)
 */
function buildOShaughnessyHall(materials) {
  const root = new THREE.Group();
  root.position.set(196, 0, 338);

  // North-South Collegiate Gothic Main Spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(22, 16.5, 88), materials.ndBuffBrick);
  spine.position.y = 8.25;
  root.add(spine);

  const spineRoof = new THREE.Mesh(new THREE.ConeGeometry(16, 7.5, 4), materials.slateRoof);
  spineRoof.rotation.y = Math.PI / 4;
  spineRoof.scale.set(0.95, 1, 3.85);
  spineRoof.position.y = 20.2;
  root.add(spineRoof);

  // Rear East Gallery Wing
  const eastWing = new THREE.Mesh(new THREE.BoxGeometry(26, 15, 32), materials.ndBuffBrick);
  eastWing.position.set(18, 7.5, 0);
  root.add(eastWing);

  // Iconic 34m Square Collegiate Gothic Carillon/Clock Tower facing West down South Quad!
  const tower = new THREE.Mesh(new THREE.BoxGeometry(12.5, 32, 12.5), materials.ndBuffBrick);
  tower.position.set(-8, 16, 0);
  root.add(tower);

  const towerCrown = new THREE.Mesh(new THREE.BoxGeometry(13.4, 2.6, 13.4), materials.limestone);
  towerCrown.position.set(-8, 32.8, 0);
  root.add(towerCrown);

  for (const cx of [-14.2, -1.8]) {
    for (const cz of [-6.2, 6.2]) {
      const pin = new THREE.Mesh(new THREE.ConeGeometry(1.0, 4.2, 4), materials.limestone);
      pin.position.set(cx, 36.1, cz);
      root.add(pin);
    }
  }

  // Great Hall Stained Glass Window
  const greatWin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 5.2), materials.stainedGlass);
  greatWin.position.set(-14.35, 11.5, 0);
  root.add(greatWin);

  tagBuilding(root, 'oshaughnessy-hall');
  return root;
}

/**
 * 6. NOTRE DAME LAW SCHOOL (Biolchini + Eck Halls + Iconic Spanning Gothic Law Arch!) at (108, 330)
 */
function buildLawSchool(materials) {
  const root = new THREE.Group();
  root.position.set(108, 0, 330);

  // North Building: Biolchini Hall of Law
  const biolchini = new THREE.Mesh(new THREE.BoxGeometry(46, 17, 28), materials.ndBuffBrick);
  biolchini.position.set(-8, 8.5, -22);
  root.add(biolchini);
  const bRoof = new THREE.Mesh(new THREE.ConeGeometry(22, 7, 4), materials.slateRoof);
  bRoof.rotation.y = Math.PI / 4;
  bRoof.scale.set(1.45, 1, 0.9);
  bRoof.position.set(-8, 20.5, -22);
  root.add(bRoof);

  // South Building: Eck Hall of Law
  const eck = new THREE.Mesh(new THREE.BoxGeometry(52, 17.5, 28), materials.ndBuffBrick);
  eck.position.set(4, 8.75, 22);
  root.add(eck);
  const eRoof = new THREE.Mesh(new THREE.ConeGeometry(22, 7.2, 4), materials.slateRoof);
  eRoof.rotation.y = Math.PI / 4;
  eRoof.scale.set(1.65, 1, 0.9);
  eRoof.position.set(4, 21.0, 22);
  root.add(eRoof);

  // THE ICONIC GOTHIC LAW ARCH Bridge Connecting Both Halls!
  const archSpan = new THREE.Mesh(new THREE.BoxGeometry(11, 7.5, 18), materials.limestone);
  archSpan.position.set(-4, 11.5, 0);
  root.add(archSpan);
  const archRoof = new THREE.Mesh(new THREE.ConeGeometry(8.2, 4.2, 4), materials.slateRoof);
  archRoof.rotation.y = Math.PI / 4;
  archRoof.scale.set(0.95, 1, 1.55);
  archRoof.position.set(-4, 17.3, 0);
  root.add(archRoof);

  for (const pz of [-7.5, 7.5]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(11.4, 8.2, 3.2), materials.limestone);
    pier.position.set(-4, 4.1, pz);
    root.add(pier);
  }

  tagBuilding(root, 'law-school');
  return root;
}

/**
 * 7. MENDOZA COLLEGE OF BUSINESS & STAYER CENTER (288, 428) + JORDAN HALL OF SCIENCE (505, 215)
 *    + GRACE & FLANNER 11-STORY TOWERS (with glowing "#1" sign!) + STEPAN GEODESIC DOME
 */
function buildModernAndScienceLandmarks(materials) {
  const group = new THREE.Group();

  // A. Mendoza College of Business & Stayer Center (288, 428)
  const mendoza = new THREE.Group();
  mendoza.position.set(288, 0, 428);

  const mMain = new THREE.Mesh(new THREE.BoxGeometry(78, 17.5, 34), materials.ndBuffBrick);
  mMain.position.set(0, 8.75, -16);
  mendoza.add(mMain);
  const mRoof = new THREE.Mesh(new THREE.ConeGeometry(26, 7.5, 4), materials.slateRoof);
  mRoof.rotation.y = Math.PI / 4;
  mRoof.scale.set(2.1, 1, 0.92);
  mRoof.position.set(0, 21.2, -16);
  mendoza.add(mRoof);

  // Classical Jordan Auditorium Rotunda & Copper Dome at West Corner
  const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12, 16, 20), materials.limestone);
  rotunda.position.set(-34, 8, -2);
  mendoza.add(rotunda);
  const rotDome = new THREE.Mesh(
    new THREE.SphereGeometry(11.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materials.verdigrisCopper
  );
  rotDome.scale.set(1, 0.65, 1);
  rotDome.position.set(-34, 16, -2);
  mendoza.add(rotDome);

  // Stayer Center for Executive Education immediately South
  const stayer = new THREE.Mesh(new THREE.BoxGeometry(58, 16, 24), materials.ndWarmGothicBrick);
  stayer.position.set(6, 8, 24);
  mendoza.add(stayer);
  const sRoof = new THREE.Mesh(new THREE.ConeGeometry(19, 6.8, 4), materials.slateRoof);
  sRoof.rotation.y = Math.PI / 4;
  sRoof.scale.set(2.15, 1, 0.88);
  sRoof.position.set(6, 19.4, 24);
  mendoza.add(sRoof);

  tagBuilding(mendoza, 'mendoza-business');
  group.add(mendoza);

  // B. Jordan Hall of Science (505, 215) — Collegiate Gothic + Twin Glass Greenhouses + Observatory Dome!
  const jordan = new THREE.Group();
  jordan.position.set(505, 0, 215);

  const jBody = new THREE.Mesh(new THREE.BoxGeometry(88, 19.5, 34), materials.ndBuffBrick);
  jBody.position.y = 9.75;
  jordan.add(jBody);

  const jRoof = new THREE.Mesh(new THREE.ConeGeometry(25, 8.2, 4), materials.slateRoof);
  jRoof.rotation.y = Math.PI / 4;
  jRoof.scale.set(2.45, 1, 0.96);
  jRoof.position.y = 23.6;
  jordan.add(jRoof);

  // Rooftop Astronomical Observatory Silver Dome
  const obsDrum = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 4.2, 16), materials.limestone);
  obsDrum.position.set(22, 25.5, 0);
  jordan.add(obsDrum);
  const obsDome = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.whiteDomeShell);
  obsDome.position.set(22, 27.6, 0);
  jordan.add(obsDome);

  // Twin Glass Conservatory Greenhouses on South Side
  for (const gx of [-24, 24]) {
    const gh = new THREE.Mesh(new THREE.BoxGeometry(16, 7.5, 12), materials.glassGreenhouse);
    gh.position.set(gx, 3.75, 22);
    jordan.add(gh);
  }

  tagBuilding(jordan, 'jordan-science');
  group.add(jordan);

  // C. Grace Hall (486, -38) with Iconic Glowing Red "#1" Rooftop Sign!
  const grace = new THREE.Group();
  grace.position.set(486, 0, -38);
  const gTower = new THREE.Mesh(new THREE.BoxGeometry(26, 42, 26), materials.highRiseBrick);
  gTower.position.y = 21;
  grace.add(gTower);
  const gCap = new THREE.Mesh(new THREE.BoxGeometry(27.2, 2.2, 27.2), materials.limestone);
  gCap.position.y = 43.1;
  grace.add(gCap);

  // Iconic "#1" Sign on top of Grace Hall!
  const signGroup = new THREE.Group();
  signGroup.position.set(0, 47.2, 0);
  signGroup.rotation.y = -0.55; // Angled toward campus center & stadium
  // "#" bars
  for (const hx of [-2.2, -0.8]) {
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 0.55), materials.neonNumberOne);
    vBar.position.set(hx, 0, 0);
    signGroup.add(vBar);
  }
  for (const hy of [-0.9, 0.9]) {
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.55), materials.neonNumberOne);
    hBar.position.set(-1.5, hy, 0);
    signGroup.add(hBar);
  }
  // "1" bar
  const oneBar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.2, 0.65), materials.neonNumberOne);
  oneBar.position.set(1.8, 0.2, 0);
  signGroup.add(oneBar);
  const oneBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.65), materials.neonNumberOne);
  oneBase.position.set(1.8, -2.7, 0);
  signGroup.add(oneBase);
  grace.add(signGroup);

  tagBuilding(grace, 'grace-hall');
  group.add(grace);

  // D. Flanner Hall (486, +32) — Twin 11-Story Tower
  const flanner = new THREE.Group();
  flanner.position.set(486, 0, 32);
  const fTower = new THREE.Mesh(new THREE.BoxGeometry(26, 41, 26), materials.highRiseBrick);
  fTower.position.y = 20.5;
  flanner.add(fTower);
  const fCap = new THREE.Mesh(new THREE.BoxGeometry(27.2, 2.2, 27.2), materials.limestone);
  fCap.position.y = 42.1;
  flanner.add(fCap);
  tagBuilding(flanner, 'flanner-hall');
  group.add(flanner);

  // E. Stepan Center Geodesic Dome (336, -232)
  const stepan = new THREE.Group();
  stepan.position.set(336, 0, -232);
  const sWall = new THREE.Mesh(new THREE.CylinderGeometry(21, 21.5, 5.5, 24), materials.ndBuffBrick);
  sWall.position.y = 2.75;
  stepan.add(sWall);
  const geoDome = new THREE.Mesh(
    new THREE.IcosahedronGeometry(21.2, 2),
    materials.whiteDomeShell
  );
  geoDome.scale.set(1, 0.58, 1);
  geoDome.position.y = 5.2;
  stepan.add(geoDome);
  tagBuilding(stepan, 'stepan-center');
  group.add(stepan);

  return group;
}

export function createAcademicLandmarks(scene, materials, lakeShaderMat) {
  const group = new THREE.Group();
  group.name = 'AcademicLandmarks';

  group.add(
    buildHesburghLibrary(materials, lakeShaderMat),
    buildClarkeFountain(materials, lakeShaderMat),
    buildSouthDiningHall(materials),
    buildBondHall(materials),
    buildOShaughnessyHall(materials),
    buildLawSchool(materials),
    buildModernAndScienceLandmarks(materials)
  );

  scene.add(group);
  return { group };
}
