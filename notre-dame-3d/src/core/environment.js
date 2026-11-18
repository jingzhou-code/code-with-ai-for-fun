import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldDirection;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNightFactor;
  varying vec3 vWorldDirection;

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float h = clamp(dir.y * 0.85 + 0.12, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.62));

    // Solar glow & disc
    float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sunAmt, 14.0) * (1.0 - uNightFactor * 0.85) * 0.48;
    col += uSunColor * smoothstep(0.9991, 0.9998, sunAmt) * (1.0 - uNightFactor) * 2.2;

    // Horizon warm rim near sunset/sunrise
    float sunsetBand = exp(-abs(dir.y) * 9.0) * pow(sunAmt, 2.5);
    col += uSunColor * sunsetBand * (1.0 - uNightFactor * 0.7) * 0.42;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createEnvironment(scene, renderer, camera) {
  // 1. Atmospheric Sky Dome
  const skyUniforms = {
    uTopColor: { value: new THREE.Color('#1f4e8c') },
    uHorizonColor: { value: new THREE.Color('#f2b679') },
    uSunDir: { value: new THREE.Vector3(-0.7, 0.25, 0.4).normalize() },
    uSunColor: { value: new THREE.Color('#ffae52') },
    uNightFactor: { value: 0.25 },
  };

  const skyGeo = new THREE.SphereGeometry(2600, 36, 24);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // 2. Starfield for Night Vigil
  const starCount = 1400;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.88 + 0.08);
    const r = 2350;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xfff6e0,
    size: 3.4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // 3. Distance Fog
  scene.fog = new THREE.FogExp2('#d9aa82', 0.00034);

  // 4. Primary Sun / Moon & Hemisphere Lighting
  const hemiLight = new THREE.HemisphereLight('#ffd8a8', '#354832', 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#ffbe76', 2.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 40;
  sunLight.shadow.camera.far = 1650;
  const shadowExtent = 680;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.bias = -0.00045;
  sunLight.target.position.set(80, 0, 180);
  scene.add(sunLight);
  scene.add(sunLight.target);

  const moonLight = new THREE.DirectionalLight('#7aa2e8', 0.0);
  moonLight.position.set(260, 420, -320);
  scene.add(moonLight);

  // Iconic Landmark Night Floodlights (Golden Dome, Basilica Spire, Grotto Candles, Touchdown Jesus)
  const domeFloodLight = new THREE.PointLight('#ffd269', 0, 145, 1.5);
  domeFloodLight.position.set(0, 50, 16);
  scene.add(domeFloodLight);

  const basilicaSpireLight = new THREE.PointLight('#ffe09c', 0, 120, 1.6);
  basilicaSpireLight.position.set(-74, 52, 68);
  scene.add(basilicaSpireLight);

  const grottoCandleLight = new THREE.PointLight('#ff9b38', 18, 52, 1.6);
  grottoCandleLight.position.set(-135, 3.6, 10);
  scene.add(grottoCandleLight);

  const touchdownMuralLight = new THREE.PointLight('#ffe4a3', 0, 130, 1.5);
  touchdownMuralLight.position.set(405, 36, 118);
  scene.add(touchdownMuralLight);

  // 5. Seasonal Falling Particles (Autumn leaves / Winter snow / Spring petals)
  const particleCount = 900;
  const pPos = new Float32Array(particleCount * 3);
  const pSeed = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 1400 + 80;
    pPos[i * 3 + 1] = Math.random() * 140 + 2;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 1300 + 160;
    pSeed[i] = Math.random() * 100;
  }
  const weatherGeo = new THREE.BufferGeometry();
  weatherGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const weatherMat = new THREE.PointsMaterial({
    color: '#d97724',
    size: 2.2,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
  scene.add(weatherPoints);

  // 6. Post-Processing Composer (ACES + Subtle UnrealBloom)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.34,
    0.58,
    0.84
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const sunDir = new THREE.Vector3();
  const cDawnHorizon = new THREE.Color('#f39c6b');
  const cNoonHorizon = new THREE.Color('#bfdcf5');
  const cDuskHorizon = new THREE.Color('#ee965b');
  const cNightHorizon = new THREE.Color('#101d38');

  const cDayTop = new THREE.Color('#2463b5');
  const cDuskTop = new THREE.Color('#1a396e');
  const cNightTop = new THREE.Color('#050b18');

  let currentSeason = 'autumn';
  let currentNightFactor = 0.25;

  function updateTimeAndSeason(hour, season, gameday) {
    currentSeason = season;

    // Solar elevation angle across 24h (sunrise ~6:15, solar noon ~13:00, sunset ~18:15)
    const solarPhase = ((hour - 6.25) / 12.0) * Math.PI;
    const elevation = Math.sin(solarPhase);
    const azimuth = ((hour - 12.25) / 12.0) * Math.PI * 0.85;

    sunDir.set(
      -Math.sin(azimuth) * Math.cos(Math.max(-0.2, elevation)),
      Math.max(-0.35, elevation * 0.88),
      Math.cos(azimuth) * 0.55 + 0.25
    ).normalize();

    skyUniforms.uSunDir.value.copy(sunDir);

    const nightFactor = THREE.MathUtils.clamp(1.0 - THREE.MathUtils.smoothstep(elevation, -0.14, 0.22), 0, 1);
    const goldenHourFactor = THREE.MathUtils.clamp(1.0 - Math.abs(elevation - 0.08) / 0.28, 0, 1);
    currentNightFactor = nightFactor;
    skyUniforms.uNightFactor.value = nightFactor;

    // Sky colors
    const topCol = cDayTop.clone().lerp(cDuskTop, goldenHourFactor * 0.75).lerp(cNightTop, nightFactor);
    const dayH = hour < 12 ? cNoonHorizon.clone().lerp(cDawnHorizon, goldenHourFactor) : cNoonHorizon.clone().lerp(cDuskHorizon, goldenHourFactor);
    const horCol = dayH.lerp(cNightHorizon, nightFactor);

    if (season === 'winter' && nightFactor < 0.7) {
      horCol.lerp(new THREE.Color('#dce6f2'), 0.42);
      topCol.lerp(new THREE.Color('#5c82ad'), 0.28);
    }

    skyUniforms.uTopColor.value.copy(topCol);
    skyUniforms.uHorizonColor.value.copy(horCol);
    skyUniforms.uSunColor.value.setHex(goldenHourFactor > 0.35 ? 0xff9d47 : 0xfff0d1);

    // Fog sync
    scene.fog.color.copy(horCol);
    scene.fog.density = season === 'winter' ? 0.00046 : 0.00028 + goldenHourFactor * 0.00008;

    // Sun & Moon intensities
    const dayStrength = 1.0 - nightFactor;
    sunLight.position.copy(sunDir).multiplyScalar(780).add(new THREE.Vector3(80, 30, 180));
    sunLight.intensity = dayStrength * (2.55 - goldenHourFactor * 0.35);
    sunLight.color.setHex(goldenHourFactor > 0.38 ? 0xffae63 : 0xfff4de);

    hemiLight.intensity = 0.26 + dayStrength * 0.62;
    hemiLight.color.copy(horCol).lerp(new THREE.Color('#ffffff'), 0.45);
    hemiLight.groundColor.setHex(season === 'winter' ? 0x9fb0c4 : 0x3b4a34);

    moonLight.intensity = nightFactor * 0.68;
    starMat.opacity = THREE.MathUtils.smoothstep(nightFactor, 0.35, 0.92) * 0.9;

    // Iconic Notre Dame Night Uplighting!
    const archGlow = THREE.MathUtils.smoothstep(nightFactor, 0.15, 0.85);
    domeFloodLight.intensity = archGlow * 140;
    basilicaSpireLight.intensity = archGlow * 90;
    touchdownMuralLight.intensity = archGlow * 110;
    grottoCandleLight.intensity = 16 + archGlow * 42;

    // Bloom balance
    bloomPass.strength = 0.22 + archGlow * 0.28 + (gameday ? 0.08 : 0);
    bloomPass.threshold = 0.86 - archGlow * 0.18;

    // Weather particles style
    if (season === 'winter') {
      weatherPoints.visible = true;
      weatherMat.color.setHex(0xf4f8ff);
      weatherMat.size = 2.6;
      weatherMat.opacity = 0.82;
    } else if (season === 'autumn') {
      weatherPoints.visible = true;
      weatherMat.color.setHex(0xd96b27);
      weatherMat.size = 2.0;
      weatherMat.opacity = 0.55;
    } else if (season === 'spring') {
      weatherPoints.visible = true;
      weatherMat.color.setHex(0xf9c6d3);
      weatherMat.size = 1.9;
      weatherMat.opacity = 0.48;
    } else {
      weatherPoints.visible = false;
    }

    return { nightFactor, sunDir };
  }

  function tick(elapsed, delta) {
    // Flicker Grotto candle light subtly
    const flicker = Math.sin(elapsed * 7.3) * 1.8 + Math.cos(elapsed * 13.1) * 1.1;
    grottoCandleLight.intensity = Math.max(10, (16 + currentNightFactor * 42) + flicker);

    // Animate falling leaves / snow
    if (weatherPoints.visible) {
      const arr = weatherGeo.attributes.position.array;
      const fallSpeed = currentSeason === 'winter' ? 11.5 : 6.5;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        arr[idx] += Math.sin(elapsed * 0.8 + pSeed[i]) * delta * 3.2;
        arr[idx + 1] -= fallSpeed * delta;
        arr[idx + 2] += Math.cos(elapsed * 0.7 + pSeed[i]) * delta * 2.4;
        if (arr[idx + 1] < 1) {
          arr[idx + 1] = 135;
        }
      }
      weatherGeo.attributes.position.needsUpdate = true;
    }
  }

  function resize(width, height) {
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
  }

  return {
    composer,
    skyUniforms,
    updateTimeAndSeason,
    tick,
    resize,
  };
}
