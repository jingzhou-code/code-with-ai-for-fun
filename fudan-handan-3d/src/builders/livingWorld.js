import * as THREE from 'three';
import { ROADS } from '../data/campusData.js';

/**
 * Builds Instanced Foliage, Streetlamps, Animated Traffic, Campus Cyclists/Students & Sky Atmosphere
 */
export function buildLivingWorld(ctx) {
  setupSkyAndLighting(ctx);
  buildInstancedTrees(ctx);
  buildInstancedStreetlamps(ctx);
  buildTrafficAndStudents(ctx);
}

/**
 * 1. Dynamic Sky Dome, Starfield, Directional Sun/Moon Shadow Light & Hemisphere Fill
 */
function setupSkyAndLighting(ctx) {
  // Gradient Sky Dome Shader
  const skyGeo = new THREE.SphereGeometry(1900, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2a65a8) },
      horizonColor: { value: new THREE.Color(0xa8cde8) },
      sunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) },
      sunGlowColor: { value: new THREE.Color(0xfff0d0) },
      sunGlowStrength: { value: 0.35 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunGlowColor;
      uniform float sunGlowStrength;
      varying vec3 vWorldPos;
      void main() {
        vec3 d = normalize(vWorldPos);
        float h = clamp(d.y * 1.15 + 0.06, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.62));
        float sunAmt = max(dot(d, normalize(sunDir)), 0.0);
        col += sunGlowColor * pow(sunAmt, 14.0) * sunGlowStrength;
        col += sunGlowColor * pow(sunAmt, 180.0) * (sunGlowStrength * 1.6);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  ctx.scene.add(skyDome);

  // Night Starfield
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.12 + Math.random() * 0.88);
    const r = 1750;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xeef4ff,
    size: 3.2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  ctx.scene.add(stars);

  // Hemisphere Ambient Light
  const hemiLight = new THREE.HemisphereLight(0xdbeeff, 0x3b4a3a, 0.85);
  ctx.scene.add(hemiLight);

  // Primary Sun / Moon Shadow-Casting Directional Light
  const sunLight = new THREE.DirectionalLight(0xfff6e5, 2.1);
  sunLight.position.set(220, 340, 180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 40;
  sunLight.shadow.camera.far = 1350;
  const d = 560;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  ctx.scene.add(sunLight);

  ctx.scene.fog = new THREE.FogExp2(0xb6cfe4, 0.00048);

  ctx.atmosphere = { skyMat, starMat, hemiLight, sunLight };
}

/**
 * 2. Instanced Campus Trees (~2,400 French Sycamores, Camphors, Willows & Pines)
 */
