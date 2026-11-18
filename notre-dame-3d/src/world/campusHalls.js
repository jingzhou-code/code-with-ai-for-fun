import * as THREE from 'three';

function addPitchedBar(parent, w, h, d, x, z, brickMat, roofMat, stoneMat) {
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2), stoneMat);
  plinth.position.set(x, 0.7, z);
  parent.add(plinth);

  const wallH = Math.max(6, h - 5.2);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), brickMat);
  body.position.set(x, 1.4 + wallH / 2, z);
  parent.add(body);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.7, d + 0.8), stoneMat);
  cornice.position.set(x, 1.4 + wallH + 0.35, z);
  parent.add(cornice);

  // Steep pitched slate roof
  const roofH = Math.min(6.8, Math.max(3.8, Math.min(w, d) * 0.26));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, roofH, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set((w + 1.4) * 0.71, 1, (d + 1.4) * 0.71);
  roof.position.set(x, 1.4 + wallH + 0.7 + roofH / 2, z);
  parent.add(roof);

  return 1.4 + wallH;
}

function buildParametricHall(b, materials) {
  const root = new THREE.Group();
  root.position.set(b.x, 0, b.z);

  const brickMat =
    b.archStyle === 'limestone-gothic'
      ? materials.limestone
      : b.archStyle === 'victorian' || b.archStyle === 'mansard'
      ? materials.ndBuffBrick
      : materials.ndWarmGothicBrick;
  const roofMat = b.archStyle === 'collegiate' ? materials.redTileRoof : materials.slateRoof;
  const stoneMat = materials.limestone;

  const { w, d, h } = b;

  if (b.courtyard) {
    // Collegiate Gothic Quadrangle / Cloister Courtyard Plan
    const wingT = Math.min(13, Math.min(w, d) * 0.28);
    addPitchedBar(root, w, h, wingT, 0, -d / 2 + wingT / 2, brickMat, roofMat, stoneMat);
    addPitchedBar(root, w, h, wingT, 0, d / 2 - wingT / 2, brickMat, roofMat, stoneMat);
    addPitchedBar(root, wingT, h * 0.94, d - wingT * 1.6, -w / 2 + wingT / 2, 0, brickMat, roofMat, stoneMat);
    addPitchedBar(root, wingT, h * 0.94, d - wingT * 1.6, w / 2 - wingT / 2, 0, brickMat, roofMat, stoneMat);
  } else if (b.wingPlan === 'H') {
    const barW = Math.min(14, w * 0.3);
    addPitchedBar(root, w * 0.72, h, Math.min(15, d * 0.44), 0, 0, brickMat, roofMat, stoneMat);
    addPitchedBar(root, barW, h * 1.03, d, -w / 2 + barW / 2, 0, brickMat, roofMat, stoneMat);
    addPitchedBar(root, barW, h * 1.03, d, w / 2 - barW / 2, 0, brickMat, roofMat, stoneMat);
  } else if (b.wingPlan === 'U') {
    const wingT = Math.min(14, d * 0.35);
    addPitchedBar(root, w, h, wingT, 0, d / 2 - wingT / 2, brickMat, roofMat, stoneMat);
    addPitchedBar(root, wingT, h * 0.96, d, -w / 2 + wingT / 2, 0, brickMat, roofMat, stoneMat);
    addPitchedBar(root, wingT, h * 0.96, d, w / 2 - wingT / 2, 0, brickMat, roofMat, stoneMat);
  } else if (b.wingPlan === 'L') {
    const wingT = Math.min(15, Math.min(w, d) * 0.42);
    addPitchedBar(root, w, h, wingT, 0, -d / 2 + wingT / 2, brickMat, roofMat, stoneMat);
    addPitchedBar(root, wingT, h * 0.96, d, -w / 2 + wingT / 2, 0, brickMat, roofMat, stoneMat);
  } else {
    // Classic Collegiate Bar + Projecting Central Gable Pavilion
    const eaveY = addPitchedBar(root, w, h, d, 0, 0, brickMat, roofMat, stoneMat);
    const pavW = Math.min(14, w * 0.34);
    const pav = new THREE.Mesh(new THREE.BoxGeometry(pavW, eaveY - 0.8, d + 3.2), brickMat);
    pav.position.set(0, (eaveY - 0.8) / 2 + 0.8, 0);
    root.add(pav);

    // Dormer windows along roof
    const dormerCount = Math.max(2, Math.floor(w / 14));
    for (let i = 0; i < dormerCount; i++) {
      const dx = -w * 0.36 + (i / Math.max(1, dormerCount - 1)) * (w * 0.72);
      if (Math.abs(dx) < pavW * 0.55) continue;
      const dormer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, d * 0.72), stoneMat);
      dormer.position.set(dx, eaveY + 1.1, 0);
      root.add(dormer);
    }
  }

  // Optional Victorian Corner Turrets (Sorin Hall, Corby Hall, Washington Hall, Carroll Hall!)
  if (b.hasTurret) {
    const rTur = 3.1;
    for (const sx of [-w / 2 + 1.2, w / 2 - 1.2]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rTur, rTur * 1.05, h * 0.88, 14), brickMat);
      cyl.position.set(sx, (h * 0.88) / 2, d / 2 - 1.2);
      root.add(cyl);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(rTur * 1.18, 7.2, 14), materials.verdigrisCopper);
      cone.position.set(sx, h * 0.88 + 3.6, d / 2 - 1.2);
      root.add(cone);
    }
  }

  // Optional Collegiate Gothic Entrance Arch & Bell/Clock Tower (Howard, Lyons, Alumni, CoMo, West Quad, etc.)
  if (b.hasTower) {
    const tw = Math.min(10.5, Math.min(w, d) * 0.34);
    const th = h + 5.8;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(tw, th, tw), brickMat);
    tower.position.set(0, th / 2, 0);
    root.add(tower);

    const battlement = new THREE.Mesh(new THREE.BoxGeometry(tw + 1.0, 1.6, tw + 1.0), stoneMat);
    battlement.position.set(0, th + 0.6, 0);
    root.add(battlement);

    for (const cx of [-tw / 2, tw / 2]) {
      for (const cz of [-tw / 2, tw / 2]) {
        const pin = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.8, 4), stoneMat);
        pin.position.set(cx, th + 2.6, cz);
        root.add(pin);
      }
    }
  }

  // Every Notre Dame Residence Hall has a Chapel! Add a glowing Stained-Glass Chapel Window
  if (b.category === 'residential') {
    const chapelWin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 5.4, 0.55), materials.stainedGlass);
    chapelWin.position.set(0, 6.2, d / 2 + 0.15);
    root.add(chapelWin);
  }

  root.userData.buildingId = b.id;
  root.traverse((o) => {
    o.userData.buildingId = b.id;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return root;
}

export function createCampusHalls(scene, buildings, materials) {
  const group = new THREE.Group();
  group.name = 'CampusResidenceAndAcademicHalls';

  for (const b of buildings) {
    if (b.custom) continue;
    const hall = buildParametricHall(b, materials);
    group.add(hall);
  }

  // Eddy Street Commons Mixed-Use Village along the Southern Gateway (z = 775..835)
  const eddyGroup = new THREE.Group();
  const eddyBlocks = [
    { x: 18, z: 795, w: 62, d: 28, h: 19 },
    { x: 112, z: 795, w: 68, d: 28, h: 21 },
    { x: 205, z: 795, w: 58, d: 28, h: 18 },
    { x: 112, z: 848, w: 84, d: 30, h: 22 },
  ];
  for (const eb of eddyBlocks) {
    const bGrp = new THREE.Group();
    addPitchedBar(bGrp, eb.w, eb.h, eb.d, eb.x, eb.z, materials.ndWarmGothicBrick, materials.slateRoof, materials.limestone);
    eddyGroup.add(bGrp);
  }
  eddyGroup.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  group.add(eddyGroup);

  scene.add(group);
  return { group };
}
