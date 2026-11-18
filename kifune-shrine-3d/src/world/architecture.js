import * as THREE from 'three';
import { createPlaqueTexture } from '../utils/textures.js';

function registerSnow(snowRegistry, mesh) {
  if (snowRegistry && mesh) {
    mesh.visible = false;
    snowRegistry.push(mesh);
  }
}

// Authentic curved Japanese roof (Irimoya / Kirizuma / Nagare-zukuri)
export function createCurvedJapaneseRoof({
  width = 8,
  depth = 6,
  height = 2.4,
  curveSag = 0.28,
  cornerLift = 0.32,
  nagareExtension = 0, // +Z front porch roof extension for Nagare-zukuri
  isGabled = true,
  chigi = false,
  katsuogiCount = 0,
  materials,
  snowRegistry
}) {
  const group = new THREE.Group();

  const segX = 20;
  const segZ = 18; // Even count guarantees an exact vertex row along the ridge!
  const totalDepth = depth + nagareExtension;
  const geo = new THREE.PlaneGeometry(width, totalDepth, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const halfW = width * 0.5;
  const backHalfD = depth * 0.5;
  const frontHalfD = depth * 0.5 + nagareExtension;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    // Normalize original PlaneGeometry Z in [-totalDepth/2, +totalDepth/2] -> [-1, +1]
    const rawNormZ = pos.getZ(i) / (totalDepth * 0.5);
    const origNormZ = Math.max(-1, Math.min(1, rawNormZ));
    const z = origNormZ >= 0 ? origNormZ * frontHalfD : origNormZ * backHalfD;
    pos.setZ(i, z);

    const nx = Math.min(1, Math.abs(x) / halfW); // 0 center -> 1 eave X
    const nz = Math.min(1, Math.abs(origNormZ)); // 0 exact ridge -> 1 eave Z

    let slopeFactor;
    if (isGabled) {
      // Irimoya: horizontal ridge along |nx| <= 0.34, hipped skirt beyond
      const ridgeExcess = Math.max(0, (nx - 0.34) / 0.66);
      slopeFactor = Math.min(1, Math.max(nz, ridgeExcess * (0.62 + 0.38 * nz)));
    } else {
      // Hipped pyramid (Hogyo / Yosemune)
      slopeFactor = Math.min(1, Math.max(nx, nz));
    }

    // Concave teri curve: steeper near ridge, flattening toward eaves
    const teri = Math.pow(Math.max(0, 1.0 - slopeFactor), 1.38);
    let y = teri * height - Math.sin(slopeFactor * Math.PI) * curveSag;

    // Graceful upturned corner sori
    const cornerFactor = Math.pow(nx * nz, 1.6);
    y += cornerFactor * cornerLift;

    // Gentle forward sweep for Nagare-zukuri front slope
    if (nagareExtension > 0 && z > backHalfD * 0.35) {
      const extT = (z - backHalfD * 0.35) / (frontHalfD - backHalfD * 0.35);
      y -= Math.sin(Math.min(1, extT) * Math.PI * 0.5) * 0.16;
    }

    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  // Extrude roof thickness slightly by pairing top copper surface + warm hinoki underside
  const topRoof = new THREE.Mesh(geo, materials.copperRoof);
  topRoof.castShadow = true;
  topRoof.receiveShadow = true;
  group.add(topRoof);

  const underGeo = geo.clone();
  underGeo.translate(0, -0.11, 0);
  const underMat = materials.darkCedar.clone();
  underMat.side = THREE.BackSide;
  const underRoof = new THREE.Mesh(underGeo, underMat);
  group.add(underRoof);

  // Winter snow cap mesh slightly above roof
  if (snowRegistry) {
    const snowGeo = geo.clone();
    snowGeo.scale(0.985, 1.0, 0.985);
    snowGeo.translate(0, 0.055, 0);
    const snowMesh = new THREE.Mesh(snowGeo, materials.snowCap);
    snowMesh.receiveShadow = true;
    group.add(snowMesh);
    registerSnow(snowRegistry, snowMesh);
  }

  // Main ridge beam (Munagawara) + gilded end caps (Onigawara) seated flush on roof crest
  const ridgeW = isGabled ? width * 0.68 : width * 0.36;
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(ridgeW, 0.24, 0.28),
    materials.blackLacquer
  );
  ridge.position.set(0, height - 0.01, 0);
  ridge.castShadow = true;
  group.add(ridge);

  const goldStrip = new THREE.Mesh(
    new THREE.BoxGeometry(ridgeW + 0.04, 0.05, 0.3),
    materials.goldHardware
  );
  goldStrip.position.set(0, height + 0.08, 0);
  group.add(goldStrip);

  for (const dir of [-1, 1]) {
    const oni = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.42, 0.36),
      materials.blackLacquer
    );
    oni.position.set(dir * (ridgeW * 0.5 + 0.05), height + 0.07, 0);
    group.add(oni);

    const oniGold = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8),
      materials.goldHardware
    );
    oniGold.rotation.z = Math.PI / 2;
    oniGold.position.set(dir * (ridgeW * 0.5 + 0.07), height + 0.17, 0);
    group.add(oniGold);
  }

  // Triangular white-plaster & timber gables (Tsuma) on Irimoya roofs
  if (isGabled) {
    for (const dir of [-1, 1]) {
      const gableShape = new THREE.Shape();
      const gw = depth * 0.34;
      const gh = height * 0.58;
      gableShape.moveTo(-gw, 0);
      gableShape.lineTo(gw, 0);
      gableShape.lineTo(0, gh);
      gableShape.closePath();

      const gableGeo = new THREE.ShapeGeometry(gableShape);
      const gable = new THREE.Mesh(gableGeo, materials.whitePlaster);
      gable.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      gable.position.set(dir * (ridgeW * 0.48), height * 0.4, 0);
      group.add(gable);
    }
  }

  // Sacred Chigi (forked roof finials) & Katsuogi (cylindrical ridge logs) for Honden/Gonden
  if (chigi) {
    for (const side of [-1, 1]) {
      for (const tilt of [-1, 1]) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 1.55, 0.14),
          materials.hinoki
        );
        blade.position.set(side * (ridgeW * 0.42), height + 0.44, tilt * 0.22);
        blade.rotation.x = tilt * 0.52;
        group.add(blade);

        const tipGold = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.22, 0.15),
          materials.goldHardware
        );
        tipGold.position.set(side * (ridgeW * 0.42), height + 1.08, tilt * 0.55);
        tipGold.rotation.x = tilt * 0.52;
        group.add(tipGold);
      }
    }
  }

  if (katsuogiCount > 0) {
    for (let i = 0; i < katsuogiCount; i++) {
      const t = katsuogiCount === 1 ? 0.5 : i / (katsuogiCount - 1);
      const kx = (t - 0.5) * (ridgeW * 0.68);
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.105, 0.92, 10),
        materials.hinoki
      );
      log.rotation.x = Math.PI / 2;
      log.position.set(kx, height + 0.19, 0);
      group.add(log);

      for (const end of [-1, 1]) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.092, 0.092, 0.08, 10),
          materials.goldHardware
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.set(kx, height + 0.19, end * 0.44);
        group.add(cap);
      }
    }
  }

  return group;
}

