import * as THREE from 'three';
import {
  createGothicHall,
  createGothicTower,
  createGothicGateOrBridge
} from './gothicKit.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function buildMainQuadrangles(scene, mats, registerHitTarget) {
  const quadRoot = new THREE.Group();
  quadRoot.name = 'MainQuadrangles';

  // ============================================================================
  // 1. WILLIAM RAINEY HARPER MEMORIAL LIBRARY (Twin Towers + Vaulted Hall + Bridges)
  // ============================================================================
  const harperGroup = new THREE.Group();
  harperGroup.position.set(24, 0, 182);

  const harperHall = createGothicHall(mats, {
    w: 62,
    d: 19,
    h: 20,
    roofH: 8.2,
    buttresses: true,
    dormers: true,
    crenellated: true
  });
  harperGroup.add(harperHall);

  // Glowing tall Cathey Learning Center Gothic reading-room lancet windows
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) === 2) continue;
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
      win.scale.set(3.4, 9.5, 0.35);
      win.position.set(i * 7.2, 12.2, side * 9.65);
      harperGroup.add(win);
    }
  }

  // West Tower (King's College secular battlements) & East Tower (Byzantine/Christ Church crown)
  const westTower = createGothicTower(mats, { w: 11.5, d: 12.5, h: 38, pinnacleH: 6.2 });
  westTower.position.set(-16.5, 0, 0.5);
  harperGroup.add(westTower);

  const eastTower = createGothicTower(mats, {
    w: 11.5,
    d: 12.5,
    h: 38,
    pinnacleH: 5.4,
    octagonalCrown: true
  });
  eastTower.position.set(16.5, 0, 0.5);
  harperGroup.add(eastTower);

  // Arched Gothic Skybridges connecting West to Wieboldt & East to Social Science
  const westBridge = createGothicGateOrBridge(mats, { w: 11, d: 6.5, h: 13.5 });
  westBridge.position.set(-36, 0, 0);
  harperGroup.add(westBridge);

  const eastBridge = createGothicGateOrBridge(mats, { w: 11, d: 6.5, h: 13.5 });
  eastBridge.position.set(36, 0, 0);
  harperGroup.add(eastBridge);

  registerHitTarget(harperGroup, 'harper');
  quadRoot.add(harperGroup);

  // ============================================================================
  // 2. CLASSICS QUADRANGLE (SW Corner: Classics, Wieboldt, Goodspeed, Gates-Blake)
  // ============================================================================
  const classicsGroup = new THREE.Group();

  // Wieboldt Hall (between Harper & Classics on 59th)
  const wieboldt = createGothicHall(mats, { w: 30, d: 16, h: 16.5, roofH: 6.8 });
  wieboldt.position.set(-32, 0, 182);
  classicsGroup.add(wieboldt);

  // Classics Building at 59th & Ellis (French Chateau-Gothic steep roof + corner turret)
  const classicsBldg = createGothicHall(mats, { w: 24, d: 20, h: 18, roofH: 8.5 });
  classicsBldg.position.set(-60, 0, 182);
  classicsGroup.add(classicsBldg);

  const classicsTurret = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.4, 21, 12),
    mats.limestoneTrim
  );
  classicsTurret.position.set(-71, 10.5, 191);
  classicsGroup.add(classicsTurret);
  const turretCap = new THREE.Mesh(new THREE.ConeGeometry(3.6, 8.5, 12), mats.slateRoof);
  turretCap.position.set(-71, 25.2, 191);
  classicsGroup.add(turretCap);

  // Goodspeed & Gates-Blake Halls along Ellis Ave (1892 originals)
  const goodspeed = createGothicHall(mats, { w: 16, d: 34, h: 15, roofH: 6.0 });
  goodspeed.position.set(-66, 0, 148);
  classicsGroup.add(goodspeed);

  const gatesBlake = createGothicHall(mats, { w: 16, d: 30, h: 15, roofH: 6.0 });
  gatesBlake.position.set(-66, 0, 110);
  classicsGroup.add(gatesBlake);

  registerHitTarget(classicsGroup, 'classics_quad');
  quadRoot.add(classicsGroup);

  // ============================================================================
  // 3. SOCIAL SCIENCE & SOUTHEAST WOMEN'S QUADRANGLE (Social Science, Foster, Kelly, Beecher, Green)
  // ============================================================================
  const socSciGroup = new THREE.Group();

  const socSci = createGothicHall(mats, { w: 32, d: 17, h: 17.5, roofH: 6.8, crenellated: true });
  socSci.position.set(78, 0, 182);
  socSciGroup.add(socSci);

  const foster = createGothicHall(mats, { w: 22, d: 19, h: 17.5, roofH: 8.0 });
  foster.position.set(107, 0, 182);
  socSciGroup.add(foster);

  for (const [zPos, hVal] of [[152, 15], [124, 15], [96, 15.5]]) {
    const dorm = createGothicHall(mats, { w: 16, d: 24, h: hVal, roofH: 6.0 });
    dorm.position.set(110, 0, zPos);
    socSciGroup.add(dorm);
  }

  registerHitTarget(socSciGroup, 'social_science_quad');
  quadRoot.add(socSciGroup);

  // ============================================================================
  // 4. COBB LECTURE HALL (1892 First Building) & EDWARD H. LEVI HALL
  // ============================================================================
  const cobbGroup = new THREE.Group();
  cobbGroup.position.set(-66, 0, 56);

  const cobbMain = createGothicHall(mats, { w: 18, d: 58, h: 16.5, roofH: 7.2 });
  cobbGroup.add(cobbMain);

  // Projecting Gothic Entrance Porch facing East onto Main Quad & C Bench
  const cobbTower = createGothicTower(mats, { w: 8.5, d: 8.5, h: 24, pinnacleH: 4.2 });
  cobbTower.position.set(8.5, 0, 0);
  cobbGroup.add(cobbTower);

  registerHitTarget(cobbGroup, 'cobb_hall');
  quadRoot.add(cobbGroup);

  // Edward H. Levi Hall (Administration Building at 5801 S Ellis)
  const leviGroup = new THREE.Group();
  leviGroup.position.set(-66, 0, -8);

  const leviWallMat = mats.tiledFacade(mats.gothicFacade, 48, 19);
  const leviMain = new THREE.Mesh(UNIT_BOX, leviWallMat);
  leviMain.scale.set(19, 19.5, 48);
  leviMain.position.y = 9.75;
  leviMain.castShadow = true;
  leviMain.receiveShadow = true;
  leviGroup.add(leviMain);

  const leviCrown = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  leviCrown.scale.set(20, 1.4, 49);
  leviCrown.position.y = 19.8;
  leviGroup.add(leviCrown);

  registerHitTarget(leviGroup, 'levi_hall');
  quadRoot.add(leviGroup);

  // ============================================================================
  // 5. SWIFT HALL & JOSEPH BOND CHAPEL (Divinity School Jewel-Box Chapel)
  // ============================================================================
  const swiftGroup = new THREE.Group();
  swiftGroup.position.set(-24, 0, 26);

  const swiftHall = createGothicHall(mats, {
    w: 18,
    d: 38,
    h: 17,
    roofH: 6.5,
    crenellated: true
  });
  swiftHall.position.set(8, 0, 0);
  swiftGroup.add(swiftHall);

  // Joseph Bond Chapel with steep roof, stained glass & oxidized green copper fleche spire!
  const bondChapel = createGothicHall(mats, {
    w: 24,
    d: 12,
    h: 14,
    roofH: 7.8,
    buttresses: true,
    dormers: false,
    fleche: true
  });
  bondChapel.position.set(-13, 0, 11);
  swiftGroup.add(bondChapel);

  const bondGlass = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
  bondGlass.scale.set(0.4, 8.5, 5.2);
  bondGlass.position.set(-25.1, 8.5, 11);
  swiftGroup.add(bondGlass);

  // Cloister arcade linking Swift & Bond Chapel
  const cloister = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  cloister.scale.set(12, 5.2, 3.8);
  cloister.position.set(-2, 2.6, -4);
  swiftGroup.add(cloister);

  registerHitTarget(swiftGroup, 'swift_bond');
  quadRoot.add(swiftGroup);

  // ============================================================================
  // 6. ROSENWALD, WALKER & STUART HALLS (Dividing Main Lawn & Harper/SocSci Quads)
  // ============================================================================
  const rosenwaldGroup = new THREE.Group();
  rosenwaldGroup.position.set(56, 0, 52);

  // Rosenwald West & Central Tower
  const rosenwaldWing = createGothicHall(mats, { w: 34, d: 16, h: 16, roofH: 6.5 });
  rosenwaldWing.position.set(-28, 0, 0);
  rosenwaldGroup.add(rosenwaldWing);

  const rosenwaldTower = createGothicTower(mats, { w: 11, d: 11, h: 32, pinnacleH: 4.8 });
  rosenwaldTower.position.set(-28, 0, 1);
  rosenwaldGroup.add(rosenwaldTower);

  // Walker Museum (Center)
  const walker = createGothicHall(mats, { w: 28, d: 18, h: 17.5, roofH: 7.2 });
  walker.position.set(8, 0, -4);
  rosenwaldGroup.add(walker);

  // Stuart Hall (East along University Ave, original Law School)
  const stuart = createGothicHall(mats, { w: 20, d: 42, h: 17, roofH: 6.8, crenellated: true });
  stuart.position.set(52, 0, 2);
  rosenwaldGroup.add(stuart);

  registerHitTarget(rosenwaldGroup, 'rosenwald_stuart');
  quadRoot.add(rosenwaldGroup);

  // ============================================================================
  // 7. RYERSON PHYSICAL LABORATORY (with Observatory Turret!) & ECKHART HALL
  // ============================================================================
  const ryersonGroup = new THREE.Group();
  ryersonGroup.position.set(18, 0, -64);

  const ryersonHall = createGothicHall(mats, { w: 50, d: 17, h: 17.5, roofH: 7.5 });
  ryersonGroup.add(ryersonHall);

  // Ryerson's iconic central rooftop astronomical observatory turret
  const obsBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 8.5, 8),
    mats.limestoneTrim
  );
  obsBase.position.set(0, 23.5, 0);
  ryersonGroup.add(obsBase);

  const obsDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mats.copperPatina
  );
  obsDome.position.set(0, 27.6, 0);
  ryersonGroup.add(obsDome);

  registerHitTarget(ryersonGroup, 'ryerson');
  quadRoot.add(ryersonGroup);

  // Eckhart Hall (Math & CS) + Gothic Arch Bridge to Ryerson
  const eckhartGroup = new THREE.Group();
  eckhartGroup.position.set(88, 0, -68);

  const eckhartSouth = createGothicHall(mats, { w: 42, d: 16, h: 17, roofH: 6.5, crenellated: true });
  eckhartSouth.position.set(-4, 0, 4);
  eckhartGroup.add(eckhartSouth);

  const eckhartEast = createGothicHall(mats, { w: 17, d: 44, h: 17, roofH: 6.5 });
  eckhartEast.position.set(20, 0, -10);
  eckhartGroup.add(eckhartEast);

  const ryersonBridge = createGothicGateOrBridge(mats, { w: 12, d: 6, h: 12 });
  ryersonBridge.position.set(-34, 0, 4);
  eckhartGroup.add(ryersonBridge);

  registerHitTarget(eckhartGroup, 'eckhart');
  quadRoot.add(eckhartGroup);

  // ============================================================================
  // 8. KENT CHEMICAL (with Octagonal Lecture Theater), JONES LAB & SNELL-HITCHCOCK
  // ============================================================================
  const kentJonesGroup = new THREE.Group();
  kentJonesGroup.position.set(-52, 0, -68);

  const kentHall = createGothicHall(mats, { w: 38, d: 16, h: 16.5, roofH: 6.8 });
  kentHall.position.set(16, 0, 4);
  kentJonesGroup.add(kentHall);

  // Kent's famous Octagonal Lecture Hall behind the main wing
  const kentOct = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 9.5, 11.5, 8),
    mats.limestoneTrim
  );
  kentOct.position.set(16, 5.75, -13);
  kentOct.castShadow = true;
  kentJonesGroup.add(kentOct);
  const kentOctRoof = new THREE.Mesh(new THREE.ConeGeometry(10.2, 5.5, 8), mats.slateRoof);
  kentOctRoof.position.set(16, 14.2, -13);
  kentJonesGroup.add(kentOctRoof);

  // George Herbert Jones Laboratory (Plutonium National Historic Landmark on Ellis Ave)
  const jonesLab = createGothicHall(mats, { w: 17, d: 46, h: 16.5, roofH: 6.2 });
  jonesLab.position.set(-14, 0, -8);
  kentJonesGroup.add(jonesLab);

  // Searle Chemistry Lab link
  const searleLab = createGothicHall(mats, { w: 17, d: 34, h: 16, roofH: 5.2, dormers: false });
  searleLab.position.set(-14, 0, -52);
  kentJonesGroup.add(searleLab);

  registerHitTarget(kentJonesGroup, 'kent_jones');
  quadRoot.add(kentJonesGroup);

  // Snell-Hitchcock Hall (NW Corner of Main Quad: 57th & Ellis)
  const snellHitchcock = new THREE.Group();
  snellHitchcock.position.set(-54, 0, -185);

  const hitchcock = createGothicHall(mats, {
    w: 48,
    d: 14,
    h: 15,
    roofH: 5.8,
    dormers: false // Prairie flat-roofed dormers / corn-husk details
  });
  hitchcock.position.set(8, 0, -24);
  snellHitchcock.add(hitchcock);

  const snell = createGothicHall(mats, { w: 15, d: 42, h: 15.5, roofH: 6.5 });
  snell.position.set(-12, 0, 2);
  snellHitchcock.add(snell);

  registerHitTarget(snellHitchcock, 'snell_hitchcock');
  quadRoot.add(snellHitchcock);

  // ============================================================================
  // 9. HULL BIOLOGICAL COURTS (Culver, Anatomy, Zoology, Botany) & HULL GATE
  // ============================================================================
  const hullGroup = new THREE.Group();
  hullGroup.position.set(18, 0, -182);

  // North wing along 57th St (Botany / Erman)
  const hullNorth = createGothicHall(mats, { w: 54, d: 15, h: 16, roofH: 6.5 });
  hullNorth.position.set(0, 0, -26);
  hullGroup.add(hullNorth);

  // West wing (Culver / Anatomy)
  const hullWest = createGothicHall(mats, { w: 15, d: 44, h: 16, roofH: 6.5 });
  hullWest.position.set(-28, 0, 2);
  hullGroup.add(hullWest);

  // East wing (Zoology)
  const hullEast = createGothicHall(mats, { w: 15, d: 44, h: 16, roofH: 6.5 });
  hullEast.position.set(28, 0, 2);
  hullGroup.add(hullEast);

  // Iconic Ornate Hull Gate facing South onto the Main Quad axis!
  const hullGate = createGothicGateOrBridge(mats, { w: 15, d: 4.5, h: 14, isGate: true });
  hullGate.position.set(0, 0, 48);
  hullGroup.add(hullGate);

  registerHitTarget(hullGroup, 'botany_pond');
  quadRoot.add(hullGroup);

  // ============================================================================
  // 10. THE TOWER GROUP (Mitchell Tower, Hutchinson, Reynolds, Mandel) & COBB GATE
  // ============================================================================
  const towerGroup = new THREE.Group();
  towerGroup.position.set(92, 0, -195);

  // Hutchinson Hall (Commons) along E 57th St (Christ Church Great Hall)
  const hutchinson = createGothicHall(mats, {
    w: 44,
    d: 16,
    h: 17.5,
    roofH: 7.5,
    crenellated: true,
    dormers: false
  });
  hutchinson.position.set(-10, 0, -14);
  towerGroup.add(hutchinson);

  // Mitchell Tower (Oxford Magdalen-inspired belfry tower at junction!)
  const mitchellTower = createGothicTower(mats, {
    w: 12.5,
    d: 12.5,
    h: 43,
    pinnacleH: 7.2
  });
  mitchellTower.position.set(16, 0, -12);
  towerGroup.add(mitchellTower);

  // Reynolds Club along University Ave
  const reynolds = createGothicHall(mats, { w: 17, d: 34, h: 16, roofH: 6.5, crenellated: true });
  reynolds.position.set(18, 0, 12);
  towerGroup.add(reynolds);

  // Leon Mandel Assembly Hall (south-west auditorium + cloister)
  const mandel = createGothicHall(mats, { w: 19, d: 38, h: 17.5, roofH: 6.8 });
  mandel.position.set(-6, 0, 24);
  towerGroup.add(mandel);

  registerHitTarget(towerGroup, 'tower_group');
  quadRoot.add(towerGroup);

  // Cobb Gate with Gargoyles at E 57th St entrance just west of Hutchinson!
  const cobbGateGroup = new THREE.Group();
  cobbGateGroup.position.set(56, 0, -210);
  const cobbGate = createGothicGateOrBridge(mats, { w: 12, d: 8.5, h: 12.5, isGate: true });
  cobbGateGroup.add(cobbGate);
  registerHitTarget(cobbGateGroup, 'cobb_gate');
  quadRoot.add(cobbGateGroup);

  scene.add(quadRoot);
  return quadRoot;
}
