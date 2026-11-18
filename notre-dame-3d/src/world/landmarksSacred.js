import * as THREE from 'three';

function tagInteractive(root, buildingId) {
  root.userData.buildingId = buildingId;
  root.traverse((obj) => {
    obj.userData.buildingId = buildingId;
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

/**
 * 1. MAIN ADMINISTRATION BUILDING ("THE GOLDEN DOME" + OUR LADY STATUE)
 * Coordinates: (0, 0), Height: 57m (187 ft)
 */
function buildMainBuilding(materials) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);

  // Granite raised rusticated basement plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(78, 3.6, 32), materials.limestone);
  plinth.position.y = 1.8;
  root.add(plinth);

  const northPlinth = new THREE.Mesh(new THREE.BoxGeometry(30, 3.6, 26), materials.limestone);
  northPlinth.position.set(0, 1.8, -22);
  root.add(northPlinth);

  // Main 4-story Second Empire Buff-Brick Core + East/West End Pavilions + North Wing
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(74, 18.5, 26), materials.ndBuffBrick);
  mainBody.position.y = 3.6 + 9.25;
  root.add(mainBody);

  // Projecting East & West Corner Pavilions
  for (const sx of [-31, 31]) {
    const pav = new THREE.Mesh(new THREE.BoxGeometry(15, 20.5, 30), materials.ndBuffBrick);
    pav.position.set(sx, 3.6 + 10.25, 0);
    root.add(pav);

    // Pavilion Mansard Roof
    const pavRoof = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 11.8, 5.8, 4), materials.slateRoof);
    pavRoof.rotation.y = Math.PI / 4;
    pavRoof.scale.set(1.0, 1.0, 1.75);
    pavRoof.position.set(sx, 24.1 + 2.9, 0);
    root.add(pavRoof);
  }

  // Central Projecting Tower Base
  const centerPav = new THREE.Mesh(new THREE.BoxGeometry(22, 23, 31), materials.ndBuffBrick);
  centerPav.position.set(0, 3.6 + 11.5, 1.5);
  root.add(centerPav);

  // Rear North Wing
  const northWing = new THREE.Mesh(new THREE.BoxGeometry(26, 18.5, 24), materials.ndBuffBrick);
  northWing.position.set(0, 3.6 + 9.25, -22);
  root.add(northWing);

  // Sloped French Mansard Roof along main body & north wing
  const mainRoof = new THREE.Mesh(new THREE.CylinderGeometry(34, 41, 5.4, 4), materials.slateRoof);
  mainRoof.rotation.y = Math.PI / 4;
  mainRoof.scale.set(1.22, 1, 0.45);
  mainRoof.position.set(0, 22.1 + 2.7, 0);
  root.add(mainRoof);

  const northRoof = new THREE.Mesh(new THREE.CylinderGeometry(13, 17.5, 5.0, 4), materials.slateRoof);
  northRoof.rotation.y = Math.PI / 4;
  northRoof.position.set(0, 22.1 + 2.5, -22);
  root.add(northRoof);

  // Dormer windows along mansard roofline
  for (const dx of [-20, -13, 13, 20]) {
    for (const dz of [-12.2, 12.2]) {
      const dormer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 2.2), materials.limestone);
      dormer.position.set(dx, 23.6, dz);
      root.add(dormer);
    }
  }

  // Famous Grand Southern Portico & Steps (Facing God Quad, +Z)
  for (let step = 0; step < 6; step++) {
    const sw = 20 - step * 0.5;
    const sd = 9.5 - step * 1.25;
    const st = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.62, sd), materials.limestone);
    st.position.set(0, 0.31 + step * 0.6, 21.2 - step * 0.62);
    root.add(st);
  }

  const porticoDeck = new THREE.Mesh(new THREE.BoxGeometry(19, 1.0, 6.5), materials.limestone);
  porticoDeck.position.set(0, 3.8, 19.2);
  root.add(porticoDeck);

  // 6 Classical Corinthian Columns supporting the Portico Pediment
  for (let i = 0; i < 6; i++) {
    const cx = -7.5 + i * 3.0;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 10.5, 14), materials.limestone);
    col.position.set(cx, 9.4, 21.6);
    root.add(col);
  }

  const entablature = new THREE.Mesh(new THREE.BoxGeometry(19.6, 2.0, 7.0), materials.limestone);
  entablature.position.set(0, 15.4, 19.3);
  root.add(entablature);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(10.8, 3.8, 4), materials.limestone);
  pediment.rotation.y = Math.PI / 4;
  pediment.scale.set(1.28, 1, 0.45);
  pediment.position.set(0, 18.2, 19.5);
  root.add(pediment);

  // Square Pedestal & Two-Stage Neo-Classical White Drum supporting the Golden Dome
  const squareDrum = new THREE.Mesh(new THREE.BoxGeometry(15.5, 5.5, 15.5), materials.limestone);
  squareDrum.position.set(0, 29.2, 1.0);
  root.add(squareDrum);

  const lowerOctDrum = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 8.1, 7.2, 16), materials.whiteMarble);
  lowerOctDrum.position.set(0, 35.4, 1.0);
  root.add(lowerOctDrum);

  // Corinthian Pilasters & Dark Arched Windows around the Drum
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 6.8, 8), materials.limestone);
    pil.position.set(Math.cos(ang) * 7.85, 35.4, 1.0 + Math.sin(ang) * 7.85);
    root.add(pil);
  }

  const drumCornice = new THREE.Mesh(new THREE.CylinderGeometry(8.3, 7.9, 1.1, 24), materials.limestone);
  drumCornice.position.set(0, 39.3, 1.0);
  root.add(drumCornice);

  // THE 23.9-KARAT GOLDEN DOME!
  const domeGeo = new THREE.SphereGeometry(7.75, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const goldenDomeMesh = new THREE.Mesh(domeGeo, materials.goldenDome);
  goldenDomeMesh.scale.set(1, 1.24, 1);
  goldenDomeMesh.position.set(0, 39.4, 1.0);
  root.add(goldenDomeMesh);

  // Gold Dome Ribs (12 meridians)
  for (let r = 0; r < 6; r++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(7.78, 0.12, 8, 28, Math.PI),
      materials.goldenDome
    );
    rib.scale.set(1, 1.24, 1);
    rib.rotation.y = (r / 6) * Math.PI;
    rib.position.set(0, 39.4, 1.0);
    root.add(rib);
  }

  // Golden Lantern Cupola
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 3.4, 12), materials.whiteMarble);
  lanternBase.position.set(0, 50.2, 1.0);
  root.add(lanternBase);

  const lanternCap = new THREE.Mesh(new THREE.SphereGeometry(1.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), materials.goldenDome);
  lanternCap.position.set(0, 51.9, 1.0);
  root.add(lanternCap);

  // 19-Foot (5.8m) Gilded Statue of OUR LADY (Virgin Mary) Watching Over Campus!
  const globeOrb = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 12), materials.goldenDome);
  globeOrb.position.set(0, 54.1, 1.0);
  root.add(globeOrb);

  const maryBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.72, 3.6, 12), materials.goldenDome);
  maryBody.position.set(0, 56.1, 1.0);
  root.add(maryBody);

  const maryHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), materials.goldenDome);
  maryHead.position.set(0, 58.2, 1.0);
  root.add(maryHead);

  // Halo of 12 stars & Outstretched welcoming arms facing South (+Z)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 16), materials.goldenDome);
  halo.position.set(0, 58.35, 0.9);
  root.add(halo);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 8), materials.goldenDome);
    arm.position.set(side * 0.78, 56.9, 1.35);
    arm.rotation.z = side * 0.72;
    arm.rotation.x = 0.35;
    root.add(arm);
  }

  tagInteractive(root, 'main-building');
  return root;
}

