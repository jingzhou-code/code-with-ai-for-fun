import * as THREE from 'three';
import { createRng } from '../utils/noise.js';
import { createShimenawa } from './architecture.js';
import { createPlaqueTexture } from '../utils/textures.js';
import {
  getTerrainHeight,
  getRiverCenterX,
  getRoadCenterX,
  STAIR_CORRIDORS,
  projectOntoSegment
} from './terrain.js';

// Monumental 400-year-old Sacred Katsura Tree (御神木「桂」) — multiple dragon-like trunks
export function createSacredKatsuraTree({
  height = 25.0,
  trunkCount = 9,
  seed = 400,
  materials,
  foliageRegistry
}) {
  const group = new THREE.Group();
  const rng = createRng(seed);

  // Massive gnarled mossy root flare base
  const rootBase = new THREE.Mesh(
    new THREE.ConeGeometry(2.15, 2.5, 12),
    materials.agedWood
  );
  rootBase.position.y = 1.1;
  rootBase.castShadow = true;
  rootBase.receiveShadow = true;
  group.add(rootBase);

  // Sacred Shimenawa wrapped around the base trunk
  const shimenawa = createShimenawa({
    length: 3.4,
    thickness: 0.11,
    shideCount: 6,
    materials
  });
  shimenawa.position.set(0, 1.95, 1.48);
  group.add(shimenawa);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xd98a26,
    roughness: 0.78,
    metalness: 0.02
  });
  if (foliageRegistry) {
    foliageRegistry.push({ material: leafMat, type: 'katsura' });
  }

  for (let i = 0; i < trunkCount; i++) {
    const angle = (i / trunkCount) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const spread = 0.22 + (i % 3) * 0.14;
    const topH = height * (0.76 + rng() * 0.24);

    const pts = [
      new THREE.Vector3(Math.cos(angle) * 0.55, 0.4, Math.sin(angle) * 0.55),
      new THREE.Vector3(
        Math.cos(angle + 0.18) * (1.2 + spread * 1.6),
        topH * 0.34,
        Math.sin(angle + 0.18) * (1.2 + spread * 1.6)
      ),
      new THREE.Vector3(
        Math.cos(angle - 0.12) * (2.2 + spread * 4.2),
        topH * 0.68,
        Math.sin(angle - 0.12) * (2.2 + spread * 4.2)
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.08) * (3.1 + spread * 6.5),
        topH,
        Math.sin(angle + 0.08) * (3.1 + spread * 6.5)
      )
    ];

    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.28 - (i % 3) * 0.04, 8, false);
    // Taper upper radius
    const pos = tubeGeo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const py = pos.getY(v);
      const factor = Math.max(0.28, 1.0 - (py / topH) * 0.72);
      const center = curve.getPointAt(Math.min(1, Math.max(0, py / topH)));
      pos.setX(v, center.x + (pos.getX(v) - center.x) * factor);
      pos.setZ(v, center.z + (pos.getZ(v) - center.z) * factor);
    }
    tubeGeo.computeVertexNormals();

    const trunkMesh = new THREE.Mesh(tubeGeo, materials.agedWood);
    trunkMesh.castShadow = true;
    group.add(trunkMesh);

    // Crown foliage clouds along upper half of each dragon bough
    for (let c = 0; c < 3; c++) {
      const u = 0.62 + c * 0.17;
      const pt = curve.getPointAt(Math.min(0.98, u));
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.75 + rng() * 0.85, 1),
        leafMat
      );
      puff.scale.set(1.25, 0.78, 1.25);
      puff.position.copy(pt);
      puff.castShadow = true;
      group.add(puff);
    }
  }

  // Low wooden protective fence around the sacred roots
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), materials.hinoki);
    post.position.set(Math.cos(a) * 2.55, 0.42, Math.sin(a) * 2.55);
    group.add(post);
  }

  return group;
}