// Braided Shimenawa sacred rope with white zigzag Shide paper streamers
export function createShimenawa({ length = 4.2, thickness = 0.11, shideCount = 5, materials }) {
  const group = new THREE.Group();
  const segs = 22;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const x = (t - 0.5) * length;
    const sag = -Math.sin(t * Math.PI) * (length * 0.045);
    const taper = Math.sin(t * Math.PI) * 0.72 + 0.28;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(thickness * taper, 8, 6),
      materials.shimenawa
    );
    bead.scale.set(1.45, 0.95, 0.95);
    bead.position.set(x, sag, 0);
    group.add(bead);
  }

  // Hanging zigzag Shide streamers
  for (let s = 0; s < shideCount; s++) {
    const t = (s + 1) / (shideCount + 1);
    const x = (t - 0.5) * length * 0.78;
    const sag = -Math.sin(t * Math.PI) * (length * 0.045);
    const shideGroup = new THREE.Group();
    shideGroup.position.set(x, sag - 0.05, 0.03);
    for (let zigs = 0; zigs < 3; zigs++) {
      const flap = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.18),
        materials.shideWhite
      );
      flap.position.set((zigs % 2 === 0 ? -1 : 1) * 0.035, -0.09 - zigs * 0.13, 0);
      flap.rotation.z = (zigs % 2 === 0 ? 1 : -1) * 0.28;
      shideGroup.add(flap);
    }
    group.add(shideGroup);
  }

  return group;
}

// Authentic Myojin Torii (with curved Kasagi, Shimaki, Gakuzuka, plaque, Nemaki & Kamebara)
export function createMyojinTorii({
  width = 5.0,
  height = 6.2,
  pillarRadius = 0.24,
  plaqueText = '貴船神社',
  isWood = false,
  materials,
  snowRegistry
}) {
  const group = new THREE.Group();
  const mainMat = isWood ? materials.agedWood : materials.vermilion;
  const spanHalf = width * 0.5;

  // Two cylindrical pillars with slight authentic inward tilt (korobi) + stone Kamebara + black Nemaki
  for (const side of [-1, 1]) {
    const baseStone = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius * 1.48, pillarRadius * 1.68, 0.36, 14),
      materials.stoneStep
    );
    baseStone.position.set(side * spanHalf, 0.18, 0);
    baseStone.castShadow = true;
    baseStone.receiveShadow = true;
    group.add(baseStone);

    const nemaki = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius * 1.07, pillarRadius * 1.1, 0.95, 14),
      materials.blackLacquer
    );
    nemaki.position.set(side * (spanHalf - 0.015), 0.78, 0);
    nemaki.rotation.z = side * 0.024;
    nemaki.castShadow = true;
    group.add(nemaki);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius * 0.92, pillarRadius, height, 16),
      mainMat
    );
    pillar.position.set(side * (spanHalf - 0.07), height * 0.5 + 0.15, 0);
    pillar.rotation.z = side * 0.024;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // Nuki lower crossbeam + Kusabi wedges
  const nukiY = height * 0.77;
  const nukiLen = width + 1.55;
  const nuki = new THREE.Mesh(
    new THREE.BoxGeometry(nukiLen, pillarRadius * 1.05, pillarRadius * 0.72),
    mainMat
  );
  nuki.position.set(0, nukiY, 0);
  nuki.castShadow = true;
  group.add(nuki);

  for (const side of [-1, 1]) {
    const kusabi = new THREE.Mesh(
      new THREE.BoxGeometry(pillarRadius * 2.5, pillarRadius * 1.32, pillarRadius * 0.85),
      isWood ? materials.darkCedar : materials.blackLacquer
    );
    kusabi.position.set(side * (spanHalf - 0.08), nukiY, 0);
    group.add(kusabi);
  }

  // Curved Kasagi + Shimaki top lintel with upturned wingtips
  const topLen = width + 2.45;
  const segs = 24;
  const kasagiGeo = new THREE.BoxGeometry(topLen, pillarRadius * 1.15, pillarRadius * 1.55, segs, 1, 1);
  const shimakiGeo = new THREE.BoxGeometry(topLen - 0.28, pillarRadius * 0.82, pillarRadius * 1.2, segs, 1, 1);
  const capGeo = new THREE.BoxGeometry(topLen + 0.08, pillarRadius * 0.45, pillarRadius * 1.66, segs, 1, 1);

  for (const g of [kasagiGeo, shimakiGeo, capGeo]) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const nx = Math.abs(x) / (topLen * 0.5);
      const curveUp = Math.pow(nx, 2.35) * 0.44;
      p.setY(i, p.getY(i) + curveUp);
    }
    g.computeVertexNormals();
  }

  const shimaki = new THREE.Mesh(shimakiGeo, mainMat);
  shimaki.position.set(0, height + 0.05, 0);
  shimaki.castShadow = true;
  group.add(shimaki);

  const kasagi = new THREE.Mesh(kasagiGeo, mainMat);
  kasagi.position.set(0, height + 0.25, 0);
  kasagi.castShadow = true;
  group.add(kasagi);

  const blackCap = new THREE.Mesh(capGeo, materials.blackLacquer);
  blackCap.position.set(0, height + 0.42, 0);
  blackCap.castShadow = true;
  group.add(blackCap);

  if (snowRegistry) {
    const snowGeo = capGeo.clone();
    snowGeo.translate(0, 0.09, 0);
    const snowCap = new THREE.Mesh(snowGeo, materials.snowCap);
    snowCap.position.copy(blackCap.position);
    group.add(snowCap);
    registerSnow(snowRegistry, snowCap);
  }

  // Center Gakuzuka strut & framed calligraphy Hengaku plaque
  const strutH = height - nukiY;
  const gakuzuka = new THREE.Mesh(
    new THREE.BoxGeometry(pillarRadius * 0.9, strutH, pillarRadius * 0.65),
    mainMat
  );
  gakuzuka.position.set(0, nukiY + strutH * 0.5, 0);
  group.add(gakuzuka);

  if (plaqueText) {
    const plaqueTex = createPlaqueTexture(plaqueText, { vertical: true });
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.35,
      metalness: 0.25
    });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.18, 0.14), [
      materials.blackLacquer,
      materials.blackLacquer,
      materials.blackLacquer,
      materials.blackLacquer,
      plaqueMat,
      plaqueMat
    ]);
    plaque.position.set(0, (nukiY + height) * 0.5 + 0.05, 0);
    plaque.rotation.x = 0.08;
    group.add(plaque);
  }

  // Sacred Shimenawa suspended beneath Nuki
  const rope = createShimenawa({
    length: width - 0.55,
    thickness: 0.09,
    shideCount: 5,
    materials
  });
  rope.position.set(0, nukiY - 0.24, 0);
  group.add(rope);

  return group;
}

