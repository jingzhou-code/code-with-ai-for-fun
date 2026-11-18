import * as THREE from 'three';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const PINNACLE_CONE = new THREE.ConeGeometry(0.55, 2.8, 4);

/**
 * Extrudes a true triangular pitched gable roof along the X or Z axis
 */
function createGablePrismGeometry(length, span, rise, alongX = true) {
  const shape = new THREE.Shape();
  shape.moveTo(-span * 0.5, 0);
  shape.lineTo(0, rise);
  shape.lineTo(span * 0.5, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    steps: 1
  });
  geo.translate(0, 0, -length * 0.5);
  if (alongX) {
    geo.rotateY(Math.PI * 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a rich Collegiate Gothic hall wing with:
 * - Limestone or red-brick mullioned facade
 * - Base plinth & cornice trim
 * - Rhythmic exterior stone buttresses
 * - Steeply pitched slate roof + limestone end-gables + optional dormers & copper fleche
 */
export function createGothicHall(mats, opts) {
  const {
    w = 40,
    d = 16,
    h = 15,
    roofH = 6.5,
    brick = false,
    buttresses = true,
    dormers = true,
    crenellated = false,
    fleche = false
  } = opts;

  const group = new THREE.Group();
  const alongX = w >= d;
  const facadeBase = brick ? mats.redBrickGothic : mats.gothicFacade;
  const wallMat = mats.tiledFacade(facadeBase, Math.max(w, d), h);

  // Main masonry body
  const body = new THREE.Mesh(UNIT_BOX, wallMat);
  body.scale.set(w, h, d);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Ground limestone plinth
  const plinth = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
  plinth.scale.set(w + 0.9, 1.3, d + 0.9);
  plinth.position.y = 0.65;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Upper cornice belt
  const cornice = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
  cornice.scale.set(w + 0.7, 0.65, d + 0.7);
  cornice.position.y = h - 0.2;
  group.add(cornice);

  // Exterior Gothic buttresses along long walls
  if (buttresses) {
    const longLen = alongX ? w : d;
    const shortLen = alongX ? d : w;
    const count = Math.max(3, Math.floor(longLen / 7.5));
    const step = (longLen - 4) / (count - 1);
    for (let i = 0; i < count; i++) {
      const offset = -longLen * 0.5 + 2 + i * step;
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
        if (alongX) {
          b.scale.set(0.85, h * 0.92, 1.35);
          b.position.set(offset, h * 0.46, side * (shortLen * 0.5 + 0.45));
        } else {
          b.scale.set(1.35, h * 0.92, 0.85);
          b.position.set(side * (shortLen * 0.5 + 0.45), h * 0.46, offset);
        }
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
      }
    }
  }

  // Optional crenellated parapet along roofline
  if (crenellated) {
    const merlonSpacing = 3.2;
    const nx = Math.floor(w / merlonSpacing);
    for (let i = 0; i <= nx; i++) {
      const mx = -w * 0.5 + (i / Math.max(1, nx)) * w;
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
        m.scale.set(1.4, 1.15, 0.6);
        m.position.set(mx, h + 0.55, side * (d * 0.5));
        group.add(m);
      }
    }
  }

  // Steep pitched slate roof + raised limestone end gables
  if (roofH > 0) {
    const length = alongX ? w + 0.6 : d + 0.6;
    const span = alongX ? d + 0.8 : w + 0.8;
    const roofGeo = createGablePrismGeometry(length, span, roofH, alongX);
    const roof = new THREE.Mesh(roofGeo, mats.slateRoof);
    roof.position.y = h;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Raised stone end-gable parapets (signature Collegiate Gothic silhouette!)
    const gableGeo = createGablePrismGeometry(0.75, span + 0.35, roofH + 0.55, alongX);
    for (const end of [-1, 1]) {
      const gable = new THREE.Mesh(gableGeo, mats.limestoneTrim);
      if (alongX) {
        gable.position.set(end * (w * 0.5), h, 0);
      } else {
        gable.position.set(0, h, end * (d * 0.5));
      }
      gable.castShadow = true;
      group.add(gable);

      // Apex stone finial
      const finial = new THREE.Mesh(PINNACLE_CONE, mats.limestoneTrim);
      finial.scale.set(0.65, 0.75, 0.65);
      if (alongX) {
        finial.position.set(end * (w * 0.5), h + roofH + 1.1, 0);
      } else {
        finial.position.set(0, h + roofH + 1.1, end * (d * 0.5));
      }
      group.add(finial);
    }

    // Dormer windows along pitched roof
    if (dormers && Math.max(w, d) >= 18) {
      const longLen = alongX ? w : d;
      const shortSpan = alongX ? d : w;
      const dCount = Math.max(2, Math.floor(longLen / 10));
      const dStep = (longLen - 8) / Math.max(1, dCount - 1);
      for (let i = 0; i < dCount; i++) {
        const posAlong = dCount === 1 ? 0 : -longLen * 0.5 + 4 + i * dStep;
        for (const side of [-1, 1]) {
          const dormer = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
          if (alongX) {
            dormer.scale.set(1.9, 2.3, 2.2);
            dormer.position.set(posAlong, h + roofH * 0.36, side * (shortSpan * 0.28));
          } else {
            dormer.scale.set(2.2, 2.3, 1.9);
            dormer.position.set(side * (shortSpan * 0.28), h + roofH * 0.36, posAlong);
          }
          group.add(dormer);
        }
      }
    }

    // Optional oxidized copper Gothic fleche spire at center of ridge
    if (fleche) {
      const base = new THREE.Mesh( new THREE.CylinderGeometry(1.1, 1.35, 3.2, 8), mats.copperPatina );
      base.position.y = h + roofH + 1.2;
      group.add(base);

      const spire = new THREE.Mesh( new THREE.ConeGeometry(1.05, 9.5, 8), mats.copperPatina );
      spire.position.y = h + roofH + 7.4;
      spire.castShadow = true;
      group.add(spire);
    }
  }

  return group;
}