/**
 * 2. BASILICA OF THE SACRED HEART
 * Coordinates: (-74, +52), Height: 66.4m (218 ft — tallest university chapel in America!)
 * Oriented North-South: Main Entrance & Spire at South (+Z), Lady Chapel Apse at North (-Z).
 */
function buildBasilica(materials) {
  const root = new THREE.Group();
  root.position.set(-74, 0, 52);

  // Stone foundation
  const base = new THREE.Mesh(new THREE.BoxGeometry(28, 1.6, 78), materials.limestone);
  base.position.y = 0.8;
  root.add(base);

  // Tall Neo-Gothic Nave
  const nave = new THREE.Mesh(new THREE.BoxGeometry(15.5, 22, 62), materials.ndBuffBrick);
  nave.position.set(0, 12.2, -2);
  root.add(nave);

  // Steep Slate Gable Roof over Nave
  const naveRoofGeo = new THREE.ConeGeometry(12.2, 9.5, 4);
  const naveRoof = new THREE.Mesh(naveRoofGeo, materials.slateRoof);
  naveRoof.rotation.y = Math.PI / 4;
  naveRoof.scale.set(0.92, 1, 3.6);
  naveRoof.position.set(0, 27.9, -2);
  root.add(naveRoof);

  // Side Aisles (East & West)
  for (const sx of [-10.2, 10.2]) {
    const aisle = new THREE.Mesh(new THREE.BoxGeometry(5.6, 12.5, 54), materials.ndBuffBrick);
    aisle.position.set(sx, 7.4, -2);
    root.add(aisle);
  }

  // East-West Transept Crossing + Fleche Pinnacle
  const transept = new THREE.Mesh(new THREE.BoxGeometry(34, 21.5, 14), materials.ndBuffBrick);
  transept.position.set(0, 12.0, -14);
  root.add(transept);

  const transeptRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 8.8, 4), materials.slateRoof);
  transeptRoof.rotation.y = Math.PI / 4;
  transeptRoof.scale.set(2.2, 1, 0.88);
  transeptRoof.position.set(0, 27.1, -14);
  root.add(transeptRoof);

  const fleche = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9.5, 8), materials.verdigrisCopper);
  fleche.position.set(0, 33.5, -14);
  root.add(fleche);

  // Northern Polygonal Apse & Lady Chapel
  const apse = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.2, 20, 7), materials.ndBuffBrick);
  apse.position.set(0, 11.2, -35);
  root.add(apse);
  const apseRoof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 7.5, 7), materials.slateRoof);
  apseRoof.position.set(0, 24.9, -35);
  root.add(apseRoof);

  const ladyChapel = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.5, 12, 7), materials.ndBuffBrick);
  ladyChapel.position.set(0, 7.2, -43);
  root.add(ladyChapel);

  // 14 Neo-Gothic Buttresses, Pinnacles & Glowing Stained-Glass Lancet Windows!
  for (let i = 0; i < 7; i++) {
    const bz = -26 + i * 8.2;
    for (const side of [-1, 1]) {
      // Outer Buttress Pier + Spirelet
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.5, 15.5, 1.8), materials.limestone);
      pier.position.set(side * 13.4, 8.6, bz);
      root.add(pier);

      const flyer = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 1.1), materials.limestone);
      flyer.position.set(side * 10.6, 16.8, bz);
      flyer.rotation.z = side * 0.42;
      root.add(flyer);

      const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.6, 4), materials.limestone);
      pinnacle.position.set(side * 13.4, 18.2, bz);
      root.add(pinnacle);

      // Jewel-toned Stained Glass Clerestory & Aisle Lancet Windows
      if (Math.abs(bz - -14) > 5) {
        const winAisle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.2, 2.4), materials.stainedGlass);
        winAisle.position.set(side * 13.05, 7.8, bz);
        root.add(winAisle);

        const winClerestory = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 2.2), materials.stainedGlass);
        winClerestory.position.set(side * 7.82, 17.6, bz);
        root.add(winClerestory);
      }
    }
  }

  // Transept Rose Windows (East & West)
  for (const side of [-1, 1]) {
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.5, 20), materials.stainedGlass);
    rose.rotation.z = Math.PI / 2;
    rose.position.set(side * 17.1, 16.2, -14);
    root.add(rose);
  }

  // GRAND SOUTHERN BELL TOWER & 66.4m SPIRE!
  const towerSquare = new THREE.Mesh(new THREE.BoxGeometry(12.2, 33, 12.2), materials.ndBuffBrick);
  towerSquare.position.set(0, 17.5, 30.5);
  root.add(towerSquare);

  // Corner Tower Buttresses & Gothic Pinnacles
  for (const cx of [-6.1, 6.1]) {
    for (const cz of [24.4, 36.6]) {
      const tb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 35, 1.8), materials.limestone);
      tb.position.set(cx, 18.5, cz);
      root.add(tb);
      const tp = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.2, 4), materials.limestone);
      tp.position.set(cx, 38.6, cz);
      root.add(tp);
    }
  }

  // Southern Entrance Gothic Portal & Rose Window
  const southPortal = new THREE.Mesh(new THREE.BoxGeometry(6.8, 8.5, 2.8), materials.limestone);
  southPortal.position.set(0, 5.2, 37.2);
  root.add(southPortal);

  const southRose = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.5, 20), materials.stainedGlass);
  southRose.rotation.x = Math.PI / 2;
  southRose.position.set(0, 15.8, 36.7);
  root.add(southRose);

  // Octagonal Belfry Stage
  const octBelfry = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.7, 11.5, 8), materials.ndBuffBrick);
  octBelfry.position.set(0, 39.5, 30.5);
  root.add(octBelfry);

  // Soaring Copper-Slate Spire rising to 66.4m + Golden Cross!
  const spire = new THREE.Mesh(new THREE.ConeGeometry(5.1, 19.2, 8), materials.verdigrisCopper);
  spire.position.set(0, 54.8, 30.5);
  root.add(spire);

  const crossVert = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.8, 8), materials.goldenDome);
  crossVert.position.set(0, 65.5, 30.5);
  root.add(crossVert);
  const crossHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.1, 8), materials.goldenDome);
  crossHoriz.rotation.z = Math.PI / 2;
  crossHoriz.position.set(0, 66.1, 30.5);
  root.add(crossHoriz);

  tagInteractive(root, 'basilica');
  return root;
}

