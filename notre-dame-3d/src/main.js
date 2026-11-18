import * as THREE from 'three';
import { BUILDINGS, TOUR_STOPS, QUADS_INFO } from './data/campusData.js';
import { createCampusMaterials } from './core/materials.js';
import { createEnvironment } from './core/environment.js';
import { createNavigationController } from './core/controls.js';
import { createTerrainAndLakes } from './world/terrainAndLakes.js';
import { createSacredLandmarks } from './world/landmarksSacred.js';
import { createAcademicLandmarks } from './world/landmarksAcademic.js';
import { createAthleticLandmarks } from './world/landmarksAthletics.js';
import { createCampusHalls } from './world/campusHalls.js';
import { createFoliageAndLife } from './world/foliageAndLife.js';
import { createHUD } from './ui/hud.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar-fill');
const loadingStage = document.getElementById('loading-stage');
const hoverLabel = document.getElementById('hover-label');
const canvas = document.getElementById('nd-canvas');

function setProgress(pct, msg) {
  if (loadingBar) loadingBar.style.width = `${pct}%`;
  if (loadingStage) loadingStage.textContent = msg;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

async function initNotreDameCampus() {
  // 1. Renderer, Scene & Camera
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
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    46,
    window.innerWidth / window.innerHeight,
    1.2,
    4200
  );
  // Iconic opening hero view: God Quad looking up toward the Golden Dome, Basilica Spire & St. Mary's Lake!
  camera.position.set(52, 62, 165);

  setProgress(18, '调配圣约瑟夫湖泥黄砖、哥特彩窗与 23.9K 金顶材质…');
  await nextFrame();
  const materials = createCampusMaterials();

  setProgress(34, '铺设双湖水波着色器、七大草坪与校园步道…');
  await nextFrame();
  const env = createEnvironment(scene, renderer, camera);
  const terrain = createTerrainAndLakes(scene, materials);

  setProgress(54, '筑造金顶主楼、圣心大教堂与露德圣母岩洞烛火…');
  await nextFrame();
  const sacred = createSacredLandmarks(scene, materials, terrain.getGroundHeight);

  setProgress(72, '镶嵌赫斯伯格图书馆“达阵耶稣”壁画与学院殿堂…');
  await nextFrame();
  const academic = createAcademicLandmarks(scene, materials, terrain.poolShaderMat);

  setProgress(86, '建造 8 万座圣母大学橄榄球场与 33 座学生宿舍院…');
  await nextFrame();
  const athletics = createAthleticLandmarks(scene, materials);
  const halls = createCampusHalls(scene, BUILDINGS, materials);

  setProgress(96, '栽植两千八百株四季林木与点亮校园灯火…');
  await nextFrame();
  const life = createFoliageAndLife(scene, BUILDINGS, materials, terrain.getGroundHeight);

  // Selection Ground Halo Ring
  const selectRingGeo = new THREE.RingGeometry(1, 1.08, 48);
  selectRingGeo.rotateX(-Math.PI / 2);
  const selectRingMat = new THREE.MeshBasicMaterial({
    color: '#ffd24a',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.78,
  });
  const selectRing = new THREE.Mesh(selectRingGeo, selectRingMat);
  selectRing.position.set(0, 0.45, 0);
  selectRing.scale.set(44, 1, 34);
  scene.add(selectRing);

  function placeSelectionRing(b) {
    const gy = terrain.getGroundHeight(b.x, b.z);
    selectRing.position.set(b.x, gy + 0.42, b.z);
    selectRing.scale.set(b.w * 0.62 + 4, 1, b.d * 0.62 + 4);
  }

  // App State
  const state = {
    hour: 17.65, // Golden Hour Sunset default
    season: 'autumn',
    gameday: false,
    nightFactor: 0.25,
    sunDir: new THREE.Vector3(-0.7, 0.25, 0.4),
  };

  function syncEnvironment() {
    const { nightFactor, sunDir } = env.updateTimeAndSeason(state.hour, state.season, state.gameday);
    state.nightFactor = nightFactor;
    state.sunDir.copy(sunDir);
    materials.updateAtmosphere({
      nightFactor,
      gameday: state.gameday,
      season: state.season,
    });
    athletics.updateLights(nightFactor, state.gameday);
    terrain.setSeason(state.season);
    life.setSeason(state.season);
  }

  // Navigation & HUD Wiring
  let hud = null;
  const nav = createNavigationController({
    camera,
    domElement: canvas,
    tourStops: TOUR_STOPS,
    getGroundHeight: terrain.getGroundHeight,
    onTourStopChange: (stop, idx, total, paused) => {
      hud?.updateTourBanner(stop, idx, total, paused);
      const b = BUILDINGS.find((item) => item.id === stop.buildingId);
      if (b) placeSelectionRing(b);
    },
    onModeChange: (mode) => {
      hud?.syncModeUI(mode);
    },
  });

  function focusOnBuilding(b) {
    placeSelectionRing(b);
    const [ox, oy, oz] = b.cameraOffset || [52, 34, 62];
    if (nav.getMode() === 'tour') {
      nav.setMode('orbit');
    }
    if (nav.getMode() === 'walk') {
      const walkX = b.x + Math.sign(ox || 1) * (b.w * 0.5 + 16);
      const walkZ = b.z + Math.sign(oz || 1) * (b.d * 0.5 + 18);
      const gy = terrain.getGroundHeight(walkX, walkZ);
      nav.flyTo([walkX, gy + 1.85, walkZ], [b.x, Math.min(18, b.h * 0.45), b.z], 1.35);
    } else {
      nav.flyTo([b.x + ox, oy, b.z + oz], [b.x, b.h * 0.36, b.z], 1.55);
    }
  }

  hud = createHUD({
    buildings: BUILDINGS,
    quadsInfo: QUADS_INFO,
    camera,
    onSelectBuilding: (b, shouldFly) => {
      placeSelectionRing(b);
      if (shouldFly) focusOnBuilding(b);
    },
    onFocusBuilding: (b) => focusOnBuilding(b),
    onModeSelect: (m) => nav.setMode(m),
    onTimeChange: (hr) => {
      state.hour = hr;
      syncEnvironment();
    },
    onSeasonChange: (season) => {
      state.season = season;
      syncEnvironment();
    },
    onToggleGameDay: (gd) => {
      state.gameday = gd;
      syncEnvironment();
    },
    onTourPrev: () => nav.prevTourStop(),
    onTourNext: () => nav.nextTourStop(),
    onTourTogglePause: () => nav.toggleTourPause(),
    onMinimapTeleport: (wx, wz) => {
      if (nav.getMode() === 'tour') nav.setMode('orbit');
      if (nav.getMode() === 'walk') {
        const gy = terrain.getGroundHeight(wx, wz);
        nav.flyTo([wx, gy + 1.85, wz], [0, 22, 0], 1.2);
      } else {
        nav.flyTo([wx + 42, 72, wz + 95], [wx, 8, wz], 1.35);
      }
    },
  });

  syncEnvironment();
  placeSelectionRing(BUILDINGS[0]);

  // 3D Raycasting (Hover Tooltip + Click to Inspect + Double-Click to Fly)
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickTargets = [sacred.sacredGroup, academic.group, athletics.group, halls.group];
  const buildingMap = new Map(BUILDINGS.map((b) => [b.id, b]));

  let pointerDownPos = { x: 0, y: 0 };

  canvas.addEventListener('pointermove', (e) => {
    if (nav.getMode() === 'walk') {
      hoverLabel.classList.add('hidden');
      return;
    }
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickTargets, true);
    const hit = hits.find((h) => h.object.userData?.buildingId);
    if (hit) {
      const b = buildingMap.get(hit.object.userData.buildingId);
      if (b) {
        canvas.style.cursor = 'pointer';
        hoverLabel.innerHTML = `<strong>${b.nameZh}</strong> · ${b.nameEn}`;
        hoverLabel.style.left = `${e.clientX}px`;
        hoverLabel.style.top = `${e.clientY}px`;
        hoverLabel.classList.remove('hidden');
        return;
      }
    }
    canvas.style.cursor = 'grab';
    hoverLabel.classList.add('hidden');
  });

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('click', (e) => {
    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 5) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickTargets, true);
    const hit = hits.find((h) => h.object.userData?.buildingId);
    if (hit) {
      const b = buildingMap.get(hit.object.userData.buildingId);
      if (b) {
        hud.setSelectedBuilding(b.id);
        placeSelectionRing(b);
      }
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickTargets, true);
    const hit = hits.find((h) => h.object.userData?.buildingId);
    if (hit) {
      const b = buildingMap.get(hit.object.userData.buildingId);
      if (b) {
        hud.setSelectedBuilding(b.id);
        focusOnBuilding(b);
      }
    }
  });

  // Resize Handler
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    env.resize(w, h);
  });

  // Dismiss Loading Curtain
  setProgress(100, '欢迎来到美国圣母大学 · Welcome to Notre Dame du Lac');
  setTimeout(() => {
    loadingScreen?.classList.add('fade-out');
  }, 260);

  // Main Animation Loop
  const clock = new THREE.Clock();
  let frameCount = 0;
  let fpsTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    nav.update(delta);
    env.tick(elapsed, delta);
    terrain.tick(elapsed, env.skyUniforms.uHorizonColor.value, state.sunDir, state.nightFactor);
    sacred.tick(elapsed);
    life.tick(elapsed, delta, state.gameday);

    // Subtle selection ring pulse
    selectRingMat.opacity = 0.55 + Math.sin(elapsed * 3.2) * 0.22;

    hud.updateWorldPins();
    hud.drawMinimap(nav.orbit.target);

    env.composer.render();

    frameCount++;
    fpsTimer += delta;
    if (fpsTimer >= 0.5) {
      hud.setFPS(Math.round(frameCount / fpsTimer));
      frameCount = 0;
      fpsTimer = 0;
    }
  }

  animate();
}

initNotreDameCampus();