/**
 * Builds a monumental Collegiate Gothic Tower (for Mitchell Tower, Harper Twin Towers,
 * Rockefeller Carillon Tower, Rosenwald Tower, Saieh Lawson Spire, Burton-Judson, Billings)
 */
export function createGothicTower(mats, opts) {
  const {
    w = 12,
    d = 12,
    h = 38,
    brick = false,
    pinnacleH = 5.5,
    octagonalCrown = false,
    copperSpireH = 0
  } = opts;

  const group = new THREE.Group();
  const facadeBase = brick ? mats.redBrickGothic : mats.gothicFacade;
  const wallMat = mats.tiledFacade(facadeBase, w * 1.4, h, 14, 14);

  // Main shaft
  const shaft = new THREE.Mesh(UNIT_BOX, wallMat);
  shaft.scale.set(w, h, d);
  shaft.position.y = h * 0.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // 4 stepped corner clasping buttresses rising full height into corner pinnacles
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cb1 = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
      cb1.scale.set(1.6, h + 1.4, 1.6);
      cb1.position.set(sx * (w * 0.5), (h + 1.4) * 0.5, sz * (d * 0.5));
      cb1.castShadow = true;
      group.add(cb1);

      if (pinnacleH > 0) {
        const pin = new THREE.Mesh(
          new THREE.ConeGeometry(1.05, pinnacleH, 4),
          mats.limestoneTrim
        );
        pin.rotation.y = Math.PI * 0.25;
        pin.position.set(sx * (w * 0.5), h + 1.4 + pinnacleH * 0.5, sz * (d * 0.5));
        pin.castShadow = true;
        group.add(pin);
      }
    }
  }

  // Horizontal stringcourses
  for (const ratio of [0.35, 0.68, 0.96]) {
    const band = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    band.scale.set(w + 0.9, 0.55, d + 0.9);
    band.position.y = h * ratio;
    group.add(band);
  }

  // Belfry lancet louver openings on all 4 faces near top
  const belfryH = h * 0.2;
  const belfryY = h * 0.82;
  for (const side of [-1, 1]) {
    for (const off of [-w * 0.18, w * 0.18]) {
      const l1 = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
      l1.scale.set(w * 0.18, belfryH, 0.4);
      l1.position.set(off, belfryY, side * (d * 0.5 + 0.08));
      group.add(l1);

      const l2 = new THREE.Mesh(UNIT_BOX, mats.stainedGlass);
      l2.scale.set(0.4, belfryH, d * 0.18);
      l2.position.set(side * (w * 0.5 + 0.08), belfryY, off);
      group.add(l2);
    }
  }

  // Crenellated battlements on top parapet
  const merlons = 4;
  for (let i = 0; i <= merlons; i++) {
    const t = -0.38 + (i / merlons) * 0.76;
    for (const side of [-1, 1]) {
      const m1 = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
      m1.scale.set(1.2, 1.5, 0.65);
      m1.position.set(t * w, h + 0.75, side * (d * 0.5));
      group.add(m1);

      const m2 = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
      m2.scale.set(0.65, 1.5, 1.2);
      m2.position.set(side * (w * 0.5), h + 0.75, t * d);
      group.add(m2);
    }
  }

  // Optional octagonal lantern crown (like Rockefeller Chapel or Harper East Tower)
  if (octagonalCrown) {
    const octH = w * 0.68;
    const oct = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.36, w * 0.42, octH, 8),
      mats.limestoneTrim
    );
    oct.position.y = h + octH * 0.5;
    oct.castShadow = true;
    group.add(oct);

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.37, octH * 0.55, 8),
      mats.copperPatina
    );
    cap.position.y = h + octH + octH * 0.27;
    group.add(cap);
  }

  // Optional soaring Gothic spire (like Saieh Hall's Lawson Tower)
  if (copperSpireH > 0) {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.36, copperSpireH, 8),
      brick ? mats.limestoneTrim : mats.copperPatina
    );
    spire.position.y = h + copperSpireH * 0.5;
    spire.castShadow = true;
    group.add(spire);
  }

  return group;
}

