import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { LANDMARKS } from './data/landmarks.js';
import { buildTerrainWorld } from './world/terrain.js';
import { buildAllTempleStructures } from './world/buildings.js';
import { buildBotanicalWorld } from './world/foliage.js';
import { buildAtmosphereSystem } from './world/atmosphere.js';
import { createNavigationController } from './world/navigation.js';
import { createZenSoundscape } from './audio/soundscape.js';
import { clamp } from './utils/noise.js';

const stageEl = document.getElementById('canvas-stage');
const markersEl = document.getElementById('world-markers');
const loadingEl = document.getElementById('loading-screen');
const loadingBarEl = document.getElementById('loading-progress');

function setProgress(pct) {
  if (loadingBarEl) loadingBarEl.style.width = `${pct}%`;
}

// ============================================================================
// 1. Renderer, Scene, Camera & Post-Processing Pipeline
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
stageEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.25,
  900
);
camera.position.set(...LANDMARKS[0].cameraPos);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.22, // Subtle warm glow on sunlit Momiji & dusk lanterns
  0.55,
  0.84
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ============================================================================
// 2. Construct Mount Ogura Terrain, Architecture, 225 Maples & Atmosphere
// ============================================================================
setProgress(25);
const terrain = buildTerrainWorld(scene);

setProgress(50);
const architecture = buildAllTempleStructures(scene);

setProgress(75);
const botanical = buildBotanicalWorld(scene);

setProgress(90);
const atmosphere = buildAtmosphereSystem(scene, architecture);
const nav = createNavigationController(camera, renderer.domElement, LANDMARKS);
const soundscape = createZenSoundscape();

// Application State
const appState = {
  season: 'autumn',
  hour: 15.8,
  shigure: false,
  markersVisible: true,
  infoCollapsed: false
};

// ============================================================================
// 3. Build 3D World Floating Pins, Sidebar List & Slope Elevation Minimap
// ============================================================================
const landmarkListEl = document.getElementById('landmark-list');
const svgDotsGroup = document.getElementById('svg-landmark-dots');
const svgPlayerDot = document.getElementById('svg-player-dot');

const pinElements = [];
const listButtons = [];
const svgDots = [];

function worldXToMinimapX(wx) {
  // wx = +76 (East Sanmon) -> svg x=14; wx = -48 (West Observatory) -> svg x=244
  const t = clamp((76 - wx) / 124, 0, 1);
  return 14 + t * 230;
}

function worldYToMinimapY(wy) {
  // wy = 0 -> svg y=75; wy = 28 -> svg y=12
  const t = clamp(wy / 29, 0, 1);
  return 75 - t * 63;
}

LANDMARKS.forEach((lm, idx) => {
  // Sidebar item
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `landmark-item${idx === 0 ? ' active' : ''}`;
  btn.innerHTML = `<span class="lm-num">${lm.order}</span><span class="lm-name">${lm.name}</span>`;
  btn.addEventListener('click', () => {
    nav.flyToLandmark(idx, updateActiveLandmarkUI);
  });
  li.appendChild(btn);
  landmarkListEl.appendChild(li);
  listButtons.push(btn);

  // Slope SVG dot (skip index 0 'overview')
  if (idx > 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', worldXToMinimapX(lm.position[0]).toFixed(1));
    circle.setAttribute('cy', worldYToMinimapY(lm.position[1]).toFixed(1));
    circle.setAttribute('r', '3.1');
    circle.setAttribute('class', 'map-spot-dot');
    circle.innerHTML = `<title>${lm.order} · ${lm.name}</title>`;
    circle.addEventListener('click', () => {
      nav.flyToLandmark(idx, updateActiveLandmarkUI);
    });
    svgDotsGroup.appendChild(circle);
    svgDots.push({ idx, el: circle });

    // 3D Projected World Pin
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'world-pin';
    pin.innerHTML = `<span class="pin-num">${lm.order}</span><span>${lm.name.split('（')[0]}</span>`;
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      nav.flyToLandmark(idx, updateActiveLandmarkUI);
    });
    markersEl.appendChild(pin);
    pinElements.push({
      idx,
      el: pin,
      worldPos: new THREE.Vector3(lm.position[0], lm.position[1] + 2.6, lm.position[2])
    });
  }
});

// ============================================================================
// 4. UI Synchronization & Event Bindings
// ============================================================================
const infoOrderEl = document.getElementById('info-order');
const infoEraEl = document.getElementById('info-era');
const infoTitleEl = document.getElementById('info-title');
const infoSubEl = document.getElementById('info-subtitle');
const infoDescEl = document.getElementById('info-desc');
const infoPoemEl = document.getElementById('info-poem');
const infoPoetEl = document.getElementById('info-poet');

