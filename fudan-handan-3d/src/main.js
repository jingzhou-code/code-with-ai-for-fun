import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { WORLD_BOUNDS, ZONES, ROADS, LANDMARKS, TOUR_STOPS } from './data/campusData.js';
import {
  buildGuanghuaComplex,
  buildCentralAxis,
  buildHeritageQuarter,
  buildGardensAndWater,
  buildArenasAndUrbanContext,
} from './builders/landmarksBuilder.js';
import { buildCampusZones } from './builders/campusZonesBuilder.js';
import {
  buildLivingWorld,
  applySeasonColors,
  updateLivingWorld,
  updateAtmosphereForHour,
} from './builders/livingWorld.js';

// ================= APPLICATION CONTEXT =================
const canvas = document.getElementById('campus-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1.2, 3200);
// Opening panoramic vista framing Main Gate, Central Axis, Heritage Quarter & 142m Guanghua Twin Towers
camera.position.set(-108, 156, 385);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.maxPolarAngle = Math.PI * 0.484;
controls.minDistance = 16;
controls.maxDistance = 1050;
controls.target.set(82, 26, 12);

// Post-processing pipeline (Subtle Architectural Bloom + ACES Output)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.26,
  0.52,
  0.84
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const ctx = {
  scene,
  camera,
  renderer,
  emissiveMaterials: [],
  beacons: [],
  vehicles: [],
  commuters: [],
  currentHour: 13.8,
  season: 'summer',
};

// Navigation & Interaction State
const state = {
  mode: 'orbit', // 'orbit' | 'walk' | 'bike' | 'tour'
  selectedId: 'guanghua-towers',
  showLabels: true,
  activeZoneFilter: 'all',
  searchQuery: '',
  // Camera fly-to tween
  tween: null,
  // Walk / Bike first-person controller
  fpYaw: 0,
  fpPitch: 0,
  fpVelY: 0,
  keys: {},
  isDraggingLook: false,
  lastPointer: { x: 0, y: 0 },
  // Guided Tour
  tourIndex: 0,
  tourTimer: 0,
};

// ================= PROGRESSIVE CAMPUS CONSTRUCTION =================
function setLoadingProgress(pct, text) {
  const bar = document.getElementById('loading-bar');
  const stage = document.getElementById('loading-stage');
  if (bar) bar.style.width = `${pct}%`;
  if (stage) stage.textContent = text;
}

async function initCampus() {
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

  setLoadingProgress(18, '铺设邯郸校区1383亩四大分区地形与城市干道网…');
  await nextFrame();
  buildCampusZones(ctx);

  setLoadingProgress(44, '雕琢光华楼双子塔、邯郸路正校门、毛主席像与恒隆物理楼…');
  await nextFrame();
  buildGuanghuaComplex(ctx);
  buildCentralAxis(ctx);

  setLoadingProgress(66, '复原相辉堂、子彬院小白宫、1921奕柱堂校史馆与燕园曦园…');
  await nextFrame();
  buildHeritageQuarter(ctx);
  buildGardensAndWater(ctx);

  setLoadingProgress(84, '构筑南区正大体育馆、北区体育馆、中环邯郸路地道与跨街天桥…');
  await nextFrame();
  buildArenasAndUrbanContext(ctx);

  setLoadingProgress(96, '栽植两千余株香樟悬铃木、点亮校园路灯与师生车流…');
  await nextFrame();
  buildLivingWorld(ctx);
  updateAtmosphereForHour(ctx, ctx.currentHour);

  initUI();
  selectLandmark('guanghua-towers', false);

  setLoadingProgress(100, '复旦大学（邯郸校区）构筑完成');
  setTimeout(() => {
    document.getElementById('loading-curtain')?.classList.add('fade-out');
  }, 260);
}

// ================= UI, DIRECTORY, LABELS & MINIMAP =================
const labelElements = new Map();

function initUI() {
  // 1. Create 3D Floating HTML Labels
  const labelsLayer = document.getElementById('labels-layer');
  LANDMARKS.forEach((lm) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `campus-label ${lm.tier === 'major' ? 'tier-major' : 'tier-standard'}`;
    el.textContent = lm.name;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectLandmark(lm.id, true);
    });
    labelsLayer.appendChild(el);
    labelElements.set(lm.id, el);
  });

  // 2. Render Left Directory List
  renderDirectoryList();

  document.getElementById('landmark-search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderDirectoryList();
  });

  document.querySelectorAll('.zone-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zone-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeZoneFilter = btn.dataset.zone;
      renderDirectoryList();
    });
  });

  // Drawer collapse / expand
  const leftDrawer = document.getElementById('left-drawer');
  const openFab = document.getElementById('open-drawer-fab');
  document.getElementById('toggle-drawer-btn').addEventListener('click', () => {
    leftDrawer.classList.add('collapsed');
    openFab.classList.remove('hidden');
  });
  openFab.addEventListener('click', () => {
    leftDrawer.classList.remove('collapsed');
    openFab.classList.add('hidden');
  });

  // Dossier actions
  document.getElementById('dossier-close-btn').addEventListener('click', () => {
    document.getElementById('dossier-card').classList.add('hidden');
  });
  document.getElementById('dossier-orbit-btn').addEventListener('click', () => {
    if (state.selectedId) {
      setMode('orbit');
      flyToLandmark(state.selectedId);
    }
  });
  document.getElementById('dossier-walk-btn').addEventListener('click', () => {
    const lm = LANDMARKS.find((l) => l.id === state.selectedId);
    if (lm) {
      enterFirstPerson('walk', lm.walkPos[0], lm.walkPos[1], lm.x, lm.z);
    }
  });

  // Top Navigation Mode Buttons
  document.getElementById('mode-orbit-btn').addEventListener('click', () => setMode('orbit'));
  document.getElementById('mode-walk-btn').addEventListener('click', () => {
    const lm = LANDMARKS.find((l) => l.id === state.selectedId) || LANDMARKS[5];
    enterFirstPerson('walk', lm.walkPos[0], lm.walkPos[1], lm.x, lm.z);
  });
  document.getElementById('mode-bike-btn').addEventListener('click', () => {
    // Default bike start on Guanghua Avenue or selected landmark
    const lm = LANDMARKS.find((l) => l.id === state.selectedId);
    const sx = lm ? lm.walkPos[0] : 0;
    const sz = lm ? lm.walkPos[1] : 52;
    enterFirstPerson('bike', sx, sz, sx + 30, sz - 20);
  });
  document.getElementById('mode-tour-btn').addEventListener('click', () => startGuidedTour());
  document.getElementById('exit-walk-btn').addEventListener('click', () => setMode('orbit'));

  // Tour controls
  document.getElementById('tour-prev-btn').addEventListener('click', () => stepGuidedTour(-1));
  document.getElementById('tour-next-btn').addEventListener('click', () => stepGuidedTour(1));
  document.getElementById('tour-exit-btn').addEventListener('click', () => setMode('orbit'));

  // Time-of-Day Presets & Slider
  const timeSlider = document.getElementById('time-slider');
  const setTimeUI = (hour) => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    document.getElementById('clock-readout').textContent =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    timeSlider.value = hour;
    updateAtmosphereForHour(ctx, hour);
    bloomPass.strength = hour < 6.4 || hour > 18.0 ? 0.46 : 0.24;
  };

  timeSlider.addEventListener('input', (e) => {
    document.querySelectorAll('.time-presets .chip-btn').forEach((b) => b.classList.remove('active'));
    setTimeUI(parseFloat(e.target.value));
  });

  document.querySelectorAll('.time-presets .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-presets .chip-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setTimeUI(parseFloat(btn.dataset.hour));
    });
  });

  // Season Toggle (春夏翠樟 vs 深秋金梧桐)
  const seasonBtn = document.getElementById('season-toggle-btn');
  seasonBtn.addEventListener('click', () => {
    ctx.season = ctx.season === 'summer' ? 'autumn' : 'summer';
    applySeasonColors(ctx, ctx.season);
    seasonBtn.textContent = ctx.season === 'summer' ? '春夏翠樟' : '深秋梧桐';
    seasonBtn.classList.toggle('active', ctx.season === 'autumn');
  });

  // Guanghua Wind Tunnel Toggle
  const windBtn = document.getElementById('wind-toggle-btn');
  windBtn.addEventListener('click', () => {
    if (!ctx.windTunnel) return;
    const next = !ctx.windTunnel.group.visible;
    ctx.windTunnel.group.visible = next;
    windBtn.classList.toggle('active', next);
    if (next) {
      selectLandmark('guanghua-towers', true);
    }
  });

  // Labels Toggle
  const labelsBtn = document.getElementById('labels-toggle-btn');
  labelsBtn.addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    labelsBtn.classList.toggle('active', state.showLabels);
    document.getElementById('labels-layer').style.display = state.showLabels ? 'block' : 'none';
  });

  // 3D Raycast Picking + Walk Drag-Look + Keyboard Listeners
  setupInputHandlers();

  // Interactive Minimap Click-to-Teleport
  setupMinimapInteraction();
}