// 1,000-Year Fused Twin Cedars: Aioi-no-Sugi (相生の杉)
export function createAioiNoSugi({ materials }) {
  const group = new THREE.Group();

  // Shared colossal 1,000-year root base
  const fusedBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.95, 3.2, 14),
    materials.agedWood
  );
  fusedBase.scale.set(1.35, 1.0, 0.95);
  fusedBase.position.y = 1.6;
  fusedBase.castShadow = true;
  group.add(fusedBase);

  const cedarMat = new THREE.MeshStandardMaterial({
    color: 0x1c3d27,
    roughness: 0.88
  });

  // Twin colossal 32m trunks rising side by side from the single root
  for (const side of [-0.68, 0.68]) {
    const trunkH = 31.0 + side * 1.2;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.72, trunkH, 12),
      materials.agedWood
    );
    trunk.position.set(side, 2.5 + trunkH * 0.5, 0);
    trunk.rotation.z = -side * 0.018;
    trunk.castShadow = true;
    group.add(trunk);

    for (let tier = 0; tier < 7; tier++) {
      const ty = 12.5 + tier * 2.85;
      const rad = 3.2 - tier * 0.34;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(rad, 4.2, 9),
        cedarMat
      );
      cone.position.set(side * 1.15, ty, 0);
      cone.castShadow = true;
      group.add(cone);
    }
  }

  const rope = createShimenawa({ length: 3.1, thickness: 0.11, shideCount: 5, materials });
  rope.position.set(0, 2.65, 1.38);
  group.add(rope);

  return group;
}

// Fused Cedar + Maple Sacred Tree at Okumiya: Renri-no-Sugi (連理の杉)
export function createRenriNoSugi({ materials, foliageRegistry }) {
  const group = new THREE.Group();

  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.4, 2.4, 12), materials.agedWood);
  root.position.y = 1.2;
  group.add(root);

  // Left: Straight towering Japanese Cedar (杉)
  const cedarTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.58, 24, 10), materials.agedWood);
  cedarTrunk.position.set(-0.32, 13.0, 0);
  cedarTrunk.castShadow = true;
  group.add(cedarTrunk);

  const cedarLeafMat = new THREE.MeshStandardMaterial({ color: 0x1d4028, roughness: 0.88 });
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6 - i * 0.3, 3.8, 9), cedarLeafMat);
    cone.position.set(-0.35, 10.5 + i * 2.5, 0);
    group.add(cone);
  }

  // Right: Sinuous Japanese Maple (楓) embracing & emerging from the same trunk!
  const mapleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 1.2, 0),
    new THREE.Vector3(0.85, 4.6, 0.4),
    new THREE.Vector3(2.1, 8.2, 0.9),
    new THREE.Vector3(3.4, 11.4, 1.2)
  ]);
  const mapleTrunk = new THREE.Mesh(
    new THREE.TubeGeometry(mapleCurve, 14, 0.24, 8, false),
    materials.agedWood
  );
  mapleTrunk.castShadow = true;
  group.add(mapleTrunk);

  const mapleMat = new THREE.MeshStandardMaterial({ color: 0xc92b22, roughness: 0.76 });
  if (foliageRegistry) {
    foliageRegistry.push({ material: mapleMat, type: 'momiji' });
  }
  for (const u of [0.58, 0.78, 0.98]) {
    const pt = mapleCurve.getPointAt(u);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), mapleMat);
    crown.scale.set(1.35, 0.72, 1.25);
    crown.position.copy(pt);
    crown.castShadow = true;
    group.add(crown);
  }

  const rope = createShimenawa({ length: 2.3, thickness: 0.09, shideCount: 4, materials });
  rope.position.set(0, 2.1, 1.05);
  group.add(rope);

  return group;
}