// Kifune's iconic Vermilion Wooden Kasuga-doro Lantern (春日灯籠)
export function createKasugaLantern({ scale = 1.0, materials, snowRegistry, glowMeshes }) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Stone base (Kiso)
  const stonePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.22, 0.68),
    materials.stoneStep
  );
  stonePlinth.position.y = 0.11;
  stonePlinth.castShadow = true;
  stonePlinth.receiveShadow = true;
  group.add(stonePlinth);

  const stoneCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.18, 8),
    materials.stoneStep
  );
  stoneCollar.position.y = 0.31;
  group.add(stoneCollar);

  // Vermilion wooden post (Sao)
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.115, 1.28, 10),
    materials.vermilion
  );
  post.position.y = 1.02;
  post.castShadow = true;
  group.add(post);

  // Tiered waist platform (Chudai) with decorative bracket arms
  const chudaiLower = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.09, 0.46),
    materials.vermilion
  );
  chudaiLower.position.y = 1.68;
  group.add(chudaiLower);

  const chudaiUpper = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.62),
    materials.vermilion
  );
  chudaiUpper.position.y = 1.77;
  chudaiUpper.castShadow = true;
  group.add(chudaiUpper);

  // Glowing Washi light box (Hibukuro) + 4 vermilion corner stiles
  const hibukuro = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.44, 0.42),
    materials.lanternGlow
  );
  hibukuro.position.y = 2.03;
  group.add(hibukuro);
  if (glowMeshes) glowMeshes.push(hibukuro);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const stile = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.46, 0.055),
        materials.vermilion
      );
      stile.position.set(sx * 0.2, 2.03, sz * 0.2);
      group.add(stile);
    }
  }

  // Curved shingle pyramid roof (Kasa) with upturned corners & brass Hoju jewel finial
  const kasaRoof = createCurvedJapaneseRoof({
    width: 0.94,
    depth: 0.94,
    height: 0.42,
    curveSag: 0.06,
    cornerLift: 0.1,
    isGabled: false,
    materials,
    snowRegistry
  });
  kasaRoof.position.y = 2.26;
  group.add(kasaRoof);

  const hojuBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 0.06, 10),
    materials.goldHardware
  );
  hojuBase.position.y = 2.71;
  group.add(hojuBase);

  const hojuJewel = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    materials.goldHardware
  );
  hojuJewel.scale.set(1, 1.35, 1);
  hojuJewel.position.y = 2.81;
  group.add(hojuJewel);

  return group;
}

// Traditional weathered mossy Stone Toro lantern for Okumiya cedar avenue & precincts
export function createStoneToro({ scale = 1.0, materials, snowRegistry, glowMeshes }) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.26, 6), materials.mossRock);
  base.position.y = 0.13;
  base.castShadow = true;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.05, 8), materials.stoneStep);
  post.position.y = 0.78;
  post.castShadow = true;
  group.add(post);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.24, 0.16, 6), materials.stoneStep);
  platform.position.y = 1.38;
  group.add(platform);

  const lightBox = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 6), materials.lanternGlow);
  lightBox.position.y = 1.64;
  group.add(lightBox);
  if (glowMeshes) glowMeshes.push(lightBox);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.36, 6), materials.mossRock);
  roof.position.y = 1.98;
  roof.castShadow = true;
  group.add(roof);

  if (snowRegistry) {
    const snowCone = new THREE.Mesh(new THREE.ConeGeometry(0.53, 0.22, 6), materials.snowCap);
    snowCone.position.y = 2.08;
    group.add(snowCone);
    registerSnow(snowRegistry, snowCone);
  }

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), materials.stoneStep);
  finial.position.y = 2.21;
  group.add(finial);

  return group;
}

