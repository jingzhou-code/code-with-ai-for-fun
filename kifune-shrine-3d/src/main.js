import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CAMERA_PRESETS } from './data/landmarks.js';
import { createSharedMaterialLibrary } from './utils/textures.js';
import {
  createRiverMaterial,
  createWaterfallMaterial,
  createSacredSpringMaterial
} from './shaders/waterShaders.js';
import { buildValleyTerrain } from './world/terrain.js';
import { populateValleyForest } from './world/nature.js';
import { buildAllKifunePrecincts } from './world/precincts.js';
import { createAtmosphericParticles } from './world/particles.js';
import { createAtmosphereSystem } from './systems/atmosphere.js';
import { createNavigationSystem } from './systems/navigation.js';
import { createShrineAudioSystem } from './systems/audio.js';
import { createUISystem } from './systems/ui.js';

function bootstrapKifuneShrine() {
  const container = document.getElementById('webgl-container');

  // 1. Renderer & Scene Setup
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const initialPreset = CAMERA_PRESETS[0]; // Iconic Omotesando Lantern Steps!
  const camera = new THREE.PerspectiveCamera(
    initialPreset.fov,
    window.innerWidth / window.innerHeight,
    0.2,
    520
  );
  camera.position.set(...initialPreset.pos);

  // 2. Post-Processing Pipeline (Subtle Warm Lantern & Firefly Bloom)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.38,
    0.58,
    0.76
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // 3. Shared Procedural PBR Materials & Custom GLSL Water Shaders
  const { materials } = createSharedMaterialLibrary();
  const riverMat = createRiverMaterial();
  const waterfallMat = createWaterfallMaterial();
  const springMat = createSacredSpringMaterial();

  const snowRegistry = [];
  const foliageRegistry = [];

  // 4. Construct Continuous 300m Kibune Valley, River & Waterfalls
  const terrainObj = buildValleyTerrain(riverMat, waterfallMat, materials);
  scene.add(terrainObj.group);

  // 5. Construct All 5 Zones of Kifune Shrine (Approach/Kawadoko, Omotesando+Hongu, Yui, Aioi/Omoigawa, Okumiya)
  const precinctsObj = buildAllKifunePrecincts({
    materials,
    springMat,
    waterfallMat,
    snowRegistry,
    foliageRegistry
  });
  scene.add(precinctsObj.root);

  // 6. Populate GPU-Instanced Primeval Cryptomeria Cedar & Momiji Maple Forest
  const forestGroup = populateValleyForest({
    materials,
    foliageRegistry,
    snowRegistry
  });
  scene.add(forestGroup);

  // 7. Seasonal & Spiritual Particle Systems
  const particles = createAtmosphericParticles();
  scene.add(particles.group);

  // 8. Atmosphere, Navigation, Web Audio & UI Orchestration
  const atmosphere = createAtmosphereSystem({
    scene,
    materials,
    riverMat,
    waterfallMat,
    lanternLights: precinctsObj.lanternLights,
    snowRegistry,
    foliageRegistry,
    applySeasonTerrainTint: terrainObj.applySeasonTerrainTint,
    particles,
    onBloomChange: (strength) => {
      bloomPass.strength = strength;
    }
  });

  let ui = null;
  const navigation = createNavigationSystem({
    camera,
    domElement: renderer.domElement,
    onPresetReached: (preset) => {
      if (ui) ui.selectPreset(preset);
    }
  });
  navigation.orbit.target.set(...initialPreset.target);
  navigation.orbit.update();

  const audio = createShrineAudioSystem();

  // Suzu Bell swing animation state when praying
  const activeBellSwings = {};

  const clock = new THREE.Clock();
  let totalElapsed = 0;

  ui = createUISystem({
    navigation,
    atmosphere,
    audio,
    onPrayAtShrine: (shrineId) => {
      activeBellSwings[shrineId] = 0;
    },
    onFloatMizuura: () => {
      springMat.uniforms.uRippleTime.value = totalElapsed;
    },
    onTieMusubibumi: () => {
      precinctsObj.addMusubibumiKnot();
    }
  });

  // Start in Autumn Dusk (紅葉灯籠ライトアップ — matching mid-November Kifune Illumination!)
  // Also honor optional URL query parameters (?preset=hongu_haiden&season=winter&time=day&rain=1&photo=1)
  const params = new URLSearchParams(window.location.search);
  const initSeason = params.get('season') || 'autumn';
  const initTime = params.get('time') || 'dusk';
  const initRain = params.get('rain') === '1';
  atmosphere.applyState({ season: initSeason, timeMode: initTime, rain: initRain });

  document.querySelectorAll('[data-season]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.season === initSeason);
  });
  document.querySelectorAll('[data-time]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.time === initTime);
  });
  if (initRain) document.getElementById('btn-rain')?.classList.add('is-active');
  if (params.get('photo') === '1') document.body.classList.add('hud-hidden');

  const reqPresetId = params.get('preset');
  if (reqPresetId) {
    const found = CAMERA_PRESETS.find((p) => p.id === reqPresetId);
    if (found) {
      camera.position.set(...found.pos);
      camera.fov = found.fov || 48;
      camera.updateProjectionMatrix();
      navigation.orbit.target.set(...found.target);
      navigation.orbit.update();
      ui.selectPreset(found);
    }
  }

  // Expose clean debug/automation API on window for testing & inspection
  window.__kifuneApp = {
    camera,
    navigation,
    atmosphere,
    ui,
    presets: CAMERA_PRESETS
  };

  // Fade out loading veil once first frame is ready
  requestAnimationFrame(() => {
    const veil = document.getElementById('loading-veil');
    if (veil) veil.classList.add('is-loaded');
  });

  // Resize Listener
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  // 9. Main Render & Simulation Loop
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    totalElapsed += dt;

    // Animate water shaders
    riverMat.uniforms.uTime.value = totalElapsed;
    waterfallMat.uniforms.uTime.value = totalElapsed;
    springMat.uniforms.uTime.value = totalElapsed;

    // Gentle drift of floating Mizuura-mikuji slips on sacred spring basin
    precinctsObj.floatingSlips.forEach((slipObj) => {
      slipObj.mesh.position.x = slipObj.baseX + Math.sin(totalElapsed * 0.8 + slipObj.phase) * 0.05;
      slipObj.mesh.position.z = slipObj.baseZ + Math.cos(totalElapsed * 0.65 + slipObj.phase) * 0.05;
      slipObj.mesh.rotation.z = slipObj.phase * 0.3 + Math.sin(totalElapsed * 0.5 + slipObj.phase) * 0.08;
    });

    // Animate Suzu shrine bell rope swing during prayer ritual
    for (const sId of Object.keys(activeBellSwings)) {
      activeBellSwings[sId] += dt;
      const t = activeBellSwings[sId];
      const bellRef = precinctsObj.suzuBells[sId];
      if (bellRef) {
        const swing = Math.sin(t * 14.0) * Math.exp(-t * 1.4) * 0.28;
        bellRef.rope.rotation.z = swing;
        bellRef.bell.position.x = swing * 0.45;
      }
      if (t > 3.5) {
        if (bellRef) {
          bellRef.rope.rotation.z = 0;
          bellRef.bell.position.x = 0;
        }
        delete activeBellSwings[sId];
      }
    }

    navigation.update(dt);
    atmosphere.update(totalElapsed, camera.position);
    particles.update(dt, totalElapsed, camera.position);
    audio.update(camera.position);
    ui.update(camera, precinctsObj.interactiveTargets);

    composer.render();
  }

  animate();
}

bootstrapKifuneShrine();