/**
 * 3. THE GROTTO OF OUR LADY OF LOURDES
 * Coordinates: (-136, 0, +8) — Boulder Cave, Virgin Mary Niche, St. Bernadette & 220 Flickering Candles!
 */
function buildGrotto(materials, getGroundHeight) {
  const root = new THREE.Group();
  const gx = -136;
  const gz = 8;
  const baseY = getGroundHeight(gx, gz);
  root.position.set(gx, baseY, gz);

  // Semicircular flagstone prayer plaza
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 0.5, 24), materials.limestone);
  plaza.position.y = 0.25;
  root.add(plaza);

  // Sculpted Cave Arch of 48 Glacial Fieldstone Boulders (opening toward South-West / Lake)
  const rockGeo = new THREE.DodecahedronGeometry(2.3, 1);
  let seed = 91;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 52; i++) {
    const t = (i / 51) * Math.PI * 1.15 - 0.15;
    const layer = i % 4;
    const radius = 8.8 - layer * 1.25;
    const bx = Math.cos(t) * radius + (rand() - 0.5) * 1.6;
    const bz = -Math.sin(t) * (radius * 0.82) + (rand() - 0.5) * 1.4;
    const by = 1.2 + layer * 2.1 + Math.sin(t) * 1.8;

    const boulder = new THREE.Mesh(rockGeo, materials.boulderRock);
    boulder.position.set(bx, by, bz);
    boulder.scale.set(1.1 + rand() * 0.75, 0.85 + rand() * 0.65, 1.0 + rand() * 0.7);
    boulder.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    root.add(boulder);
  }

  // Overhanging Cave Vault Cap Rocks
  for (let k = 0; k < 14; k++) {
    const ang = 0.2 + (k / 13) * (Math.PI - 0.4);
    const cap = new THREE.Mesh(rockGeo, materials.boulderRock);
    cap.position.set(Math.cos(ang) * 5.2, 8.2 + (rand() - 0.5) * 1.1, -Math.sin(ang) * 4.4);
    cap.scale.set(1.5, 0.9, 1.4);
    root.add(cap);
  }

  // Stone Altar inside the Cave
  const altar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.6), materials.limestone);
  altar.position.set(0, 0.85, -3.6);
  root.add(altar);

  // Upper-Right Niche: Luminous White Statue of Our Lady of Lourdes!
  const maryPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.7, 10), materials.limestone);
  maryPedestal.position.set(4.5, 4.4, -2.4);
  root.add(maryPedestal);

  const maryStatue = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 2.05, 12), materials.whiteMarble);
  maryStatue.position.set(4.5, 5.7, -2.4);
  root.add(maryStatue);

  const maryHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), materials.whiteMarble);
  maryHead.position.set(4.5, 6.85, -2.4);
  root.add(maryHead);

  // Kneeling St. Bernadette Statue on the left plaza
  const bernadette = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 1.35, 10), materials.whiteMarble);
  bernadette.position.set(-4.2, 1.15, 2.2);
  root.add(bernadette);

  // Wrought-Iron Votive Candle Racks + 220 Glowing Votive Candles (InstancedMesh)!
  const rackMat = new THREE.MeshStandardMaterial({ color: '#1e2229', roughness: 0.5, metalness: 0.7 });
  const candleCount = 220;
  const flameGeo = new THREE.ConeGeometry(0.065, 0.22, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffbe42' });
  const candleFlames = new THREE.InstancedMesh(flameGeo, flameMat, candleCount);

  const glassGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.18, 6);
  const glassMat = new THREE.MeshBasicMaterial({ color: '#ff7b29' });
  const candleJars = new THREE.InstancedMesh(glassGeo, glassMat, candleCount);

  const dummy = new THREE.Object3D();
  let cIdx = 0;
  const rackConfigs = [
    { x: -3.2, z: -1.4, rot: 0.35 },
    { x: 3.3, z: -1.2, rot: -0.35 },
  ];
  for (const rc of rackConfigs) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 1.1), rackMat);
    stand.position.set(rc.x, 0.95, rc.z);
    stand.rotation.y = rc.rot;
    root.add(stand);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 22; col++) {
        if (cIdx >= candleCount) break;
        const lx = -1.7 + (col / 21) * 3.4;
        const ly = 1.55 + row * 0.16;
        const lz = -0.36 + row * 0.18;
        const cosR = Math.cos(rc.rot);
        const sinR = Math.sin(rc.rot);
        const wx = rc.x + lx * cosR + lz * sinR;
        const wz = rc.z - lx * sinR + lz * cosR;

        dummy.position.set(wx, ly, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        candleJars.setMatrixAt(cIdx, dummy.matrix);

        dummy.position.set(wx, ly + 0.16, wz);
        dummy.updateMatrix();
        candleFlames.setMatrixAt(cIdx, dummy.matrix);
        cIdx++;
      }
    }
  }
  root.add(candleJars);
  root.add(candleFlames);

  // Wooden prayer kneelers/benches in front of the Grotto
  for (let row = 0; row < 3; row++) {
    for (const side of [-4.2, 4.2]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.55, 0.65), materials.rusticTimber);
      bench.position.set(side, 0.72, 4.8 + row * 2.3);
      root.add(bench);
    }
  }

  tagInteractive(root, 'grotto');
  return { root, candleFlames };
}