// Mirei Shigemori's 1965 Boat-Shaped Stone Garden: Sekitei "Amatsu-Iwasaka" (石庭「天津磐境」)
export function createAmatsuIwasakaGarden({ materials }) {
  const group = new THREE.Group();
  const rng = createRng(1965);

  // Raked white gravel rectangular bed framed by cut stone kerbs
  const gravelBed = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 0.14, 9.6),
    materials.rakedGravel
  );
  gravelBed.position.y = 0.07;
  gravelBed.receiveShadow = true;
  group.add(gravelBed);

  // Mossy boat-hull island pointing North (-Z)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 3.6); // Pointed prow
  hullShape.quadraticCurveTo(1.75, 1.2, 1.55, -2.8);
  hullShape.lineTo(-1.55, -2.8);
  hullShape.quadraticCurveTo(-1.75, 1.2, 0, 3.6);

  const mossHull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hullShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06 }),
    materials.mossRock
  );
  mossHull.rotation.x = -Math.PI / 2;
  mossHull.position.set(0, 0.12, 0.2);
  mossHull.receiveShadow = true;
  group.add(mossHull);

  // Dynamic angular Kibune-ishi stones outlining the vessel's gunwales & prow
  const stoneCount = 26;
  for (let i = 0; i < stoneCount; i++) {
    const t = i / stoneCount;
    const angle = t * Math.PI * 2;
    const bx = Math.sin(angle) * (1.45 * (1 - Math.max(0, Math.cos(angle)) * 0.35));
    const bz = -Math.cos(angle) * 3.1;
    const isProw = i === 0;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(isProw ? 0.58 : 0.3 + rng() * 0.18, 0),
      materials.kibuneStone
    );
    rock.scale.set(0.85, isProw ? 1.65 : 1.15 + rng() * 0.5, 1.25);
    rock.position.set(bx, 0.32 + (isProw ? 0.3 : 0), bz);
    rock.rotation.set(rng() * 0.4, rng() * 3.14, rng() * 0.3);
    rock.castShadow = true;
    group.add(rock);
  }

  // Central Camellia Tree (椿) representing the sacred mast (Himorogi)
  const mastTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 2.6, 8),
    materials.agedWood
  );
  mastTrunk.position.set(0, 1.4, -0.2);
  mastTrunk.castShadow = true;
  group.add(mastTrunk);

  const camelliaCrown = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.05, 1),
    new THREE.MeshStandardMaterial({ color: 0x234d28, roughness: 0.7 })
  );
  camelliaCrown.position.set(0, 2.75, -0.2);
  camelliaCrown.castShadow = true;
  group.add(camelliaCrown);

  // Crimson Camellia blossoms dotting the mast tree
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xd92b3a, roughness: 0.5 });
  for (let b = 0; b < 9; b++) {
    const ba = (b / 9) * Math.PI * 2;
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), blossomMat);
    flower.position.set(Math.cos(ba) * 0.88, 2.55 + (b % 3) * 0.25, -0.2 + Math.sin(ba) * 0.88);
    group.add(flower);
  }

  return group;
}

// 6-Ton Natural Boat-Shaped Kibune Rock at Yui-no-Yashiro: Ama-no-Iwafune (天乃磐船)
export function createAmaNoIwafune({ materials }) {
  const group = new THREE.Group();

  // Gravel & cradle stones
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.16, 16), materials.rakedGravel);
  bed.scale.set(1.25, 1, 0.8);
  bed.position.y = 0.08;
  group.add(bed);

  // Sculpted 3.3m natural boat-shaped stone with sharp upturned prow (Hesaki)
  const boatGeo = new THREE.BoxGeometry(3.4, 0.95, 1.25, 14, 4, 6);
  const p = boatGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); // -1.7 stern -> +1.7 prow
    const y = p.getY(i);
    const z = p.getZ(i);
    const nx = x / 1.7;
    // Taper width toward prow & stern like a hull
    const taperZ = Math.max(0.18, 1.0 - Math.pow(Math.abs(nx), 1.85) * 0.84);
    // Curve bottom keel upward & lift prow dramatically
    const keelLift = Math.pow(Math.max(0, nx), 2.0) * 0.62 + Math.pow(Math.max(0, -nx), 2.2) * 0.28;
    // Concave deck hollow on top
    const deckHollow = y > 0 ? -Math.cos(nx * 1.2) * 0.16 * (1 - Math.abs(z) / 0.7) : 0;

    p.setZ(i, z * taperZ);
    p.setY(i, y * (0.72 + (nx > 0 ? nx * 0.22 : 0)) + keelLift + deckHollow);
  }
  boatGeo.computeVertexNormals();

  const iwafune = new THREE.Mesh(boatGeo, materials.kibuneStone);
  iwafune.position.set(0, 0.72, 0);
  iwafune.castShadow = true;
  iwafune.receiveShadow = true;
  group.add(iwafune);

  // Low bamboo Kekkai railing around Ama-no-Iwafune
  for (const sx of [-2.1, 2.1]) {
    for (const sz of [-1.25, 1.25]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), materials.bamboo);
      post.position.set(sx, 0.32, sz);
      group.add(post);
    }
  }
  for (const sz of [-1.25, 1.25]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 8), materials.bamboo);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.55, sz);
    group.add(rail);
  }

  return group;
}