function buildInstancedTrees(ctx) {
  const treeSpecs = [];

  const pushTree = (x, z, scale = 1, kind = 'sycamore') => {
    // Avoid spawning directly inside Handan Rd asphalt
    if (Math.abs(z - 198) < 17.5) return;
    treeSpecs.push({ x, z, scale, kind });
  };

  // A. Boulevard Avenues along tree-lined roads
  ROADS.forEach((r) => {
    if (!r.trees) return;
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    const spacing = r.name === '光华大道' || r.name === '国权路(南段)' ? 12.5 : 16;
    const steps = Math.floor(len / spacing);
    const offset = r.width * 0.5 + 2.4;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const bx = r.x1 + dx * t;
      const bz = r.z1 + dz * t;
      // Skip major road intersections
      if (Math.abs(bz - 198) < 22) continue;
      if (r.name !== '光华大道' && Math.abs(bz - 52) < 10) continue;

      const s = 0.88 + ((i * 37) % 10) * 0.032;
      const kind =
        r.name === '光华大道' || r.name === '国权路(南段)' || r.name === '相伯路'
          ? 'sycamore'
          : 'camphor';
      pushTree(bx + nx * offset, bz + nz * offset, s, kind);
      pushTree(bx - nx * offset, bz - nz * offset, s * 0.96, kind);
    }
  });

  // B. Denghui Oval Ring Trees around Xianghui Hall Lawn
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    pushTree(-275 + Math.cos(a) * 48.5, -18 + Math.sin(a) * 56.5, 1.08, 'sycamore');
  }

  // C. Guanghua Great Lawn Flanking Camphor & Ginkgo Groves
  for (let z = 32; z <= 148; z += 13) {
    pushTree(283, z, 1.05, 'sycamore');
    pushTree(381, z, 1.05, 'sycamore');
    pushTree(291, z + 5, 0.9, 'camphor');
    pushTree(373, z + 5, 0.9, 'camphor');
  }

  // D. Riverbank Weeping Willows along Z ≈ -192 & Gardens (Yanyuan + Xiyuan)
  for (let rx = -520; rx <= 560; rx += 22) {
    if (Math.abs(rx - -185) < 12 || Math.abs(rx - 435) < 16) continue;
    pushTree(rx, -182, 0.95, 'willow');
    pushTree(rx + 9, -202, 0.92, 'willow');
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pushTree(-112 + Math.cos(a) * 44, 142 + Math.sin(a) * 21, 0.95, 'willow');
    pushTree(102 + Math.cos(a) * 42, 142 + Math.sin(a) * 21, 0.95, 'willow');
  }

  // E. Evergreen Pines around Mao Statue, Xianghui Hall & Jiuyuan Villas
  [
    [-11, 78],
    [11, 78],
    [-11, 90],
    [11, 90],
    [-294, -82],
    [-256, -82],
    [76, 355],
    [128, 355],
    [95, 376],
  ].forEach(([px, pz]) => pushTree(px, pz, 1.12, 'pine'));

  const count = treeSpecs.length;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 3.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x564334, roughness: 0.92 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);

  const crownGeo = new THREE.DodecahedronGeometry(3.3, 1);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.84,
  });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  crowns.castShadow = true;
  crowns.receiveShadow = true;

  const dummy = new THREE.Object3D();
  treeSpecs.forEach((t, i) => {
    dummy.position.set(t.x, 1.8 * t.scale, t.z);
    dummy.scale.set(t.scale, t.scale, t.scale);
    dummy.rotation.set(0, (i * 1.7) % Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    const cy = t.kind === 'pine' ? 5.6 * t.scale : 5.4 * t.scale;
    dummy.position.set(t.x, cy, t.z);
    if (t.kind === 'pine') {
      dummy.scale.set(t.scale * 0.68, t.scale * 1.48, t.scale * 0.68);
    } else if (t.kind === 'willow') {
      dummy.scale.set(t.scale * 1.18, t.scale * 0.88, t.scale * 1.18);
    } else {
      dummy.scale.set(t.scale * 1.12, t.scale * 0.96, t.scale * 1.12);
    }
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  ctx.scene.add(trunks, crowns);

  ctx.trees = { crowns, specs: treeSpecs };
  applySeasonColors(ctx, 'summer');
}

export function applySeasonColors(ctx, season = 'summer') {
  if (!ctx.trees) return;
  const { crowns, specs } = ctx.trees;
  const col = new THREE.Color();

  specs.forEach((t, i) => {
    const jitter = ((i * 29) % 13) / 13;
    if (season === 'summer') {
      if (t.kind === 'pine') col.setHSL(0.36, 0.45, 0.22 + jitter * 0.05);
      else if (t.kind === 'willow') col.setHSL(0.31, 0.52, 0.34 + jitter * 0.07);
      else if (t.kind === 'sycamore') col.setHSL(0.33, 0.48, 0.29 + jitter * 0.08);
      else col.setHSL(0.35, 0.46, 0.26 + jitter * 0.07);
    } else {
      // Golden Shanghai Autumn (深秋金黄梧桐与银杏红枫)
      if (t.kind === 'pine') col.setHSL(0.36, 0.42, 0.22 + jitter * 0.04);
      else if (t.kind === 'sycamore') {
        // Golden amber & russet French plane trees!
        col.setHSL(0.08 + jitter * 0.05, 0.78, 0.46 + jitter * 0.1);
      } else if (t.kind === 'willow') {
        col.setHSL(0.22, 0.48, 0.38 + jitter * 0.06);
      } else {
        // Camphor stays evergreen mixed with crimson maple accents
        if (i % 5 === 0) col.setHSL(0.03, 0.74, 0.42);
        else col.setHSL(0.33, 0.4, 0.28 + jitter * 0.06);
      }
    }
    crowns.setColorAt(i, col);
  });
  crowns.instanceColor.needsUpdate = true;
}

/**
 * 3. Instanced Campus & Urban Streetlamps (Warm Amber Glow at Dusk/Night)
 */
function buildInstancedStreetlamps(ctx) {
  const positions = [];
  // Guanghua Ave, Riyue West/East, Benbei Expressway, Handan Rd, Guoquan Rd, Guoding Rd
  for (let x = -360; x <= 410; x += 28) {
    positions.push([x, 45.2], [x, 58.8]);
  }
  for (let z = 60; z <= 168; z += 24) {
    positions.push([-21.5, z], [21.5, z]);
  }
  for (let x = -560; x <= 620; x += 42) {
    positions.push([x, 180.5], [x, 215.5]);
  }
  for (let z = 225; z <= 560; z += 36) {
    positions.push([-186, z], [180, z], [426, z]);
  }
  for (let z = -240; z <= -150; z += 22) {
    positions.push([-180, z]);
  }

  const count = positions.length;
  const poleMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.08, 0.13, 5.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2c323a, metalness: 0.6, roughness: 0.4 }),
    count
  );
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xf7efe0,
    emissive: new THREE.Color(0xffbe66),
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  ctx.emissiveMaterials.push({ mat: bulbMat, maxIntensity: 2.4 });
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 8, 8), bulbMat, count);

  const dummy = new THREE.Object3D();
  positions.forEach(([x, z], i) => {
    dummy.position.set(x, 2.7, z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 5.55, z);
    dummy.updateMatrix();
    bulbMesh.setMatrixAt(i, dummy.matrix);
  });
  ctx.scene.add(poleMesh, bulbMesh);
}

