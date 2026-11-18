import * as THREE from 'three';
import { getWalkableHeight } from '../world/SitePlan.js';

export function createAtmosphereSystem(scene) {
  const group = new THREE.Group();
  group.name = 'AtmosphereAndNightIllumination';
  scene.add(group);

  // =========================================================================
  // 1. PROCEDURAL GRADIENT & STARRY SKY DOME SHADER
  // =========================================================================
  const skyUniforms = {
    uZenithColor: { value: new THREE.Color(0x284b7a) },
    uHorizonColor: { value: new THREE.Color(0xf0935b) },
    uSunGlowColor: { value: new THREE.Color(0xffcf7d) },
    uSunDir: { value: new THREE.Vector3(-0.85, 0.18, 0.2) },
    uStarVisibility: { value: 0.0 },
  };

  const skyGeo = new THREE.SphereGeometry(1350, 40, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunGlowColor;
      uniform vec3 uSunDir;
      uniform float uStarVisibility;
      varying vec3 vWorldDir;

      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.52));

        // Solar / Sunset halo toward sun direction
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        sky += uSunGlowColor * pow(sunDot, 7.0) * 0.55;
        sky += uSunGlowColor * smoothstep(0.9975, 0.9996, sunDot) * 1.45;

        // Crisp night stars above horizon
        if (uStarVisibility > 0.01 && dir.y > 0.04) {
          vec3 grid = floor(dir * 260.0);
          float st = hash3(grid);
          if (st > 0.9955) {
            float twinkle = (st - 0.9955) / 0.0045;
            sky += vec3(0.95, 0.97, 1.0) * twinkle * uStarVisibility * smoothstep(0.04, 0.28, dir.y);
          }
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // =========================================================================
  // 2. SUN / MOON DIRECTIONAL + HEMISPHERE LIGHTING
  // =========================================================================
  const hemiLight = new THREE.HemisphereLight(0xffdfc2, 0x3b3530, 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffb978, 2.35);
  sunLight.position.set(-140, 58, 36);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 420;
  const d = 145;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  sunLight.target.position.set(10, 14, 10);
  scene.add(sunLight, sunLight.target);

  scene.fog = new THREE.FogExp2(0xd88d63, 0.00145);

  // =========================================================================
  // 3. SPECIAL NIGHT VIEWING (夜間特別拝観ライトアップ + 観音慈悲の青い光!)
  // =========================================================================
  const nightLightsGroup = new THREE.Group();
  group.add(nightLightsGroup);

  const uplightConfigs = [
    // Warm amber uplights illuminating the 139 Kakezukuri Stage Pillars & Hondo!
    { pos: [24, 9.5, 22], color: 0xff8a36, maxIntensity: 68, dist: 48 },
    { pos: [14, 14.0, 18], color: 0xff9442, maxIntensity: 45, dist: 38 },
    { pos: [34, 14.0, 18], color: 0xff9442, maxIntensity: 45, dist: 38 },
    // Sanju-no-to Three-Storied Pagoda uplight
    { pos: [-58, 22.0, 19], color: 0xff7b29, maxIntensity: 62, dist: 46 },
    // Nio-mon Gate uplight
    { pos: [-105, 13.5, 4], color: 0xff8634, maxIntensity: 44, dist: 34 },
    // Okuno-in & Kin'un-kei crimson maple valley uplights
    { pos: [66, 15.0, 18], color: 0xff8c3b, maxIntensity: 48, dist: 40 },
    { pos: [44, 10.5, 29], color: 0xff6e28, maxIntensity: 42, dist: 38 },
    // Koyasu Pagoda & Jishu Jinja soft glow
    { pos: [18, 23.0, 88], color: 0xff9648, maxIntensity: 32, dist: 30 },
  ];

  const nightPointLights = uplightConfigs.map((cfg) => {
    const pl = new THREE.PointLight(cfg.color, 0, cfg.dist, 1.5);
    pl.position.set(...cfg.pos);
    nightLightsGroup.add(pl);
    return { light: pl, maxIntensity: cfg.maxIntensity };
  });

  // Iconic Sacred Blue Laser Beam of Kannon's Compassion (観音様の慈悲を表す青い一筋の光)
  // Shoots straight Westward from above Kiyomizu-dera across the Kyoto night sky!
  const beamLen = 920;
  const beamGeo = new THREE.CylinderGeometry(0.32, 1.35, beamLen, 16, 1, true);
  beamGeo.rotateZ(Math.PI * 0.5);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x3bb8ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const kannonBlueBeam = new THREE.Mesh(beamGeo, beamMat);
  kannonBlueBeam.position.set(16 - beamLen * 0.5, 29.5, -4.0);
  kannonBlueBeam.rotation.z = -0.045; // Slight upward angle over Kyoto Basin!

  const haloGeo = new THREE.CylinderGeometry(1.1, 3.8, beamLen, 16, 1, true);
  haloGeo.rotateZ(Math.PI * 0.5);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x1678ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const kannonBeamHalo = new THREE.Mesh(haloGeo, haloMat);
  kannonBeamHalo.position.copy(kannonBlueBeam.position);
  kannonBeamHalo.rotation.copy(kannonBlueBeam.rotation);
  group.add(kannonBlueBeam, kannonBeamHalo);

  // =========================================================================
  // 4. SEASONAL FALLING PARTICLES (桜吹雪 / 蛍 / 舞い散る紅葉 / 粉雪)
  // =========================================================================
  const pCount = 900;
  const pPositions = new Float32Array(pCount * 3);
  const pSeeds = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = -125 + Math.random() * 225;
    pPositions[i * 3 + 1] = 6 + Math.random() * 38;
    pPositions[i * 3 + 2] = -65 + Math.random() * 165;
    pSeeds[i] = Math.random() * 100;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xd94826,
    size: 0.42,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const seasonalParticles = new THREE.Points(particleGeo, particleMat);
  group.add(seasonalParticles);

  // =========================================================================
  // 5. ANIMATED PILGRIMS IN KIMONO & MONK ROBES STROLLING THE PRECINCT
  // =========================================================================
  const pilgrimsGroup = new THREE.Group();
  group.add(pilgrimsGroup);
  const kimonoColors = [0xc44332, 0x35537a, 0xd8a84c, 0x5c3a58, 0x2c2926, 0x6b8252, 0xe6b4b8];
  const pilgrims = [];

  const pilgrimRoutes = [
    // Strolling on the Stage of Kiyomizu admiring Kyoto!
    { ax: 15.5, az: 18.0, bx: 32.5, bz: 18.0, speed: 0.42 },
    { ax: 31.0, az: 15.5, bx: 17.0, bz: 16.5, speed: 0.36 },
    { ax: 20.0, az: 12.5, bx: 28.0, bz: 17.5, speed: 0.31 },
    // Walking from Sai-mon past Sanju-no-to toward Todoroki-mon
    { ax: -72.0, az: 5.5, bx: -16.0, bz: 2.5, speed: 0.65 },
    { ax: -20.0, az: 3.5, bx: -68.0, bz: 6.5, speed: 0.58 },
    // Climbing Kiyomizu-zaka toward Nio-mon
    { ax: -158.0, az: 3.2, bx: -115.0, bz: 3.8, speed: 0.62 },
    { ax: -116.0, az: 5.2, bx: -154.0, bz: 4.8, speed: 0.55 },
    // Okuno-in panoramic deck & Otowa Waterfall plaza
    { ax: 66.5, az: 13.0, bx: 66.5, bz: 23.0, speed: 0.35 },
    { ax: 47.0, az: 29.0, bx: 55.0, bz: 30.0, speed: 0.4 },
    { ax: 18.0, az: 28.0, bx: 44.0, bz: 29.0, speed: 0.58 },
  ];

  for (let i = 0; i < 24; i++) {
    const route = pilgrimRoutes[i % pilgrimRoutes.length];
    const fig = new THREE.Group();
    const robeMat = new THREE.MeshStandardMaterial({
      color: kimonoColors[i % kimonoColors.length],
      roughness: 0.85,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.28, 8), robeMat);
    body.position.y = 0.64;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xeed8c4, roughness: 0.8 })
    );
    head.position.y = 1.44;
    fig.add(body, head);
    pilgrimsGroup.add(fig);

    pilgrims.push({
      mesh: fig,
      route,
      phase: (i / 24) * Math.PI * 2,
    });
  }

  let currentSeason = 'autumn';
  let currentNightFactor = 0.2;

  function updateAtmosphereState(timeHours, season) {
    currentSeason = season;

    // Convert 0..24h to solar elevation: sunrise ~6:00, noon 12:00, sunset ~17:45 (Kyoto autumn)
    const dayAngle = ((timeHours - 6.0) / 12.0) * Math.PI;
    const sunElev = Math.sin(dayAngle); // > 0 daytime, < 0 nighttime
    // Azimuth: East (+X) at 6:00 -> South (+Z) at 12:00 -> West (-X, Kyoto sunset!) at 18:00
    const sunX = Math.cos(dayAngle) * 180;
    const sunY = Math.max(-45, sunElev * 155);
    const sunZ = Math.sin(dayAngle) * 68;

    const nightFactor = THREE.MathUtils.clamp(1.0 - (sunElev + 0.16) / 0.38, 0, 1);
    const sunsetFactor =
      THREE.MathUtils.clamp(1.0 - Math.abs(sunElev - 0.08) / 0.28, 0, 1) * (1.0 - nightFactor * 0.7);
    currentNightFactor = nightFactor;

    // Position directional light (Sun by day, cool silver Moon by night)
    if (nightFactor < 0.85) {
      sunLight.position.set(sunX + 10, Math.max(14, sunY), sunZ + 10);
      sunUniformVec(skyUniforms.uSunDir.value, sunX, sunY, sunZ);
    } else {
      sunLight.position.set(-110, 95, -65);
      sunUniformVec(skyUniforms.uSunDir.value, -110, 95, -65);
    }

    // Interpolate Sky Dome, Fog, Sun & Hemisphere colors
    const zenithDay = new THREE.Color(season === 'winter' ? 0x567ba3 : 0x2d66a6);
    const horizonDay = new THREE.Color(season === 'winter' ? 0xcad9e8 : 0xa7CBE8);
    const zenithSunset = new THREE.Color(0x283f6b);
    const horizonSunset = new THREE.Color(0xe87b46);
    const zenithNight = new THREE.Color(0x060b16);
    const horizonNight = new THREE.Color(0x131d33);

    const zCol = zenithDay.clone().lerp(zenithSunset, sunsetFactor).lerp(zenithNight, nightFactor);
    const hCol = horizonDay.clone().lerp(horizonSunset, sunsetFactor).lerp(horizonNight, nightFactor);

    skyUniforms.uZenithColor.value.copy(zCol);
    skyUniforms.uHorizonColor.value.copy(hCol);
    skyUniforms.uSunGlowColor.value.setHex(nightFactor > 0.75 ? 0x9bb8e8 : sunsetFactor > 0.3 ? 0xffb35c : 0xfff3d6);
    skyUniforms.uStarVisibility.value = THREE.MathUtils.smoothstep(nightFactor, 0.45, 0.95);

    scene.fog.color.copy(hCol);
    scene.fog.density = season === 'winter' ? 0.0017 : 0.00115 + sunsetFactor * 0.00035;

    // Sun & Hemi light intensities
    const sunDayCol = new THREE.Color(0xfff4e2);
    const sunSetCol = new THREE.Color(0xff964f);
    const moonCol = new THREE.Color(0x7aa2d8);
    sunLight.color.copy(sunDayCol).lerp(sunSetCol, sunsetFactor).lerp(moonCol, nightFactor);
    sunLight.intensity = THREE.MathUtils.lerp(2.45, 0.42, nightFactor);

    hemiLight.color.copy(hCol).lerp(new THREE.Color(0xffffff), 0.35);
    hemiLight.groundColor.setHex(nightFactor > 0.6 ? 0x161412 : 0x453b31);
    hemiLight.intensity = THREE.MathUtils.lerp(0.82, 0.28, nightFactor);

    // Special Night Viewing Uplights + Sacred Blue Kannon Beam!
    const nightIllum = THREE.MathUtils.smoothstep(nightFactor, 0.32, 0.85);
    for (const item of nightPointLights) {
      item.light.intensity = item.maxIntensity * nightIllum;
    }
    kannonBlueBeam.material.opacity = nightIllum * 0.72;
    kannonBeamHalo.material.opacity = nightIllum * 0.22;
    kannonBlueBeam.visible = nightIllum > 0.01;
    kannonBeamHalo.visible = nightIllum > 0.01;

    // Seasonal Falling Particle styling
    if (season === 'spring') {
      particleMat.color.setHex(0xfad4e0);
      particleMat.size = 0.38;
      particleMat.opacity = 0.88;
    } else if (season === 'autumn') {
      particleMat.color.setHex(0xe04f24);
      particleMat.size = 0.44;
      particleMat.opacity = 0.88;
    } else if (season === 'winter') {
      particleMat.color.setHex(0xf4f8ff);
      particleMat.size = 0.36;
      particleMat.opacity = 0.92;
    } else {
      // Summer: golden fireflies at night, soft pollen/mist motes by day
      particleMat.color.setHex(nightIllum > 0.3 ? 0xc8ff5a : 0xeaf7df);
      particleMat.size = nightIllum > 0.3 ? 0.34 : 0.22;
      particleMat.opacity = nightIllum > 0.3 ? 0.82 : 0.38;
    }

    return { nightFactor, sunsetFactor };
  }

  function tickAtmosphere(elapsed, dt) {
    // Animate seasonal falling leaves / sakura petals / snow / fireflies
    const pos = particleGeo.attributes.position.array;
    const isSummerFireflies = currentSeason === 'summer' && currentNightFactor > 0.4;

    for (let i = 0; i < pCount; i++) {
      const i3 = i * 3;
      const seed = pSeeds[i];
      if (isSummerFireflies) {
        pos[i3] += Math.sin(elapsed * 0.8 + seed) * dt * 0.6;
        pos[i3 + 1] += Math.cos(elapsed * 1.1 + seed * 1.3) * dt * 0.45;
        pos[i3 + 2] += Math.sin(elapsed * 0.7 - seed) * dt * 0.6;
      } else {
        const fallSpeed = currentSeason === 'winter' ? 1.85 : 1.35;
        pos[i3] += Math.sin(elapsed * 0.9 + seed) * dt * 0.85 - dt * 0.35;
        pos[i3 + 1] -= fallSpeed * dt;
        pos[i3 + 2] += Math.cos(elapsed * 0.75 + seed) * dt * 0.65;
        if (pos[i3 + 1] < 3.0) {
          pos[i3 + 1] = 38.0 + (seed % 8);
          pos[i3] = -115 + ((seed * 37.3) % 210);
        }
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Animate strolling pilgrims smoothly along routes
    for (const p of pilgrims) {
      const r = p.route;
      const pingPong = 0.5 + 0.5 * Math.sin(elapsed * r.speed * 0.14 + p.phase);
      const px = r.ax + (r.bx - r.ax) * pingPong;
      const pz = r.az + (r.bz - r.az) * pingPong;
      const py = getWalkableHeight(px, pz);
      const bob = Math.abs(Math.sin(elapsed * 4.2 + p.phase)) * 0.05;
      p.mesh.position.set(px, py + bob, pz);
    }
  }

  return {
    updateAtmosphereState,
    tickAtmosphere,
  };
}

function sunUniformVec(target, x, y, z) {
  target.set(x, y, z).normalize();
}
