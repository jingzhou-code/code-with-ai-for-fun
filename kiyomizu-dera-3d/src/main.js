import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { LANDMARKS, getTerrainHeight, getWalkableHeight } from './world/SitePlan.js';
import { createMaterialLibrary } from './materials/ProceduralTextures.js';
import { buildTerrainAndNature } from './world/TerrainAndNature.js';
import { buildHondoAndKakezukuriStage } from './architecture/HondoStageBuilder.js';
import { buildAllPrecinctBuildings } from './architecture/PrecinctBuildings.js';
import { createAtmosphereSystem } from './effects/AtmosphereAndShaders.js';
import { createZenSoundscape } from './audio/ZenSoundscape.js';
import { setupHUDAndMinimap } from './ui/MinimapAndHUD.js';

const progressBar = document.getElementById('loading-progress-bar');
const statusText = document.getElementById('loading-status-text');
const loadingScreen = document.getElementById('loading-screen');

function setProgress(pct, msg) {
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (statusText) statusText.textContent = msg;
}

async function initKiyomizuDera() {
  const canvas = document.getElementById('temple-canvas');

  // 1. Renderer & Scene Setup
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    46,
    window.innerWidth / window.innerHeight,
    0.4,
    2200
  );

  // Hero starting viewpoint: Iconic Okuno-in panoramic view across Kin'un-kei to Hondo, Sanju-no-to & Kyoto!
  const heroSpot = LANDMARKS[0];
  camera.position.set(...heroSpot.cameraPos);

  // Post-processing Composer with subtle Bloom for sunset, lanterns & Night Illumination
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.32,
    0.58,
    0.84
  );
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  // Controls: Orbit + First-Person PointerLock
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.055;
  orbit.maxDistance = 290;
  orbit.minDistance = 3.5;
  orbit.maxPolarAngle = Math.PI * 0.495;
  orbit.target.set(...heroSpot.target);
  orbit.update();

  const pointerLock = new PointerLockControls(camera, document.body);

  // 2. Progressive World Construction
  setProgress(22, '正在研磨桧皮葺、本瓦葺、丹涂与古榉木材质…');
  await nextFrame();
  const { materials, applySeasonMaterialState } = createMaterialLibrary();

  setProgress(48, '正在雕琢音羽山、锦云溪断崖、千株枫樱与远景京都市街…');
  await nextFrame();
  const nature = buildTerrainAndNature(materials);
  scene.add(nature.group);

  setProgress(72, '正在架设国宝本堂与 139 根榉木六段通贯无钉悬造舞台…');
  await nextFrame();
  const hondo = buildHondoAndKakezukuriStage(materials);
  scene.add(hondo.group);

  setProgress(88, '正在营建仁王门、三重塔、西门、钟楼、奥之院、地主神社与音羽之泷…');
  await nextFrame();
  const precinct = buildAllPrecinctBuildings(materials);
  scene.add(precinct.group);

  setProgress(96, '正在点亮四季天穹、石灯笼与夜间观音慈悲之光…');
  await nextFrame();
  const atmosphere = createAtmosphereSystem(scene);
  const soundscape = createZenSoundscape();

  // Application State
  let currentMode = 'orbit'; // 'orbit' | 'walk' | 'tour'
  let currentSeason = 'autumn';
  let currentTime = 17.15; // Kyoto golden sunset (日想観)
  let xrayEnabled = false;

  // Smooth Camera Flight State
  const flight = {
    active: false,
    elapsed: 0,
    duration: 2.2,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  };

  function flyTo(camArr, targetArr, duration = 2.1) {
    flight.active = true;
    flight.elapsed = 0;
    flight.duration = duration;
    flight.startPos.copy(camera.position);
    flight.endPos.set(camArr[0], camArr[1], camArr[2]);
    flight.startTarget.copy(orbit.target);
    flight.endTarget.set(targetArr[0], targetArr[1], targetArr[2]);
  }

  // Auto-Pilgrimage Tour State
  let tourIndex = 0;
  let tourHoldTimer = 0;

  // First-Person Walk Physics State
  const walkKeys = { forward: false, backward: false, left: false, right: false, sprint: false };
  let walkFeetY = 18.65;
  let walkVelY = 0;

  // Bell Strike Visual State
  let bellAnimTime = -1;

  function syncEnvironment() {
    const { nightFactor } = atmosphere.updateAtmosphereState(currentTime, currentSeason);
    applySeasonMaterialState(currentSeason, nightFactor);
    nature.applySeasonToNature(currentSeason);
    nature.setCityNightGlow(nightFactor);
    bloomPass.strength = THREE.MathUtils.lerp(0.24, 0.56, nightFactor);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.06, 1.24, nightFactor);
  }
  syncEnvironment();

  function triggerBellStrike() {
    soundscape.ringTempleBell();
    bellAnimTime = 0;
  }

  // 3. Connect HUD & Interactive 2D Minimap
  const hud = setupHUDAndMinimap({
    onSelectLandmark: (lm) => {
      if (currentMode === 'walk') {
        switchMode('orbit');
        hud.setModeUI('orbit');
      }
      if (currentMode === 'tour') {
        currentMode = 'orbit';
        hud.setModeUI('orbit');
      }
      flyTo(lm.cameraPos, lm.target, 2.0);
    },
    onChangeMode: (mode) => {
      switchMode(mode);
    },
    onToggleXRay: () => {
      xrayEnabled = !xrayEnabled;
      hondo.setXRayMode(xrayEnabled);
      if (xrayEnabled && currentMode === 'orbit') {
        const underLm = LANDMARKS.find((l) => l.id === 'kakezukuri_understage');
        if (underLm) {
          hud.setActiveLandmarkCard(underLm.id);
          flyTo([8.5, 16.0, 32.0], [24.0, 14.5, 11.0], 1.9);
        }
      }
      return xrayEnabled;
    },
    onRingBell: () => {
      triggerBellStrike();
    },
    onToggleAudio: () => soundscape.toggleAmbient(),
    onChangeSeason: (season) => {
      currentSeason = season;
      syncEnvironment();
    },
    onChangeTime: (val) => {
      currentTime = val;
      syncEnvironment();
    },
    onMinimapTeleport: (wx, wz) => {
      if (currentMode !== 'orbit') {
        switchMode('orbit');
        hud.setModeUI('orbit');
      }
      const ty = getWalkableHeight(wx, wz);
      flyTo([wx - 18, ty + 14, wz + 22], [wx, ty + 3, wz], 1.8);
    },
  });

  function switchMode(newMode) {
    currentMode = newMode;
    flight.active = false;

    if (newMode === 'walk') {
      orbit.enabled = false;
      // Place visitor either at current nearby walkable deck or on the Stage of Kiyomizu if camera is high in the air
      const distToCenter = Math.hypot(camera.position.x - 24, camera.position.z - 15);
      if (distToCenter > 135 || camera.position.y > 42) {
        camera.position.set(24.0, 18.65 + 1.68, 16.5);
        camera.lookAt(10.0, 19.5, 14.0);
        walkFeetY = 18.65;
      } else {
        walkFeetY = getWalkableHeight(camera.position.x, camera.position.z, camera.position.y - 1.68);
        camera.position.y = walkFeetY + 1.68;
      }
      walkVelY = 0;
    } else {
      if (pointerLock.isLocked) pointerLock.unlock();
      orbit.enabled = newMode === 'orbit';
      if (newMode === 'tour') {
        tourIndex = 0;
        tourHoldTimer = 0;
        const lm = LANDMARKS[tourIndex];
        hud.setActiveLandmarkCard(lm.id);
        flyTo(lm.cameraPos, lm.target, 2.8);
      }
    }
  }

  // Click canvas in Walk mode to lock pointer; in Orbit mode raycast to focus clicked temple hall!
  const raycaster = new THREE.Raycaster();
  const pointerDownPos = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownPos.set(e.clientX, e.clientY);
    if (currentMode === 'tour') {
      currentMode = 'orbit';
      orbit.enabled = true;
      flight.active = false;
      hud.setModeUI('orbit');
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (currentMode === 'walk') {
      if (!pointerLock.isLocked) pointerLock.lock();
      return;
    }
    if (currentMode !== 'orbit') return;
    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 5) return;

    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([hondo.group, precinct.group], true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      let lmId = null;
      while (obj) {
        if (obj.userData && obj.userData.landmarkId) {
          lmId = obj.userData.landmarkId;
          break;
        }
        obj = obj.parent;
      }
      if (lmId) {
        const lm = LANDMARKS.find((item) => item.id === lmId);
        if (lm) {
          hud.setActiveLandmarkCard(lm.id);
          flyTo(lm.cameraPos, lm.target, 1.9);
        }
      }
    }
  });

  // Keyboard Controls (WASD Walk + Shortcuts 1/2/3/X/B/M/H)
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        walkKeys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        walkKeys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        walkKeys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        walkKeys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        walkKeys.sprint = true;
        break;
      case 'Space':
        if (currentMode === 'walk' && Math.abs(walkVelY) < 0.05) {
          walkVelY = 4.6;
        }
        break;
      case 'Digit1':
        switchMode('orbit');
        hud.setModeUI('orbit');
        break;
      case 'Digit2':
        switchMode('walk');
        hud.setModeUI('walk');
        break;
      case 'Digit3':
        switchMode('tour');
        hud.setModeUI('tour');
        break;
      case 'KeyX':
        xrayEnabled = !xrayEnabled;
        hondo.setXRayMode(xrayEnabled);
        hud.setXRayButtonActive(xrayEnabled);
        break;
      case 'KeyB':
        triggerBellStrike();
        break;
      case 'KeyH':
        hud.toggleHUDHidden();
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        walkKeys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        walkKeys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        walkKeys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        walkKeys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        walkKeys.sprint = false;
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // Fade out loading screen once first frame renders
  setProgress(100, '全伽蓝复原完毕，欢迎参拜音羽山清水寺');
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
  }, 320);

  // 4. Main Animation Loop
  const clock = new THREE.Clock();
  const camForward = new THREE.Vector3();
  const moveVec = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    // Camera Flight Interpolation
    if (flight.active) {
      flight.elapsed += dt;
      const rawT = Math.min(1, flight.elapsed / flight.duration);
      const ease = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      camera.position.lerpVectors(flight.startPos, flight.endPos, ease);
      orbit.target.lerpVectors(flight.startTarget, flight.endTarget, ease);
      if (currentMode === 'tour') {
        camera.lookAt(orbit.target);
      }
      if (rawT >= 1) {
        flight.active = false;
      }
    }

    // Mode Updates
    if (currentMode === 'orbit') {
      orbit.update();
      const minGround = getTerrainHeight(camera.position.x, camera.position.z) + 1.15;
      if (camera.position.y < minGround) {
        camera.position.y = minGround;
      }
    } else if (currentMode === 'tour') {
      if (!flight.active) {
        tourHoldTimer += dt;
        // Gentle cinematic drift around current landmark
        camera.position.x += Math.cos(elapsed * 0.35) * dt * 0.75;
        camera.position.z += Math.sin(elapsed * 0.35) * dt * 0.75;
        camera.lookAt(orbit.target);

        if (tourHoldTimer >= 5.5) {
          tourHoldTimer = 0;
          tourIndex = (tourIndex + 1) % LANDMARKS.length;
          const nextLm = LANDMARKS[tourIndex];
          hud.setActiveLandmarkCard(nextLm.id);
          flyTo(nextLm.cameraPos, nextLm.target, 3.2);
        }
      }
    } else if (currentMode === 'walk') {
      const speed = (walkKeys.sprint ? 11.5 : 5.6) * dt;
      moveVec.set(0, 0, 0);
      if (walkKeys.forward) moveVec.z += 1;
      if (walkKeys.backward) moveVec.z -= 1;
      if (walkKeys.left) moveVec.x -= 1;
      if (walkKeys.right) moveVec.x += 1;

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize();
        pointerLock.moveForward(moveVec.z * speed);
        pointerLock.moveRight(moveVec.x * speed);
      }

      // Clamp to precinct bounds
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -172, 92);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -74, 105);

      const targetFloor = getWalkableHeight(camera.position.x, camera.position.z, walkFeetY);
      walkVelY -= 14.0 * dt;
      walkFeetY += walkVelY * dt;
      if (walkFeetY <= targetFloor) {
        walkFeetY = THREE.MathUtils.lerp(walkFeetY, targetFloor, Math.min(1, dt * 16));
        walkVelY = 0;
      }
      camera.position.y = walkFeetY + 1.68;
    }

    // Animate Otowa Waterfall Streams & Mist Splash
    const refs = precinct.animatedRefs;
    for (let i = 0; i < refs.waterfallStreams.length; i++) {
      const stream = refs.waterfallStreams[i];
      const pulse = 0.94 + Math.sin(elapsed * 9.0 + i * 2.1) * 0.08;
      stream.scale.set(pulse, 1, pulse);
    }
    if (refs.waterfallSplashParticles) {
      const sp = refs.waterfallSplashParticles.geometry.attributes.position.array;
      for (let i = 0; i < sp.length; i += 3) {
        sp[i + 1] += dt * 1.4;
        if (sp[i + 1] > 1.75) sp[i + 1] = 0.62;
      }
      refs.waterfallSplashParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate Shoro 1478 Temple Bell Strike & Expanding Golden Soundwave Ring
    if (bellAnimTime >= 0) {
      bellAnimTime += dt;
      if (refs.shumokuStriker) {
        const pullPush =
          bellAnimTime < 0.12
            ? THREE.MathUtils.lerp(-1.65, -0.78, bellAnimTime / 0.12)
            : -1.65 + Math.exp(-(bellAnimTime - 0.12) * 3.5) * Math.cos(bellAnimTime * 9.0) * 0.45;
        refs.shumokuStriker.position.x = pullPush;
      }
      if (refs.bellGroup && bellAnimTime >= 0.1) {
        refs.bellGroup.rotation.z =
          Math.exp(-(bellAnimTime - 0.1) * 0.85) * Math.sin((bellAnimTime - 0.1) * 5.2) * 0.055;
      }
      if (refs.bellWaveMesh && bellAnimTime >= 0.1) {
        const wt = bellAnimTime - 0.1;
        const scale = 1.0 + wt * 14.0;
        refs.bellWaveMesh.scale.set(scale, 1, scale);
        refs.bellWaveMesh.material.opacity = Math.max(0, 0.72 * (1 - wt / 3.2));
      }
      if (bellAnimTime > 6.5) {
        bellAnimTime = -1;
        if (refs.bellWaveMesh) refs.bellWaveMesh.material.opacity = 0;
      }
    }

    // Animate Particles & Strolling Pilgrims
    atmosphere.tickAtmosphere(elapsed, dt);

    // Update 2D Precinct Minimap
    camera.getWorldDirection(camForward);
    hud.renderMinimap(camera.position, camForward);

    composer.render();
  }

  animate();
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

initKiyomizuDera();