/**
 * 4. Living Campus Traffic (Handan Rd Tunnel + Surface Buses/Cars) & Student Cyclists/Pedestrians
 */
function buildTrafficAndStudents(ctx) {
  ctx.vehicles = [];
  ctx.commuters = [];

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const carPalette = [0xe8ecf0, 0x2d4159, 0x9aa4b0, 0x8b2626, 0x1e242b, 0xd8b45c];

  // Spawn 34 urban vehicles
  const routes = [
    // Handan Rd Surface Eastbound & Westbound
    { axis: 'x', fixed: 209, min: -610, max: 670, dir: 1, speed: 17, tunnel: false },
    { axis: 'x', fixed: 187, min: -610, max: 670, dir: -1, speed: 16, tunnel: false },
    // Handan Rd Middle Ring Express Lanes (Dive underground between X=-460 and X=+505!)
    { axis: 'x', fixed: 202.5, min: -610, max: 670, dir: 1, speed: 26, tunnel: true },
    { axis: 'x', fixed: 193.5, min: -610, max: 670, dir: -1, speed: 26, tunnel: true },
    // Guoding Rd North-South
    { axis: 'z', fixed: 439, min: -520, max: 600, dir: 1, speed: 13, tunnel: false },
    { axis: 'z', fixed: 431, min: -520, max: 600, dir: -1, speed: 13, tunnel: false },
    // Guoquan Rd South
    { axis: 'z', fixed: -191, min: 220, max: 600, dir: 1, speed: 11, tunnel: false },
  ];

  routes.forEach((rt, rIdx) => {
    const count = rt.axis === 'x' ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const isBus = !rt.tunnel && i === 0;
      const vGroup = new THREE.Group();
      const len = isBus ? 10.5 : 4.4;
      const wid = isBus ? 2.6 : 1.85;
      const hgt = isBus ? 3.1 : 1.45;
      const bodyCol = isBus ? 0x2b6e58 : carPalette[(rIdx + i) % carPalette.length];

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(wid, hgt, len),
        new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.4, metalness: 0.3 })
      );
      body.position.y = hgt * 0.5 + 0.25;
      vGroup.add(body);

      if (!isBus) {
        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(wid * 0.86, 0.72, len * 0.52),
          new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.3 })
        );
        cabin.position.y = hgt + 0.45;
        vGroup.add(cabin);
      }

      // Headlights (+Z in local space) & Taillights (-Z)
      const hl = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.75, 0.22, 0.12), headlightMat);
      hl.position.set(0, 0.65, len * 0.5 + 0.04);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.75, 0.22, 0.12), taillightMat);
      tl.position.set(0, 0.65, -len * 0.5 - 0.04);
      vGroup.add(hl, tl);

      const span = rt.max - rt.min;
      const pos = rt.min + (i / count) * span;
      ctx.scene.add(vGroup);
      ctx.vehicles.push({ group: vGroup, route: rt, pos, hl, tl });
    }
  });

  // Spawn 56 Campus Cyclists & Walking Students along Guanghua Ave, Riyue Rd & Benbei Expressway
  const shirtPalette = [0x1e4b85, 0xd9e2ec, 0xb83b35, 0x3b7a57, 0xe3b34c, 0x5c6b7e];
  const studentPaths = [
    { axis: 'x', fixed: 49.5, min: -340, max: 390, bike: true },
    { axis: 'x', fixed: 54.5, min: -340, max: 390, bike: false },
    { axis: 'z', fixed: -24, min: 54, max: 170, bike: false },
    { axis: 'z', fixed: 24, min: 54, max: 170, bike: true },
    { axis: 'z', fixed: -185, min: -280, max: -60, bike: true }, // "本北高速" bike stream!
  ];

  studentPaths.forEach((sp, sIdx) => {
    const num = sp.bike ? 12 : 10;
    for (let i = 0; i < num; i++) {
      const g = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.65, 4, 8),
        new THREE.MeshStandardMaterial({ color: shirtPalette[(sIdx + i) % shirtPalette.length] })
      );
      torso.position.y = 1.15;
      g.add(torso);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf1d2b6 })
      );
      head.position.y = 1.72;
      g.add(head);

      if (sp.bike) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.45, 1.35),
          new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x2b7de9 : 0xf2b705 })
        );
        frame.position.y = 0.48;
        g.add(frame);
      }

      const dir = i % 2 === 0 ? 1 : -1;
      const speed = sp.bike ? 5.2 + (i % 3) * 0.7 : 1.45 + (i % 3) * 0.2;
      const pos = sp.min + (i / num) * (sp.max - sp.min);
      ctx.scene.add(g);
      ctx.commuters.push({ group: g, path: sp, pos, dir, speed });
    }
  });
}