function renderDirectoryList() {
  const listEl = document.getElementById('landmark-list');
  listEl.innerHTML = '';

  const filtered = LANDMARKS.filter((lm) => {
    const matchZone = state.activeZoneFilter === 'all' || lm.zone === state.activeZoneFilter;
    if (!matchZone) return false;
    if (!state.searchQuery) return true;
    const hay = `${lm.name} ${lm.enName} ${lm.zoneLabel} ${lm.desc} ${lm.lore}`.toLowerCase();
    return hay.includes(state.searchQuery);
  });

  filtered.forEach((lm) => {
    const li = document.createElement('li');
    li.className = `landmark-item ${lm.id === state.selectedId ? 'active' : ''}`;
    li.dataset.id = lm.id;
    li.innerHTML = `
      <div class="landmark-item-main">
        <div class="landmark-item-name">${lm.name}</div>
        <div class="landmark-item-sub">${lm.enName}</div>
      </div>
      <span class="landmark-tag">${lm.zoneLabel.split(' · ')[0]}</span>
    `;
    li.addEventListener('click', () => selectLandmark(lm.id, true));
    listEl.appendChild(li);
  });
}

function selectLandmark(id, fly = true) {
  const lm = LANDMARKS.find((item) => item.id === id);
  if (!lm) return;
  state.selectedId = id;

  // Update Dossier Card
  const card = document.getElementById('dossier-card');
  card.classList.remove('hidden');
  document.getElementById('dossier-zone-badge').textContent = lm.zoneLabel;
  document.getElementById('dossier-title').textContent = lm.name;
  document.getElementById('dossier-subtitle').textContent = lm.enName;
  document.getElementById('dossier-year').textContent = lm.year;
  document.getElementById('dossier-scale').textContent = lm.scale;
  document.getElementById('dossier-style').textContent = lm.style;
  document.getElementById('dossier-desc').textContent = lm.desc;
  document.getElementById('dossier-lore').textContent = lm.lore;

  // Highlight active item in list & labels
  document.querySelectorAll('.landmark-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
  labelElements.forEach((el, key) => {
    el.classList.toggle('selected', key === id);
  });

  if (fly) {
    if (state.mode === 'walk' || state.mode === 'bike') {
      enterFirstPerson(state.mode, lm.walkPos[0], lm.walkPos[1], lm.x, lm.z);
    } else {
      if (state.mode === 'tour') setMode('orbit');
      flyToLandmark(id);
    }
  }
}

function flyToLandmark(id) {
  const lm = LANDMARKS.find((item) => item.id === id);
  if (!lm) return;
  const targetEnd = new THREE.Vector3(lm.x, Math.min(lm.h * 0.42, 46), lm.z);
  const camEnd = new THREE.Vector3(
    lm.x + lm.camOffset[0],
    lm.camOffset[1],
    lm.z + lm.camOffset[2]
  );
  startCameraTween(camEnd, targetEnd, 1.15);
}

function startCameraTween(camEnd, targetEnd, duration = 1.1) {
  state.tween = {
    camStart: camera.position.clone(),
    targetStart: controls.target.clone(),
    camEnd,
    targetEnd,
    elapsed: 0,
    duration,
  };
}

// ================= MODES: ORBIT, WALK, BIKE & GUIDED TOUR =================
function setMode(nextMode) {
  state.mode = nextMode;
  if (document.pointerLockElement) {
    document.exitPointerLock?.();
  }
  camera.rotation.z = 0;

  document.getElementById('mode-orbit-btn').classList.toggle('active', nextMode === 'orbit');
  document.getElementById('mode-walk-btn').classList.toggle('active', nextMode === 'walk');
  document.getElementById('mode-bike-btn').classList.toggle('active', nextMode === 'bike');
  document.getElementById('mode-tour-btn').classList.toggle('active', nextMode === 'tour');

  document.getElementById('walk-hud').classList.toggle('hidden', nextMode !== 'walk' && nextMode !== 'bike');
  document.getElementById('tour-banner').classList.toggle('hidden', nextMode !== 'tour');

  controls.enabled = nextMode === 'orbit';
  if (nextMode === 'orbit' && camera.position.y < 14) {
    // Lift smoothly back to aerial view when exiting walk/bike
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const lookPt = camera.position.clone().addScaledVector(fwd, 35);
    lookPt.y = 6;
    const highPos = camera.position.clone().add(new THREE.Vector3(0, 72, 88));
    startCameraTween(highPos, lookPt, 0.95);
  }
}

function enterFirstPerson(mode, x, z, lookAtX = 0, lookAtZ = 0) {
  state.tween = null;
  setMode(mode);
  const eyeH = mode === 'bike' ? 1.88 : 1.72;
  camera.position.set(x, eyeH, z);
  state.fpYaw = Math.atan2(x - lookAtX, z - lookAtZ);
  state.fpPitch = 0.04;
  state.fpVelY = 0;
  applyFirstPersonRotation();
}

function applyFirstPersonRotation() {
  const euler = new THREE.Euler(state.fpPitch, state.fpYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}

function startGuidedTour() {
  setMode('tour');
  state.tourIndex = 0;
  goToTourStop(0);
}

function stepGuidedTour(deltaIdx) {
  const next = (state.tourIndex + deltaIdx + TOUR_STOPS.length) % TOUR_STOPS.length;
  goToTourStop(next);
}

function goToTourStop(idx) {
  state.tourIndex = idx;
  state.tourTimer = 0;
  const stop = TOUR_STOPS[idx];
  document.getElementById('tour-index').textContent =
    `巡礼 ${String(idx + 1).padStart(2, '0')} / ${TOUR_STOPS.length}`;
  document.getElementById('tour-spot-name').textContent = stop.title;
  document.getElementById('tour-caption').textContent = stop.caption;

  selectLandmark(stop.landmarkId, false);
  startCameraTween(
    new THREE.Vector3(...stop.camPos),
    new THREE.Vector3(...stop.target),
    1.65
  );
}

// ================= INPUT & RAYCASTING =================
function setupInputHandlers() {
  const raycaster = new THREE.Raycaster();
  const pointerDownPos = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownPos.x = e.clientX;
    pointerDownPos.y = e.clientY;
    if (state.mode === 'walk' || state.mode === 'bike') {
      state.isDraggingLook = true;
      state.lastPointer.x = e.clientX;
      state.lastPointer.y = e.clientY;
    }
  });

  window.addEventListener('pointerup', (e) => {
    state.isDraggingLook = false;
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (dist > 5 || e.target !== canvas) return;

    if (state.mode === 'walk' || state.mode === 'bike') {
      canvas.requestPointerLock?.();
      return;
    }

    // 3D Raycast Building Selection
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      const lmId = hit.object.userData?.landmarkId;
      if (lmId) {
        selectLandmark(lmId, true);
        break;
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (state.mode !== 'walk' && state.mode !== 'bike') return;
    if (document.pointerLockElement === canvas) {
      state.fpYaw -= e.movementX * 0.0022;
      state.fpPitch = THREE.MathUtils.clamp(
        state.fpPitch - e.movementY * 0.0022,
        -Math.PI * 0.42,
        Math.PI * 0.42
      );
      applyFirstPersonRotation();
    } else if (state.isDraggingLook) {
      const dx = e.clientX - state.lastPointer.x;
      const dy = e.clientY - state.lastPointer.y;
      state.lastPointer.x = e.clientX;
      state.lastPointer.y = e.clientY;
      state.fpYaw -= dx * 0.0032;
      state.fpPitch = THREE.MathUtils.clamp(
        state.fpPitch - dy * 0.0032,
        -Math.PI * 0.42,
        Math.PI * 0.42
      );
      applyFirstPersonRotation();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    state.keys[e.code] = true;
    if (e.code === 'Escape' && (state.mode === 'walk' || state.mode === 'bike')) {
      setMode('orbit');
    } else if (e.code === 'Digit1') setMode('orbit');
    else if (e.code === 'Digit2') document.getElementById('mode-walk-btn').click();
    else if (e.code === 'Digit3') document.getElementById('mode-bike-btn').click();
    else if (e.code === 'Digit4') startGuidedTour();
  });

  window.addEventListener('keyup', (e) => {
    state.keys[e.code] = false;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}

function updateFirstPersonMovement(delta) {
  if (state.mode !== 'walk' && state.mode !== 'bike') return;

  const isBike = state.mode === 'bike';
  const sprint = state.keys['ShiftLeft'] || state.keys['ShiftRight'];
  const speed = isBike ? (sprint ? 42 : 24) : sprint ? 22 : 10.5;

  let moveForward = 0;
  let moveRight = 0;
  if (state.keys['KeyW'] || state.keys['ArrowUp']) moveForward += 1;
  if (state.keys['KeyS'] || state.keys['ArrowDown']) moveForward -= 1;
  if (state.keys['KeyD'] || state.keys['ArrowRight']) moveRight += 1;
  if (state.keys['KeyA'] || state.keys['ArrowLeft']) moveRight -= 1;

  const forwardVec = new THREE.Vector3(-Math.sin(state.fpYaw), 0, -Math.cos(state.fpYaw));
  const rightVec = new THREE.Vector3(Math.cos(state.fpYaw), 0, -Math.sin(state.fpYaw));

  const move = new THREE.Vector3();
  move.addScaledVector(forwardVec, moveForward);
  move.addScaledVector(rightVec, moveRight);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
    camera.position.add(move);
  }

  // Clamp inside campus exploration bounds
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, WORLD_BOUNDS.minX + 15, WORLD_BOUNDS.maxX - 15);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, WORLD_BOUNDS.minZ + 15, WORLD_BOUNDS.maxZ - 15);

  const baseEye = isBike ? 1.88 : 1.72;
  if (state.keys['Space'] && camera.position.y <= baseEye + 0.05) {
    state.fpVelY = 7.2;
  }
  state.fpVelY -= 18 * delta;
  camera.position.y = Math.max(baseEye, camera.position.y + state.fpVelY * delta);
  if (camera.position.y <= baseEye) state.fpVelY = 0;
}

// ================= FLOATING LABELS & 2D MINIMAP RADAR =================
const projVec = new THREE.Vector3();

function updateFloatingLabels() {
  if (!state.showLabels) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  LANDMARKS.forEach((lm) => {
    const el = labelElements.get(lm.id);
    if (!el) return;

    projVec.set(lm.x, lm.h + 5.5, lm.z);
    const dist = camera.position.distanceTo(projVec);

    // Hide standard labels when zoomed way out to keep view uncluttered
    if (lm.tier !== 'major' && lm.id !== state.selectedId && dist > 430) {
      el.style.display = 'none';
      return;
    }

    projVec.project(camera);
    if (projVec.z > 1 || projVec.x < -1.05 || projVec.x > 1.05 || projVec.y < -1.05 || projVec.y > 1.05) {
      el.style.display = 'none';
      return;
    }

    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-projVec.y * 0.5 + 0.5) * h;
    el.style.display = 'block';
    el.style.transform = `translate(-50%, -100%) translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
  });
}

function setupMinimapInteraction() {
  const mmCanvas = document.getElementById('minimap-canvas');
  mmCanvas.addEventListener('click', (e) => {
    const rect = mmCanvas.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const wx = WORLD_BOUNDS.minX + u * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
    const wz = WORLD_BOUNDS.minZ + v * (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ);

    if (state.mode === 'walk' || state.mode === 'bike') {
      camera.position.x = wx;
      camera.position.z = wz;
    } else {
      if (state.mode === 'tour') setMode('orbit');
      startCameraTween(
        new THREE.Vector3(wx + 35, 95, wz + 125),
        new THREE.Vector3(wx, 10, wz),
        0.95
      );
    }
  });
}

function drawMinimapAndTelemetry() {
  const mmCanvas = document.getElementById('minimap-canvas');
  if (!mmCanvas) return;
  const mctx = mmCanvas.getContext('2d');
  const W = mmCanvas.width;
  const H = mmCanvas.height;

  const toMapX = (wx) => ((wx - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * W;
  const toMapY = (wz) => ((wz - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * H;

  mctx.fillStyle = '#111b29';
  mctx.fillRect(0, 0, W, H);

  // Zones
  ZONES.forEach((z) => {
    const x1 = toMapX(z.bounds.x1);
    const y1 = toMapY(z.bounds.z1);
    const x2 = toMapX(z.bounds.x2);
    const y2 = toMapY(z.bounds.z2);
    mctx.fillStyle = 'rgba(62, 108, 68, 0.34)';
    mctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  });

  // River
  mctx.strokeStyle = '#2c7e96';
  mctx.lineWidth = 2.5;
  mctx.beginPath();
  mctx.moveTo(0, toMapY(-192));
  mctx.lineTo(W, toMapY(-192));
  mctx.stroke();

  // Roads
  ROADS.forEach((r) => {
    mctx.strokeStyle = r.type === 'urban-arterial' ? '#8c97a6' : 'rgba(180, 190, 204, 0.42)';
    mctx.lineWidth = r.type === 'urban-arterial' ? 3.2 : 1.2;
    mctx.beginPath();
    mctx.moveTo(toMapX(r.x1), toMapY(r.z1));
    mctx.lineTo(toMapX(r.x2), toMapY(r.z2));
    mctx.stroke();
  });

  // Landmark Footprints
  const catColor = {
    heritage: '#c84b43',
    academic: '#d9c29c',
    dorm: '#6fa3c7',
    sports: '#5ca874',
  };
  LANDMARKS.forEach((lm) => {
    const mx = toMapX(lm.x);
    const my = toMapY(lm.z);
    const mw = Math.max(3.5, (lm.w / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * W);
    const mh = Math.max(3.5, (lm.d / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * H);
    mctx.fillStyle = catColor[lm.category] || '#d9c29c';
    mctx.fillRect(mx - mw / 2, my - mh / 2, mw, mh);

    if (lm.id === state.selectedId) {
      mctx.strokeStyle = '#ffd670';
      mctx.lineWidth = 1.6;
      mctx.strokeRect(mx - mw / 2 - 2, my - mh / 2 - 2, mw + 4, mh + 4);
    }
  });

  // Camera Position & View Cone
  const refPt = state.mode === 'orbit' || state.mode === 'tour' ? controls.target : camera.position;
  const camX = toMapX(camera.position.x);
  const camY = toMapY(camera.position.z);
  const lookDir = new THREE.Vector3();
  camera.getWorldDirection(lookDir);
  const heading = Math.atan2(lookDir.x, lookDir.z);

  mctx.save();
  mctx.translate(camX, camY);
  mctx.rotate(-heading + Math.PI);
  mctx.fillStyle = 'rgba(230, 196, 122, 0.26)';
  mctx.beginPath();
  mctx.moveTo(0, 0);
  mctx.lineTo(-11, -22);
  mctx.lineTo(11, -22);
  mctx.closePath();
  mctx.fill();
  mctx.restore();

  mctx.fillStyle = '#ffd166';
  mctx.beginPath();
  mctx.arc(camX, camY, 3.3, 0, Math.PI * 2);
  mctx.fill();

  // Compass N
  mctx.fillStyle = 'rgba(255,255,255,0.7)';
  mctx.font = '600 10px Inter, sans-serif';
  mctx.fillText('N ↑', W - 24, 13);

  // Update Live Zone & Coordinate Readout
  const rx = Math.round(refPt.x);
  const rz = Math.round(refPt.z);
  const ew = rx >= 0 ? `${rx}m E` : `${Math.abs(rx)}m W`;
  const ns = rz >= 0 ? `${rz}m S` : `${Math.abs(rz)}m N`;
  document.getElementById('coords-readout').textContent = `${ew}, ${ns}`;

  const currentZone = ZONES.find(
    (z) =>
      refPt.x >= z.bounds.x1 &&
      refPt.x <= z.bounds.x2 &&
      refPt.z >= z.bounds.z1 &&
      refPt.z <= z.bounds.z2
  );
  document.getElementById('live-zone-readout').textContent = currentZone
    ? currentZone.name
    : Math.abs(refPt.z - 198) < 24
      ? '邯郸路 · 中环地道走廊'
      : '复旦大学 · 邯郸校区周边';
}

// ================= MAIN RENDER LOOP =================
const timer = new THREE.Timer();

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  const elapsed = timer.getElapsed();

  // Camera Tweening
  if (state.tween) {
    state.tween.elapsed += delta;
    const t = Math.min(state.tween.elapsed / state.tween.duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(state.tween.camStart, state.tween.camEnd, ease);
    controls.target.lerpVectors(state.tween.targetStart, state.tween.targetEnd, ease);
    if (t >= 1) state.tween = null;
  }

  if (state.mode === 'orbit') {
    controls.update();
  } else if (state.mode === 'tour') {
    controls.update();
    if (!state.tween) {
      state.tourTimer += delta;
      // Gentle cinematic orbital drift during tour stop
      camera.position.x += Math.cos(elapsed * 0.35) * 2.2 * delta;
      if (state.tourTimer > 7.5) {
        stepGuidedTour(1);
      }
    }
  } else {
    updateFirstPersonMovement(delta);
  }

  updateLivingWorld(ctx, elapsed, delta);
  updateFloatingLabels();
  drawMinimapAndTelemetry();

  composer.render();
}

initCampus().then(() => {
  animate();
});