function updateActiveLandmarkUI(lm, idx) {
  infoOrderEl.textContent = lm.order;
  infoEraEl.textContent = lm.era;
  infoTitleEl.textContent = lm.name;
  infoSubEl.textContent = lm.subtitle;
  infoDescEl.textContent = lm.description;
  infoPoemEl.textContent = lm.poem;
  infoPoetEl.textContent = `—— ${lm.poet}`;

  listButtons.forEach((b, i) => b.classList.toggle('active', i === idx));
  svgDots.forEach((d) => d.el.classList.toggle('active', d.idx === idx));
  pinElements.forEach((p) => p.el.classList.toggle('active', p.idx === idx));
}

updateActiveLandmarkUI(LANDMARKS[0], 0);

// Mode Buttons (Orbit / First-Person Pilgrim Walk / Auto Guided Tour)
const btnOrbit = document.getElementById('btn-mode-orbit');
const btnWalk = document.getElementById('btn-mode-walk');
const btnTour = document.getElementById('btn-mode-tour');
const walkHintEl = document.getElementById('walk-hint');

function syncNavButtons() {
  const m = nav.getMode();
  const touring = nav.isAutoTour();
  btnOrbit.classList.toggle('active', m === 'orbit' && !touring);
  btnWalk.classList.toggle('active', m === 'walk');
  btnTour.classList.toggle('active', touring);
  walkHintEl.classList.toggle('hidden', m !== 'walk');
}

btnOrbit.addEventListener('click', () => {
  nav.setAutoTour(false);
  nav.setMode('orbit');
  syncNavButtons();
});

btnWalk.addEventListener('click', () => {
  nav.setAutoTour(false);
  nav.setMode('walk');
  syncNavButtons();
});

btnTour.addEventListener('click', () => {
  const next = !nav.isAutoTour();
  nav.setAutoTour(next, updateActiveLandmarkUI);
  syncNavButtons();
});

document.getElementById('btn-prev-spot').addEventListener('click', () => {
  nav.flyToLandmark(nav.getCurrentLandmarkIndex() - 1, updateActiveLandmarkUI);
});
document.getElementById('btn-next-spot').addEventListener('click', () => {
  nav.flyToLandmark(nav.getCurrentLandmarkIndex() + 1, updateActiveLandmarkUI);
});
document.getElementById('btn-walk-here').addEventListener('click', () => {
  nav.setAutoTour(false);
  nav.setMode('walk');
  nav.flyToLandmark(nav.getCurrentLandmarkIndex(), updateActiveLandmarkUI);
  syncNavButtons();
});

// Strike the 1642 Shōrō Belfry Ōshikichō Bronze Bell!
function ringTempleBell() {
  architecture.triggerBellStrike();
  soundscape.playBonshoBell(0.52);
}

document.getElementById('btn-bell').addEventListener('click', () => {
  ringTempleBell();
});

// Ogura Shigure Drizzle Toggle
const btnShigure = document.getElementById('btn-shigure');
btnShigure.addEventListener('click', () => {
  appState.shigure = !appState.shigure;
  btnShigure.classList.toggle('active', appState.shigure);
  atmosphere.applyAtmosphere({
    hour: appState.hour,
    season: appState.season,
    shigure: appState.shigure
  });
  soundscape.setShigureRain(appState.shigure);
});

// 3D Landmark Pins Toggle
const btnMarkers = document.getElementById('btn-markers');
btnMarkers.addEventListener('click', () => {
  appState.markersVisible = !appState.markersVisible;
  btnMarkers.classList.toggle('active', appState.markersVisible);
  markersEl.classList.toggle('hidden', !appState.markersVisible);
});

// Web Audio Zen Soundscape Toggle
const btnAudio = document.getElementById('btn-audio');
btnAudio.addEventListener('click', () => {
  const on = soundscape.setEnabled(!soundscape.isEnabled());
  btnAudio.classList.toggle('active', on);
  if (on) soundscape.setShigureRain(appState.shigure);
});

// Zen Fullscreen Clean UI Toggle
const btnRestoreUi = document.getElementById('btn-restore-ui');
function toggleZenCleanUI() {
  const clean = document.body.classList.toggle('zen-clean');
  btnRestoreUi.classList.toggle('hidden', !clean);
}
document.getElementById('btn-zen-ui').addEventListener('click', toggleZenCleanUI);
btnRestoreUi.addEventListener('click', toggleZenCleanUI);

// Collapse / Expand Sidebar & Info Card
const btnToggleMap = document.getElementById('btn-toggle-map');
const keidaiBody = document.getElementById('keidai-body');
btnToggleMap.addEventListener('click', () => {
  const hidden = keidaiBody.classList.toggle('hidden');
  btnToggleMap.textContent = hidden ? '展开列表' : '收起列表';
});

