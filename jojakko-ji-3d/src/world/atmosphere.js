import * as THREE from 'three';
import { createSeededRandom, clamp } from '../utils/noise.js';
import { getSingleMomijiLeafTexture } from '../utils/textures.js';

export function buildAtmosphereSystem(scene, archRefs) {
  const root = new THREE.Group();
  root.name = 'OguraAtmosphere';
  const rng = createSeededRandom(1715);

  // ============================================================================
  // 1. Custom Gradient Sky Dome + Sun/Moon Orb + Northern Starfield & Big Dipper
  // ============================================================================
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x2e5b88) },
    uMidColor: { value: new THREE.Color(0x7ca2c4) },
    uHorizonColor: { value: new THREE.Color(0xe6ccb2) },
    uSunDir: { value: new THREE.Vector3(0.6, 0.45, 0.3).normalize() },
    uSunGlow: { value: new THREE.Color(0xffe0a8) },
    uSunStrength: { value: 0.55 }
  };

  const skyGeo = new THREE.SphereGeometry(620, 36, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunGlow;
      uniform float uSunStrength;
      varying vec3 vWorldDir;
      void main() {
        float h = clamp(vWorldDir.y, -0.15, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(-0.04, 0.28, h));
        col = mix(col, uTopColor, smoothstep(0.24, 0.88, h));
        float sunDot = max(dot(normalize(vWorldDir), normalize(uSunDir)), 0.0);
        col += uSunGlow * (pow(sunDot, 18.0) * 0.42 + pow(sunDot, 220.0) * 1.15) * uSunStrength;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  root.add(skyDome);

  // Starfield + Hokushin Polaris & Big Dipper (北辰・北斗七星 honoring Myōken Bosatsu!)
  const starCount = 650;
  const starPos = new Float32Array((starCount + 8) * 3);
  const starSizes = new Float32Array(starCount + 8);
  for (let i = 0; i < starCount; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(0.08 + rng() * 0.92);
    const r = 560;
    starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starSizes[i] = 1.2 + rng() * 2.0;
  }
  // Prominent Polaris & Big Dipper in the Northern (-Z) sky!
  const dipperOffsets = [
    [0, 255, -500],     // Polaris (北極星・北辰)
    [-55, 215, -510],   // Dubhe
    [-42, 192, -518],   // Merak
    [-12, 185, -522],   // Phecda
    [8, 202, -518],     // Megrez
    [36, 208, -515],    // Alioth
    [62, 216, -510],    // Mizar
    [88, 204, -512]     // Alkaid
  ];
  dipperOffsets.forEach(([dx, dy, dz], idx) => {
    const k = starCount + idx;
    starPos[k * 3 + 0] = dx;
    starPos[k * 3 + 1] = dy;
    starPos[k * 3 + 2] = dz;
    starSizes[k] = idx === 0 ? 4.5 : 3.4;
  });

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xf4f1dc,
    size: 2.3,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  root.add(stars);

  // ============================================================================
  // 2. Primary Sun/Moon Shadow Light + Hemisphere Fill + Night Illumination Lights
  // ============================================================================
  const hemiLight = new THREE.HemisphereLight(0xaac8e8, 0x4b5836, 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff0d4, 2.25);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 230;
  sunLight.shadow.camera.left = -75;
  sunLight.shadow.camera.right = 85;
  sunLight.shadow.camera.top = 58;
  sunLight.shadow.camera.bottom = -58;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.03;
  sunLight.target.position.set(5, 11, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Special Night Illumination Uplights (夜間特別拝観ライトアップ) on Iconic Structures & Maple Canopy!
  const nightUplights = [];
  const uplightSpecs = [
    { pos: [41.5, 3.0, 0.0], color: 0xff9e4a, dist: 22, baseInt: 5.5 },    // Niomon thatched gate
    { pos: [26.0, 4.8, -2.2], color: 0xff7038, dist: 20, baseInt: 4.8 },   // Lower stone steps maples
    { pos: [16.5, 8.2, 2.2], color: 0xff7838, dist: 20, baseInt: 4.8 },    // Upper stone steps maples
    { pos: [2.8, 12.0, 0.0], color: 0xffaa56, dist: 26, baseInt: 6.2 },    // Hondo Main Hall facade
    { pos: [3.2, 12.2, 10.5], color: 0xffa64d, dist: 16, baseInt: 3.8 },   // Shoro Belfry
    { pos: [-1.5, 12.2, 18.5], color: 0xff9b48, dist: 18, baseInt: 4.2 },  // Myoken-do & Torii
    { pos: [-3.5, 11.8, -14.5], color: 0xffb366, dist: 20, baseInt: 4.5 }, // Pond garden reflection!
    { pos: [-25.5, 20.5, 4.0], color: 0xff9f46, dist: 28, baseInt: 7.5 },  // Tahoto Pagoda hero uplight!
    { pos: [-28.5, 21.8, 21.5], color: 0xffa452, dist: 18, baseInt: 4.0 }  // Kasenshi & Shigure-tei
  ];

  uplightSpecs.forEach((s) => {
    const pl = new THREE.PointLight(s.color, 0, s.dist, 1.55);
    pl.position.set(...s.pos);
    root.add(pl);
    nightUplights.push({ light: pl, maxIntensity: s.baseInt });
  });

  // Exponential Valley Mist (嵯峨野朝霧・山靄)
  scene.fog = new THREE.FogExp2(0xd8ccb8, 0.0036);

  // ============================================================================
  // 3. Fluttering Falling Maple Leaves / Sakura Petals / Winter Snowflakes!
  // ============================================================================
  const driftCount = 260;
  const leafTex = getSingleMomijiLeafTexture();
  const driftGeo = new THREE.PlaneGeometry(0.22, 0.22);
  const driftMat = new THREE.MeshBasicMaterial({
    map: leafTex,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  });
  const driftInst = new THREE.InstancedMesh(driftGeo, driftMat, driftCount);
  const driftData = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < driftCount; i++) {
    driftData.push({
      x: -50 + rng() * 122,
      y: 2 + rng() * 30,
      z: (rng() - 0.5) * 60,
      vy: 0.55 + rng() * 0.65,
      phase: rng() * Math.PI * 2,
      spinX: (rng() - 0.5) * 3.2,
      spinY: (rng() - 0.5) * 3.2,
      scale: 0.72 + rng() * 0.75,
      seed: rng()
    });
  }
  root.add(driftInst);

  // ============================================================================
  // 4. Ogura Shigure Mountain Drizzle (小倉時雨 — Poetic Drizzle Streaks)
  // ============================================================================
  const rainCount = 1100;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSeeds = [];
  for (let i = 0; i < rainCount; i++) {
    const rx = -55 + rng() * 130;
    const ry = rng() * 38;
    const rz = (rng() - 0.5) * 72;
    rainSeeds.push({ x: rx, y: ry, z: rz, speed: 15 + rng() * 7 });
    rainPositions[i * 6 + 0] = rx;
    rainPositions[i * 6 + 1] = ry;
    rainPositions[i * 6 + 2] = rz;
    rainPositions[i * 6 + 3] = rx + 0.14;
    rainPositions[i * 6 + 4] = ry - 0.95;
    rainPositions[i * 6 + 5] = rz + 0.06;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xcbd8e4,
    transparent: true,
    opacity: 0.36
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  root.add(rainLines);

  let currentSeason = 'autumn';
  let currentHour = 15.6; // Warm golden late-autumn afternoon default!
  let shigureEnabled = false;

  function recolorDriftingParticles(season) {
    const c = new THREE.Color();
    for (let i = 0; i < driftCount; i++) {
      const r = driftData[i].seed;
      if (season === 'autumn') {
        c.setHex(r < 0.45 ? 0xc8281c : r < 0.8 ? 0xe55c1f : 0xebb128);
      } else if (season === 'spring') {
        c.setHex(r < 0.6 ? 0xf8ced9 : 0xf2aec0);
      } else if (season === 'winter') {
        c.setHex(0xf6f9fd);
      } else {
        c.setHex(0x63ad44);
      }
      driftInst.setColorAt(i, c);
    }
    driftInst.instanceColor.needsUpdate = true;
    driftInst.visible = season !== 'summer' || true; // Subtle falling green leaves in summer breeze too
  }

  function applyAtmosphere({ hour = currentHour, season = currentSeason, shigure = shigureEnabled } = {}) {
    currentHour = hour;
    currentSeason = season;
    shigureEnabled = shigure;

    recolorDriftingParticles(season);
    rainLines.visible = shigure;

    // Authentic Kyoto Late-Autumn (35°N November) Southern Solar Arc:
    // Morning rises in East-Southeast (+X, +Z), Midday shines from high South-Southeast,
    // Golden Hour rakes warmly across the mountainside from South-Southwest without hiding behind Mt. Ogura!
    const dayFrac = clamp((hour - 6.0) / 11.8, 0, 1);
    const isNight = hour < 5.7 || hour > 18.1;
    const twilight =
      hour >= 5.7 && hour < 7.1
        ? 1 - (hour - 5.7) / 1.4
        : hour > 16.5 && hour <= 18.1
        ? (hour - 16.5) / 1.6
        : isNight
        ? 1
        : 0;

    if (!isNight) {
      const sunElev = Math.sin(dayFrac * Math.PI);
      const sx = 115 - dayFrac * 98; // +115 (East dawn) -> +66 (Midday) -> +17 (Golden raking SSW light!)
      const sy = 24 + sunElev * 72;
      const sz = -18 + dayFrac * 112; // Sweeps across the southern sky
      sunLight.position.set(sx, sy, sz);
      skyUniforms.uSunDir.value.set(sx, sy, sz).normalize();
    } else {
      sunLight.position.set(84, 72, 34);
      skyUniforms.uSunDir.value.set(84, 72, 34).normalize();
    }

    // Interpolate sky, fog, sun intensity, and temple night-illumination!
    if (isNight) {
      skyUniforms.uTopColor.value.setHex(0x070e1d);
      skyUniforms.uMidColor.value.setHex(0x13223d);
      skyUniforms.uHorizonColor.value.setHex(0x22304d);
      skyUniforms.uSunGlow.value.setHex(0xc8dcf8);
      skyUniforms.uSunStrength.value = 0.28;

      sunLight.color.setHex(0x9ab8e6);
      sunLight.intensity = 0.55;
      hemiLight.color.setHex(0x486494);
      hemiLight.groundColor.setHex(0x202820);
      hemiLight.intensity = 0.58;

      scene.fog.color.setHex(0x121b2d);
      scene.fog.density = shigure ? 0.0052 : 0.0024;
      starMat.opacity = shigure ? 0.15 : 0.94;
    } else if (hour < 8.5) {
      // Poetic Sagano Morning Mist (朝霧): pearl-gold eastern rays streaming straight up the stone steps!
      skyUniforms.uTopColor.value.setHex(0x3f70a2);
      skyUniforms.uMidColor.value.setHex(0x92b8d4);
      skyUniforms.uHorizonColor.value.setHex(0xf7e2c6);
      skyUniforms.uSunGlow.value.setHex(0xffe3ad);
      skyUniforms.uSunStrength.value = 0.88;

      sunLight.color.setHex(0xffe4ba);
      sunLight.intensity = shigure ? 1.45 : 2.65;
      hemiLight.color.setHex(0xcde2f5);
      hemiLight.groundColor.setHex(0x52663e);
      hemiLight.intensity = 0.95;

      scene.fog.color.setHex(0xe8dccb);
      scene.fog.density = shigure ? 0.0058 : 0.0028;
      starMat.opacity = 0;
    } else if (hour > 15.0) {
      // Golden Sunset / Autumn Glow (夕照): warm raking amber light igniting the 225 Momiji maples!
      skyUniforms.uTopColor.value.setHex(0x2a4d7d);
      skyUniforms.uMidColor.value.setHex(0x9c727e);
      skyUniforms.uHorizonColor.value.setHex(0xf49d62);
      skyUniforms.uSunGlow.value.setHex(0xffa95c);
      skyUniforms.uSunStrength.value = 0.95;

      sunLight.color.setHex(0xffbe78);
      sunLight.intensity = shigure ? 1.35 : 2.85 * (1 - twilight * 0.45);
      hemiLight.color.setHex(0xebc0a6);
      hemiLight.groundColor.setHex(0x594935);
      hemiLight.intensity = 0.92;

      scene.fog.color.setHex(0xdca886);
      scene.fog.density = shigure ? 0.0052 : 0.0019;
      starMat.opacity = twilight * 0.5;
    } else {
      // Crisp Kyoto Autumn Midday
      skyUniforms.uTopColor.value.setHex(shigure ? 0x5c6e7e : 0x2964a0);
      skyUniforms.uMidColor.value.setHex(shigure ? 0x8fa0ad : 0x76acd8);
      skyUniforms.uHorizonColor.value.setHex(shigure ? 0xc2ccd2 : 0xe0ebf0);
      skyUniforms.uSunGlow.value.setHex(0xfff5df);
      skyUniforms.uSunStrength.value = shigure ? 0.2 : 0.58;

      sunLight.color.setHex(0xfff7e8);
      sunLight.intensity = shigure ? 1.5 : 2.75;
      hemiLight.color.setHex(0xc2dff8);
      hemiLight.groundColor.setHex(0x52693e);
      hemiLight.intensity = 1.0;

      scene.fog.color.setHex(shigure ? 0xb8c3c8 : 0xd8e3e8);
      scene.fog.density = shigure ? 0.0055 : 0.0016;
      starMat.opacity = 0;
    }

    if (season === 'winter' && !isNight) {
      scene.fog.color.lerp(new THREE.Color(0xe6edf5), 0.55);
    }

    // Activate warm lanterns, Shōji glow & architectural uplights during Dusk & Night!
    const lanternFactor = isNight ? 1.0 : twilight > 0.15 ? twilight : shigure ? 0.35 : 0.08;
    nightUplights.forEach((u) => {
      u.light.intensity = u.maxIntensity * (isNight ? 1.0 : Math.max(0, twilight - 0.1));
    });
    if (archRefs) {
      archRefs.shojiMat.emissiveIntensity = 0.1 + lanternFactor * 1.15;
      archRefs.lanternGlowMat.emissiveIntensity = 0.15 + lanternFactor * 1.85;
    }
  }

  applyAtmosphere();
  scene.add(root);

  return {
    root,
    applyAtmosphere,
    update(elapsed, dt) {
      // Animate fluttering maple leaves / sakura petals / snowflakes
      const densityFactor = currentSeason === 'summer' ? 0.25 : 1.0;
      const activeCount = Math.floor(driftCount * densityFactor);
      driftInst.count = activeCount;

      for (let i = 0; i < activeCount; i++) {
        const d = driftData[i];
        d.y -= d.vy * dt * (currentSeason === 'winter' ? 0.85 : 1.0);
        const swayX = Math.sin(elapsed * 1.1 + d.phase) * 0.75 * dt;
        const swayZ = Math.cos(elapsed * 0.85 + d.phase * 1.3) * 0.65 * dt;
        d.x += swayX;
        d.z += swayZ;

        if (d.y < -1.0) {
          d.y = 28 + (i % 9);
          d.x = -48 + ((d.seed * 137.5 + elapsed * 0.5) % 118);
        }

        dummy.position.set(d.x, d.y, d.z);
        if (currentSeason === 'winter') {
          dummy.rotation.set(elapsed * 0.6, elapsed * 0.8, 0);
          dummy.scale.setScalar(d.scale * 0.45);
        } else {
          dummy.rotation.set(
            elapsed * d.spinX + d.phase,
            elapsed * d.spinY,
            Math.sin(elapsed * 2.0 + d.phase) * 0.6
          );
          dummy.scale.setScalar(d.scale);
        }
        dummy.updateMatrix();
        driftInst.setMatrixAt(i, dummy.matrix);
      }
      driftInst.instanceMatrix.needsUpdate = true;

      // Animate Ogura Shigure mountain drizzle if enabled
      if (rainLines.visible) {
        const pos = rainGeo.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
          const rs = rainSeeds[i];
          rs.y -= rs.speed * dt;
          rs.x += 2.2 * dt;
          if (rs.y < -1) {
            rs.y = 36;
            rs.x = -55 + ((i * 19.37) % 130);
          }
          pos[i * 6 + 0] = rs.x;
          pos[i * 6 + 1] = rs.y;
          pos[i * 6 + 2] = rs.z;
          pos[i * 6 + 3] = rs.x + 0.14;
          pos[i * 6 + 4] = rs.y - 1.05;
          pos[i * 6 + 5] = rs.z + 0.05;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    }
  };
}