/**
 * 4. 1831 LOG CHAPEL & 1843 OLD COLLEGE + HOLY CROSS CEMETERY
 */
function buildFoundingSites(materials) {
  const group = new THREE.Group();

  // Log Chapel (-162, -56)
  const logChapel = new THREE.Group();
  logChapel.position.set(-162, 0, -56);
  logChapel.rotation.y = 0.32;

  const lcWalls = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5.2, 16.5), materials.rusticTimber);
  lcWalls.position.y = 2.8;
  logChapel.add(lcWalls);

  // Stacked corner notched log ends
  for (let h = 0.8; h <= 5.0; h += 0.7) {
    const logBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 17.4, 8), materials.rusticTimber);
    logBeam.rotation.x = Math.PI / 2;
    logBeam.position.set(-5.25, h, 0);
    logChapel.add(logBeam);
    const logBeamR = logBeam.clone();
    logBeamR.position.x = 5.25;
    logChapel.add(logBeamR);
  }

  const lcRoof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 4.4, 4), materials.redTileRoof);
  lcRoof.rotation.y = Math.PI / 4;
  lcRoof.scale.set(0.95, 1, 1.45);
  lcRoof.position.y = 7.5;
  logChapel.add(lcRoof);

  const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.8), materials.rusticTimber);
  belfry.position.set(0, 9.6, 6.2);
  logChapel.add(belfry);
  const lcCross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), materials.goldenDome);
  lcCross.position.set(0, 11.6, 6.2);
  logChapel.add(lcCross);

  tagInteractive(logChapel, 'log-chapel');
  group.add(logChapel);

  // Old College (-182, -22) — 1843 oldest brick building on campus
  const oldCollege = new THREE.Group();
  oldCollege.position.set(-182, 0, -22);
  oldCollege.rotation.y = 0.24;

  const ocBody = new THREE.Mesh(new THREE.BoxGeometry(15.5, 9.2, 12.2), materials.ndWarmGothicBrick);
  ocBody.position.y = 4.6;
  oldCollege.add(ocBody);

  const ocRoof = new THREE.Mesh(new THREE.ConeGeometry(11.4, 4.8, 4), materials.slateRoof);
  ocRoof.rotation.y = Math.PI / 4;
  ocRoof.scale.set(1.05, 1, 0.85);
  ocRoof.position.y = 11.5;
  oldCollege.add(ocRoof);

  const ocPorch = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.8, 3.0), materials.limestone);
  ocPorch.position.set(0, 2.0, 7.2);
  oldCollege.add(ocPorch);

  tagInteractive(oldCollege, 'old-college');
  group.add(oldCollege);

  // Holy Cross Community Cemetery (-290, +155) — Rows of identical white stone crosses!
  const cemetery = new THREE.Group();
  cemetery.position.set(-290, 0, 155);

  const chapelMausoleum = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5.8, 6.5), materials.limestone);
  chapelMausoleum.position.set(0, 2.9, -18);
  cemetery.add(chapelMausoleum);
  const cmRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3.2, 4), materials.slateRoof);
  cmRoof.rotation.y = Math.PI / 4;
  cmRoof.position.set(0, 7.4, -18);
  cemetery.add(cmRoof);

  const crossCount = 120;
  const crossV = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 1.45, 0.18), materials.whiteMarble, crossCount);
  const crossH = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.24, 0.18), materials.whiteMarble, crossCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 12; c++) {
      const cx = -22 + c * 4.0;
      const cz = -8 + r * 3.6;
      dummy.position.set(cx, 0.72, cz);
      dummy.updateMatrix();
      crossV.setMatrixAt(idx, dummy.matrix);
      dummy.position.set(cx, 1.05, cz);
      dummy.updateMatrix();
      crossH.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }
  cemetery.add(crossV);
  cemetery.add(crossH);
  tagInteractive(cemetery, 'holy-cross-cemetery');
  group.add(cemetery);

  return group;
}

export function createSacredLandmarks(scene, materials, getGroundHeight) {
  const sacredGroup = new THREE.Group();
  sacredGroup.name = 'SacredLandmarks';

  const mainBuilding = buildMainBuilding(materials);
  const basilica = buildBasilica(materials);
  const { root: grotto, candleFlames } = buildGrotto(materials, getGroundHeight);
  const foundingSites = buildFoundingSites(materials);

  sacredGroup.add(mainBuilding, basilica, grotto, foundingSites);
  scene.add(sacredGroup);

  function tick(elapsed) {
    // Subtle organic candle pulse
    const s = 1.0 + Math.sin(elapsed * 9.5) * 0.08;
    candleFlames.scale.set(1, s, 1);
  }

  return { sacredGroup, tick };
}