/**
 * Real-time Per-Frame World Update (Animations + Time of Day)
 */
export function updateLivingWorld(ctx, elapsed, delta) {
  // 1. Animate National Flag Wave at Flag Square
  if (ctx.animatedFlag) {
    const { mesh, basePos } = ctx.animatedFlag;
    const posAttr = mesh.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const pinFactor = (bx + 2.4) / 4.8; // 0 at pole, 1 at free edge
      posAttr.array[i * 3 + 2] =
        Math.sin(bx * 2.2 - elapsed * 4.5 + by * 0.6) * 0.28 * pinFactor;
    }
    posAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  // 2. Animate Guanghua Wind Tunnel Ribbons (when enabled)
  if (ctx.windTunnel && ctx.windTunnel.group.visible) {
    ctx.windTunnel.ribbons.forEach((r) => {
      r.mesh.position.y = Math.sin(elapsed * 2.6 + r.phase) * 1.4;
      r.mesh.material.opacity = 0.28 + 0.32 * (0.5 + 0.5 * Math.sin(elapsed * 3.4 + r.phase));
    });
  }

  // 3. Blink Guanghua Twin Spire Red Aviation Beacons at Dusk/Night
  const isNight = ctx.currentHour < 6.2 || ctx.currentHour > 18.2;
  const blink = Math.sin(elapsed * 4.2) > 0;
  ctx.beacons.forEach((b) => {
    b.visible = isNight && blink;
  });

  // 4. Move Urban Vehicles (with Middle Ring Handan Rd Tunnel dive!)
  ctx.vehicles.forEach((v) => {
    const rt = v.route;
    v.pos += rt.dir * rt.speed * delta;
    if (rt.dir > 0 && v.pos > rt.max) v.pos = rt.min;
    if (rt.dir < 0 && v.pos < rt.min) v.pos = rt.max;

    let y = 0.08;
    let hiddenUnderground = false;
    if (rt.tunnel) {
      // Ramp down between X=-475..-435, underground between -435..+490, ramp up +490..+530
      if (v.pos > -435 && v.pos < 490) {
        hiddenUnderground = true;
      } else if (v.pos >= -475 && v.pos <= -435) {
        const t = (v.pos - -475) / 40;
        y = -t * 4.2;
      } else if (v.pos >= 490 && v.pos <= 530) {
        const t = (530 - v.pos) / 40;
        y = -t * 4.2;
      }
    }

    v.group.visible = !hiddenUnderground;
    if (!hiddenUnderground) {
      if (rt.axis === 'x') {
        v.group.position.set(v.pos, y, rt.fixed);
        v.group.rotation.y = rt.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        v.group.position.set(rt.fixed, y, v.pos);
        v.group.rotation.y = rt.dir > 0 ? 0 : Math.PI;
      }
      v.hl.visible = isNight;
      v.tl.visible = isNight;
    }
  });

  // 5. Move Campus Cyclists & Students
  ctx.commuters.forEach((c) => {
    const sp = c.path;
    c.pos += c.dir * c.speed * delta;
    if (c.pos > sp.max) {
      c.pos = sp.max;
      c.dir = -1;
    } else if (c.pos < sp.min) {
      c.pos = sp.min;
      c.dir = 1;
    }
    const bob = sp.bike ? 0 : Math.abs(Math.sin(elapsed * 7 + c.pos)) * 0.08;
    if (sp.axis === 'x') {
      c.group.position.set(c.pos, 0.08 + bob, sp.fixed);
      c.group.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      c.group.position.set(sp.fixed, 0.08 + bob, c.pos);
      c.group.rotation.y = c.dir > 0 ? 0 : Math.PI;
    }
  });
}

