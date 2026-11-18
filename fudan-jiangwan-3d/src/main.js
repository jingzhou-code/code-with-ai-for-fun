import * as THREE from 'three';
import { BRIDGES, LANDMARKS } from './data/campusData.js';
import {
  createFacadeMaterialSet,
  createGroundTextures,
  createRoofMaterials,
} from './world/textures.js';
import { CampusArchitect } from './world/architecture.js';
import { CampusLandscape } from './world/landscape.js';
import { CampusAtmosphere } from './world/atmosphere.js';
import { CampusNavigator } from './controls/navigation.js';
import { CampusHUD } from './ui/hud.js';

function setLoadingProgress(pct, text) {
  const bar = document.getElementById('loading-bar-fill');
  const stage = document.getElementById('loading-stage');
  if (bar) bar.style.width = `${pct}%`;
  if (stage && text) stage.textContent = text;
}

async function bootCampus() {
  const container = document.getElementById('canvas-container');

  // 1. 初始化高精度 WebGL 渲染器与色调映射
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    1.0,
    6500
  );

  const nextTick = () => new Promise((r) => setTimeout(r, 16));

  setLoadingProgress(24, '正在生成新古典主义石材立面与自习灯光纹理…');
  await nextTick();

  // 2. 构建材质与贴图集
  const facadeSet = createFacadeMaterialSet(renderer);
  const roofMats = createRoofMaterials();
  const groundTextures = createGroundTextures();

  setLoadingProgress(48, '正在铺设五经七纬道路、日湖月湖与三千株四季林木…');
  await nextTick();

  // 3. 构建大气天空、地形河网、植被与动态校园交通
  const atmosphere = new CampusAtmosphere(scene);
  const landscape = new CampusLandscape(scene, groundTextures);

  setLoadingProgress(74, '正在雕琢廖凯原法学楼穹顶、李兆基图书馆与智华楼桥洞…');
  await nextTick();

  // 4. 构建全校 35 处地标建筑群与 14 座欧式石拱桥
  const architect = new CampusArchitect(facadeSet, roofMats);
  const buildingsGroup = new THREE.Group();
  LANDMARKS.forEach((lm) => {
    buildingsGroup.add(architect.buildLandmark(lm));
  });
  BRIDGES.forEach((b) => {
    buildingsGroup.add(architect.buildBridge(b));
  });
  scene.add(buildingsGroup);

  setLoadingProgress(92, '正在启动四模式漫游相机与实时导览雷达…');
  await nextTick();

  // 5. 导航控制器与交互 HUD
  const navigator = new CampusNavigator(camera, renderer.domElement);
  const hud = new CampusHUD({
    camera,
    navigator,
    atmosphere,
    landscape,
    architect,
  });

  // 6. 鼠标点击三维建筑拾取（区分拖拽旋转与轻点选中）
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;
    const moveDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (moveDist > 5) return; // 旋转拖拽不触发建筑点击

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(architect.pickableMeshes, false);
    if (hits.length > 0 && hits[0].object.userData.landmark) {
      hud.selectLandmark(hits[0].object.userData.landmark, false);
    }
  });

  // 7. 自适应窗口尺寸
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 首帧立即渲染完成再淡出遮罩
  navigator.update(0.016);
  landscape.update(
    0,
    0.016,
    atmosphere.sunDir,
    atmosphere.sunColor,
    atmosphere.skyHorizon,
    atmosphere.nightFactor
  );
  hud.updateLabels();
  hud.updateMinimap();
  renderer.render(scene, camera);

  // 8. 淡出加载遮罩，开启主循环
  setLoadingProgress(100, '欢迎来到淞沪路2005号 · 复旦大学江湾校区');
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('fade-out');
  }, 120);

  const timer = new THREE.Timer();
  const perfEl = document.getElementById('perf-readout');
  let frameCounter = 0;
  let fpsTimer = 0;

  function animate(timestamp) {
    requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = Math.min(0.05, timer.getDelta());
    const elapsed = timer.getElapsed();

    navigator.update(dt);
    landscape.update(
      elapsed,
      dt,
      atmosphere.sunDir,
      atmosphere.sunColor,
      atmosphere.skyHorizon,
      atmosphere.nightFactor
    );
    hud.updateLabels();
    hud.updateMinimap();

    renderer.render(scene, camera);

    frameCounter++;
    fpsTimer += dt;
    if (fpsTimer >= 1.0 && perfEl) {
      const fps = Math.round(frameCounter / fpsTimer);
      perfEl.textContent = `淞沪路2005号 · 1600亩实景 · ${fps} FPS`;
      frameCounter = 0;
      fpsTimer = 0;
    }
  }

  animate();
}

bootCampus();
