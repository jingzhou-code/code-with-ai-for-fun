import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CAMPUS_ZONES, LANDMARKS, STREETS_NS, STREETS_EW } from './data/campusData.js';
import { createCampusMaterials } from './materials/proceduralTextures.js';
import { buildTerrainAndGrid } from './builders/terrainAndGrid.js';
import { buildMainQuadrangles } from './builders/mainQuadBuilder.js';
import { buildAllCampusLandmarks } from './builders/landmarkBuilder.js';
import { buildLifeAndFoliage } from './builders/lifeAndFoliage.js';
import { createEnvironmentSystem } from './systems/environmentSystem.js';
import { createCameraRig } from './systems/cameraRig.js';
import { createMinimap } from './systems/minimap.js';

const canvas = document.getElementById('viewport-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1.0, 5000);

// Post-processing pipeline
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.22,
  0.55,
  0.82
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Raycast registry mapping 3D groups -> Landmark IDs
const hitMeshes = [];
function registerHitTarget(object3D, landmarkId) {
  object3D.userData.landmarkId = landmarkId;
  object3D.traverse((child) => {
    if (child.isMesh) {
      child.userData.landmarkId = landmarkId;
      hitMeshes.push(child);
    }
  });
}

// Build Entire University of Chicago Campus!
const mats = createCampusMaterials();
const { flagMesh } = buildTerrainAndGrid(scene, mats, registerHitTarget);
buildMainQuadrangles(scene, mats, registerHitTarget);
buildAllCampusLandmarks(scene, mats, registerHitTarget);
const life = buildLifeAndFoliage(scene, mats);
const env = createEnvironmentSystem(scene, mats, bloomPass);

// Update Masthead subtitle with live architectural count
const statsLine = document.getElementById('campus-stats-line');
if (statsLine) {
  statsLine.textContent = `${LANDMARKS.length} 座核心历史与现代地标 · ${life.treeCount.toLocaleString()} 株植物园树木 · 55th–61st 全街区复原`;
}

// Ground Highlight Beacon Ring for Selected Building
const beaconGeo = new THREE.RingGeometry(1, 1.08, 48);
beaconGeo.rotateX(-Math.PI * 0.5);
const beaconMat = new THREE.MeshBasicMaterial({
  color: '#e5b96e',
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.85
});
const selectionRing = new THREE.Mesh(beaconGeo, beaconMat);
selectionRing.visible = false;
scene.add(selectionRing);

// State
let activeLandmarkId = 'harper';
let hoveredLandmarkId = null;
let activeZone = 'all';
let searchQuery = '';
let showPins = true;
let hudHidden = false;

// Camera Rig
const tourBanner = document.getElementById('tour-banner');
const tourBadge = document.getElementById('tour-step-badge');
const tourCaption = document.getElementById('tour-caption');
const walkHint = document.getElementById('walk-hint');

const camRig = createCameraRig(camera, canvas, {
  onModeChange(mode) {
    document.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mode === mode);
    });
    tourBanner.classList.toggle('is-visible', mode === 'tour');
    walkHint.classList.toggle('is-visible', mode === 'walk');
  },
  onTourStop(stop, lm, idx, total) {
    tourBadge.textContent = `${idx + 1} / ${total}`;
    tourCaption.textContent = stop.caption;
    if (lm) selectLandmark(lm.id, false);
  }
});

// Minimap
const minimapCanvas = document.getElementById('minimap-canvas');
const minimap = createMinimap(minimapCanvas, (wx, wz) => {
  camRig.flyToPoint(wx, wz, [0, 72, 105], 6);
});

// ============================================================================
// UI DIRECTORY, DOSSIER & FLOATING 3D PINS
// ============================================================================
const zoneTabsEl = document.getElementById('zone-tabs');
const listEl = document.getElementById('landmark-list');
const searchEl = document.getElementById('landmark-search');
const dossierCard = document.getElementById('dossier-card');
const worldLabelsEl = document.getElementById('world-labels');

