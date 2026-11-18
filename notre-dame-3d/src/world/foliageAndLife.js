import * as THREE from 'three';

const SEASON_PALETTES = {
  autumn: ['#c85a1e', '#d98c21', '#a83324', '#386639', '#e0a938', '#8c4322', '#2d5332'],
  spring: ['#4ea84a', '#6bc259', '#f3a6be', '#f7cad8', '#3e8e41', '#7fd166'],
  summer: ['#2d6a36', '#387d3f', '#23572c', '#468f49', '#316e38'],
  winter: ['#dce6f2', '#cfdceb', '#2c4a38', '#e8eff7', '#b9c8d8'],
};

function isBlockedForTree(x, z, buildings) {
  // Exclude St. Mary's Lake & St. Joseph's Lake basins
  const dMary = Math.hypot((x - -468) / 260, (z - -128) / 172);
  if (dMary < 0.98) {
    // Allow trees on St. Mary's Island (-605, -155)
    if (Math.hypot(x - -605, z - -155) > 22) return true;
  }
  const dJoe = Math.hypot((x - -5) / 184, (z - -328) / 168);
  if (dJoe < 0.98) return true;

  // Exclude open center lawns of major sightlines (keep trees along quad borders, not blocking Dome/Touchdown Jesus!)
  if (Math.abs(x) < 22 && z > 20 && z < 325) return true; // Central God Quad Golden Dome sightline
  if (Math.abs(x - 412) < 34 && z > 85 && z < 410) return true; // Touchdown Jesus -> Stadium sightline
  if (Math.abs(x - 62) < 13 && z > 270 && z < 900) return true; // Notre Dame Ave roadway

  // Exclude building footprints (+ buffer)
  for (const b of buildings) {
    const halfW = b.w / 2 + 8;
    const halfD = b.d / 2 + 8;
    if (Math.abs(x - b.x) < halfW && Math.abs(z - b.z) < halfD) {
      return true;
    }
  }
  return false;
}

