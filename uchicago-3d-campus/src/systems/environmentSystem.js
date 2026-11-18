import * as THREE from 'three';

export function createEnvironmentSystem(scene, mats, bloomPass) {
  // Gradient Sky Dome
  const skyGeo = new THREE.SphereGeometry(3200, 32, 20);
  const skyUniforms = {
    topColor: { value: new THREE.Color('#2d5a88') },
    horizonColor: { value: new THREE.Color('#e8b882') },
    bottomColor: { value: new THREE.Color('#303842') }
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
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
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = h > 0.0
          ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
          : mix(horizonColor, bottomColor, clamp(-h * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Starfield for Midnight Study Mode
  const starCount = 1200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.12 + Math.random() * 0.88);
    const r = 2850;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#fff8ea',
    size: 4.5,
    transparent: true,
    opacity: 0,
    fog: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Fog
  const fog = new THREE.FogExp2('#dfbe99', 0.00034);
  scene.fog = fog;

  // Hemisphere Sky + Warm Limestone Bounce Fill
  const hemiLight = new THREE.HemisphereLight('#bfd8f2', '#9c8b73', 0.9);
  scene.add(hemiLight);

  // Primary Sun / Moon Directional Light with Crisp Campus Shadows
  const sunLight = new THREE.DirectionalLight('#ffe4bc', 2.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 40;
  sunLight.shadow.camera.far = 1850;
  const d = 560;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.00035;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Warm Night Campus Accent Lights (Main Quad, Mansueto Dome, Rockefeller Chapel, Law Pool)
  const nightAccents = [];
  for (const [x, y, z, dist] of [
    [22, 16, -8, 160],     // Main Quad center
    [24, 24, 175, 130],    // Harper Memorial Library
    [-32, 16, -295, 120],  // Mansueto Dome
    [204, 34, 142, 160],   // Rockefeller Chapel
    [318, 22, 48, 120],    // Booth Winter Garden
    [128, 16, 465, 110]    // Law School Fountain
  ]) {
    const pl = new THREE.PointLight('#ffbd6b', 0, dist, 1.6);
    pl.position.set(x, y, z);
    scene.add(pl);
    nightAccents.push(pl);
  }

  let currentHour = 16.6; // Default: Golden Hyde Park Afternoon!
  let currentSeason = 'autumn';

  function applyState() {
    // Solar elevation curve (sunrise ~6:00, noon 12:30, sunset ~18:30)
    const dayAngle = ((currentHour - 6) / 12.5) * Math.PI;
    const sinElev = Math.sin(dayAngle);
    const cosAzim = Math.cos(dayAngle);

    const isDay = sinElev > -0.08;
    const nightFactor = THREE.MathUtils.clamp(1 - (sinElev + 0.12) * 2.4, 0, 1);
    const duskFactor = THREE.MathUtils.clamp(1 - Math.abs(sinElev - 0.14) * 3.2, 0, 1);

    // Position Sun across Southern Hyde Park sky (East +X in morning -> South +Z noon -> West -X sunset)
    const radius = 820;
    if (isDay) {
      const elev = Math.max(0.08, sinElev);
      sunLight.position.set(cosAzim * radius, elev * 680, 260 + (1 - elev) * 180);
    } else {
      // Cool silver moonlight from SE
      sunLight.position.set(340, 460, 320);
    }
    sunLight.target.position.set(30, 0, 20);
    sunLight.target.updateMatrixWorld();

    // Colors by Time of Day & Season
    const isWinter = currentSeason === 'winter';

    const noonTop = new THREE.Color(isWinter ? '#5d82a8' : '#2d68a8');
    const noonHor = new THREE.Color(isWinter ? '#d8e3ed' : '#bcd7ec');
    const duskTop = new THREE.Color('#273e66');
    const duskHor = new THREE.Color('#e8995e');
    const nightTop = new THREE.Color('#090f1c');
    const nightHor = new THREE.Color('#182338');

    const topCol = noonTop.clone().lerp(duskTop, duskFactor).lerp(nightTop, nightFactor);
    const horCol = noonHor.clone().lerp(duskHor, duskFactor).lerp(nightHor, nightFactor);

    skyUniforms.topColor.value.copy(topCol);
    skyUniforms.horizonColor.value.copy(horCol);
    fog.color.copy(horCol);
    fog.density = isWinter ? 0.00042 : 0.00031;

    // Sun & Fill Intensities
    if (nightFactor > 0.82) {
      sunLight.color.set('#7fa2d8');
      sunLight.intensity = 0.55;
    } else {
      const sunDay = new THREE.Color('#fff5e4');
      const sunDusk = new THREE.Color('#ffae62');
      sunLight.color.copy(sunDay.lerp(sunDusk, duskFactor));
      sunLight.intensity = THREE.MathUtils.lerp(2.55, 0.65, nightFactor);
    }

    hemiLight.intensity = THREE.MathUtils.lerp(0.95, 0.34, nightFactor);
    hemiLight.color.copy(horCol);

    starMat.opacity = THREE.MathUtils.smoothstep(nightFactor, 0.45, 0.95) * 0.9;

    for (const pl of nightAccents) {
      pl.intensity = nightFactor * 2.2;
    }

    if (bloomPass) {
      bloomPass.strength = THREE.MathUtils.lerp(0.16, 0.52, nightFactor);
      bloomPass.threshold = THREE.MathUtils.lerp(0.88, 0.52, nightFactor);
    }

    mats.syncEnvironment({ nightFactor, season: currentSeason });
  }

  function setTimeOfDay(hour) {
    currentHour = ((hour % 24) + 24) % 24;
    applyState();
  }

  function setSeason(season) {
    currentSeason = season;
    applyState();
  }

  applyState();

  return {
    setTimeOfDay,
    setSeason,
    getHour: () => currentHour,
    getSeason: () => currentSeason
  };
}