function renderZoneTabs() {
  zoneTabsEl.innerHTML = '';
  for (const z of CAMPUS_ZONES) {
    const btn = document.createElement('button');
    btn.className = `zone-chip${z.id === activeZone ? ' is-active' : ''}`;
    btn.textContent = z.label.split(' · ')[0];
    btn.title = z.label;
    btn.addEventListener('click', () => {
      activeZone = z.id;
      renderZoneTabs();
      renderDirectoryList();
    });
    zoneTabsEl.appendChild(btn);
  }
}

function renderDirectoryList() {
  listEl.innerHTML = '';
  const q = searchQuery.trim().toLowerCase();
  const filtered = LANDMARKS.filter((lm) => {
    if (activeZone !== 'all' && lm.zone !== activeZone) return false;
    if (!q) return true;
    return (
      lm.name.toLowerCase().includes(q) ||
      lm.nameZh.toLowerCase().includes(q) ||
      lm.architect.toLowerCase().includes(q) ||
      lm.style.toLowerCase().includes(q) ||
      lm.address.toLowerCase().includes(q)
    );
  });

  for (const lm of filtered) {
    const item = document.createElement('button');
    item.className = `landmark-item${lm.id === activeLandmarkId ? ' is-active' : ''}`;
    item.dataset.id = lm.id;
    item.innerHTML = `
      <div class="lm-item-title">
        <span>${lm.nameZh}</span>
        <span class="lm-item-year">${lm.year}</span>
      </div>
      <div class="lm-item-en">${lm.name}</div>
    `;
    item.addEventListener('click', () => {
      selectLandmark(lm.id, true);
    });
    listEl.appendChild(item);
  }
}

function selectLandmark(id, fly = true) {
  const lm = LANDMARKS.find((l) => l.id === id);
  if (!lm) return;
  activeLandmarkId = id;

  document.getElementById('dossier-zh').textContent = lm.nameZh;
  document.getElementById('dossier-en').textContent = lm.name;
  document.getElementById('dossier-year').textContent = lm.year;
  document.getElementById('dossier-style').textContent = lm.style;
  document.getElementById('dossier-arch').textContent = lm.architect;
  document.getElementById('dossier-addr').textContent = lm.address;
  document.getElementById('dossier-desc').textContent = lm.desc;
  dossierCard.classList.add('is-visible');

  // Position selection ring around building
  const radius = Math.max(lm.footprint[0], lm.footprint[1]) * 0.58;
  selectionRing.scale.set(radius, 1, radius);
  selectionRing.position.set(lm.pos[0], 0.35, lm.pos[2]);
  selectionRing.visible = lm.id !== 'midway';

  document.querySelectorAll('.landmark-item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });
  document.querySelectorAll('.world-pin').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });

  if (fly) camRig.flyToLandmark(lm);
}

// Create Floating 3D Pins for Featured Landmarks
const SHORT_PIN_NAMES = {
  harper: '哈珀纪念图书馆',
  cobb_hall: '科布讲堂 (1892)',
  tower_group: '米切尔钟塔',
  botany_pond: '植物学池塘',
  ryerson: '莱尔森物理馆',
  regenstein: '雷根斯坦图书馆',
  mansueto: '曼苏托玻璃穹顶',
  nuclear_energy: '摩尔《核能》雕塑',
  rockefeller: '洛克菲勒大教堂',
  robie_house: '赖特·罗比住宅',
  booth_harper: '布斯商学院',
  saieh_hall: '赛耶经济学院',
  midway: '中途公园大道',
  law_school: '沙里宁法学院',
  crown_ssa: '密斯社工学院',
  logan_center: '洛根艺术中心',
  rubenstein_forum: '鲁宾斯坦论坛',
  ratner: '拉特纳悬索体育馆',
  campus_north: '北校区书院',
  ccd_hospital: '芝大医学中心 CCD'
};