// Four-legged Shrine Gate (Shinmon / Minamimon)
export function createShinmonGate({
  width = 6.2,
  depth = 3.4,
  height = 4.2,
  isVermilion = false,
  plaqueText = '',
  materials,
  snowRegistry,
  glowMeshes
}) {
  const group = new THREE.Group();
  const timberMat = isVermilion ? materials.vermilion : materials.hinoki;

  // Stone foundation plinths left & right leaving wide walkable central threshold
  for (const side of [-1, 1]) {
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, 0.32, depth),
      materials.stoneStep
    );
    plinth.position.set(side * (width * 0.34), 0.16, 0);
    plinth.receiveShadow = true;
    group.add(plinth);

    // Side bay lattice & white plaster wall
    const lowerWall = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, height * 0.44, 0.16),
      materials.whitePlaster
    );
    lowerWall.position.set(side * (width * 0.34), 0.32 + height * 0.22, 0);
    lowerWall.castShadow = true;
    group.add(lowerWall);

    // Upper wooden lattice bars
    for (let k = -3; k <= 3; k++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, height * 0.36, 0.05),
        timberMat
      );
      bar.position.set(side * (width * 0.34) + k * 0.16, 0.32 + height * 0.62, 0);
      group.add(bar);
    }
  }

  // Main gate columns (4 central + 4 outer)
  const colPositionsX = [-width * 0.45, -width * 0.22, width * 0.22, width * 0.45];
  const colPositionsZ = [-depth * 0.36, 0, depth * 0.36];
  for (const cx of colPositionsX) {
    for (const cz of colPositionsZ) {
      if (Math.abs(cx) > width * 0.3 && cz !== 0 && Math.abs(cz) > depth * 0.3) {
        // Outer corner posts
      }
      const r = cz === 0 ? 0.17 : 0.135;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 1.04, height, 14),
        timberMat
      );
      col.position.set(cx, height * 0.5 + 0.16, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);
    }
  }

  // Tie beams (Kashiranuki & Kouryou)
  const mainBeam = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, 0.26, 0.28),
    timberMat
  );
  mainBeam.position.set(0, height - 0.18, 0);
  mainBeam.castShadow = true;
  group.add(mainBeam);

  const upperBeam = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.8, 0.24, depth * 0.8),
    timberMat
  );
  upperBeam.position.set(0, height + 0.12, 0);
  group.add(upperBeam);

  // Hanging central brass Hexagonal Tsuri-doro lantern
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), materials.blackLacquer);
  cord.position.set(0, height - 0.45, 0);
  group.add(cord);

  const hangLantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.18, 0.36, 6),
    materials.lanternGlow
  );
  hangLantern.position.set(0, height - 0.82, 0);
  group.add(hangLantern);
  if (glowMeshes) glowMeshes.push(hangLantern);

  const hangCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.18, 6),
    materials.goldHardware
  );
  hangCap.position.set(0, height - 0.6, 0);
  group.add(hangCap);

  // Sacred Shimenawa across central bay
  const rope = createShimenawa({
    length: width * 0.42,
    thickness: 0.08,
    shideCount: 4,
    materials
  });
  rope.position.set(0, height - 0.42, depth * 0.38);
  group.add(rope);

  if (plaqueText) {
    const pTex = createPlaqueTexture(plaqueText, { vertical: false });
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.52, 0.1),
      new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.35 })
    );
    plaque.position.set(0, height - 0.12, depth * 0.42);
    group.add(plaque);
  }

  // Sweeping Irimoya Copper Roof
  const roof = createCurvedJapaneseRoof({
    width: width + 2.4,
    depth: depth + 2.1,
    height: 2.15,
    curveSag: 0.24,
    cornerLift: 0.32,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = height + 0.22;
  group.add(roof);

  return group;
}

// Grand Shrine Worship Hall (Haiden — 拝殿)
export function createHaiden({
  width = 10.6,
  depth = 7.4,
  height = 4.4,
  woodMat,
  materials,
  snowRegistry,
  glowMeshes
}) {
  const group = new THREE.Group();
  const timber = woodMat || materials.hinoki;

  // Stone foundation platform (Kidan)
  const kidan = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1.4, 0.68, depth + 1.4),
    materials.stoneStep
  );
  kidan.position.y = 0.34;
  kidan.castShadow = true;
  kidan.receiveShadow = true;
  group.add(kidan);

  // Raised wooden veranda (En) & railings (Kouran) with brass Giboshi finials
  const veranda = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.8, 0.18, depth + 0.8),
    timber
  );
  veranda.position.y = 0.92;
  veranda.castShadow = true;
  veranda.receiveShadow = true;
  group.add(veranda);

  // Perimeter columns supporting Haiden
  const colsX = 5;
  const colsZ = 4;
  for (let ix = 0; ix < colsX; ix++) {
    for (let iz = 0; iz < colsZ; iz++) {
      if (ix > 0 && ix < colsX - 1 && iz > 0 && iz < colsZ - 1) continue;
      const cx = ((ix / (colsX - 1)) - 0.5) * (width - 1.2);
      const cz = ((iz / (colsZ - 1)) - 0.5) * (depth - 1.2);
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.195, height, 14),
        timber
      );
      col.position.set(cx, 1.0 + height * 0.5, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);
    }
  }

  // Side & rear slatted wooden panels / shoji screens + warm sacred interior altar glow
  const innerChamber = new THREE.Mesh(
    new THREE.BoxGeometry(width - 2.2, height - 0.8, depth - 2.2),
    materials.agedWood
  );
  innerChamber.position.set(0, 1.0 + (height - 0.8) * 0.5, -0.3);
  group.add(innerChamber);

  const altarGlowPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.42, height * 0.52),
    materials.shojiGlow
  );
  altarGlowPanel.position.set(0, 1.0 + height * 0.44, depth * 0.5 - 1.15);
  group.add(altarGlowPanel);
  if (glowMeshes) glowMeshes.push(altarGlowPanel);

  // Golden Gohei /Sacred Mirror (Shinkyo) glimmering inside Haiden
  const mirrorStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20),
    materials.goldHardware
  );
  mirrorStand.rotation.x = Math.PI / 2;
  mirrorStand.position.set(0, 2.35, depth * 0.5 - 0.95);
  group.add(mirrorStand);

  // Veranda Railings with Brass Giboshi posts (leaving front center open for steps)
  const railY = 1.52;
  for (const side of [-1, 1]) {
    const sideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, depth + 0.7),
      timber
    );
    sideRail.position.set(side * (width * 0.5 + 0.32), railY, 0);
    group.add(sideRail);

    const frontHalfRail = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.3, 0.09, 0.09),
      timber
    );
    frontHalfRail.position.set(side * (width * 0.36), railY, depth * 0.5 + 0.32);
    group.add(frontHalfRail);

    for (const zSign of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 10), timber);
      post.position.set(side * (width * 0.5 + 0.32), 1.28, zSign * (depth * 0.5 + 0.32));
      group.add(post);
      const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), materials.goldHardware);
      giboshi.scale.set(1, 1.35, 1);
      giboshi.position.set(side * (width * 0.5 + 0.32), 1.65, zSign * (depth * 0.5 + 0.32));
      group.add(giboshi);
    }
  }

  // Front Mukouhai (worship porch steps, pillars, Saisen-bako offering box, Suzu bell & curtain)
  const stepWidth = 3.6;
  for (let s = 0; s < 5; s++) {
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth, 0.19, 0.38),
      timber
    );
    st.position.set(0, 0.12 + s * 0.19, depth * 0.5 + 1.95 - s * 0.34);
    st.castShadow = true;
    st.receiveShadow = true;
    group.add(st);
  }

  // Porch front square chamfered columns
  for (const side of [-1, 1]) {
    const pCol = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, height * 0.88, 0.28),
      timber
    );
    pCol.position.set(side * 1.95, 0.45 + height * 0.44, depth * 0.5 + 1.65);
    pCol.castShadow = true;
    group.add(pCol);

    const pBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.22, 0.44),
      materials.stoneStep
    );
    pBase.position.set(side * 1.95, 0.11, depth * 0.5 + 1.65);
    group.add(pBase);

    // Hanging brass Tsuri-doro lanterns on both sides of front eaves
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.32, 6),
      materials.lanternGlow
    );
    lantern.position.set(side * 2.55, height * 0.82, depth * 0.5 + 0.95);
    group.add(lantern);
    if (glowMeshes) glowMeshes.push(lantern);
  }

  // Purple crested Shrine Curtain (Jinmaku) across front beam
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.72, 0.88),
    materials.curtain
  );
  curtain.position.set(0, height * 0.88 + 0.45, depth * 0.5 - 0.52);
  group.add(curtain);

  const shimenawa = createShimenawa({
    length: 3.7,
    thickness: 0.1,
    shideCount: 5,
    materials
  });
  shimenawa.position.set(0, height * 0.85, depth * 0.5 + 1.68);
  group.add(shimenawa);

  // Saisen-bako (Wooden Slatted Offering Box)
  const saisen = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.78, 0.92),
    timber
  );
  saisen.position.set(0, 1.32, depth * 0.5 + 0.35);
  saisen.castShadow = true;
  group.add(saisen);

  const saisenGold = new THREE.Mesh(
    new THREE.BoxGeometry(1.99, 0.08, 0.96),
    materials.goldHardware
  );
  saisenGold.position.set(0, 1.68, depth * 0.5 + 0.35);
  group.add(saisenGold);

  // Suzu Shrine Bell + Red/White Braided Suzu-o Rope
  const suzuBell = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 12),
    materials.goldHardware
  );
  suzuBell.position.set(0, height * 0.78, depth * 0.5 + 0.55);
  group.add(suzuBell);

  const suzuRope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.045, 2.05, 10),
    materials.vermilion
  );
  suzuRope.position.set(0, height * 0.78 - 1.15, depth * 0.5 + 0.55);
  group.add(suzuRope);

  // Grand Sweeping Irimoya Copper Roof with Nagare front porch extension
  const roof = createCurvedJapaneseRoof({
    width: width + 3.4,
    depth: depth + 2.8,
    height: 3.1,
    curveSag: 0.34,
    cornerLift: 0.44,
    nagareExtension: 1.65,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = 1.0 + height;
  group.add(roof);

  return { group, suzuBell, suzuRope };
}

// Sacred Inner Sanctuary (Honden / Gonden — 流造 Nagare-zukuri with Chigi & Katsuogi)
export function createHonden({
  width = 5.4,
  depth = 4.2,
  height = 3.8,
  woodMat,
  chigi = true,
  katsuogiCount = 5,
  withFence = true,
  materials,
  snowRegistry
}) {
  const group = new THREE.Group();
  const timber = woodMat || materials.hinoki;

  // Raised sacred floor on stilts (Takayuka)
  const stoneBase = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.8, 0.45, depth + 0.8),
    materials.stoneStep
  );
  stoneBase.position.y = 0.225;
  stoneBase.receiveShadow = true;
  group.add(stoneBase);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.8, height * 0.72, depth - 0.8),
    timber
  );
  body.position.set(0, 1.15 + height * 0.36, -0.2);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Sacred double doors with gold hardware fittings
  const doorGold = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.65),
    materials.goldHardware
  );
  doorGold.position.set(0, 2.1, depth * 0.5 - 0.58);
  group.add(doorGold);

  // Veranda & steep Kizahashi sacred stairs
  const veranda = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.16, depth + 0.6),
    timber
  );
  veranda.position.set(0, 1.15, 0.1);
  veranda.castShadow = true;
  group.add(veranda);

  const stairs = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.18, 1.85),
    timber
  );
  stairs.rotation.x = 0.58;
  stairs.position.set(0, 0.65, depth * 0.5 + 0.85);
  stairs.castShadow = true;
  group.add(stairs);

  // Sweeping Nagare-zukuri Roof with Chigi & Katsuogi
  const roof = createCurvedJapaneseRoof({
    width: width + 2.4,
    depth: depth + 1.8,
    height: 2.55,
    curveSag: 0.32,
    cornerLift: 0.36,
    nagareExtension: 1.55,
    isGabled: true,
    chigi,
    katsuogiCount,
    materials,
    snowRegistry
  });
  roof.position.y = 1.15 + height * 0.72;
  group.add(roof);

  // Sacred Tamagaki / Sukibei enclosure fence
  if (withFence) {
    const fw = width + 4.4;
    const fd = depth + 4.4;
    const fh = 1.65;
    const segments = [
      { pos: [0, fh * 0.5, -fd * 0.5], size: [fw, fh, 0.14] },
      { pos: [-fw * 0.5, fh * 0.5, 0], size: [0.14, fh, fd] },
      { pos: [fw * 0.5, fh * 0.5, 0], size: [0.14, fh, fd] },
      { pos: [-fw * 0.32, fh * 0.5, fd * 0.5], size: [fw * 0.36, fh, 0.14] },
      { pos: [fw * 0.32, fh * 0.5, fd * 0.5], size: [fw * 0.36, fh, 0.14] }
    ];
    for (const seg of segments) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(...seg.size), timber);
      wall.position.set(...seg.pos);
      wall.castShadow = true;
      group.add(wall);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(seg.size[0] + 0.12, 0.14, seg.size[2] + 0.22),
        materials.copperRoof
      );
      cap.position.set(seg.pos[0], fh + 0.06, seg.pos[2]);
      group.add(cap);
    }
  }

  return group;
}

