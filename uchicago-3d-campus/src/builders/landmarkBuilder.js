import * as THREE from 'three';
import {
  createGothicHall,
  createGothicTower,
  createGothicGateOrBridge
} from './gothicKit.js';
import { createRadialGraniteTexture } from '../materials/proceduralTextures.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function buildAllCampusLandmarks(scene, mats, registerHitTarget) {
  const root = new THREE.Group();
  root.name = 'CampusLandmarks';

  // ============================================================================
  // 1. ROCKEFELLER MEMORIAL CHAPEL (Bertram Goodhue, 1928 — 207ft Carillon Tower!)
  // ============================================================================
  const rock = new THREE.Group();
  rock.position.set(204, 0, 142);

  // Monumental Cruciform Nave (N-S axis)
  const nave = createGothicHall(mats, {
    w: 24,
    d: 84,
    h: 26,
    roofH: 11.5,
    buttresses: true,
    dormers: false,
    fleche: true
  });
  rock.add(nave);

  // Wide E-W Transept crossing
  const transept = createGothicHall(mats, {
    w: 46,
    d: 22,
    h: 25,
    roofH: 10.5,
    buttresses: true,
    dormers: false
  });
  transept.position.set(0, 0, -6);
  rock.add(transept);

  // Soaring Great South Stained-Glass Window facing the Midway Plaisance
  const southWindow = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
  southWindow.scale.set(11.5, 17, 0.6);
  southWindow.position.set(0, 14.5, 42.1);
  rock.add(southWindow);

  // 207-foot (63m) Laura Spelman Rockefeller Carillon Tower at SE/SW flank
  const carillonTower = createGothicTower(mats, {
    w: 15.5,
    d: 15.5,
    h: 58,
    pinnacleH: 6.5,
    octagonalCrown: true
  });
  carillonTower.position.set(15, 0, 22);
  rock.add(carillonTower);

  registerHitTarget(rock, 'rockefeller');
  root.add(rock);

  // ============================================================================
  // 2. JOSEPH REGENSTEIN LIBRARY ("The Reg" — SOM Walter Netsch Brutalist Icon)
  // ============================================================================
  const reg = new THREE.Group();
  reg.position.set(38, 0, -320);

  const regBlocks = [
    // [w, h, d, x, z] — Walter Netsch's rotated/stepped Field-Theory modules!
    [82, 24, 52, 0, 0],
    [56, 32, 38, 6, -4],
    [34, 37, 26, 12, -6],
    [28, 18, 64, -32, 4],
    [30, 21, 58, 34, 6],
    [18, 34, 18, -22, -24],
    [18, 34, 18, 38, -22],
    [48, 12, 24, 0, 32] // South entrance colonnade terrace facing 57th St
  ];

  for (const [w, h, d, bx, bz] of regBlocks) {
    const m = new THREE.Mesh(
      UNIT_BOX,
      mats.tiledFacade(mats.regensteinLimestone, Math.max(w, d), h, 16, 15)
    );
    m.scale.set(w, h, d);
    m.position.set(bx, h * 0.5, bz);
    m.castShadow = true;
    m.receiveShadow = true;
    reg.add(m);

    const cap = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
    cap.scale.set(w + 0.6, 0.8, d + 0.6);
    cap.position.set(bx, h + 0.2, bz);
    reg.add(cap);
  }

  registerHitTarget(reg, 'regenstein');
  root.add(reg);

  // ============================================================================
  // 3. JOE AND RIKA MANSUETO LIBRARY (Helmut Jahn Elliptical Glass Diagrid Dome)
  // ============================================================================
  const mansueto = new THREE.Group();
  mansueto.position.set(-32, 0, -295);

  // Concrete Perimeter Collar Ring
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 19.6, 1.5, 40),
    mats.limestoneTrim
  );
  collar.scale.set(1.78, 1, 0.98);
  collar.position.y = 0.75;
  collar.receiveShadow = true;
  mansueto.add(collar);

  // Warm illuminated interior reading room floor & wood study tables visible inside dome!
  const readingFloor = new THREE.Mesh(
    new THREE.CircleGeometry(17.8, 36),
    mats.registerEmissive(
      new THREE.MeshStandardMaterial({
        color: '#d8b989',
        emissive: new THREE.Color('#ffcf86'),
        emissiveIntensity: 0.25,
        roughness: 0.6
      }),
      1.35
    )
  );
  readingFloor.scale.set(1.76, 0.96, 1);
  readingFloor.rotation.x = -Math.PI * 0.5;
  readingFloor.position.y = 0.82;
  mansueto.add(readingFloor);

  // Central circulation core desk inside Mansueto
  const coreDesk = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
  coreDesk.scale.set(16, 3.2, 7);
  coreDesk.position.set(4, 2.3, 0);
  mansueto.add(coreDesk);

  // Translucent Elliptical Glass Shell
  const domeGeo = new THREE.SphereGeometry(18.5, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeGlass = new THREE.Mesh(domeGeo, mats.mansuetoDomeGlass);
  domeGlass.scale.set(1.78, 0.64, 0.98);
  domeGlass.position.y = 1.1;
  domeGlass.castShadow = true;
  mansueto.add(domeGlass);

  // Structural White-Silver Diagrid Space-Frame Lattice
  const diagridGeo = new THREE.SphereGeometry(18.62, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const diagrid = new THREE.Mesh(
    diagridGeo,
    new THREE.MeshStandardMaterial({
      color: '#dce4ec',
      wireframe: true,
      roughness: 0.3,
      metalness: 0.75
    })
  );
  diagrid.scale.set(1.78, 0.64, 0.98);
  diagrid.position.y = 1.12;
  mansueto.add(diagrid);

  // Link corridor to Regenstein
  const regLink = new THREE.Mesh(UNIT_BOX, mats.curtainGlass);
  regLink.scale.set(14, 4.5, 7);
  regLink.position.set(34, 2.25, -8);
  mansueto.add(regLink);

  registerHitTarget(mansueto, 'mansueto');
  root.add(mansueto);

  // ============================================================================
  // 4. HENRY MOORE'S "NUCLEAR ENERGY" MONUMENT (Site of Fermi's CP-1, 1942)
  // ============================================================================
  const cp1 = new THREE.Group();
  cp1.position.set(-66, 0, -332);

  // Radial Granite Plaza
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(10.5, 32),
    new THREE.MeshStandardMaterial({ map: createRadialGraniteTexture(), roughness: 0.85 })
  );
  plaza.rotation.x = -Math.PI * 0.5;
  plaza.position.y = 0.08;
  plaza.receiveShadow = true;
  cp1.add(plaza);

  // Granite Pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.75, 20), mats.limestoneDark);
  ped.position.y = 0.38;
  cp1.add(ped);

  // Henry Moore's Bronze Sculpture: Cathedral Column Base + Pierced Atomic Skull/Cloud Dome
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.1, 10), mats.bronzeMoore);
    col.position.set(Math.cos(a) * 0.85, 1.65, Math.sin(a) * 0.85);
    col.castShadow = true;
    cp1.add(col);
  }
  const skullDome = new THREE.Mesh(new THREE.SphereGeometry(1.75, 20, 16), mats.bronzeMoore);
  skullDome.scale.set(1.08, 0.92, 0.96);
  skullDome.position.y = 3.35;
  skullDome.castShadow = true;
  cp1.add(skullDome);

  // Historic Landmark Plaque Wall facing Ellis Ave
  const plaqueWall = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
  plaqueWall.scale.set(1.1, 2.4, 7.5);
  plaqueWall.position.set(-7.5, 1.2, 0);
  cp1.add(plaqueWall);

  registerHitTarget(cp1, 'nuclear_energy');
  root.add(cp1);

  // ============================================================================
  // 5. FREDERICK C. ROBIE HOUSE (Frank Lloyd Wright, 1910 — Prairie School Icon)
  // ============================================================================
  const robie = new THREE.Group();
  robie.position.set(292, 0, -32);

  // Long Sweeping Roman-Brick Garden & Terrace Walls (Extreme Horizontality!)
  const prowWall = new THREE.Mesh(UNIT_BOX, mats.prairieBrick);
  prowWall.scale.set(48, 2.2, 13);
  prowWall.position.set(0, 1.1, 2);
  prowWall.castShadow = true;
  prowWall.receiveShadow = true;
  robie.add(prowWall);

  // Limestone coping band on garden wall
  const coping1 = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  coping1.scale.set(48.6, 0.35, 13.5);
  coping1.position.set(0, 2.3, 2);
  robie.add(coping1);

  // Second floor living/dining Prairie vessel + ribbon art-glass windows
  const vessel2 = new THREE.Mesh(UNIT_BOX, mats.prairieBrick);
  vessel2.scale.set(34, 3.4, 9.5);
  vessel2.position.set(-2, 4.0, 1.5);
  vessel2.castShadow = true;
  robie.add(vessel2);

  const ribbonGlass = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
  ribbonGlass.scale.set(30, 1.35, 9.8);
  ribbonGlass.position.set(-2, 4.5, 1.5);
  robie.add(ribbonGlass);

  // Dramatic Cantilevered Low-Hipped Main Prairie Roof (extending 6m unsupported West & East!)
  const mainCantilever = new THREE.Mesh(new THREE.ConeGeometry(1, 1.85, 4), mats.slateRoof);
  mainCantilever.rotation.y = Math.PI * 0.25;
  mainCantilever.scale.set(33, 1, 9.2);
  mainCantilever.position.set(-2, 6.5, 1.5);
  mainCantilever.castShadow = true;
  robie.add(mainCantilever);

  // Third-floor Belvedere Bedroom Mass + Upper Cantilevered Roof + Central Brick Chimney
  const belvedere = new THREE.Mesh(UNIT_BOX, mats.prairieBrick);
  belvedere.scale.set(16, 3.0, 14);
  belvedere.position.set(6, 7.0, -2.5);
  robie.add(belvedere);

  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.6, 4), mats.slateRoof);
  upperRoof.rotation.y = Math.PI * 0.25;
  upperRoof.scale.set(15, 1, 13);
  upperRoof.position.set(6, 9.2, -2.5);
  upperRoof.castShadow = true;
  robie.add(upperRoof);

  const chimney = new THREE.Mesh(UNIT_BOX, mats.prairieBrick);
  chimney.scale.set(3.4, 11.8, 2.4);
  chimney.position.set(1, 5.9, 0.5);
  robie.add(chimney);

  registerHitTarget(robie, 'robie_house');
  root.add(robie);

  // ============================================================================
  // 6. BOOTH SCHOOL OF BUSINESS — CHARLES M. HARPER CENTER (Rafael Viñoly)
  // ============================================================================
  const booth = new THREE.Group();
  booth.position.set(318, 0, 48);

  // Four horizontal limestone perimeter wings respecting Robie House's datum
  for (const [w, h, d, bx, bz] of [
    [76, 20, 18, 0, -24],
    [76, 20, 18, 0, 24],
    [18, 20, 56, -29, 0],
    [18, 20, 56, 29, 0]
  ]) {
    const wing = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.warmModernFacade, Math.max(w, d), h));
    wing.scale.set(w, h, d);
    wing.position.set(bx, h * 0.5, bz);
    wing.castShadow = true;
    wing.receiveShadow = true;
    booth.add(wing);

    // Cantilevered horizontal limestone sun-canopy roof
    const eave = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    eave.scale.set(w + 3.5, 0.8, d + 3.5);
    eave.position.set(bx, h + 0.4, bz);
    booth.add(eave);
  }

  // Soaring 6-story Curved-Steel Gothic-Arch Winter Garden Glass Atrium in center!
  const atriumGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 23, 28, 16, 1, false, 0, Math.PI),
    mats.mansuetoDomeGlass
  );
  atriumGlass.rotation.z = Math.PI * 0.5;
  atriumGlass.rotation.y = Math.PI * 0.5;
  atriumGlass.scale.set(1.45, 1.0, 1.25);
  atriumGlass.position.set(-6, 11, 0);
  booth.add(atriumGlass);

  // Structural tubular steel Gothic arches inside Winter Garden
  for (let z = -15; z <= 15; z += 7.5) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(15, 0.35, 8, 24, Math.PI),
      mats.limestoneTrim
    );
    arch.position.set(-6, 12, z);
    booth.add(arch);
  }

  registerHitTarget(booth, 'booth_harper');
  root.add(booth);

  // ============================================================================
  // 7. EAST CAMPUS: SAIEH HALL, ISAC (ORIENTAL INST.), QUAD CLUB, IDA NOYES, LAB, I-HOUSE
  // ============================================================================
  // Saieh Hall for Economics (Red-Brick Collegiate Gothic + Soaring White Lawson Spire!)
  const saieh = new THREE.Group();
  saieh.position.set(194, 0, -82);

  for (const [w, d, bx, bz] of [
    [68, 15, 0, -18],
    [68, 15, 0, 18],
    [15, 42, -26.5, 0],
    [15, 42, 26.5, 0]
  ]) {
    const wing = createGothicHall(mats, { w, d, h: 16.5, roofH: 6.5, brick: true });
    wing.position.set(bx, 0, bz);
    saieh.add(wing);
  }

  const lawsonTower = createGothicTower(mats, {
    w: 11.5,
    d: 11.5,
    h: 34,
    brick: true,
    pinnacleH: 5.5,
    copperSpireH: 15
  });
  lawsonTower.position.set(0, 0, 18);
  saieh.add(lawsonTower);

  registerHitTarget(saieh, 'saieh_hall');
  root.add(saieh);

  // Institute for the Study of Ancient Cultures (ISAC / Oriental Institute)
  const isac = new THREE.Group();
  isac.position.set(176, 0, 22);
  const isacMain = createGothicHall(mats, {
    w: 48,
    d: 16,
    h: 15.5,
    roofH: 4.5,
    dormers: false,
    crenellated: true
  });
  isacMain.position.set(0, 0, -12);
  isac.add(isacMain);
  for (const sx of [-18, 18]) {
    const wng = createGothicHall(mats, { w: 14, d: 28, h: 14.5, roofH: 4.2, dormers: false });
    wng.position.set(sx, 0, 6);
    isac.add(wng);
  }
  registerHitTarget(isac, 'isac_oi');
  root.add(isac);

  // Quadrangle Club (Red-Brick Faculty Club + Clay Tennis Courts at 57th & University)
  const quadClub = new THREE.Group();
  quadClub.position.set(176, 0, -192);
  const qcBldg = createGothicHall(mats, { w: 36, d: 18, h: 13.5, roofH: 6.2, brick: true });
  qcBldg.position.set(-8, 0, -6);
  quadClub.add(qcBldg);
  // Green/Blue Tennis Courts beside Quad Club
  const courts = new THREE.Mesh(
    UNIT_BOX,
    new THREE.MeshStandardMaterial({ color: '#2e6b54', roughness: 0.8 })
  );
  courts.scale.set(34, 0.2, 26);
  courts.position.set(32, 0.1, 0);
  quadClub.add(courts);
  registerHitTarget(quadClub, 'quad_club');
  root.add(quadClub);

  // Ida Noyes Hall (1212 E 59th St facing Midway)
  const idaNoyes = new THREE.Group();
  idaNoyes.position.set(318, 0, 174);
  const idaMain = createGothicHall(mats, {
    w: 66,
    d: 18,
    h: 17,
    roofH: 7.4,
    crenellated: true
  });
  idaNoyes.add(idaMain);
  registerHitTarget(idaNoyes, 'ida_noyes');
  root.add(idaNoyes);

  // University of Chicago Laboratory Schools (Blaine Hall, Judd, Belfield, Gordon Parks Arts Hall)
  const labSchools = new THREE.Group();
  labSchools.position.set(442, 0, 115);

  const blaine = createGothicHall(mats, { w: 84, d: 17, h: 17, roofH: 7.2 });
  blaine.position.set(0, 0, 62);
  labSchools.add(blaine);

  const blaineTower = createGothicTower(mats, { w: 10.5, d: 10.5, h: 29, pinnacleH: 4.5 });
  blaineTower.position.set(0, 0, 64);
  labSchools.add(blaineTower);

  for (const [bx, bz] of [[-34, 18], [34, 18], [-34, -28]]) {
    const hall = createGothicHall(mats, { w: 18, d: 44, h: 16, roofH: 6.0 });
    hall.position.set(bx, 0, bz);
    labSchools.add(hall);
  }

  // Gordon Parks Arts Hall (Dark textured masonry & bronze contemporary wing)
  const gpArts = new THREE.Mesh(
    UNIT_BOX,
    mats.tiledFacade(mats.saarinenPleatedGlass, 48, 19)
  );
  gpArts.scale.set(46, 19, 36);
  gpArts.position.set(22, 9.5, -28);
  gpArts.castShadow = true;
  labSchools.add(gpArts);

  registerHitTarget(labSchools, 'lab_schools');
  root.add(labSchools);

  // International House (1414 E 59th St — 12-story Art-Deco Gothic Limestone Tower)
  const iHouse = new THREE.Group();
  iHouse.position.set(552, 0, 162);

  const ihBase = createGothicHall(mats, {
    w: 72,
    d: 20,
    h: 28,
    roofH: 5.5,
    dormers: false,
    crenellated: true
  });
  iHouse.add(ihBase);

  const ihTower = createGothicTower(mats, { w: 18, d: 18, h: 45, pinnacleH: 5.0 });
  ihTower.position.set(0, 0, -2);
  iHouse.add(ihTower);

  registerHitTarget(iHouse, 'i_house');
  root.add(iHouse);

  // ============================================================================
  // 8. NORTH CAMPUS: RATNER ATHLETICS, CAMPUS NORTH, MAX PALEVSKY, SMART MUSEUM
  // ============================================================================
  // Gerald Ratner Athletics Center (César Pelli — 5 Tilted Masts + Cable-Stayed Roofs!)
  const ratner = new THREE.Group();
  ratner.position.set(-108, 0, -515);

  const ratnerGlassBox = new THREE.Mesh(
    UNIT_BOX,
    mats.tiledFacade(mats.curtainGlass, 82, 14)
  );
  ratnerGlassBox.scale.set(84, 13, 56);
  ratnerGlassBox.position.y = 6.5;
  ratnerGlassBox.castShadow = true;
  ratnerGlassBox.receiveShadow = true;
  ratner.add(ratnerGlassBox);

  // Undulating S-curved silver roof shells
  for (let i = -1; i <= 1; i++) {
    const archShell = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 86, 20, 1, false, -0.55, 1.1),
      new THREE.MeshStandardMaterial({ color: '#d7dee6', roughness: 0.35, metalness: 0.65 })
    );
    archShell.rotation.z = Math.PI * 0.5;
    archShell.scale.set(0.65, 1, 1);
    archShell.position.set(0, 5.2 + (i === 0 ? 2.2 : 0), i * 16);
    archShell.castShadow = true;
    ratner.add(archShell);
  }

  // 5 Iconic Tilted Tapered Masts + Suspension Tension Cables!
  const cableMat = new THREE.LineBasicMaterial({ color: '#cfd6de' });
  for (let m = 0; m < 5; m++) {
    const mx = -30 + m * 15;
    const mz = -24;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.72, 34, 10),
      mats.mastYellowSteel
    );
    mast.position.set(mx, 16.5, mz);
    mast.rotation.x = -0.22; // Signature Pelli outward tilt!
    mast.castShadow = true;
    ratner.add(mast);

    const mastTop = new THREE.Vector3(mx, 32.8, mz - 3.6);
    for (const targetZ of [-12, 4, 20, -34]) {
      const targetY = targetZ === -34 ? 0.5 : 14.5;
      const pts = [mastTop, new THREE.Vector3(mx, targetY, targetZ)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      ratner.add(new THREE.Line(lineGeo, cableMat));
    }
  }

  registerHitTarget(ratner, 'ratner');
  root.add(ratner);

  // Campus North Residential Commons (Studio Gang — 15-story Precast Fin Tower + Curved Wings)
  const campusNorth = new THREE.Group();
  campusNorth.position.set(96, 0, -558);

  const cnWings = [
    // [w, h, d, x, z, rotY]
    [22, 52, 38, -24, -14, 0.18], // 15-story Main Tower
    [19, 36, 42, 8, -18, -0.14],  // 11-story Central Wing
    [18, 22, 44, 34, -8, -0.32],  // 5-story East Wing
    [38, 10, 18, -12, 24, 0.08]   // Baker Dining Commons Glass Pavilion
  ];
  for (const [w, h, d, bx, bz, ry] of cnWings) {
    const m = new THREE.Mesh(
      UNIT_BOX,
      mats.tiledFacade(mats.warmModernFacade, Math.max(w, d), h, 14, 12)
    );
    m.scale.set(w, h, d);
    m.position.set(bx, h * 0.5, bz);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    campusNorth.add(m);

    // Studio Gang angled white precast fins
    const finCap = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    finCap.scale.set(w + 0.8, 1.1, d + 0.8);
    finCap.position.set(bx, h + 0.3, bz);
    finCap.rotation.y = ry;
    campusNorth.add(finCap);
  }
  registerHitTarget(campusNorth, 'campus_north');
  root.add(campusNorth);

  // Max Palevsky Residential Commons (Ricardo Legorreta Warm Ochre/Terracotta) & Gothic Bartlett
  const maxP = new THREE.Group();
  maxP.position.set(82, 0, -402);

  for (const [w, h, d, bx, bz, isGold] of [
    [36, 16, 16, -28, -16, false],
    [32, 18, 16, 16, -16, true],
    [16, 17, 36, 34, 8, false],
    [28, 15, 15, -24, 14, true]
  ]) {
    const block = new THREE.Mesh(UNIT_BOX, isGold ? mats.legorretaGold : mats.legorretaOchre);
    block.scale.set(w, h, d);
    block.position.set(bx, h * 0.5, bz);
    block.castShadow = true;
    block.receiveShadow = true;
    maxP.add(block);
  }

  // Bartlett Dining Commons (Gothic limestone hall at 57th & University edge of Bartlett Quad)
  const bartlett = createGothicHall(mats, { w: 20, d: 38, h: 16.5, roofH: 6.8, crenellated: true });
  bartlett.position.set(28, 0, 52);
  maxP.add(bartlett);

  registerHitTarget(maxP, 'max_palevsky');
  root.add(maxP);

  // Smart Museum of Art & Cochrane-Woods Art Center
  const smart = new THREE.Group();
  smart.position.set(12, 0, -498);
  for (const [w, h, d, bx, bz] of [
    [46, 10.5, 16, 0, -18],
    [16, 10.5, 38, -22, 4],
    [38, 10.5, 15, 8, 18]
  ]) {
    const b = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    b.scale.set(w, h, d);
    b.position.set(bx, h * 0.5, bz);
    b.castShadow = true;
    b.receiveShadow = true;
    smart.add(b);
  }
  // Sculpture in Smart Museum courtyard
  const artPiece = new THREE.Mesh(new THREE.TorusKnotGeometry(2.2, 0.55, 48, 10), mats.bronzeMoore);
  artPiece.position.set(2, 3.2, 0);
  smart.add(artPiece);
  registerHitTarget(smart, 'smart_museum');
  root.add(smart);

  // ============================================================================
  // 9. SOUTH CAMPUS (Across the Midway Plaisance along E 60th St)
  // ============================================================================
  // Laird Bell Law Quadrangle — Eero Saarinen Pleated Curtain Wall + Reflecting Fountain Pool!
  const law = new THREE.Group();
  law.position.set(128, 0, 495);

  // Reflecting Pool facing E 60th St / Midway
  const poolRim = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  poolRim.scale.set(44, 0.7, 22);
  poolRim.position.set(0, 0.35, -36);
  law.add(poolRim);

  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(41, 19), mats.waterMat);
  poolWater.rotation.x = -Math.PI * 0.5;
  poolWater.position.set(0, 0.75, -36);
  law.add(poolWater);

  // Pevsner bronze abstract fountain sculpture in Law School reflecting pool
  const lawSculpture = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), mats.bronzeMoore);
  lawSculpture.scale.set(1.4, 1.8, 0.7);
  lawSculpture.position.set(-8, 2.6, -36);
  law.add(lawSculpture);

  // Saarinen's D'Angelo Law Library Tower with Accordion-Pleated Faceted Glass!
  const lawTower = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.saarinenPleatedGlass, 42, 29));
  lawTower.scale.set(40, 29, 24);
  lawTower.position.set(0, 14.5, 0);
  lawTower.castShadow = true;
  law.add(lawTower);

  // Pleated triangular glass prism fins along North & South faces of Saarinen tower
  for (let px = -16; px <= 16; px += 4) {
    for (const pz of [-12.2, 12.2]) {
      const prism = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 29, 3),
        mats.saarinenPleatedGlass
      );
      prism.position.set(px, 14.5, pz);
      law.add(prism);
    }
  }

  // Low Limestone Classroom & Courtroom Rotunda Wings
  const lawWest = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  lawWest.scale.set(22, 10, 46);
  lawWest.position.set(-30, 5, 6);
  lawWest.castShadow = true;
  law.add(lawWest);

  const lawEast = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  lawEast.scale.set(24, 9.5, 32);
  lawEast.position.set(29, 4.75, -8);
  lawEast.castShadow = true;
  law.add(lawEast);

  registerHitTarget(law, 'law_school');
  root.add(law);

  // Crown Family School (SSA — Ludwig Mies van der Rohe Black Steel & Glass Pavilion!)
  const mies = new THREE.Group();
  mies.position.set(-138, 0, 468);

  const podium = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  podium.scale.set(52, 1.4, 38);
  podium.position.y = 0.7;
  podium.receiveShadow = true;
  mies.add(podium);

  const glassCore = new THREE.Mesh(UNIT_BOX, mats.saarinenPleatedGlass);
  glassCore.scale.set(44, 8.2, 30);
  glassCore.position.y = 5.5;
  glassCore.castShadow = true;
  mies.add(glassCore);

  // Signature Mies van der Rohe Flat Fascia Roof & Perimeter Black I-Beam Columns
  const miesRoof = new THREE.Mesh(UNIT_BOX, mats.miesSteel);
  miesRoof.scale.set(48, 1.3, 34);
  miesRoof.position.y = 10.2;
  miesRoof.castShadow = true;
  mies.add(miesRoof);

  for (let cx = -22; cx <= 22; cx += 8.8) {
    for (const cz of [-16.2, 16.2]) {
      const col = new THREE.Mesh(UNIT_BOX, mats.miesSteel);
      col.scale.set(0.65, 9.2, 0.65);
      col.position.set(cx, 5.4, cz);
      mies.add(col);
    }
  }

  registerHitTarget(mies, 'crown_ssa');
  root.add(mies);

  // Burton–Judson Courts ("BJ" — Castle-Like Double-Courtyard Gothic Dorms)
  const bj = new THREE.Group();
  bj.position.set(-24, 0, 482);

  for (const [w, d, bx, bz] of [
    [88, 15, 0, -24],
    [88, 15, 0, 24],
    [15, 58, -36.5, 0],
    [15, 58, 0, 0],
    [15, 58, 36.5, 0]
  ]) {
    const wng = createGothicHall(mats, { w, d, h: 16.5, roofH: 6.8 });
    wng.position.set(bx, 0, bz);
    bj.add(wng);
  }
  const bjTower = createGothicTower(mats, { w: 11.5, d: 11.5, h: 31, pinnacleH: 4.8 });
  bjTower.position.set(-14, 0, -24);
  bj.add(bjTower);

  registerHitTarget(bj, 'burton_judson');
  root.add(bj);

  // Reva and David Logan Center for the Arts (11-Story Limestone Tower + Sawtooth Podium)
  const logan = new THREE.Group();
  logan.position.set(-218, 0, 495);

  const loganPodium = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  loganPodium.scale.set(68, 11, 56);
  loganPodium.position.set(0, 5.5, 4);
  loganPodium.castShadow = true;
  logan.add(loganPodium);

  // North-facing studio skylights on podium
  for (let sz = -16; sz <= 20; sz += 12) {
    const tooth = new THREE.Mesh(UNIT_BOX, mats.curtainGlass);
    tooth.scale.set(58, 3.6, 5);
    tooth.position.set(0, 12.2, sz);
    tooth.rotation.x = -0.35;
    logan.add(tooth);
  }

  const loganTower = new THREE.Mesh(
    UNIT_BOX,
    mats.tiledFacade(mats.regensteinLimestone, 24, 52, 16, 16)
  );
  loganTower.scale.set(22, 52, 20);
  loganTower.position.set(18, 26, -16);
  loganTower.castShadow = true;
  logan.add(loganTower);

  // Top-floor panoramic performance gallery glass band
  const loganTopGlass = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
  loganTopGlass.scale.set(22.4, 5.5, 20.4);
  loganTopGlass.position.set(18, 48, -16);
  logan.add(loganTopGlass);

  registerHitTarget(logan, 'logan_center');
  root.add(logan);

  // David Rubenstein Forum (Diller Scofidio + Renfro — Stacked Cantilevered Tower at 60th & Woodlawn!)
  const rubenstein = new THREE.Group();
  rubenstein.position.set(262, 0, 472);

  const forumStacks = [
    // [w, h, d, x, y, z] — Dramatic DS+R offset cantilevers!
    [38, 11, 44, 0, 5.5, 0],
    [28, 10, 32, -5, 16, -4],
    [30, 10, 26, 6, 26, -6],
    [24, 10, 28, -4, 36, 3],
    [26, 9, 22, 4, 45.5, -5]
  ];
  for (const [w, h, d, sx, sy, sz] of forumStacks) {
    const blk = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, w, h, 14, 10));
    blk.scale.set(w, h, d);
    blk.position.set(sx, sy, sz);
    blk.castShadow = true;
    blk.receiveShadow = true;
    rubenstein.add(blk);
  }
  registerHitTarget(rubenstein, 'rubenstein_forum');
  root.add(rubenstein);

  // South Residential Commons (Cathey Dining & Renee Granville-Grossman)
  const southCommons = new THREE.Group();
  southCommons.position.set(-68, 0, 568);
  for (const [w, h, d, bx, bz] of [
    [52, 18, 16, -26, -14],
    [52, 18, 16, 32, -14],
    [18, 20, 44, -44, 8],
    [18, 20, 44, 48, 8],
    [26, 13, 22, 4, 4] // Cathey Dining Commons central pavilion
  ]) {
    const b = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.warmModernFacade, w, h));
    b.scale.set(w, h, d);
    b.position.set(bx, h * 0.5, bz);
    b.castShadow = true;
    southCommons.add(b);
  }
  registerHitTarget(southCommons, 'south_commons');
  root.add(southCommons);

  // Woodlawn Residential Commons & Harris School Keller Center
  const woodlawnKeller = new THREE.Group();
  woodlawnKeller.position.set(358, 0, 515);

  // Keller Center (1307 E 60th — Mid-century colonnade overhang + sunlit rooftop atrium)
  const keller = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.warmModernFacade, 56, 18));
  keller.scale.set(56, 17, 42);
  keller.position.set(26, 8.5, -36);
  keller.castShadow = true;
  woodlawnKeller.add(keller);
  const kellerRoof = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  kellerRoof.scale.set(62, 1.4, 48);
  kellerRoof.position.set(26, 17.6, -36);
  woodlawnKeller.add(kellerRoof);

  // Woodlawn Residential Commons wings along 61st
  for (const [w, h, d, bx, bz] of [
    [68, 26, 18, -82, 42],
    [18, 28, 52, -108, 24],
    [54, 24, 18, -18, 42]
  ]) {
    const wr = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.warmModernFacade, w, h));
    wr.scale.set(w, h, d);
    wr.position.set(bx, h * 0.5, bz);
    wr.castShadow = true;
    woodlawnKeller.add(wr);
  }
  registerHitTarget(woodlawnKeller, 'woodlawn_keller');
  root.add(woodlawnKeller);

  // ============================================================================
  // 10. WEST CAMPUS — SCIENCE QUADRANGLE & UCHICAGO MEDICINE
  // ============================================================================
  // William Eckhardt Research Center (PME — 5640 S Ellis)
  const erc = new THREE.Group();
  erc.position.set(-52, 0, -392);
  const ercBase = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  ercBase.scale.set(54, 12, 42);
  ercBase.position.y = 6;
  ercBase.castShadow = true;
  erc.add(ercBase);
  const ercUpper = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, 52, 18));
  ercUpper.scale.set(50, 17, 36);
  ercUpper.position.set(2, 20.5, 0);
  ercUpper.castShadow = true;
  erc.add(ercUpper);
  registerHitTarget(erc, 'eckhardt_erc');
  root.add(erc);

  // John Crerar Library (CS & Data Science — 5730 S Ellis)
  const crerar = new THREE.Group();
  crerar.position.set(-142, 0, -92);
  const crerarBody = new THREE.Mesh(
    UNIT_BOX,
    mats.tiledFacade(mats.regensteinLimestone, 68, 19)
  );
  crerarBody.scale.set(44, 19, 68);
  crerarBody.position.y = 9.5;
  crerarBody.castShadow = true;
  crerarBody.receiveShadow = true;
  crerar.add(crerarBody);
  registerHitTarget(crerar, 'crerar');
  root.add(crerar);

  // Kersten Physics Teaching Center, Hinds Geophysical & Cummings 12-story Tower
  const kersten = new THREE.Group();
  kersten.position.set(-126, 0, -196);

  const kerstenBldg = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.redBrickGothic, 44, 16));
  kerstenBldg.scale.set(44, 16, 26);
  kerstenBldg.position.set(12, 8, 6);
  kerstenBldg.castShadow = true;
  kersten.add(kerstenBldg);

  const hindsBldg = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.regensteinLimestone, 38, 22));
  hindsBldg.scale.set(36, 22, 24);
  hindsBldg.position.set(16, 11, 42);
  hindsBldg.castShadow = true;
  kersten.add(hindsBldg);

  // Cummings Life Science Center (Iconic 11-story slotted limestone tower at 58th & Drexel/Ingleside!)
  const cummings = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.regensteinLimestone, 32, 46));
  cummings.scale.set(30, 46, 30);
  cummings.position.set(-76, 23, 72);
  cummings.castShadow = true;
  kersten.add(cummings);

  registerHitTarget(kersten, 'kersten_hinds');
  root.add(kersten);

  // Gordon Center for Integrative Science (GCIS) & Knapp Biomedical (KCBD)
  const gcis = new THREE.Group();
  gcis.position.set(-215, 0, -295);

  const gcisMain = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, 82, 26));
  gcisMain.scale.set(78, 26, 42);
  gcisMain.position.set(18, 13, 18);
  gcisMain.castShadow = true;
  gcis.add(gcisMain);

  const kcbd = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, 64, 44));
  kcbd.scale.set(38, 44, 62);
  kcbd.position.set(-34, 22, -26);
  kcbd.castShadow = true;
  gcis.add(kcbd);

  registerHitTarget(gcis, 'gcis_kcbd');
  root.add(gcis);

  // Center for Care and Discovery (CCD — Rafael Viñoly 10-Story Sky Hospital!)
  const ccd = new THREE.Group();
  ccd.position.set(-328, 0, -155);

  const ccdPodium = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  ccdPodium.scale.set(112, 16, 62);
  ccdPodium.position.y = 8;
  ccdPodium.castShadow = true;
  ccd.add(ccdPodium);

  // Recessed glowing 7th-floor Sky Lobby!
  const skyLobby = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
  skyLobby.scale.set(104, 6, 54);
  skyLobby.position.y = 19;
  ccd.add(skyLobby);

  const ccdUpper = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, 110, 34));
  ccdUpper.scale.set(110, 34, 60);
  ccdUpper.position.y = 39;
  ccdUpper.castShadow = true;
  ccd.add(ccdUpper);

  registerHitTarget(ccd, 'ccd_hospital');
  root.add(ccd);

  // Duchossois Center (DCAM) & Comer Children's Hospital
  const dcam = new THREE.Group();
  dcam.position.set(-328, 0, -8);

  const dcamMain = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.warmModernFacade, 86, 30));
  dcamMain.scale.set(86, 30, 56);
  dcamMain.position.set(0, 15, 16);
  dcamMain.castShadow = true;
  dcam.add(dcamMain);

  const comer = new THREE.Mesh(UNIT_BOX, mats.tiledFacade(mats.curtainGlass, 68, 26));
  comer.scale.set(68, 26, 44);
  comer.position.set(12, 13, -58);
  comer.castShadow = true;
  dcam.add(comer);

  registerHitTarget(dcam, 'dcam_comer');
  root.add(dcam);

  // Billings Hospital, Mitchell & Chicago Lying-In Hospital (Monumental 210m Gothic Medical Row on 59th!)
  const billings = new THREE.Group();
  billings.position.set(-235, 0, 165);

  const billingsSpine = createGothicHall(mats, {
    w: 196,
    d: 20,
    h: 22,
    roofH: 7.5,
    crenellated: true
  });
  billingsSpine.position.set(0, 0, 14);
  billings.add(billingsSpine);

  for (const tx of [-68, 0, 68]) {
    const medTower = createGothicTower(mats, { w: 13, d: 13, h: 36, pinnacleH: 5.2 });
    medTower.position.set(tx, 0, 16);
    billings.add(medTower);

    const pav = createGothicHall(mats, { w: 18, d: 46, h: 20, roofH: 6.2 });
    pav.position.set(tx, 0, -14);
    billings.add(pav);
  }

  registerHitTarget(billings, 'billings_hospital');
  root.add(billings);

  // ============================================================================
  // 11. HYDE PARK NEIGHBORHOOD CONTEXT ROWHOUSES & APARTMENTS (55th–57th East & South)
  // ============================================================================
  const contextGroup = new THREE.Group();
  const hydeParkBlocks = [
    // Historic Woodlawn / Kimbark / Kenwood brick mansions & 3-flats North of 58th
    [292, -195, 22, 13, 18, true],
    [292, -155, 20, 12, 18, false],
    [292, -115, 22, 13, 18, true],
    [345, -195, 22, 13, 18, false],
    [345, -150, 24, 14, 18, true],
    [345, -105, 22, 12, 18, true],
    [422, -190, 32, 15, 22, true],
    [422, -130, 30, 14, 22, false],
    [422, -70, 32, 15, 22, true],
    [505, -185, 34, 16, 22, true],
    [505, -115, 34, 15, 22, false],
    [505, -45, 36, 16, 22, true],
    // North of 57th East of University (Hyde Park apartments & Seminary row)
    [195, -310, 48, 17, 22, true],
    [195, -390, 46, 18, 22, false],
    [315, -305, 52, 16, 24, true],
    [315, -385, 48, 17, 22, true],
    [425, -315, 46, 16, 22, false],
    [295, -525, 58, 20, 24, true],
    [420, -525, 54, 18, 24, false],
    // Campus Bookstore & Press on Ellis / 58th / 60th
    [-112, 32, 28, 15, 32, true],
    [505, 485, 48, 17, 26, true],
    [-325, 485, 54, 18, 28, false]
  ];

  for (const [x, z, w, h, d, isRed] of hydeParkBlocks) {
    const mat = mats.tiledFacade(isRed ? mats.redBrickGothic : mats.gothicFacade, w, h);
    const m = new THREE.Mesh(UNIT_BOX, mat);
    m.scale.set(w, h, d);
    m.position.set(x, h * 0.5, z);
    m.castShadow = true;
    m.receiveShadow = true;
    contextGroup.add(m);

    const cap = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    cap.scale.set(w + 0.6, 0.7, d + 0.6);
    cap.position.set(x, h + 0.25, z);
    contextGroup.add(cap);
  }
  root.add(contextGroup);

  scene.add(root);
  return root;
}