// 10m Mossy Stone Boat Mound at Okumiya: Funagata-ishi (船形石 / 御船型石)
export function createFunagataIshi({ materials }) {
  const group = new THREE.Group();
  const rng = createRng(677);

  // Central mossy core hull (9.2m long x 3.6m wide)
  const coreGeo = new THREE.CapsuleGeometry(1.35, 5.8, 8, 16);
  coreGeo.rotateZ(Math.PI / 2);
  coreGeo.scale(1.0, 0.58, 0.92);
  const core = new THREE.Mesh(coreGeo, materials.mossRock);
  core.position.y = 0.52;
  core.receiveShadow = true;
  group.add(core);

  // 135 individual mossy river cobbles piled into a sacred boat silhouette concealing the Yellow Boat
  for (let i = 0; i < 135; i++) {
    const u = rng() * 2 - 1; // -1..1 along boat length
    const v = (rng() * 2 - 1) * Math.sqrt(Math.max(0.06, 1 - u * u));
    const bx = u * 4.35;
    const bz = v * 1.65;
    const domeY = (1 - u * u * 0.72 - v * v * 0.65) * 1.18 + Math.pow(Math.abs(u), 3) * 0.35;
    const cobble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24 + rng() * 0.22, 0),
      i % 3 === 0 ? materials.kibuneStone : materials.mossRock
    );
    cobble.scale.set(1.25, 0.78, 1.05);
    cobble.position.set(bx, Math.max(0.18, domeY), bz);
    cobble.rotation.set(rng() * 2, rng() * 3, rng() * 2);
    cobble.castShadow = true;
    cobble.receiveShadow = true;
    group.add(cobble);
  }

  // Sacred wooden fence posts around Funagata-ishi
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const px = Math.cos(a) * 5.1;
    const pz = Math.sin(a) * 2.35;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.11), materials.agedWood);
    post.position.set(px, 0.48, pz);
    group.add(post);
  }

  return group;
}

// Engraved Stone Poetry Monument / Shrine Pillar (和泉式部歌碑・社号標)
export function createStoneStele({ text = '貴船神社', tall = false, materials }) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.72, 0.34, 8),
    materials.kibuneStone
  );
  base.position.y = 0.17;
  group.add(base);

  if (tall) {
    // Tall square granite shrine entrance pillar (社号標)
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 2.85, 0.46),
      materials.stoneStep
    );
    pillar.position.y = 1.72;
    pillar.castShadow = true;
    group.add(pillar);

    const pTex = createPlaqueTexture(text, {
      vertical: true,
      bg: '#bcbdb8',
      fg: '#1a1b1d',
      border: '#8c8e88'
    });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 2.2),
      new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.8 })
    );
    face.position.set(0, 1.78, 0.235);
    group.add(face);
  } else {
    // Natural flat poetic waka monument stone (和泉式部歌碑)
    const stele = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.92, 1),
      materials.kibuneStone
    );
    stele.scale.set(1.15, 1.35, 0.42);
    stele.position.y = 1.15;
    stele.castShadow = true;
    group.add(stele);

    const pTex = createPlaqueTexture(text, {
      vertical: true,
      bg: '#4b4f58',
      fg: '#e8e4d8',
      border: '#5f6470'
    });
    const tablet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 1.05),
      new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.7 })
    );
    tablet.position.set(0, 1.18, 0.39);
    group.add(tablet);
  }

  return group;
}