// Kifune's Cliffside Overhanging Pavilion: Ryusenkaku (龍船閣 — Kakezukuri style)
export function createRyusenkaku({ cliffDrop = 7.2, materials, snowRegistry, glowMeshes }) {
  const group = new THREE.Group();
  const w = 6.2;
  const d = 6.8;

  // Dramatic Kakezukuri timber pillar scaffolding descending down the stone cliff face!
  const gridX = [-2.4, 0, 2.4];
  const gridZ = [-2.5, 0, 2.5];
  for (const gx of gridX) {
    for (const gz of gridZ) {
      const postLen = gx >= 0 ? cliffDrop : 1.4;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, postLen, 12),
        materials.agedWood
      );
      post.position.set(gx, 0.35 - postLen * 0.5, gz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // Horizontal & cross-tie beams (Nuki) locking the overhanging Kakezukuri scaffold
  for (let level = 1; level <= 3; level++) {
    const by = 0.2 - level * 1.75;
    for (const gz of gridZ) {
      const tieX = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.16, 0.16),
        materials.agedWood
      );
      tieX.position.set(1.2, by, gz);
      group.add(tieX);
    }
    const tieZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, d - 1.2),
      materials.agedWood
    );
    tieZ.position.set(2.4, by, 0);
    group.add(tieZ);
  }

  // Main wooden viewing deck & pavilion columns
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.24, d),
    materials.hinoki
  );
  deck.position.y = 0.35;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const pavH = 3.2;
  for (const gx of [-w * 0.44, w * 0.44]) {
    for (const gz of [-d * 0.44, 0, d * 0.44]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.16, pavH, 12),
        materials.hinoki
      );
      col.position.set(gx, 0.47 + pavH * 0.5, gz);
      col.castShadow = true;
      group.add(col);
    }
  }

  // Perimeter viewing railings (open on West courtyard entry side)
  const railH = 1.05;
  const eastRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, d), materials.hinoki);
  eastRail.position.set(w * 0.46, railH, 0);
  group.add(eastRail);
  for (const sz of [-1, 1]) {
    const nr = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.09), materials.hinoki);
    nr.position.set(0, railH, sz * d * 0.46);
    group.add(nr);
  }

  // Interior rest benches (Naga-isu) for pilgrims
  for (const bz of [-1.6, 1.6]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.62), materials.hinoki);
    bench.position.set(0.4, 0.68, bz);
    bench.castShadow = true;
    group.add(bench);
    const mosen = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.04, 0.58), materials.redMosen);
    mosen.position.set(0.4, 0.9, bz);
    group.add(mosen);
  }

  // Traditional plaque reading right-to-left: 「閣船龍」
  const plaqueTex = createPlaqueTexture('閣船龍', { vertical: false });
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.52, 1.45),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.35 })
  );
  plaque.position.set(-w * 0.46, 3.25, 0);
  group.add(plaque);

  // Warm pavilion ceiling lantern
  const ceilLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    materials.lanternGlow
  );
  ceilLantern.position.set(0, 3.1, 0);
  group.add(ceilLantern);
  if (glowMeshes) glowMeshes.push(ceilLantern);

  // Sweeping Copper Roof
  const roof = createCurvedJapaneseRoof({
    width: w + 2.2,
    depth: d + 2.2,
    height: 2.05,
    curveSag: 0.24,
    cornerLift: 0.32,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = 0.47 + pavH;
  group.add(roof);

  return group;
}

// Temizuya (手水舎 — Purification Water Pavilion)
export function createTemizuya({ materials, snowRegistry }) {
  const group = new THREE.Group();
  const w = 3.2;
  const d = 2.6;
  const h = 2.65;

  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.16, d + 0.5), materials.stoneStep);
  base.position.y = 0.08;
  base.receiveShadow = true;
  group.add(base);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, h, 0.18),
        materials.hinoki
      );
      col.position.set(sx * (w * 0.42), 0.16 + h * 0.5, sz * (d * 0.42));
      col.castShadow = true;
      group.add(col);
    }
  }

  // Carved Kibune-stone basin + water surface + bamboo ladles (Hishaku)
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.68, 1.05),
    materials.kibuneStone
  );
  basin.position.y = 0.48;
  basin.castShadow = true;
  group.add(basin);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, 0.82),
    new THREE.MeshStandardMaterial({
      color: 0x266163,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.83;
  group.add(water);

  const bambooPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.48, 10),
    materials.bamboo
  );
  bambooPipe.rotation.z = Math.PI / 2;
  bambooPipe.position.set(0, 0.92, -0.18);
  group.add(bambooPipe);

  for (let i = -1; i <= 1; i++) {
    const ladleHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.56, 6),
      materials.hinoki
    );
    ladleHandle.rotation.x = Math.PI / 2;
    ladleHandle.position.set(i * 0.36, 0.89, 0.14);
    group.add(ladleHandle);

    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.04, 0.07, 10),
      materials.hinoki
    );
    cup.position.set(i * 0.36, 0.89, -0.12);
    group.add(cup);
  }

  const roof = createCurvedJapaneseRoof({
    width: w + 1.3,
    depth: d + 1.3,
    height: 1.35,
    curveSag: 0.18,
    cornerLift: 0.22,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = 0.16 + h;
  group.add(roof);

  return group;
}

// Sacred Spring Goshinsui & Mizuura-Yuniwa Water Fortune Basin (御神水・水占齋庭)
export function createMizuuraYuniwa({ springMat, materials }) {
  const group = new THREE.Group();

  // Stacked natural Kibune-ishi stone spring wall
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 1.15 - 0.2;
    const rad = 1.65 + (i % 3) * 0.22;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.42 + (i % 4) * 0.11, 1),
      i % 2 === 0 ? materials.kibuneStone : materials.mossRock
    );
    rock.scale.set(1.25, 0.9, 1.05);
    rock.position.set(Math.cos(angle) * rad * 0.7 - 0.6, 0.45 + (i % 3) * 0.42, Math.sin(angle) * 1.25);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // Stone basin rim enclosing Mizuura-Yuniwa
  const rimOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.88, 0.52, 18),
    materials.kibuneStone
  );
  rimOuter.scale.set(1.0, 1.0, 1.35);
  rimOuter.position.set(0.55, 0.26, 0);
  rimOuter.castShadow = true;
  rimOuter.receiveShadow = true;
  group.add(rimOuter);

  const basinInnerBed = new THREE.Mesh(
    new THREE.CylinderGeometry(1.48, 1.48, 0.08, 18),
    materials.mossRock
  );
  basinInnerBed.scale.set(1.0, 1.0, 1.35);
  basinInnerBed.position.set(0.55, 0.46, 0);
  group.add(basinInnerBed);

  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(1.46, 24),
    springMat
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.scale.set(1.0, 1.35, 1.0);
  waterSurface.position.set(0.55, 0.53, 0);
  waterSurface.renderOrder = 3;
  group.add(waterSurface);

  // Two bamboo spouts pouring clear sacred Goshinsui spring streams
  for (const sz of [-0.45, 0.45]) {
    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.95, 10),
      materials.bamboo
    );
    spout.rotation.z = -1.28;
    spout.position.set(-0.62, 1.05, sz);
    group.add(spout);

    // Translucent pouring water arc
    const streamArc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.032, 0.62, 8),
      new THREE.MeshStandardMaterial({
        color: 0xdff6fa,
        transparent: true,
        opacity: 0.72,
        roughness: 0.1
      })
    );
    streamArc.rotation.z = -0.35;
    streamArc.position.set(-0.12, 0.72, sz);
    group.add(streamArc);
  }

  // Floating white Mizuura-mikuji paper slips on the sacred water!
  const floatingSlips = [];
  const slipOffsets = [
    [0.42, -0.35, 0.25],
    [0.88, 0.22, -0.4],
    [0.35, 0.62, 0.75],
    [1.05, -0.58, 1.1]
  ];
  for (const [ox, oz, rot] of slipOffsets) {
    const slip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.36),
      new THREE.MeshStandardMaterial({
        color: 0xfbfaf5,
        transparent: true,
        opacity: 0.9,
        roughness: 0.4
      })
    );
    slip.rotation.x = -Math.PI / 2;
    slip.rotation.z = rot;
    slip.position.set(ox, 0.542, oz);
    group.add(slip);
    floatingSlips.push({ mesh: slip, baseX: ox, baseZ: oz, phase: rot * 3.1 });
  }

  return { group, floatingSlips };
}