const btnCollapseInfo = document.getElementById('btn-collapse-info');
const infoExpandable = document.getElementById('info-expandable');
btnCollapseInfo.addEventListener('click', () => {
  const hidden = infoExpandable.classList.toggle('hidden');
  btnCollapseInfo.textContent = hidden ? '展开' : '折叠';
});

// Four Seasons Switching
const seasonBtns = document.querySelectorAll('.season-btn');
seasonBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const s = btn.dataset.season;
    appState.season = s;
    seasonBtns.forEach((b) => b.classList.toggle('active', b === btn));

    terrain.applySeasonColors(s);
    botanical.applySeason(s);
    architecture.setWinterSnow(s === 'winter');
    atmosphere.applyAtmosphere({
      hour: appState.hour,
      season: appState.season,
      shigure: appState.shigure
    });
  });
});

// Continuous Time-of-Day Slider & Quick Presets
const timeSlider = document.getElementById('time-slider');
const timeReadout = document.getElementById('time-readout');
const timeChips = document.querySelectorAll('.time-chip');

function formatHour(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins === 60 ? 59 : mins).padStart(2, '0')}`;
}

function setTimeOfDay(hourVal, activeChip = null) {
  appState.hour = hourVal;
  timeSlider.value = String(hourVal);
  timeReadout.textContent = formatHour(hourVal);
  timeChips.forEach((c) => c.classList.toggle('active', c === activeChip));

  // Enhance subtle lantern bloom at night
  const isNight = hourVal < 6.0 || hourVal > 18.0;
  bloomPass.strength = isNight ? 0.38 : 0.22;
  renderer.toneMappingExposure = isNight ? 1.18 : 1.06;

  atmosphere.applyAtmosphere({
    hour: appState.hour,
    season: appState.season,
    shigure: appState.shigure
  });
}

timeSlider.addEventListener('input', (e) => {
  setTimeOfDay(parseFloat(e.target.value), null);
});
timeChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    setTimeOfDay(parseFloat(chip.dataset.hour), chip);
  });
});

// Keyboard Shortcuts: [B] Strike Bell, [H] Zen Clean UI
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyB') {
    ringTempleBell();
  } else if (e.code === 'KeyH') {
    toggleZenCleanUI();
  }
});

// Click-on-Building Raycasting (Ring Shōrō Bell on Click, or Focus Clicked Structure!)
const raycaster = new THREE.Raycaster();
const pointerDownPos = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos.set(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 5) return;

  const ndc = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(architecture.interactivePickables, true);
  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.isBell) {
      ringTempleBell();
    }
    if (obj.userData.landmarkId && nav.getMode() === 'orbit') {
      const idx = LANDMARKS.findIndex((l) => l.id === obj.userData.landmarkId);
      if (idx >= 0 && idx !== nav.getCurrentLandmarkIndex()) {
        nav.flyToLandmark(idx, updateActiveLandmarkUI);
      }
    }
  }
});

// ============================================================================
// 5. Resize & Main Render Loop
// ============================================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

const projVec = new THREE.Vector3();
const camForward = new THREE.Vector3();
const timer = new THREE.Timer();

function updateProjectedPins() {
  if (!appState.markersVisible) return;
  camera.getWorldDirection(camForward);

  const w = window.innerWidth;
  const h = window.innerHeight;

  for (let i = 0; i < pinElements.length; i++) {
    const p = pinElements[i];
    projVec.copy(p.worldPos).sub(camera.position);
    const dist = projVec.length();
    if (projVec.dot(camForward) <= 0.1 || dist > 168) {
      p.el.style.display = 'none';
      continue;
    }
    projVec.copy(p.worldPos).project(camera);
    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-projVec.y * 0.5 + 0.5) * h;
    if (sx < 20 || sx > w - 20 || sy < 20 || sy > h - 20) {
      p.el.style.display = 'none';
      continue;
    }
    p.el.style.display = 'inline-flex';
    p.el.style.left = `${sx}px`;
    p.el.style.top = `${sy}px`;
    p.el.style.opacity = dist > 120 ? String(1 - (dist - 120) / 48) : '1';
  }
}

function updateSlopeMinimapIndicator() {
  if (!svgPlayerDot) return;
  svgPlayerDot.setAttribute('cx', worldXToMinimapX(camera.position.x).toFixed(1));
  svgPlayerDot.setAttribute('cy', worldYToMinimapY(camera.position.y).toFixed(1));
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);
  const elapsed = timer.getElapsed();

  nav.update(dt, updateActiveLandmarkUI);
  botanical.update(elapsed, dt);
  architecture.updateAnimations(dt);
  atmosphere.update(elapsed, dt);

  updateProjectedPins();
  updateSlopeMinimapIndicator();

  composer.render();
}

// Dismiss loading veil once first frame is compiled and rendered
setProgress(100);
composer.render();
requestAnimationFrame(() => {
  loadingEl.classList.add('fade-out');
  animate();
});
