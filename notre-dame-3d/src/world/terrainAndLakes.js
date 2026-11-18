import * as THREE from 'three';

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(pos.x * 0.09 + uTime * 1.4) * 0.12 + cos(pos.y * 0.11 + uTime * 1.1) * 0.10;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNightFactor;
  uniform float uWinter;
  uniform float uFeatherEdge;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    // Procedural multi-octave wave normal
    float w1 = sin(vWorldPos.x * 0.22 + uTime * 1.6) * cos(vWorldPos.z * 0.19 - uTime * 1.2);
    float w2 = sin(vWorldPos.x * 0.51 - uTime * 2.1 + vWorldPos.z * 0.43);
    vec3 normal = normalize(vec3((w1 * 0.06 + w2 * 0.035), 1.0, (w1 * 0.05 - w2 * 0.04)));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

    vec3 deepWater = mix(vec3(0.05, 0.20, 0.30), vec3(0.02, 0.05, 0.12), uNightFactor);
    vec3 shallowWater = mix(vec3(0.10, 0.34, 0.42), vec3(0.04, 0.09, 0.18), uNightFactor);

    // Edge distance from UV center for shoreline tint
    float edge = smoothstep(0.32, 0.5, length(vUv - 0.5));
    vec3 baseCol = mix(deepWater, shallowWater, edge);
    vec3 col = mix(baseCol, uSkyColor * 0.88, clamp(fresnel * 0.78, 0.08, 0.82));

    // Sun specular glint across the lakes
    vec3 halfVec = normalize(normalize(uSunDir) + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 96.0);
    col += uSunColor * spec * (1.0 - uNightFactor * 0.75) * 1.35;

    // Winter frosted ice sheen
    if (uWinter > 0.5) {
      col = mix(col, vec3(0.78, 0.86, 0.93), 0.58);
    }

    // Soft organic lake shoreline alpha feather (disabled on rectangular architectural pools)
    float dist = length((vUv - 0.5) * vec2(2.0, 2.0));
    float lakeAlpha = 1.0 - smoothstep(0.86, 1.0, dist);
    float alpha = mix(1.0, lakeAlpha, uFeatherEdge);

    gl_FragColor = vec4(col, alpha * 0.95);
  }