// Sculpted Black & White Sacred Horse Statues (神馬像 — Birthplace of Ema) + Ema Racks
export function createSacredHorsesAndEma({ materials }) {
  const group = new THREE.Group();

  // Natural sculpted stone pedestal
  const baseRock = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 2.05, 0.95, 12),
    materials.kibuneStone
  );
  baseRock.scale.set(1.2, 1.0, 0.88);
  baseRock.position.y = 0.475;
  baseRock.castShadow = true;
  baseRock.receiveShadow = true;
  group.add(baseRock);

  function buildHorseMesh(isWhite) {
    const hGroup = new THREE.Group();
    const coatMat = isWhite
      ? new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.42, metalness: 0.12 })
      : new THREE.MeshStandardMaterial({ color: 0x1d1c1e, roughness: 0.32, metalness: 0.35 });

    // Torso (barrel + chest + hindquarters)
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.76, 8, 14), coatMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.95, 0);
    barrel.castShadow = true;
    hGroup.add(barrel);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 10), coatMat);
    chest.position.set(0.38, 0.98, 0);
    hGroup.add(chest);

    const croup = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 10), coatMat);
    croup.position.set(-0.4, 0.97, 0);
    hGroup.add(croup);

    // Noble arched neck & head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.23, 0.68, 10), coatMat);
    neck.position.set(0.54, 1.32, 0);
    neck.rotation.z = -0.45;
    neck.castShadow = true;
    hGroup.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.19), coatMat);
    head.position.set(0.76, 1.56, 0);
    head.rotation.z = -0.38;
    hGroup.add(head);

    // Ears & flowing mane
    for (const ez of [-0.06, 0.06]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), coatMat);
      ear.position.set(0.64, 1.71, ez);
      hGroup.add(ear);
    }

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 0.68, 8), coatMat);
    tail.position.set(-0.74, 0.82, 0);
    tail.rotation.z = 0.42;
    hGroup.add(tail);

    // 4 sculpted legs (one front leg raised in spirited motion for white horse)
    const legCoords = [
      [0.38, 0.14, true],
      [0.38, -0.14, false],
      [-0.4, 0.14, false],
      [-0.4, -0.14, false]
    ];
    for (const [lx, lz, raised] of legCoords) {
      if (raised && isWhite) {
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.44, 8), coatMat);
        upper.position.set(lx + 0.14, 0.72, lz);
        upper.rotation.z = -0.78;
        hGroup.add(upper);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.42, 8), coatMat);
        lower.position.set(lx + 0.26, 0.46, lz);
        lower.rotation.z = 0.35;
        hGroup.add(lower);
      } else {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.045, 0.88, 8), coatMat);
        leg.position.set(lx, 0.45, lz);
        leg.castShadow = true;
        hGroup.add(leg);
      }
    }

    return hGroup;
  }

  const blackHorse = buildHorseMesh(false);
  blackHorse.position.set(-0.22, 0.92, -0.38);
  blackHorse.rotation.y = 0.15;
  group.add(blackHorse);

  const whiteHorse = buildHorseMesh(true);
  whiteHorse.position.set(0.24, 0.96, 0.36);
  whiteHorse.rotation.y = -0.1;
  group.add(whiteHorse);

  // Wooden Ema-kake (絵馬掛) rack beside the horses
  const emaRack = new THREE.Group();
  emaRack.position.set(-2.35, 0, -1.2);
  for (const sx of [-1.1, 1.1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.05, 0.12), materials.hinoki);
    p.position.set(sx, 1.02, 0);
    p.castShadow = true;
    emaRack.add(p);
  }
  const emaRoof = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.12, 0.65), materials.copperRoof);
  emaRoof.position.set(0, 2.08, 0);
  emaRack.add(emaRoof);

  for (let r = 0; r < 3; r++) {
    const barY = 0.85 + r * 0.36;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.04), materials.hinoki);
    bar.position.set(0, barY, 0);
    emaRack.add(bar);

    for (let c = -4; c <= 4; c++) {
      const ema = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.025), materials.hinoki);
      ema.position.set(c * 0.22, barY - 0.1, (c % 2) * 0.02);
      ema.rotation.y = ((c + r) % 3 - 1) * 0.08;
      emaRack.add(ema);
    }
  }
  group.add(emaRack);

  return group;
}