// GPU-Instanced Primeval Cryptomeria Cedar Forest & Arching Momiji Maple Canopy!
export function populateValleyForest({ materials, foliageRegistry, snowRegistry }) {
  const group = new THREE.Group();
  group.name = 'KibuneForest';
  const rng = createRng(20261117);

  function isClearOfStructures(x, z) {
    const riverX = getRiverCenterX(z);
    const roadX = getRoadCenterX(z);
    // Keep clear of river + Kawadoko + road
    if (Math.abs(x - riverX) < 5.6) return false;
    if (Math.abs(x - roadX) < 4.2 && z > -118) return false;
    // Keep clear of Ryokan zone on East bank
    if (x > riverX + 3.2 && x < riverX + 12.5 && ((z > 44 && z < 60) || (z > 6 && z < 22) || (z > -32 && z < -16))) {
      return false;
    }
    // Keep clear of Hongu, Yui, and Okumiya courtyards
    if (x >= -42.5 && x <= -9.5 && z >= 5.5 && z <= 46.0) return false;
    if (x >= -36.0 && x <= -14.5 && z >= -50.0 && z <= -30.0) return false;
    if (x >= -22.5 && x <= 7.0 && z >= -166.0 && z <= -116.0) return false;
    // Keep clear of Omoi-gawa bridge & Cedar Avenue center
    if (Math.abs(x - -6.0) < 4.3 && z >= -118 && z <= -80) return false;
    // Keep clear of all 3 staircases
    for (const key of Object.keys(STAIR_CORRIDORS)) {
      const sc = STAIR_CORRIDORS[key];
      const proj = projectOntoSegment(x, z, sc.ax, sc.az, sc.bx, sc.bz);
      if (proj.rawT >= -0.08 && proj.rawT <= 1.08 && proj.dist < sc.halfWidth + 2.1) {
        return false;
      }
    }
    return true;
  }

  // 1. Collect Cedar positions (mountain slopes + formal Okumiya Cedar Avenue!)
  const cedarTransforms = [];

  // Formal ancient Cryptomeria avenue flanking Okumiya Sando (z = -87 to -115)
  for (let z = -88; z >= -115; z -= 4.4) {
    for (const side of [-1, 1]) {
      const cx = -6.0 + side * (4.6 + rng() * 0.5);
      const cy = getTerrainHeight(cx, z);
      cedarTransforms.push({ x: cx, y: cy, z, scale: 1.18 + rng() * 0.25 });
    }
  }

  // Valley-wide mountain forest cedars
  for (let i = 0; i < 1100 && cedarTransforms.length < 560; i++) {
    const x = -78 + rng() * 150;
    const z = -178 + rng() * 296;
    if (!isClearOfStructures(x, z)) continue;
    const y = getTerrainHeight(x, z);
    const scale = 0.78 + rng() * 0.68;
    cedarTransforms.push({ x, y, z, scale });
  }

  const countCedars = cedarTransforms.length;
  const cedarTrunkGeo = new THREE.CylinderGeometry(0.14, 0.42, 16.0, 7);
  cedarTrunkGeo.translate(0, 8.0, 0);
  const cedarCrown1Geo = new THREE.ConeGeometry(2.65, 9.5, 7);
  cedarCrown1Geo.translate(0, 12.2, 0);
  const cedarCrown2Geo = new THREE.ConeGeometry(1.95, 7.8, 7);
  cedarCrown2Geo.translate(0, 16.8, 0);

  const cedarLeafMat = new THREE.MeshStandardMaterial({
    color: 0x1e3f29,
    roughness: 0.88,
    metalness: 0.01
  });
  if (foliageRegistry) {
    foliageRegistry.push({ material: cedarLeafMat, type: 'cedar' });
  }

  const instTrunks = new THREE.InstancedMesh(cedarTrunkGeo, materials.agedWood, countCedars);
  const instCrown1 = new THREE.InstancedMesh(cedarCrown1Geo, cedarLeafMat, countCedars);
  const instCrown2 = new THREE.InstancedMesh(cedarCrown2Geo, cedarLeafMat, countCedars);
  instTrunks.castShadow = true;
  instCrown1.castShadow = true;
  instCrown2.castShadow = true;

  const dummy = new THREE.Object3D();
  const cTint = new THREE.Color();
  cedarTransforms.forEach((tr, idx) => {
    dummy.position.set(tr.x, tr.y - 0.2, tr.z);
    dummy.rotation.set(0, idx * 1.7, 0);
    dummy.scale.setScalar(tr.scale);
    dummy.updateMatrix();
    instTrunks.setMatrixAt(idx, dummy.matrix);
    instCrown1.setMatrixAt(idx, dummy.matrix);
    instCrown2.setMatrixAt(idx, dummy.matrix);

    cTint.setHSL(0.37 + (rng() - 0.5) * 0.04, 0.36, 0.22 + rng() * 0.09);
    instCrown1.setColorAt(idx, cTint);
    instCrown2.setColorAt(idx, cTint);
  });
  instCrown1.instanceColor.needsUpdate = true;
  instCrown2.instanceColor.needsUpdate = true;
  group.add(instTrunks, instCrown1, instCrown2);

  // Snow cones on Cedar tops for Winter mode!
  if (snowRegistry) {
    const snowCrownGeo = new THREE.ConeGeometry(1.98, 4.2, 7);
    snowCrownGeo.translate(0, 18.6, 0);
    const instCedarSnow = new THREE.InstancedMesh(snowCrownGeo, materials.snowCap, countCedars);
    cedarTransforms.forEach((tr, idx) => {
      dummy.position.set(tr.x, tr.y - 0.2, tr.z);
      dummy.rotation.set(0, idx * 1.7, 0);
      dummy.scale.setScalar(tr.scale);
      dummy.updateMatrix();
      instCedarSnow.setMatrixAt(idx, dummy.matrix);
    });
    group.add(instCedarSnow);
    instCedarSnow.visible = false;
    snowRegistry.push(instCedarSnow);
  }

  // 2. Arching Japanese Momiji Maples (いろは紅葉) framing Omotesando Steps, Kibune River & Shrines!
  const mapleSpots = [];

  // Iconic Momiji tunnel arching gracefully high over BOTH sides of Omotesando Stone Steps!
  const sc = STAIR_CORRIDORS.omotesando;
  const dx = sc.bx - sc.ax;
  const dz = sc.bz - sc.az;
  const len = Math.hypot(dx, dz);
  const px = -dz / len;
  const pz = dx / len;
  for (let s = 0.14; s <= 0.94; s += 0.11) {
    for (const side of [-1, 1]) {
      const mx = sc.ax + dx * s + px * side * (5.25 + rng() * 0.75);
      const mz = sc.az + dz * s + pz * side * (5.25 + rng() * 0.75);
      const my = getTerrainHeight(mx, mz);
      const leanAngle = Math.atan2(-px * side, -pz * side);
      mapleSpots.push({ x: mx, y: my, z: mz, scale: 1.06 + rng() * 0.22, yaw: leanAngle, lean: 0.21 });
    }
  }

  // Riverside & Courtyard Momiji trees along Kibune River, Hongu cliff, Yui-no-Yashiro, and Omoi-gawa
  for (let z = 108; z >= -135; z -= 6.5) {
    const rx = getRiverCenterX(z);
    for (const bankOffset of [-5.2, 5.4]) {
      const mx = rx + bankOffset + (rng() - 0.5) * 1.6;
      const mz = z + (rng() - 0.5) * 2.5;
      if (!isClearOfStructures(mx, mz)) continue;
      mapleSpots.push({
        x: mx,
        y: getTerrainHeight(mx, mz),
        z: mz,
        scale: 0.92 + rng() * 0.42,
        yaw: rng() * Math.PI * 2,
        lean: 0.18
      });
    }
  }

  // Extra Momiji framing Hongu cliff edge, Yui-no-Yashiro & Okumiya gate
  const curatedMaples = [
    [-11.2, 37.5], [-10.8, 22.0], [-13.5, 9.5], [-38.5, 31.0], [-39.0, 19.0],
    [-16.5, -33.0], [-17.0, -45.5], [-33.5, -34.0], [-10.5, -81.5], [-1.5, -81.5],
    [-11.2, -116.0], [-0.8, -116.0], [-19.5, -130.0], [3.5, -136.0]
  ];
  for (const [mx, mz] of curatedMaples) {
    mapleSpots.push({
      x: mx,
      y: getTerrainHeight(mx, mz),
      z: mz,
      scale: 1.12 + rng() * 0.25,
      yaw: rng() * Math.PI * 2,
      lean: 0.22
    });
  }

  const mCount = mapleSpots.length;
  const mTrunkGeo = new THREE.CylinderGeometry(0.08, 0.2, 5.8, 7);
  mTrunkGeo.translate(0, 2.9, 0);

  // Airy multi-tier Japanese maple crown positioned high (5.6m - 7.4m) so sightlines stay crisp!
  const mLeafGeo = new THREE.IcosahedronGeometry(1.38, 1);
  mLeafGeo.scale(1.45, 0.44, 1.35);
  mLeafGeo.translate(-0.55, 5.85, 1.15);

  const mLeafGeo2 = new THREE.IcosahedronGeometry(1.22, 1);
  mLeafGeo2.scale(1.4, 0.42, 1.3);
  mLeafGeo2.translate(0.75, 6.75, 1.85);

  const momijiMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x260803,
    emissiveIntensity: 0.35,
    roughness: 0.72,
    metalness: 0.02,
    flatShading: true
  });

  const instMapleTrunks = new THREE.InstancedMesh(mTrunkGeo, materials.agedWood, mCount);
  const instMapleLeaves1 = new THREE.InstancedMesh(mLeafGeo, momijiMat, mCount);
  const instMapleLeaves2 = new THREE.InstancedMesh(mLeafGeo2, momijiMat, mCount);
  instMapleTrunks.castShadow = true;
  instMapleLeaves1.castShadow = true;
  instMapleLeaves2.castShadow = true;

  const mapleSeeds = [];
  mapleSpots.forEach((mp, idx) => {
    dummy.position.set(mp.x, mp.y - 0.15, mp.z);
    dummy.rotation.set(0, mp.yaw, 0);
    dummy.rotateX(mp.lean);
    dummy.scale.setScalar(mp.scale);
    dummy.updateMatrix();
    instMapleTrunks.setMatrixAt(idx, dummy.matrix);
    instMapleLeaves1.setMatrixAt(idx, dummy.matrix);
    instMapleLeaves2.setMatrixAt(idx, dummy.matrix);
    mapleSeeds.push(rng());
  });

  group.add(instMapleTrunks, instMapleLeaves1, instMapleLeaves2);

  if (foliageRegistry) {
    foliageRegistry.push({
      type: 'instancedMomiji',
      material: momijiMat,
      meshes: [instMapleLeaves1, instMapleLeaves2],
      seeds: mapleSeeds
    });
  }

  // 3. Natural Mossy River Boulders along Kibune River & Hotaru-iwa / Tsutsumiga-iwa!
  for (let z = 112; z >= -145; z -= 3.4) {
    const rx = getRiverCenterX(z);
    for (const side of [-1, 1]) {
      const bx = rx + side * (3.7 + rng() * 1.4);
      const bz = z + (rng() - 0.5) * 1.8;
      const by = getTerrainHeight(bx, bz);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45 + rng() * 0.55, 1),
        rng() > 0.45 ? materials.mossRock : materials.kibuneStone
      );
      rock.scale.set(1.25, 0.72 + rng() * 0.35, 1.1);
      rock.position.set(bx, by + 0.12, bz);
      rock.rotation.set(rng(), rng() * 3, rng());
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }
  }

  return group;
}