`;

function drawCampusGroundCanvas(season = 'autumn') {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Map world [-1000, +1000] meters -> [0, 2048] px
  const toPxX = (x) => ((x + 1000) / 2000) * size;
  const toPxZ = (z) => ((z + 1000) / 2000) * size;
  const toLen = (m) => (m / 2000) * size;

  const isWinter = season === 'winter';
  const isAutumn = season === 'autumn';

  // 1. Base Parkland Turf
  ctx.fillStyle = isWinter ? '#dde5ef' : isAutumn ? '#355834' : '#2f6335';
  ctx.fillRect(0, 0, size, size);

  // Subtle organic turf variation patches
  for (let i = 0; i < 280; i++) {
    const rx = ((i * 733) % 1900) - 950;
    const rz = ((i * 491) % 1900) - 950;
    const rad = 35 + (i % 55);
    ctx.fillStyle = isWinter
      ? 'rgba(246, 250, 255, 0.32)'
      : i % 2 === 0
      ? 'rgba(68, 108, 52, 0.18)'
      : 'rgba(36, 72, 38, 0.16)';
    ctx.beginPath();
    ctx.arc(toPxX(rx), toPxZ(rz), toLen(rad), 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Depressed Lake Basins (sandy/pebble shoreline bed under St. Mary's & St. Joseph's Lakes)
  const paintLakeBed = (cx, cz, rx, rz, rot) => {
    ctx.save();
    ctx.translate(toPxX(cx), toPxZ(cz));
    ctx.rotate(rot);
    ctx.scale(toLen(rx), toLen(rz));
    const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1.06);
    g.addColorStop(0, '#0d2a38');
    g.addColorStop(0.84, '#1c4654');
    g.addColorStop(0.96, isWinter ? '#cfd9e5' : '#9c8f73');
    g.addColorStop(1, 'rgba(156,143,115,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // St. Mary's Lake (West-Northwest)
  paintLakeBed(-468, -128, 265, 178, -0.14);
  // St. Joseph's Lake (North)
  paintLakeBed(-5, -328, 188, 172, 0.18);

  // 3. Manicured Emerald Quads (Crisp striped collegiate grass)
  const quads = [
    { x: 0, z: 122, w: 146, d: 235 },     // Main (God) Quad
    { x: -65, z: 336, w: 455, d: 72 },    // South Quad
    { x: 192, z: -92, w: 124, d: 138 },   // North Quad
    { x: 242, z: 68, w: 188, d: 62 },     // Fieldhouse Mall
    { x: 302, z: 278, w: 132, d: 92 },    // DeBartolo Quad
    { x: -235, z: 498, w: 158, d: 64 },   // West Quad
    { x: 535, z: -48, w: 94, d: 108 },    // Mod Quad
    { x: 142, z: 668, w: 195, d: 52 },    // Irish Green
  ];

  for (const q of quads) {
    const x0 = toPxX(q.x - q.w / 2);
    const z0 = toPxZ(q.z - q.d / 2);
    const pw = toLen(q.w);
    const pd = toLen(q.d);
    ctx.fillStyle = isWinter ? '#eef4fb' : '#3d743c';
    ctx.fillRect(x0, z0, pw, pd);

    // Mowed lawn stripes
    if (!isWinter) {
      ctx.fillStyle = 'rgba(84, 146, 74, 0.22)';
      for (let sx = x0; sx < x0 + pw; sx += 8) {
        ctx.fillRect(sx, z0, 4, pd);
      }
    }
  }

  // 4. Campus Roads & Ceremonial Boulevards (Asphalt + Limestone Curbs)
  const drawRoad = (pts, widthM) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Curb
    ctx.strokeStyle = '#c8c0ae';
    ctx.lineWidth = toLen(widthM + 3);
    ctx.beginPath();
    pts.forEach(([x, z], idx) => (idx === 0 ? ctx.moveTo(toPxX(x), toPxZ(z)) : ctx.lineTo(toPxX(x), toPxZ(z))));
    ctx.stroke();
    // Roadway
    ctx.strokeStyle = isWinter ? '#4c5461' : '#353a42';
    ctx.lineWidth = toLen(widthM);
    ctx.stroke();
  };

  // Notre Dame Avenue (Ceremonial South Approach toward Main Gate & Law Arch)
  drawRoad([[62, 920], [62, 420]], 16);
  // Angela Boulevard / Edison Road (Southern border)
  drawRoad([[-920, 745], [920, 745]], 18);
  // Holy Cross Drive & St. Mary's Road (Western & Northern Perimeter)
  drawRoad([[-395, 745], [-395, 220], [-225, 110], [-205, -90], [-190, -540], [380, -540]], 13);
  // Twyckenham / Leahy / Moose Krause Circle (Athletics & East Campus)
  drawRoad([[760, 745], [760, -420], [380, -540]], 15);
  drawRoad([[310, 745], [310, 395], [545, 395], [545, 745]], 12);
  // Dorr Road (North of Library/High-Rises)
  drawRoad([[62, -290], [760, -290]], 12);

  // 5. Warm Buff-Stone & Brick Pedestrian Quad Walkways (Iconic Notre Dame Diagonal Walks!)
  const drawWalk = (pts, widthM = 5.5) => {
    ctx.strokeStyle = '#d4c8b0';
    ctx.lineWidth = toLen(widthM);
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, z], idx) => (idx === 0 ? ctx.moveTo(toPxX(x), toPxZ(z)) : ctx.lineTo(toPxX(x), toPxZ(z))));
    ctx.stroke();
  };

  // God Quad Axial + Crisscross Diagonal Walks
  drawWalk([[0, 26], [0, 336]], 9.5);
  drawWalk([[-68, 52], [68, 245]], 5.5);
  drawWalk([[68, 52], [-68, 245]], 5.5);
  drawWalk([[-74, 88], [74, 88]], 6);
  drawWalk([[-74, 175], [92, 175]], 6.5);
  // Grotto & Lakeside Trail Loop
  drawWalk([[-74, 42], [-136, 12], [-172, -38], [-192, -185]], 5);
  drawWalk([
    [-215, -45], [-340, 48], [-560, 38], [-725, -55],
    [-705, -235], [-460, -305], [-215, -215], [-215, -45],
  ], 4.5);

  // South Quad Long Axis + Diagonals
  drawWalk([[-305, 336], [188, 336]], 8.5);
  drawWalk([[-295, 306], [175, 306]], 5);
  drawWalk([[-295, 366], [175, 366]], 5);
  drawWalk([[-212, 255], [-125, 375]], 5);
  drawWalk([[-125, 375], [0, 295]], 5);
  drawWalk([[0, 295], [62, 375]], 5);
  drawWalk([[62, 260], [62, 430]], 8); // Pedestrianised upper Notre Dame Ave through Law Arch

  // Fieldhouse Mall -> Hesburgh Library -> Stadium Axis
  drawWalk([[112, 68], [395, 68]], 11);
  drawWalk([[405, 95], [418, 395]], 12); // Library Reflecting Pool down to Notre Dame Stadium!
  drawWalk([[192, 68], [192, -210]], 7.5); // North Quad spine
  drawWalk([[138, -32], [248, -155]], 4.5);
  drawWalk([[248, -32], [138, -155]], 4.5);

  // DeBartolo Quad & West Quad Walks
  drawWalk([[205, 336], [420, 336]], 7.5);
  drawWalk([[288, 215], [288, 415]], 6.5);
  drawWalk([[-310, 498], [-155, 498]], 6.5);
  drawWalk([[-235, 395], [-235, 555]], 6);

  // Plazas (Main Building steps plaza, Hesburgh Plaza, Stadium North Plaza)
  ctx.fillStyle = '#d8cdba';
  ctx.beginPath();
  ctx.arc(toPxX(0), toPxZ(175), toLen(16), 0, Math.PI * 2); // Father Sorin Statue Plaza
  ctx.arc(toPxX(242), toPxZ(68), toLen(24), 0, Math.PI * 2); // Clarke Fountain Plaza
  ctx.fill();
  ctx.fillRect(toPxX(352), toPxZ(88), toLen(106), toLen(82)); // Hesburgh South Plaza
  ctx.fillRect(toPxX(325), toPxZ(395), toLen(195), toLen(260)); // Stadium & Moose Krause Concourse

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createTerrainAndLakes(scene, materials) {
  const group = new THREE.Group();
  group.name = 'CampusTerrainAndLakes';

  // Ground Elevation helper (slight natural hollow around Grotto & Lakes)
  function getGroundHeight(x, z) {
    // Gentle slope down toward Grotto (-136, 8) and lakeside
    const dGrotto = Math.hypot(x - -145, z - -5);
    if (dGrotto < 52) {
      return -2.4 * (1 - dGrotto / 52);
    }
    return 0;
  }

  // 1. Sculpted Campus Ground Mesh (2000m x 2000m)
  const groundGeo = new THREE.PlaneGeometry(2000, 2000, 96, 96);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getGroundHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: drawCampusGroundCanvas('autumn'),
    roughness: 0.92,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Shared Custom GLSL Water Shader for St. Mary's Lake, St. Joseph's Lake & Reflecting Pool
  const sharedWaterUniforms = {
    uTime: { value: 0 },
    uSkyColor: { value: new THREE.Color('#7aa9d6') },
    uSunDir: { value: new THREE.Vector3(-0.7, 0.25, 0.4).normalize() },
    uSunColor: { value: new THREE.Color('#ffae52') },
    uNightFactor: { value: 0.25 },
    uWinter: { value: 0.0 },
  };

  const lakeShaderMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: { ...sharedWaterUniforms, uFeatherEdge: { value: 1.0 } },
    transparent: true,
    depthWrite: false,
  });

  const poolShaderMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: { ...sharedWaterUniforms, uFeatherEdge: { value: 0.0 } },
    transparent: true,
    depthWrite: false,
  });

  // St. Mary's Lake (West of Basilica & Grotto)
  const stMaryGeo = new THREE.PlaneGeometry(520, 345, 48, 36);
  const stMaryMesh = new THREE.Mesh(stMaryGeo, lakeShaderMat);
  stMaryMesh.rotation.x = -Math.PI / 2;
  stMaryMesh.rotation.z = 0.14;
  stMaryMesh.position.set(-468, 0.18, -128);
  group.add(stMaryMesh);

  // Wooded Island on West St. Mary's Lake
  const islandGeo = new THREE.CylinderGeometry(24, 32, 2.6, 18);
  const islandMat = new THREE.MeshStandardMaterial({ color: '#355c34', roughness: 0.9 });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.set(-605, 0.6, -155);
  island.receiveShadow = true;
  group.add(island);

  // St. Joseph's Lake (North of Main Building)
  const stJoeGeo = new THREE.PlaneGeometry(365, 335, 40, 40);
  const stJoeMesh = new THREE.Mesh(stJoeGeo, lakeShaderMat);
  stJoeMesh.rotation.x = -Math.PI / 2;
  stJoeMesh.rotation.z = -0.18;
  stJoeMesh.position.set(-5, 0.18, -328);
  group.add(stJoeMesh);

  // St. Joseph's Lake Wooden Pier, Beach & Boathouse (South-East Shore)
  const boathouseGroup = new THREE.Group();
  boathouseGroup.position.set(68, 0, -178);
  const bhBody = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 11), materials.ndBuffBrick);
  bhBody.position.y = 3.25;
  bhBody.castShadow = true;
  boathouseGroup.add(bhBody);
  const bhRoof = new THREE.Mesh(new THREE.ConeGeometry(12, 4.5, 4), materials.slateRoof);
  bhRoof.rotation.y = Math.PI / 4;
  bhRoof.position.y = 8.6;
  boathouseGroup.add(bhRoof);

  const pier = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 28), materials.rusticTimber);
  pier.position.set(0, 0.65, -18);
  boathouseGroup.add(pier);
  for (let pz = -6; pz >= -30; pz -= 6) {
    for (const px of [-1.7, 1.7]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 6), materials.rusticTimber);
      post.position.set(px, 0.2, pz);
      boathouseGroup.add(post);
    }
  }
  group.add(boathouseGroup);

  // Charming Stone Footbridge on the Isthmus between St. Mary's & St. Joseph's Lakes
  const bridge = new THREE.Group();
  bridge.position.set(-196, 0.6, -212);
  bridge.rotation.y = 0.45;
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 6), materials.limestone);
  bridgeDeck.position.y = 1.2;
  bridgeDeck.castShadow = true;
  bridge.add(bridgeDeck);
  for (const side of [-2.7, 2.7]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 0.45), materials.limestone);
    rail.position.set(0, 2.1, side);
    bridge.add(rail);
  }
  group.add(bridge);

  // World Peace Plaza Infinity Fountain (East Shore of St. Mary's Lake)
  const peacePlaza = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.5, 0.9, 24), materials.limestone);
  peacePlaza.position.set(-218, 0.45, -82);
  group.add(peacePlaza);
  const peaceBasin = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 1.1, 24), lakeShaderMat);
  peaceBasin.position.set(-218, 0.6, -82);
  group.add(peaceBasin);

  scene.add(group);

  let activeSeason = 'autumn';
  function setSeason(season) {
    if (season === activeSeason) return;
    activeSeason = season;
    const oldMap = groundMat.map;
    groundMat.map = drawCampusGroundCanvas(season);
    groundMat.needsUpdate = true;
    oldMap?.dispose();
    islandMat.color.setHex(season === 'winter' ? 0xe5edf6 : 0x355c34);
    sharedWaterUniforms.uWinter.value = season === 'winter' ? 1.0 : 0.0;
  }

  function tick(elapsed, skyColor, sunDir, nightFactor) {
    sharedWaterUniforms.uTime.value = elapsed;
    sharedWaterUniforms.uSkyColor.value.copy(skyColor);
    sharedWaterUniforms.uSunDir.value.copy(sunDir);
    sharedWaterUniforms.uNightFactor.value = nightFactor;
  }

  return {
    group,
    lakeShaderMat,
    poolShaderMat,
    getGroundHeight,
    setSeason,
    tick,
  };
}