// Musubibumi Racks (薄緑色の結び文掛け — Knotted Wish Racks at Yui-no-Yashiro)
export function createMusubibumiRack({ materials }) {
  const group = new THREE.Group();
  for (const sx of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.95, 0.11), materials.agedWood);
    post.position.set(sx, 0.97, 0);
    post.castShadow = true;
    group.add(post);
  }
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.12, 0.55), materials.copperRoof);
  topCap.position.set(0, 1.98, 0);
  group.add(topCap);

  const knotsContainer = new THREE.Group();
  group.add(knotsContainer);

  for (let row = 0; row < 4; row++) {
    const ry = 0.62 + row * 0.31;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.45, 6), materials.bamboo);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, ry, 0);
    group.add(rod);

    for (let col = -6; col <= 6; col++) {
      if ((row + col) % 5 === 0) continue;
      const knot = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.24, 0.02),
        materials.musubibumiGreen
      );
      knot.position.set(col * 0.175, ry - 0.09, 0);
      knot.rotation.z = ((col * 7 + row * 3) % 5 - 2) * 0.12;
      knotsContainer.add(knot);
    }
  }

  return { group, knotsContainer };
}

// Auxiliary Hokora / Massha small shrine (末社)
export function createHokora({ scale = 1.0, isVermilion = false, materials, snowRegistry }) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const stonePedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.65, 1.15),
    materials.stoneStep
  );
  stonePedestal.position.y = 0.325;
  stonePedestal.castShadow = true;
  stonePedestal.receiveShadow = true;
  group.add(stonePedestal);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.95, 0.82),
    isVermilion ? materials.vermilion : materials.agedWood
  );
  body.position.y = 1.12;
  body.castShadow = true;
  group.add(body);

  const roof = createCurvedJapaneseRoof({
    width: 1.48,
    depth: 1.52,
    height: 0.75,
    curveSag: 0.1,
    cornerLift: 0.14,
    nagareExtension: 0.28,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = 1.58;
  group.add(roof);

  return group;
}

// Reception Building / Shamusho & Saikan (社務所・授与所・斎館)
export function createShrinePavilionBuilding({
  width = 8.4,
  depth = 5.2,
  height = 3.4,
  hasCounter = true,
  materials,
  snowRegistry,
  glowMeshes
}) {
  const group = new THREE.Group();

  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.36, depth + 0.4),
    materials.stoneStep
  );
  foundation.position.y = 0.18;
  foundation.receiveShadow = true;
  group.add(foundation);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    materials.whitePlaster
  );
  walls.position.y = 0.36 + height * 0.5;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Dark cedar wainscot (Koshikabe) + timber posts
  const wainscot = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.06, height * 0.36, depth + 0.06),
    materials.darkCedar
  );
  wainscot.position.y = 0.36 + height * 0.18;
  group.add(wainscot);

  if (hasCounter) {
    // Glowing Juyosho window facing East (+X) onto Hongu courtyard
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.68, height * 0.44),
      materials.shojiGlow
    );
    win.rotation.y = Math.PI / 2;
    win.position.set(width * 0.5 + 0.04, 0.36 + height * 0.58, 0);
    group.add(win);
    if (glowMeshes) glowMeshes.push(win);

    const counterShelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, width * 0.72),
      materials.hinoki
    );
    counterShelf.position.set(width * 0.5 + 0.25, 0.36 + height * 0.35, 0);
    group.add(counterShelf);
  }

  const roof = createCurvedJapaneseRoof({
    width: width + 2.0,
    depth: depth + 2.0,
    height: 1.95,
    curveSag: 0.22,
    cornerLift: 0.28,
    isGabled: true,
    materials,
    snowRegistry
  });
  roof.position.y = 0.36 + height;
  group.add(roof);

  return group;
}

