import * as THREE from 'three';

function tagAthletic(root, id) {
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
 * 1. NOTRE DAME STADIUM ("THE HOUSE THAT ROCKNE BUILT" + CAMPUS CROSSROADS)
 * Coordinates: (422, 525)
 * Features:
 * - Full interior bowl with Navy & Gold tiered stands
 * - Authentic FieldTurf with 50-yard ND monogram & 42° diagonal endzone lines
 * - Gold Goalposts at North & South end zones
 * - Classic brick arch concourse + 2017 Campus Crossroads (Duncan West, Corbett East, O'Neill South)
 * - Giant South End Zone Video Board & North End Zone view open toward Touchdown Jesus!
 * - Knute Rockne Statue outside North Gate + Game-Day Floodlights!
 */
function buildNotreDameStadium(materials) {
  const root = new THREE.Group();
  root.position.set(422, 0, 525);

  // 1. Playing Field (FieldTurf) slightly recessed at y = 0.35
  const fieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(82, 136), materials.stadiumTurf);
  fieldMesh.rotation.x = -Math.PI / 2;
  fieldMesh.position.y = 0.38;
  root.add(fieldMesh);

  // Gold Football Goalposts at North (-56) and South (+56) End Zones!
  for (const gz of [-57, 57]) {
    const gp = new THREE.Group();
    gp.position.set(0, 0.4, gz);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.4, 8), materials.goldenDome);
    stem.position.y = 1.7;
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.7, 8), materials.goldenDome);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.y = 3.4;
    const upL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 9.2, 8), materials.goldenDome);
    upL.position.set(-2.8, 8.0, 0);
    const upR = upL.clone();
    upR.position.x = 2.8;
    gp.add(stem, crossbar, upL, upR);
    root.add(gp);
  }

  // 2. Oval Tiered Seating Bowl (Lower & Upper Decks in Notre Dame Navy & Gold)
  const tiers = 7;
  for (let t = 0; t < tiers; t++) {
    const innerRx = 52 + t * 5.6;
    const outerRx = innerRx + 5.8;
    const yH = 3.2 + t * 3.4;

    const ringShape = new THREE.Shape();
    ringShape.absellipse(0, 0, outerRx, outerRx * 1.24, 0, Math.PI * 2, false, 0);
    const holePath = new THREE.Path();
    holePath.absellipse(0, 0, innerRx, innerRx * 1.24, 0, Math.PI * 2, true, 0);
    ringShape.holes.push(holePath);

    const extrudeGeo = new THREE.ExtrudeGeometry(ringShape, {
      depth: 3.3,
      bevelEnabled: false,
      curveSegments: 36,
    });
    extrudeGeo.rotateX(-Math.PI / 2);

    const seatMat = t % 3 === 1 ? materials.stadiumSeatsGold : materials.stadiumSeatsNavy;
    const tierMesh = new THREE.Mesh(extrudeGeo, seatMat);
    tierMesh.position.y = yH - 3.0;
    root.add(tierMesh);
  }

  // 3. Historic Knute Rockne Buff/Warm Brick Outer Stadium Arcade Wall
  const outerWallShape = new THREE.Shape();
  outerWallShape.absellipse(0, 0, 92, 114, 0, Math.PI * 2, false, 0);
  const outerHole = new THREE.Path();
  outerHole.absellipse(0, 0, 86, 107, 0, Math.PI * 2, true, 0);
  outerWallShape.holes.push(outerHole);

  const wallGeo = new THREE.ExtrudeGeometry(outerWallShape, {
    depth: 26,
    bevelEnabled: false,
    curveSegments: 44,
  });
  wallGeo.rotateX(-Math.PI / 2);
  const outerWall = new THREE.Mesh(wallGeo, materials.ndWarmGothicBrick);
  root.add(outerWall);

  // Limestone Stadium Rim Coping
  const rimGeo = new THREE.TorusGeometry(90, 1.8, 8, 48);
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.scale(1, 1, 1.24);
  const rimMesh = new THREE.Mesh(rimGeo, materials.limestone);
  rimMesh.position.y = 26.2;
  root.add(rimMesh);

  // 4. CAMPUS CROSSROADS PAVILIONS (2017 $400M Addition)
  // West: Duncan Student Center + Press Box
  const duncanWest = new THREE.Mesh(new THREE.BoxGeometry(24, 38, 126), materials.ndBuffBrick);
  duncanWest.position.set(-96, 19, 0);
  root.add(duncanWest);
  const duncanGlass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 10, 96), materials.glassGreenhouse);
  duncanGlass.position.set(-84, 33, 0);
  root.add(duncanGlass);

  // East: Corbett Family Hall
  const corbettEast = new THREE.Mesh(new THREE.BoxGeometry(24, 38, 126), materials.ndBuffBrick);
  corbettEast.position.set(96, 19, 0);
  root.add(corbettEast);
  const corbettGlass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 10, 96), materials.glassGreenhouse);
  corbettGlass.position.set(84, 33, 0);
  root.add(corbettGlass);

  // South: O'Neill Hall of Music & Giant Video Scoreboard facing North!
  const oneillSouth = new THREE.Mesh(new THREE.BoxGeometry(84, 31, 22), materials.ndBuffBrick);
  oneillSouth.position.set(0, 15.5, 115);
  root.add(oneillSouth);

  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(48, 18.5, 3.2), materials.limestone);
  boardFrame.position.set(0, 35.5, 102);
  root.add(boardFrame);

  const videoScreen = new THREE.Mesh(new THREE.PlaneGeometry(44, 15.5), materials.jumbotron);
  videoScreen.rotation.y = Math.PI; // Faces North across the bowl!
  videoScreen.position.set(0, 35.5, 100.3);
  root.add(videoScreen);

  // 5. Knute Rockne Bronze Statue outside North Gate (-Z facing Touchdown Jesus Plaza!)
  const rocknePed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.4), materials.limestone);
  rocknePed.position.set(0, 1.2, -124);
  root.add(rocknePed);
  const rockneFig = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 2.8, 10), materials.bronzeStatue);
  rockneFig.position.set(0, 3.8, -124);
  root.add(rockneFig);

  // 6. Four Stadium Floodlight Banks + Real Dynamic PointLight for Game Day / Night!
  const floodBankMat = new THREE.MeshBasicMaterial({ color: '#fffbe6' });
  const floodMeshes = [];
  for (const fx of [-86, 86]) {
    for (const fz of [-62, 62]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 14, 8), materials.limestone);
      mast.position.set(fx, 44, fz);
      root.add(mast);

      root.updateMatrixWorld(true);
      const rack = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.8, 1.4), floodBankMat);
      rack.position.set(fx, 51.5, fz);
      root.add(rack);
      rack.lookAt(422, 4, 525);
      floodMeshes.push(rack);
    }
  }

  const stadiumBowlLight = new THREE.PointLight('#fff6df', 0, 290, 1.35);
  stadiumBowlLight.position.set(0, 58, 0);
  root.add(stadiumBowlLight);

  tagAthletic(root, 'notre-dame-stadium');
  return { root, stadiumBowlLight, floodBankMat };
}

