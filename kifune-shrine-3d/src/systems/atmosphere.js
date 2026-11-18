import * as THREE from 'three';

const TIME_PRESETS = {
  morning: {
    skyTop: 0x5c89b8,
    skyHorizon: 0xdce6eb,
    fogColor: 0xc9d8de,
    fogDensity: 0.0085,
    sunColor: 0xfff0d4,
    sunIntensity: 2.35,
    sunPos: [48, 52, 40],
    hemiSky: 0xbfd9ed,
    hemiGround: 0x3b4a38,
    hemiIntensity: 1.05,
    lanternFactor: 0.22,
    bloomStrength: 0.22
  },
  day: {
    skyTop: 0x3b76b8,
    skyHorizon: 0xbdd8ed,
    fogColor: 0xb8d0e0,
    fogDensity: 0.0052,
    sunColor: 0xfff8eb,
    sunIntensity: 2.85,
    sunPos: [36, 78, 28],
    hemiSky: 0xcce3f7,
    hemiGround: 0x45543e,
    hemiIntensity: 1.18,
    lanternFactor: 0.08,
    bloomStrength: 0.16
  },
  dusk: {
    skyTop: 0x1d2e54,
    skyHorizon: 0xd47855,
    fogColor: 0x3b4161,
    fogDensity: 0.0065,
    sunColor: 0xffa668,
    sunIntensity: 1.65,
    sunPos: [38, 42, 48],
    hemiSky: 0x8a8fc2,
    hemiGround: 0x3c3742,
    hemiIntensity: 1.18,
    lanternFactor: 1.08,
    bloomStrength: 0.36
  },
  night: {
    skyTop: 0x080e1c,
    skyHorizon: 0x1b2a46,
    fogColor: 0x101a30,
    fogDensity: 0.0076,
    sunColor: 0x8ab4e8, // Moonlight
    sunIntensity: 0.78,
    sunPos: [34, 64, 36],
    hemiSky: 0x3f5685,
    hemiGround: 0x1f2433,
    hemiIntensity: 0.88,
    lanternFactor: 1.38,
    bloomStrength: 0.48
  }
};