// Kibune's Famous Riverside Kawadoko Platform & Traditional Ryokan (川床料理席と料理旅館)
export function createKawadokoAndRyokan({
  deckWidth = 7.6,
  deckLength = 8.8,
  materials,
  snowRegistry,
  glowMeshes,
  ryokanEastSide = true,
  signText = '貴船茶屋'
}) {
  const group = new THREE.Group();

  // Timber pilings standing directly in the rushing Kibune River
  for (const px of [-deckWidth * 0.42, 0, deckWidth * 0.42]) {
    for (const pz of [-deckLength * 0.42, 0, deckLength * 0.42]) {
      const pile = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.1, 1.8, 8),
        materials.agedWood
      );
      pile.position.set(px, -0.85, pz);
      group.add(pile);
    }
  }

  // Bamboo & timber deck frame just 55cm above rushing white-water cascades!
  const deckFrame = new THREE.Mesh(
    new THREE.BoxGeometry(deckWidth, 0.14, deckLength),
    materials.agedWood
  );
  deckFrame.position.y = 0;
  deckFrame.castShadow = true;
  deckFrame.receiveShadow = true;
  group.add(deckFrame);

  // Woven Tatami mats + crimson Mosen felt runners + low Zataku dining tables
  const tatamiSurface = new THREE.Mesh(
    new THREE.BoxGeometry(deckWidth - 0.5, 0.06, deckLength - 0.5),
    materials.tatami
  );
  tatamiSurface.position.y = 0.1;
  tatamiSurface.receiveShadow = true;
  group.add(tatamiSurface);

  for (const rowZ of [-2.3, 0, 2.3]) {
    const mosen = new THREE.Mesh(
      new THREE.BoxGeometry(deckWidth - 1.4, 0.025, 1.55),
      materials.redMosen
    );
    mosen.position.set(0, 0.14, rowZ);
    group.add(mosen);

    const lowTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.28, 0.85),
      materials.blackLacquer
    );
    lowTable.position.set(0, 0.29, rowZ);
    lowTable.castShadow = true;
    group.add(lowTable);
  }

  // Bamboo railings & overhead Sudare reed sunshade trellis + warm Bonbori lanterns
  const canopyH = 2.55;
  for (const cx of [-deckWidth * 0.46, deckWidth * 0.46]) {
    for (const cz of [-deckLength * 0.46, 0, deckLength * 0.46]) {
      const bambooPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.06, canopyH, 8),
        materials.bamboo
      );
      bambooPost.position.set(cx, canopyH * 0.5, cz);
      group.add(bambooPost);

      // Glowing round Bonbori lantern on perimeter posts
      const bonbori = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.13, 0.28, 10),
        materials.lanternGlow
      );
      bonbori.position.set(cx, 1.15, cz);
      group.add(bonbori);
      if (glowMeshes) glowMeshes.push(bonbori);

      const bonCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.21, 0.1, 10),
        materials.blackLacquer
      );
      bonCap.position.set(cx, 1.33, cz);
      group.add(bonCap);
    }
  }

  // Overhead Sudare bamboo screen canopy
  const sudareMat = new THREE.MeshStandardMaterial({
    color: 0x8b734b,
    transparent: true,
    opacity: 0.74,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const sudareCanopy = new THREE.Mesh(
    new THREE.PlaneGeometry(deckWidth + 0.4, deckLength + 0.4),
    sudareMat
  );
  sudareCanopy.rotation.x = -Math.PI / 2;
  sudareCanopy.position.y = canopyH;
  group.add(sudareCanopy);

  // Adjacent Traditional 2-Story Kyoto Kibune Ryokan (料理旅館) on the East bank
  if (ryokanEastSide) {
    const ryokan = new THREE.Group();
    ryokan.position.set(deckWidth * 0.5 + 3.8, 0.35, 0);

    const rW = 6.2;
    const rD = deckLength + 1.2;
    const rH = 5.6;

    const body = new THREE.Mesh(new THREE.BoxGeometry(rW, rH, rD), materials.darkCedar);
    body.position.y = rH * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    ryokan.add(body);

    // 1st & 2nd floor glowing Shoji windows overlooking the river
    for (const wy of [1.55, 4.05]) {
      const shoji = new THREE.Mesh(
        new THREE.PlaneGeometry(rD * 0.78, 1.45),
        materials.shojiGlow
      );
      shoji.rotation.y = -Math.PI / 2;
      shoji.position.set(-rW * 0.5 - 0.03, wy, 0);
      ryokan.add(shoji);
      if (glowMeshes) glowMeshes.push(shoji);
    }

    // Sign plaque
    const sTex = createPlaqueTexture(signText, {
      vertical: true,
      bg: '#1c2536',
      fg: '#f5efe4',
      border: '#3b4a62'
    });
    const noren = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 1.45),
      new THREE.MeshStandardMaterial({ map: sTex, side: THREE.DoubleSide })
    );
    noren.rotation.y = -Math.PI / 2;
    noren.position.set(-rW * 0.5 - 0.35, 2.0, -rD * 0.3);
    ryokan.add(noren);

    const rRoof = createCurvedJapaneseRoof({
      width: rW + 1.8,
      depth: rD + 1.8,
      height: 1.9,
      curveSag: 0.2,
      cornerLift: 0.24,
      isGabled: true,
      materials,
      snowRegistry
    });
    rRoof.position.y = rH;
    ryokan.add(rRoof);

    group.add(ryokan);
  }

  return group;
}

// Arched Japanese Shrine Bridge (梅宮橋・思ひ川橋・鈴鹿橋)
export function createJapaneseBridge({
  span = 11.0,
  width = 3.4,
  archHeight = 0.52,
  isVermilion = true,
  alongX = true,
  materials
}) {
  const group = new THREE.Group();
  const railMat = isVermilion ? materials.vermilion : materials.hinoki;
  const segs = 18;

  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const posAlong = (t - 0.5) * span;
    const archY = Math.sin(t * Math.PI) * archHeight;
    const slopeAngle = -Math.cos(t * Math.PI) * ((archHeight * Math.PI) / span);

    const plank = new THREE.Mesh(
      alongX
        ? new THREE.BoxGeometry(span / segs + 0.04, 0.16, width)
        : new THREE.BoxGeometry(width, 0.16, span / segs + 0.04),
      materials.agedWood
    );
    if (alongX) {
      plank.position.set(posAlong, archY, 0);
      plank.rotation.z = -slopeAngle;
    } else {
      plank.position.set(0, archY, posAlong);
      plank.rotation.x = slopeAngle;
    }
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }

  // Arched side railings & Giboshi posts
  for (const side of [-1, 1]) {
    const offset = side * (width * 0.5 - 0.12);
    for (let p = 0; p <= 4; p++) {
      const t = p / 4;
      const posAlong = (t - 0.5) * (span - 0.3);
      const archY = Math.sin(t * Math.PI) * archHeight;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.95, 10), railMat);
      const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), materials.goldHardware);
      giboshi.scale.set(1, 1.35, 1);

      if (alongX) {
        post.position.set(posAlong, archY + 0.48, offset);
        giboshi.position.set(posAlong, archY + 1.0, offset);
      } else {
        post.position.set(offset, archY + 0.48, posAlong);
        giboshi.position.set(offset, archY + 1.0, posAlong);
      }
      group.add(post, giboshi);
    }

    // Upper & middle rail bars
    for (const rH of [0.46, 0.84]) {
      for (let i = 0; i < segs; i++) {
        const t = (i + 0.5) / segs;
        const posAlong = (t - 0.5) * span;
        const archY = Math.sin(t * Math.PI) * archHeight + rH;
        const bar = new THREE.Mesh(
          alongX
            ? new THREE.BoxGeometry(span / segs + 0.05, 0.075, 0.075)
            : new THREE.BoxGeometry(0.075, 0.075, span / segs + 0.05),
          railMat
        );
        if (alongX) bar.position.set(posAlong, archY, offset);
        else bar.position.set(offset, archY, posAlong);
        group.add(bar);
      }
    }
  }

  return group;
}