/**
 * 2. EDMUND P. JOYCE CENTER (PURCELL PAVILION) — Twin Ribbed Elliptical White Domes!
 * Coordinates: (636, 515)
 */
function buildJoyceCenter(materials) {
  const root = new THREE.Group();
  root.position.set(636, 0, 515);

  // Central Concourse & Brick Perimeter Plinth
  const concourse = new THREE.Mesh(new THREE.BoxGeometry(106, 9.5, 168), materials.ndBuffBrick);
  concourse.position.y = 4.75;
  root.add(concourse);

  // Twin Iconic White Thin-Shell Elliptical Domes (North Dome + South Purcell Pavilion Dome)
  for (const dz of [-42, 42]) {
    const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(45, 47, 4.5, 36), materials.limestone);
    domeDrum.scale.set(1.06, 1, 0.88);
    domeDrum.position.set(-4, 11.2, dz);
    root.add(domeDrum);

    const domeShell = new THREE.Mesh(
      new THREE.SphereGeometry(45, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.44),
      materials.whiteDomeShell
    );
    domeShell.scale.set(1.06, 0.48, 0.88);
    domeShell.position.set(-4, 12.6, dz);
    root.add(domeShell);

    // Structural radial arch ribs on each dome
    for (let r = 0; r < 6; r++) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(45.1, 0.35, 6, 32, Math.PI),
        materials.limestone
      );
      rib.scale.set(1.06, 0.48, 0.88);
      rib.rotation.y = (r / 6) * Math.PI;
      rib.position.set(-4, 12.6, dz);
      root.add(rib);
    }
  }

  // Rear East Addition: Rolfs Aquatic Center
  const aquatic = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 68), materials.ndWarmGothicBrick);
  aquatic.position.set(58, 6, 12);
  root.add(aquatic);

  tagAthletic(root, 'joyce-center');
  return root;
}

export function createAthleticLandmarks(scene, materials) {
  const group = new THREE.Group();
  group.name = 'AthleticLandmarks';

  const { root: stadium, stadiumBowlLight, floodBankMat } = buildNotreDameStadium(materials);
  const joyce = buildJoyceCenter(materials);
  group.add(stadium, joyce);
  scene.add(group);

  function updateLights(nightFactor, gameday) {
    const active = gameday || nightFactor > 0.42;
    stadiumBowlLight.intensity = active ? (gameday ? 220 : 120 * nightFactor) : 0;
    floodBankMat.color.setHex(active ? 0xfffbe6 : 0x8b939e);
  }

  return { group, updateLights };
}