/**
 * Creates a Gothic arched bridge / cloister link (e.g., Harper skybridges, Cobb Gate, Hull Gate)
 */
export function createGothicGateOrBridge(mats, { w = 12, d = 5, h = 11, isGate = false }) {
  const group = new THREE.Group();

  // Left & Right piers
  const pierW = w * 0.24;
  for (const sx of [-1, 1]) {
    const pier = new THREE.Mesh(UNIT_BOX, mats.limestoneTrim);
    pier.scale.set(pierW, h, d);
    pier.position.set(sx * (w * 0.5 - pierW * 0.5), h * 0.5, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);

    // Top turret finials on gates (Hull Gate / Cobb Gate)
    if (isGate) {
      const pTop = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.8, 4), mats.limestoneTrim);
      pTop.rotation.y = Math.PI * 0.25;
      pTop.position.set(sx * (w * 0.5 - pierW * 0.5), h + 1.9, 0);
      group.add(pTop);
    }
  }

  // Upper lintel / gallery above archway
  const lintelH = h * 0.36;
  const lintel = new THREE.Mesh(UNIT_BOX, isGate ? mats.limestoneTrim : mats.gothicFacade);
  lintel.scale.set(w, lintelH, d * 0.92);
  lintel.position.y = h - lintelH * 0.5;
  lintel.castShadow = true;
  group.add(lintel);

  if (isGate) {
    // Ornate wrought-iron cresting & gargoyle silhouettes along the gate arch!
    const iron = new THREE.Mesh(UNIT_BOX, mats.miesSteel);
    iron.scale.set(w - pierW * 2, h * 0.52, 0.22);
    iron.position.y = h * 0.3;
    group.add(iron);

    for (let i = -2; i <= 2; i++) {
      const gargoyle = new THREE.Mesh(UNIT_BOX, mats.limestoneDark);
      gargoyle.scale.set(0.65, 0.75, 1.3);
      gargoyle.position.set(i * 1.8, h + 0.3, d * 0.48);
      gargoyle.rotation.x = 0.28;
      group.add(gargoyle);
    }
  } else {
    // Pitched slate cap on skybridge
    const roof = new THREE.Mesh(
      createGablePrismGeometry(w + 0.3, d, 2.4, true),
      mats.slateRoof
    );
    roof.position.y = h;
    group.add(roof);
  }

  return group;
}