export function createFoliageAndLife(scene, buildings, materials, getGroundHeight) {
  const group = new THREE.Group();
  group.name = 'CampusFoliageStatuesAndLife';

  // ==================== 1. 2,800+ INSTANCED SEASONAL CAMPUS TREES ====================
  const treeCoords = [];
  let seed = 2026;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const tryPushTree = (x, z, scale = 1.0) => {
    if (!isBlockedForTree(x, z, buildings)) {
      treeCoords.push({ x, z, scale: scale * (0.78 + rand() * 0.55), rot: rand() * Math.PI * 2 });
    }
  };

  // Formal Tree Alleys lining Notre Dame Ave, God Quad, South Quad, North Quad & Fieldhouse Mall
  for (let z = 445; z <= 860; z += 18) {
    tryPushTree(43, z, 1.15);
    tryPushTree(81, z, 1.15);
  }
  for (let z = 45; z <= 255; z += 17) {
    tryPushTree(-56, z, 1.1);
    tryPushTree(56, z, 1.1);
  }
  for (let x = -290; x <= 170; x += 19) {
    tryPushTree(x, 310, 1.12);
    tryPushTree(x, 362, 1.12);
  }
  for (let z = -195; z <= -25; z += 18) {
    tryPushTree(146, z, 1.0);
    tryPushTree(238, z, 1.0);
  }
  for (let x = 135; x <= 345; x += 19) {
    tryPushTree(x, 42, 1.05);
    tryPushTree(x, 94, 1.05);
  }

  // Dense Lakeside Woods around St. Mary's Lake, Grotto, St. Joseph's Lake & Campus Perimeter
  for (let i = 0; i < 3600 && treeCoords.length < 2850; i++) {
    const rx = (rand() - 0.5) * 1680 + 20;
    const rz = (rand() - 0.5) * 1520 + 60;
    tryPushTree(rx, rz, 1.0);
  }

  const treeCount = treeCoords.length;
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 4.2, 6);
  const crownLowerGeo = new THREE.DodecahedronGeometry(3.8, 1);
  const crownUpperGeo = new THREE.DodecahedronGeometry(2.7, 1);

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3828', roughness: 0.92 });
  const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.84 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crownsLower = new THREE.InstancedMesh(crownLowerGeo, crownMat, treeCount);
  const crownsUpper = new THREE.InstancedMesh(crownUpperGeo, crownMat, treeCount);
  trunks.castShadow = true;
  crownsLower.castShadow = true;
  crownsLower.receiveShadow = true;
  crownsUpper.castShadow = true;

  const dummy = new THREE.Object3D();
  treeCoords.forEach((t, i) => {
    const gy = getGroundHeight(t.x, t.z);
    dummy.position.set(t.x, gy + 2.0 * t.scale, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.set(t.scale, t.scale, t.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x, gy + 5.6 * t.scale, t.z);
    dummy.scale.set(t.scale * 1.08, t.scale * 0.92, t.scale * 1.08);
    dummy.updateMatrix();
    crownsLower.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x + 0.4, gy + 8.3 * t.scale, t.z - 0.3);
    dummy.scale.set(t.scale * 0.95, t.scale * 0.98, t.scale * 0.95);
    dummy.updateMatrix();
    crownsUpper.setMatrixAt(i, dummy.matrix);
  });

  function applyTreeSeasonColors(season) {
    const pal = SEASON_PALETTES[season] || SEASON_PALETTES.autumn;
    const col = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      col.set(pal[(i * 7 + 3) % pal.length]);
      crownsLower.setColorAt(i, col);
      col.offsetHSL(0.01, 0, 0.04);
      crownsUpper.setColorAt(i, col);
    }
    crownsLower.instanceColor.needsUpdate = true;
    crownsUpper.instanceColor.needsUpdate = true;
  }
  applyTreeSeasonColors('autumn');

  group.add(trunks, crownsLower, crownsUpper);

  // ==================== 2. ICONIC BRONZE & MARBLE CAMPUS STATUES ====================
  const buildStatue = (x, z, scaleH, mat, raiseRightArm = false, wideArms = false) => {
    const sGrp = new THREE.Group();
    sGrp.position.set(x, getGroundHeight(x, z), z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 2.6, 12), materials.limestone);
    ped.position.y = 1.3;
    sGrp.add(ped);
    const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.62, scaleH, 10), mat);
    fig.position.y = 2.6 + scaleH / 2;
    sGrp.add(fig);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), mat);
    head.position.y = 2.6 + scaleH + 0.32;
    sGrp.add(head);

    if (raiseRightArm) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.5, 8), mat);
      arm.position.set(0.52, 2.6 + scaleH + 0.35, 0);
      arm.rotation.z = -0.15;
      sGrp.add(arm);
    }
    if (wideArms) {
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.35, 8), mat);
        arm.position.set(side * 0.72, 2.6 + scaleH * 0.78, 0.25);
        arm.rotation.z = side * 0.95;
        sGrp.add(arm);
      }
    }
    return sGrp;
  };

  // Father Edward Sorin Statue (0, 175) — Founder of Notre Dame
  group.add(buildStatue(0, 175, 2.9, materials.bronzeStatue, false, false));
  // Sacred Heart of Jesus Statue ("Venite Ad Me Omnes") directly in front of Main Building (0, 72)
  group.add(buildStatue(0, 72, 2.6, materials.whiteMarble, false, true));
  // "Fair Catch Corby" Statue outside Corby Hall (-70, 122)
  group.add(buildStatue(-70, 122, 2.5, materials.bronzeStatue, true, false));
  // St. Edward the Confessor Statue outside St. Ed's Hall (62, 2)
  group.add(buildStatue(62, 2, 2.3, materials.bronzeStatue, false, false));

  // ==================== 3. 240 HISTORIC CAMPUS GLOBE LAMPPOSTS ====================
  const lampPoints = [];
  for (let z = 32; z <= 330; z += 24) {
    lampPoints.push([-12, z], [12, z]);
  }
  for (let x = -295; x <= 175; x += 26) {
    lampPoints.push([x, 328], [x, 344]);
  }
  for (let x = 115; x <= 390; x += 26) {
    lampPoints.push([x, 60], [x, 76]);
  }
  for (let z = 105; z <= 415; z += 28) {
    lampPoints.push([402, z], [422, z]);
  }
  for (let z = 430; z <= 730; z += 28) {
    lampPoints.push([52, z], [72, z]);
  }

  const postMat = new THREE.MeshStandardMaterial({ color: '#1b2229', metalness: 0.7, roughness: 0.4 });
  const lampPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.16, 4.2, 6), postMat, lampPoints.length);
  const lampGlobes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.36, 10, 8), materials.lampGlobe, lampPoints.length);

  lampPoints.forEach(([lx, lz], i) => {
    const gy = getGroundHeight(lx, lz);
    dummy.position.set(lx, gy + 2.1, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampPosts.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, gy + 4.35, lz);
    dummy.updateMatrix();
    lampGlobes.setMatrixAt(i, dummy.matrix);
  });
  group.add(lampPosts, lampGlobes);

  // ==================== 4. ANIMATED STUDENTS, LAKE SAILBOATS & GAME-DAY BLIMP ====================
  const walkPaths = [
    [[-2, 32], [-2, 334]],
    [[2, 334], [2, 32]],
    [[-290, 335], [180, 335]],
    [[180, 338], [-290, 338]],
    [[115, 68], [392, 68]],
    [[410, 98], [418, 392]],
    [[-66, 54], [66, 242]],
    [[192, 64], [192, -195]],
  ];

  const studentCount = 150;
  const studentGeo = new THREE.CapsuleGeometry(0.32, 1.05, 4, 8);
  const studentMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
  const students = new THREE.InstancedMesh(studentGeo, studentMat, studentCount);
  students.castShadow = true;

  const jacketColors = ['#0c2340', '#d4a638', '#1e5c3a', '#8c2d2d', '#cbd5e1', '#25436e'];
  const studentAgents = [];
  const sCol = new THREE.Color();
  for (let i = 0; i < studentCount; i++) {
    const route = walkPaths[i % walkPaths.length];
    studentAgents.push({
      route,
      progress: rand(),
      speed: 0.018 + rand() * 0.018,
      lateral: (rand() - 0.5) * 3.4,
    });
    sCol.set(jacketColors[i % jacketColors.length]);
    students.setColorAt(i, sCol);
  }
  students.instanceColor.needsUpdate = true;
  group.add(students);

  // Sailboats on St. Joseph's Lake & St. Mary's Lake
  const sailboats = [];
  const boatConfigs = [
    { cx: -10, cz: -320, rx: 85, rz: 75, speed: 0.11, phase: 0 },
    { cx: 35, cz: -295, rx: 65, rz: 58, speed: -0.09, phase: 2.1 },
    { cx: -430, cz: -120, rx: 110, rz: 68, speed: 0.08, phase: 1.2 },
    { cx: -510, cz: -145, rx: 75, rz: 52, speed: -0.1, phase: 4.0 },
  ];
  for (const bc of boatConfigs) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5.2, 4), materials.rusticTimber);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(0.85, 1, 0.35);
    hull.position.y = 0.45;
    const sail = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 5.6, 3),
      materials.whiteMarble
    );
    sail.scale.set(0.18, 1, 1);
    sail.position.y = 3.3;
    boat.add(hull, sail);
    group.add(boat);
    sailboats.push({ mesh: boat, ...bc });
  }

  // Goodyear-style Airship / Blimp circling high above Notre Dame Stadium!
  const blimp = new THREE.Group();
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(9, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#12325e', metalness: 0.35, roughness: 0.4 })
  );
  envelope.scale.set(1, 0.92, 2.85);
  const goldStripe = new THREE.Mesh(
    new THREE.SphereGeometry(9.08, 24, 12, 0, Math.PI * 2, Math.PI * 0.43, Math.PI * 0.14),
    materials.goldenDome
  );
  goldStripe.scale.set(1, 0.92, 2.85);
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 6.8), materials.whiteMarble);
  gondola.position.y = -8.8;
  blimp.add(envelope, goldStripe, gondola);
  blimp.position.set(422, 195, 525);
  group.add(blimp);

  scene.add(group);

  function tick(elapsed, delta, gameday) {
    // Animate strolling students
    for (let i = 0; i < studentCount; i++) {
      const ag = studentAgents[i];
      ag.progress = (ag.progress + ag.speed * delta) % 1;
      const pingPong = ag.progress < 0.5 ? ag.progress * 2 : (1 - ag.progress) * 2;
      const [p0, p1] = ag.route;
      const sx = THREE.MathUtils.lerp(p0[0], p1[0], pingPong) + ag.lateral;
      const sz = THREE.MathUtils.lerp(p0[1], p1[1], pingPong);
      const bob = Math.abs(Math.sin(elapsed * 7.5 + i)) * 0.12;
      dummy.position.set(sx, getGroundHeight(sx, sz) + 0.95 + bob, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      students.setMatrixAt(i, dummy.matrix);
    }
    students.instanceMatrix.needsUpdate = true;

    // Animate Lake Sailboats
    for (const sb of sailboats) {
      const a = elapsed * sb.speed + sb.phase;
      const bx = sb.cx + Math.cos(a) * sb.rx;
      const bz = sb.cz + Math.sin(a) * sb.rz;
      sb.mesh.position.set(bx, 0.2, bz);
      sb.mesh.rotation.y = -a + (sb.speed > 0 ? 0 : Math.PI);
    }

    // Animate Game-Day Blimp circling Notre Dame Stadium
    blimp.visible = gameday;
    if (gameday) {
      const ba = elapsed * 0.09;
      blimp.position.set(422 + Math.cos(ba) * 240, 188 + Math.sin(elapsed * 0.5) * 3, 525 + Math.sin(ba) * 210);
      blimp.rotation.y = -ba;
    }
  }

  return {
    group,
    setSeason: applyTreeSeasonColors,
    tick,
  };
}