const pinEntries = [];
for (const lm of LANDMARKS) {
  if (!lm.featured) continue;
  const el = document.createElement('button');
  el.className = 'world-pin';
  el.dataset.id = lm.id;
  const shortName = SHORT_PIN_NAMES[lm.id] || lm.nameZh.split('（')[0];
  el.innerHTML = `<span class="world-pin-dot"></span><span>${shortName}</span>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectLandmark(lm.id, true);
  });
  worldLabelsEl.appendChild(el);
  const pinHeight =
    lm.id === 'rockefeller' ? 68 : lm.id === 'harper' ? 45 : lm.id === 'midway' ? 6 : 30;
  pinEntries.push({
    lm,
    el,
    worldPos: new THREE.Vector3(lm.pos[0], pinHeight, lm.pos[2])
  });
}

const projVec = new THREE.Vector3();
function updateWorldPins() {
  if (!showPins || hudHidden) {
    worldLabelsEl.style.display = 'none';
    return;
  }
  worldLabelsEl.style.display = 'block';
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dirOpen = !document.getElementById('directory-panel').classList.contains('is-collapsed');
  const dossierOpen = dossierCard.classList.contains('is-visible');

  // Sort so active pin and closer pins win screen-space priority
  const sorted = pinEntries
    .map((p) => ({
      p,
      dist: camera.position.distanceTo(p.worldPos),
      isSel: p.lm.id === activeLandmarkId
    }))
    .sort((a, b) => (b.isSel ? 1 : 0) - (a.isSel ? 1 : 0) || a.dist - b.dist);

  const placedBoxes = [];

  for (const { p, dist, isSel } of sorted) {
    projVec.copy(p.worldPos).project(camera);
    const inFront = projVec.z < 1 && projVec.z > -1;
    if (!inFront || dist > 980) {
      p.el.style.display = 'none';
      continue;
    }
    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-projVec.y * 0.5 + 0.5) * h;

    // Avoid top bar, bottom env bar, open left directory, and right dossier/minimap
    const inLeftHud = dirOpen && sx < 345 && sy < h - 120;
    const inBottomEnv = sx < 455 && sy > h - 145;
    const inRightHud = sx > w - 375 && sy > (dossierOpen ? h - 540 : h - 245);
    const inTopBar = sy < 72;

    if (!isSel && (sx < 50 || sx > w - 50 || sy < 40 || sy > h - 30 || inLeftHud || inBottomEnv || inRightHud || inTopBar)) {
      p.el.style.display = 'none';
      continue;
    }

    // Prevent label-on-label overlap
    const halfW = 58;
    const halfH = 15;
    let collides = false;
    if (!isSel) {
      for (const box of placedBoxes) {
        if (Math.abs(sx - box.x) < halfW * 2 && Math.abs(sy - box.y) < halfH * 2) {
          collides = true;
          break;
        }
      }
    }
    if (collides) {
      p.el.style.display = 'none';
      continue;
    }

    placedBoxes.push({ x: sx, y: sy });
    p.el.style.display = 'inline-flex';
    p.el.style.left = `${sx}px`;
    p.el.style.top = `${sy}px`;
  }
}

// ============================================================================
// RAYCAST PICKING (HOVER & CLICK)
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let downPos = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointermove', (e) => {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  hoveredLandmarkId = hits.length > 0 ? hits[0].object.userData.landmarkId : null;
  canvas.style.cursor = hoveredLandmarkId && camRig.getMode() !== 'walk' ? 'pointer' : 'grab';
});

canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  if (hits.length > 0) {
    const id = hits[0].object.userData.landmarkId;
    if (id) selectLandmark(id, false);
  }
});

canvas.addEventListener('dblclick', (e) => {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  if (hits.length > 0) {
    const id = hits[0].object.userData.landmarkId;
    if (id) selectLandmark(id, true);
  }
});

// ============================================================================
// HUD CONTROLS & KEYBOARD SHORTCUTS
// ============================================================================
renderZoneTabs();
renderDirectoryList();
selectLandmark('harper', false);

searchEl.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderDirectoryList();
});

const dirPanel = document.getElementById('directory-panel');
const btnToggleDir = document.getElementById('btn-toggle-dir');
btnToggleDir.addEventListener('click', () => {
  const collapsed = dirPanel.classList.toggle('is-collapsed');
  btnToggleDir.classList.toggle('is-active', !collapsed);
});

document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => camRig.setMode(btn.dataset.mode));
});

document.getElementById('btn-reset-view').addEventListener('click', () => camRig.resetOverview());

const btnTogglePins = document.getElementById('btn-toggle-pins');
btnTogglePins.addEventListener('click', () => {
  showPins = !showPins;
  btnTogglePins.classList.toggle('is-active', showPins);
});

const hudRoot = document.getElementById('hud-root');
const restoreBtn = document.getElementById('restore-hud-btn');
function toggleHud() {
  hudHidden = !hudHidden;
  hudRoot.classList.toggle('is-hidden', hudHidden);
  restoreBtn.classList.toggle('is-visible', hudHidden);
}
document.getElementById('btn-hide-hud').addEventListener('click', toggleHud);
restoreBtn.addEventListener('click', toggleHud);

document.getElementById('btn-close-dossier').addEventListener('click', () => {
  dossierCard.classList.remove('is-visible');
  selectionRing.visible = false;
});

document.getElementById('btn-tour-prev').addEventListener('click', () => camRig.nextTourStop(-1));
document.getElementById('btn-tour-next').addEventListener('click', () => camRig.nextTourStop(1));

// Time of Day Slider & Presets
const timeSlider = document.getElementById('time-slider');
const timeReadout = document.getElementById('time-readout');

function formatHour(val) {
  const h = Math.floor(val) % 24;
  const m = Math.round((val - Math.floor(val)) * 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function applyHour(hour) {
  timeSlider.value = hour;
  timeReadout.textContent = formatHour(hour);
  env.setTimeOfDay(hour);
  document.querySelectorAll('#time-presets .mini-btn').forEach((b) => {
    b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.hour) - hour) < 0.25);
  });
}

timeSlider.addEventListener('input', (e) => applyHour(parseFloat(e.target.value)));
document.querySelectorAll('#time-presets .mini-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyHour(parseFloat(btn.dataset.hour)));
});

// 4-Season Switcher
document.querySelectorAll('#season-presets .mini-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const s = btn.dataset.season;
    document.querySelectorAll('#season-presets .mini-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.season === s);
    });
    life.setSeason(s);
    env.setSeason(s);
  });
});

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'KeyH') toggleHud();
  if (e.code === 'KeyR') camRig.resetOverview();
  if (e.code === 'KeyL') btnTogglePins.click();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Nearest Hyde Park Street Intersection Readout
const coordReadout = document.getElementById('coord-readout');
function updateStreetReadout() {
  let nearestEW = STREETS_EW[0];
  let bestDz = Infinity;
  for (const st of STREETS_EW) {
    const dz = Math.abs(camera.position.z - st.z);
    if (dz < bestDz) {
      bestDz = dz;
      nearestEW = st;
    }
  }
  let nearestNS = STREETS_NS[0];
  let bestDx = Infinity;
  for (const st of STREETS_NS) {
    const dx = Math.abs(camera.position.x - st.x);
    if (dx < bestDx) {
      bestDx = dx;
      nearestNS = st;
    }
  }
  const ewShort = nearestEW.name.split(' (')[0].replace('E ', '');
  const nsShort = nearestNS.name.replace('S ', '').replace(' Ave', '').split(' (')[0];
  coordReadout.textContent = `${ewShort} & ${nsShort}`.toUpperCase();
}

// ============================================================================
// MAIN ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  camRig.update(dt);
  life.update(dt, elapsed, flagMesh);

  if (selectionRing.visible) {
    beaconMat.opacity = 0.55 + Math.sin(elapsed * 3.5) * 0.28;
  }

  updateWorldPins();
  updateStreetReadout();
  minimap.render(camera, activeLandmarkId, hoveredLandmarkId);

  composer.render();
}

animate();