/**
 * Updates Sun Trajectory, Sky Gradient, Fog, Shadows & Night Interior Window Glow
 */
export function updateAtmosphereForHour(ctx, hour) {
  ctx.currentHour = hour;
  const { skyMat, starMat, hemiLight, sunLight } = ctx.atmosphere;

  // Solar elevation angle: sunrise ~6:00, zenith ~12:30, sunset ~18:15
  const dayProgress = (hour - 6) / 12.25;
  const sunAngle = dayProgress * Math.PI;
  const sinElev = Math.sin(sunAngle);
  const cosAzim = Math.cos(sunAngle);

  const sunX = -cosAzim * 520;
  const sunY = Math.max(-140, sinElev * 480);
  const sunZ = 185 + Math.cos(dayProgress * 1.4) * 140;

  const dayFactor = THREE.MathUtils.clamp((sinElev + 0.12) / 0.45, 0, 1);
  const twilight = THREE.MathUtils.clamp(1 - Math.abs(sinElev) * 3.4, 0, 1);
  const nightFactor = 1 - dayFactor;

  if (sinElev > -0.06) {
    sunLight.position.set(sunX, Math.max(45, sunY), sunZ);
  } else {
    // Cool silver moonlight angle at night so campus silhouettes stay readable
    sunLight.position.set(-220, 310, 240);
  }

  // Sky colors
  const dayTop = new THREE.Color(0x2864a8);
  const dayHor = new THREE.Color(0xb2d4ec);
  const duskTop = new THREE.Color(0x24355c);
  const duskHor = new THREE.Color(0xe68c56);
  const nightTop = new THREE.Color(0x070d1a);
  const nightHor = new THREE.Color(0x13223b);

  const topCol = nightTop.clone().lerp(dayTop, dayFactor).lerp(duskTop, twilight * 0.65);
  const horCol = nightHor.clone().lerp(dayHor, dayFactor).lerp(duskHor, twilight * 0.85);

  skyMat.uniforms.topColor.value.copy(topCol);
  skyMat.uniforms.horizonColor.value.copy(horCol);
  skyMat.uniforms.sunDir.value.set(sunX, sunY, sunZ).normalize();
  skyMat.uniforms.sunGlowColor.value.setHex(twilight > 0.3 ? 0xff9d5c : 0xfff3d6);
  skyMat.uniforms.sunGlowStrength.value = dayFactor * 0.35 + twilight * 0.55;

  ctx.scene.fog.color.copy(horCol);
  starMat.opacity = THREE.MathUtils.smoothstep(nightFactor, 0.45, 0.95) * 0.88;

  // Sun / Moon & Hemisphere intensities
  const sunCol = new THREE.Color(0xfff6e8).lerp(new THREE.Color(0xff9955), twilight * 0.8);
  if (nightFactor > 0.85) sunCol.setHex(0x6b8cc2);
  sunLight.color.copy(sunCol);
  sunLight.intensity = THREE.MathUtils.lerp(0.38, 2.25, dayFactor);

  hemiLight.color.copy(horCol);
  hemiLight.intensity = THREE.MathUtils.lerp(0.32, 0.92, dayFactor);

  // Building Interior Windows & Streetlamps Emissive Glow
  const glowRatio = THREE.MathUtils.smoothstep(nightFactor, 0.22, 0.85);
  ctx.emissiveMaterials.forEach((item) => {
    const base = item.baseIntensity || 0;
    item.mat.emissiveIntensity = base + glowRatio * item.maxIntensity;
  });

  // Water tint shift
  if (ctx.waterMaterial) {
    ctx.waterMaterial.color.setHex(nightFactor > 0.6 ? 0x0d2636 : 0x1d5b69);
  }
}