export function createAtmosphereSystem({
  scene,
  materials,
  riverMat,
  waterfallMat,
  lanternLights,
  snowRegistry,
  foliageRegistry,
  applySeasonTerrainTint,
  particles,
  onBloomChange
}) {
  // Custom Gradient Sky Dome + Twinkling Night Stars Shader
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x182544) },
      uHorizonColor: { value: new THREE.Color(0xc46b4b) },
      uStarStrength: { value: 0.35 },
      uTime: { value: 0 }
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform float uStarStrength;
      uniform float uTime;
      varying vec3 vDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        float h = clamp(vDir.y * 1.15 + 0.08, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.65));

        if (uStarStrength > 0.01 && vDir.y > 0.08) {
          vec3 grid = floor(vDir * 240.0);
          float s = hash(grid);
          if (s > 0.9955) {
            float twinkle = 0.6 + 0.4 * sin(uTime * 2.5 + s * 90.0);
            col += vec3(0.95, 0.97, 1.0) * twinkle * uStarStrength * smoothstep(0.08, 0.35, vDir.y);
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), skyMat);
  scene.add(skyDome);

  const ambientFill = new THREE.AmbientLight(0xd9e2f2, 0.38);
  scene.add(ambientFill);

  // Main Sun / Moon Directional Light with Crisp Cascaded-style Valley Shadow Frustum
  const hemiLight = new THREE.HemisphereLight(0xbfd9ed, 0x3b4a38, 0.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff0d4, 2.2);
  dirLight.position.set(40, 65, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 5;
  dirLight.shadow.camera.far = 260;
  dirLight.shadow.camera.left = -85;
  dirLight.shadow.camera.right = 85;
  dirLight.shadow.camera.top = 135;
  dirLight.shadow.camera.bottom = -135;
  dirLight.shadow.bias = -0.0006;
  scene.add(dirLight);
  scene.add(dirLight.target);

  scene.fog = new THREE.FogExp2(0x323752, 0.0078);

  let state = {
    season: 'autumn', // 'spring' | 'summer' | 'autumn' | 'winter'
    timeMode: 'dusk', // 'morning' | 'day' | 'dusk' | 'night'
    rain: false
  };

  function updateFoliageColors(season, timeMode) {
    const tmp = new THREE.Color();
    const isIlluminated = timeMode === 'dusk' || timeMode === 'night';
    foliageRegistry.forEach((entry) => {
      if (entry.type === 'katsura') {
        if (season === 'spring') entry.material.color.setHex(0x6fb844);
        else if (season === 'summer') entry.material.color.setHex(0x2f7d36);
        else if (season === 'autumn') entry.material.color.setHex(0xe09a2b);
        else entry.material.color.setHex(0xd8e2ec);
        entry.material.emissive.setHex(isIlluminated && season === 'autumn' ? 0x381e04 : 0x000000);
        entry.material.emissiveIntensity = isIlluminated ? 0.55 : 0.0;
      } else if (entry.type === 'momiji') {
        if (season === 'spring') entry.material.color.setHex(0x78c43e);
        else if (season === 'summer') entry.material.color.setHex(0x2b7530);
        else if (season === 'autumn') entry.material.color.setHex(0xcf291d);
        else entry.material.color.setHex(0xdce5ef);
        entry.material.emissive.setHex(isIlluminated && season === 'autumn' ? 0x3d0b04 : 0x000000);
        entry.material.emissiveIntensity = isIlluminated ? 0.6 : 0.0;
      } else if (entry.type === 'cedar') {
        entry.material.color.setHex(season === 'winter' ? 0x264234 : 0x1e3f29);
      } else if (entry.type === 'instancedMomiji') {
        if (entry.material) {
          entry.material.transparent = season === 'winter';
          entry.material.opacity = season === 'winter' ? 0.52 : 1.0;
          entry.material.needsUpdate = true;
          entry.material.emissive.setHex(
            isIlluminated
              ? season === 'autumn'
                ? 0x451206
                : season === 'winter'
                  ? 0x1c2436
                  : 0x0d260c
              : 0x000000
          );
          entry.material.emissiveIntensity = isIlluminated ? 0.68 : 0.0;
        }
        entry.meshes.forEach((instMesh) => {
          for (let i = 0; i < entry.seeds.length; i++) {
            const s = entry.seeds[i];
            if (season === 'autumn') {
              if (s < 0.42) tmp.setHex(0xc9241b);
              else if (s < 0.72) tmp.setHex(0xdc4a1b);
              else if (s < 0.9) tmp.setHex(0xe6841c);
              else tmp.setHex(0x6a8c2e);
            } else if (season === 'spring') {
              tmp.setHSL(0.26 + s * 0.05, 0.62, 0.44 + s * 0.12);
            } else if (season === 'summer') {
              tmp.setHSL(0.33 + s * 0.04, 0.56, 0.27 + s * 0.08);
            } else {
              tmp.setHSL(0.58, 0.14, 0.84 + s * 0.1);
            }
            instMesh.setColorAt(i, tmp);
          }
          instMesh.instanceColor.needsUpdate = true;
        });
      }
    });
  }

  function applyState(partial = {}) {
    state = { ...state, ...partial };
    const preset = TIME_PRESETS[state.timeMode] || TIME_PRESETS.dusk;

    // Toggle snow blankets on roofs, lanterns, Torii, stone kerbs & cedars!
    const isWinter = state.season === 'winter';
    snowRegistry.forEach((mesh) => {
      mesh.visible = isWinter;
    });

    updateFoliageColors(state.season, state.timeMode);
    applySeasonTerrainTint(state.season);

    // Adjust sky & exponential mountain mist (rain deepens mist & cools sky)
    const skyTop = new THREE.Color(preset.skyTop);
    const skyHoriz = new THREE.Color(preset.skyHorizon);
    const fogCol = new THREE.Color(preset.fogColor);

    if (isWinter && (state.timeMode === 'morning' || state.timeMode === 'day')) {
      skyHoriz.lerp(new THREE.Color(0xe6eef6), 0.45);
      fogCol.lerp(new THREE.Color(0xdce6f2), 0.5);
    }
    if (state.rain) {
      skyTop.lerp(new THREE.Color(0x2a3642), 0.55);
      skyHoriz.lerp(new THREE.Color(0x52616e), 0.6);
      fogCol.lerp(new THREE.Color(0x465461), 0.55);
    }

    skyMat.uniforms.uTopColor.value.copy(skyTop);
    skyMat.uniforms.uHorizonColor.value.copy(skyHoriz);
    skyMat.uniforms.uStarStrength.value =
      state.rain ? 0.0 : state.timeMode === 'night' ? 1.0 : state.timeMode === 'dusk' ? 0.35 : 0.0;

    scene.fog.color.copy(fogCol);
    scene.fog.density = preset.fogDensity * (state.rain ? 1.38 : 1.0);

    dirLight.color.setHex(preset.sunColor);
    dirLight.intensity = preset.sunIntensity * (state.rain ? 0.48 : 1.0);
    dirLight.position.set(...preset.sunPos);

    hemiLight.color.setHex(preset.hemiSky);
    hemiLight.groundColor.setHex(isWinter ? 0x9aaaba : preset.hemiGround);
    hemiLight.intensity = preset.hemiIntensity;

    // Wet specular sheen on stone steps & retaining walls during Sacred Rain!
    materials.stoneStep.roughness = state.rain ? 0.28 : 0.76;
    materials.ishigaki.roughness = state.rain ? 0.42 : 0.88;

    // Lantern emissive & warm point lights
    const lf = state.rain && preset.lanternFactor < 0.6 ? 0.75 : preset.lanternFactor;
    materials.lanternGlow.emissiveIntensity = 0.35 + lf * 1.65;
    materials.shojiGlow.emissiveIntensity = 0.2 + lf * 0.85;

    lanternLights.forEach((item) => {
      item.light.intensity = item.baseIntensity * lf;
    });

    // Sync water shader uniforms
    riverMat.uniforms.uSkyColor.value.copy(skyHoriz);
    riverMat.uniforms.uSunDir.value.copy(dirLight.position).normalize();
    riverMat.uniforms.uLanternWarmth.value = lf;
    riverMat.uniforms.uSnowFactor.value = isWinter ? 1.0 : 0.0;
    waterfallMat.uniforms.uBrightness.value = state.timeMode === 'night' ? 0.48 : state.timeMode === 'dusk' ? 0.72 : 0.96;

    particles.configure(state);
    if (onBloomChange) {
      onBloomChange(preset.bloomStrength);
    }
  }

  function update(elapsed, cameraPos) {
    skyMat.uniforms.uTime.value = elapsed;
    skyDome.position.copy(cameraPos);

    // Center shadow frustum around camera's valley Z so shadows stay razor-sharp from Hongu to Okumiya!
    const clampedZ = Math.max(-165, Math.min(105, cameraPos.z));
    const preset = TIME_PRESETS[state.timeMode] || TIME_PRESETS.dusk;
    dirLight.target.position.set(-10, 6, clampedZ);
    dirLight.position.set(
      -10 + preset.sunPos[0],
      preset.sunPos[1],
      clampedZ + preset.sunPos[2]
    );

    // Subtle organic candle flicker on Kasuga lanterns at dusk/night
    if (preset.lanternFactor > 0.5) {
      const flicker = 1.0 + Math.sin(elapsed * 6.3) * 0.035 + Math.cos(elapsed * 11.1) * 0.02;
      materials.lanternGlow.emissiveIntensity = (0.35 + preset.lanternFactor * 1.65) * flicker;
    }
  }

  return {
    applyState,
    update,
    getState: () => ({ ...state })
  };
}
