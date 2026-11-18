import * as THREE from 'three';

function formatHourLabel(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  let phase = '白昼晴空';
  if (hour < 5.5 || hour >= 20.2) phase = '星夜烛光';
  else if (hour < 8.0) phase = '晨雾破晓';
  else if (hour >= 16.5 && hour < 20.2) phase = '落日熔金';
  return `${hh}:${mm} · ${phase}`;
}

export function createHUD({
  buildings,
  quadsInfo,
  camera,
  onSelectBuilding,
  onFocusBuilding,
  onModeSelect,
  onTimeChange,
  onSeasonChange,
  onToggleGameDay,
  onTourPrev,
  onTourNext,
  onTourTogglePause,
  onMinimapTeleport,
}) {
  const landmarkListEl = document.getElementById('landmark-list');
  const searchInput = document.getElementById('building-search-input');
  const catTabs = Array.from(document.querySelectorAll('.cat-tab'));
  const countBadge = document.getElementById('building-count-badge');

  // Inspector elements
  const inspQuad = document.getElementById('inspector-quad');
  const inspZh = document.getElementById('inspector-title-zh');
  const inspEn = document.getElementById('inspector-title-en');
  const inspYear = document.getElementById('inspector-year');
  const inspHeight = document.getElementById('inspector-height');
  const inspStyle = document.getElementById('inspector-style');
  const inspDesc = document.getElementById('inspector-desc');
  const inspFocusBtn = document.getElementById('inspector-focus-btn');

  // Header & Mode elements
  const modeBtns = {
    orbit: document.getElementById('mode-orbit-btn'),
    walk: document.getElementById('mode-walk-btn'),
    tour: document.getElementById('mode-tour-btn'),
  };
  const gamedayBtn = document.getElementById('gameday-toggle-btn');
  const labelsBtn = document.getElementById('labels-toggle-btn');
  const collapseBtn = document.getElementById('hud-collapse-btn');
  const walkCrosshair = document.getElementById('walk-crosshair');
  const controlsHintText = document.getElementById('controls-hint-text');
  const fpsCounter = document.getElementById('fps-counter');

  // Environment controls
  const timeSlider = document.getElementById('time-slider');
  const clockReadout = document.getElementById('clock-readout');
  const presetBtns = Array.from(document.querySelectorAll('.preset-btn'));
  const seasonBtns = Array.from(document.querySelectorAll('.season-btn'));

  // Tour Banner
  const tourBanner = document.getElementById('tour-banner');
  const tourStepCounter = document.getElementById('tour-step-counter');
  const tourStopTitle = document.getElementById('tour-stop-title');
  const tourStopCaption = document.getElementById('tour-stop-caption');
  const tourPrevBtn = document.getElementById('tour-prev-btn');
  const tourPauseBtn = document.getElementById('tour-pause-btn');
  const tourNextBtn = document.getElementById('tour-next-btn');

  // Minimap & World Pins
  const minimapCanvas = document.getElementById('minimap-canvas');
  const mmCtx = minimapCanvas.getContext('2d');
  const coordsReadout = document.getElementById('coords-readout');
  const worldLabelsContainer = document.getElementById('world-labels');

  let activeCat = 'featured';
  let searchQuery = '';
  let selectedId = 'main-building';
  let labelsVisible = true;

  countBadge.textContent = `${buildings.length} 地标群`;

  // Render Building List
  function renderDirectory() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = buildings.filter((b) => {
      if (q) {
        return (
          b.nameZh.toLowerCase().includes(q) ||
          b.nameEn.toLowerCase().includes(q) ||
          b.quad.toLowerCase().includes(q)
        );
      }
      if (activeCat === 'featured') return Boolean(b.featured);
      return b.category === activeCat;
    });

    landmarkListEl.innerHTML = '';
    for (const b of filtered) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `landmark-item${b.id === selectedId ? ' selected' : ''}`;
      btn.innerHTML = `
        <div class="lm-item-main">
          <span class="lm-item-zh">${b.nameZh}</span>
          <span class="lm-item-en">${b.nameEn}</span>
        </div>
        <span class="lm-item-quad">${b.year.split(/[–/]/)[0]}</span>
      `;
      btn.addEventListener('click', () => {
        setSelectedBuilding(b.id);
        onSelectBuilding?.(b, true);
      });
      landmarkListEl.appendChild(btn);
    }
  }

  function setSelectedBuilding(id) {
    const b = buildings.find((item) => item.id === id);
    if (!b) return;
    selectedId = b.id;
    inspQuad.textContent = b.quad;
    inspZh.textContent = b.nameZh;
    inspEn.textContent = b.nameEn;
    inspYear.textContent = b.year;
    inspHeight.textContent = b.heightLabel;
    inspStyle.textContent = b.style;
    inspDesc.textContent = b.desc;
    renderDirectory();
  }

  inspFocusBtn.addEventListener('click', () => {
    const b = buildings.find((item) => item.id === selectedId);
    if (b) onFocusBuilding?.(b);
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderDirectory();
  });

  catTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      catTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCat = tab.dataset.cat;
      searchInput.value = '';
      searchQuery = '';
      renderDirectory();
    });
  });

  // Mode Switcher bindings
  Object.entries(modeBtns).forEach(([mKey, btn]) => {
    btn.addEventListener('click', () => onModeSelect?.(mKey));
  });

  function syncModeUI(mode) {
    Object.entries(modeBtns).forEach(([k, btn]) => {
      btn.classList.toggle('active', k === mode);
    });
    walkCrosshair.classList.toggle('hidden', mode !== 'walk');
    tourBanner.classList.toggle('hidden', mode !== 'tour');

    if (mode === 'walk') {
      controlsHintText.textContent = '漫步模式：按住鼠标左键拖动环顾四周 · WASD 行走 · Shift 慢跑 · 按 1 返回航拍';
    } else if (mode === 'tour') {
      controlsHintText.textContent = '电影级全景导览中：可随时点击下方暂停/切站，或按 1 切换自由航拍';
    } else {
      controlsHintText.textContent = '左键旋转 · 右键平移 · 滚轮缩放 · WASD/QE 移动镜头 · 单击建筑查看档案，双击聚焦';
    }
  }

  // Time & Season controls
  timeSlider.addEventListener('input', (e) => {
    const hr = parseFloat(e.target.value);
    clockReadout.textContent = formatHourLabel(hr);
    presetBtns.forEach((b) => b.classList.remove('active'));
    onTimeChange?.(hr);
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const hr = parseFloat(btn.dataset.hour);
      timeSlider.value = String(hr);
      clockReadout.textContent = formatHourLabel(hr);
      presetBtns.forEach((b) => b.classList.toggle('active', b === btn));
      onTimeChange?.(hr);
    });
  });

  seasonBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      seasonBtns.forEach((b) => b.classList.toggle('active', b === btn));
      onSeasonChange?.(btn.dataset.season);
    });
  });

  // Game Day, Labels & Minimal View toggles
  gamedayBtn.addEventListener('click', () => {
    const active = !gamedayBtn.classList.contains('active');
    gamedayBtn.classList.toggle('active', active);
    gamedayBtn.setAttribute('aria-pressed', String(active));
    onToggleGameDay?.(active);
  });

  const toggleLabels = () => {
    labelsVisible = !labelsVisible;
    labelsBtn.classList.toggle('active', labelsVisible);
    labelsBtn.setAttribute('aria-pressed', String(labelsVisible));
    worldLabelsContainer.classList.toggle('hidden', !labelsVisible);
  };
  labelsBtn.addEventListener('click', toggleLabels);

  const toggleMinimal = () => {
    const isMin = document.body.classList.toggle('hud-minimal');
    collapseBtn.classList.toggle('active', isMin);
    collapseBtn.setAttribute('aria-pressed', String(isMin));
  };
  collapseBtn.addEventListener('click', toggleMinimal);

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyL') toggleLabels();
    if (e.code === 'KeyH') toggleMinimal();
  });

  // Tour Banner controls
  tourPrevBtn.addEventListener('click', () => onTourPrev?.());
  tourNextBtn.addEventListener('click', () => onTourNext?.());
  tourPauseBtn.addEventListener('click', () => {
    const paused = onTourTogglePause?.();
    tourPauseBtn.textContent = paused ? '继续导览' : '暂停导览';
  });

  function updateTourBanner(stop, idx, total, paused) {
    tourStepCounter.textContent = `STOP ${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    tourStopTitle.textContent = stop.title;
    tourStopCaption.textContent = stop.caption;
    tourPauseBtn.textContent = paused ? '继续导览' : '暂停导览';
    setSelectedBuilding(stop.buildingId);
  }

  // ==================== 3D FLOATING WORLD PINS ====================
  const featuredPins = buildings
    .filter((b) => b.pinLabel)
    .map((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'world-pin';
      el.innerHTML = `<span class="world-pin-dot"></span><span>${b.pinLabel}</span>`;
      el.addEventListener('click', () => {
        setSelectedBuilding(b.id);
        onSelectBuilding?.(b, true);
      });
      worldLabelsContainer.appendChild(el);
      return {
        building: b,
        el,
        worldPos: new THREE.Vector3(b.x, b.h + 9, b.z),
      };
    });

  const projVec = new THREE.Vector3();
  function updateWorldPins() {
    if (!labelsVisible) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const pin of featuredPins) {
      projVec.copy(pin.worldPos).project(camera);
      const dist = camera.position.distanceTo(pin.worldPos);
      if (projVec.z > 1 || dist > 1350) {
        pin.el.style.display = 'none';
        continue;
      }
      const sx = (projVec.x * 0.5 + 0.5) * w;
      const sy = (-projVec.y * 0.5 + 0.5) * h;
      if (sx < -60 || sx > w + 60 || sy < 45 || sy > h - 30) {
        pin.el.style.display = 'none';
        continue;
      }
      pin.el.style.display = 'inline-flex';
      pin.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }

  // ==================== INTERACTIVE 2D MINIMAP RADAR ====================
  // World bounds shown on minimap: X [-780, +820], Z [-560, +840]
  const MM_MIN_X = -780;
  const MM_MAX_X = 820;
  const MM_MIN_Z = -560;
  const MM_MAX_Z = 840;

  const toMmX = (wx) => ((wx - MM_MIN_X) / (MM_MAX_X - MM_MIN_X)) * minimapCanvas.width;
  const toMmY = (wz) => ((wz - MM_MIN_Z) / (MM_MAX_Z - MM_MIN_Z)) * minimapCanvas.height;

  minimapCanvas.addEventListener('click', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const wx = MM_MIN_X + u * (MM_MAX_X - MM_MIN_X);
    const wz = MM_MIN_Z + v * (MM_MAX_Z - MM_MIN_Z);
    onMinimapTeleport?.(wx, wz);
  });

  const camDir2D = new THREE.Vector3();
  function drawMinimap(targetPos) {
    const cw = minimapCanvas.width;
    const ch = minimapCanvas.height;
    mmCtx.fillStyle = '#09172b';
    mmCtx.fillRect(0, 0, cw, ch);

    // Lakes
    mmCtx.fillStyle = '#1b557a';
    mmCtx.beginPath();
    mmCtx.ellipse(toMmX(-468), toMmY(-128), 32, 21, -0.14, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.beginPath();
    mmCtx.ellipse(toMmX(-5), toMmY(-328), 23, 21, 0.18, 0, Math.PI * 2);
    mmCtx.fill();

    // Quads
    mmCtx.fillStyle = 'rgba(56, 128, 68, 0.42)';
    for (const q of quadsInfo) {
      const qx = toMmX(q.x - q.w / 2);
      const qy = toMmY(q.z - q.d / 2);
      const qw = (q.w / (MM_MAX_X - MM_MIN_X)) * cw;
      const qd = (q.d / (MM_MAX_Z - MM_MIN_Z)) * ch;
      mmCtx.fillRect(qx, qy, qw, qd);
    }

    // Buildings
    for (const b of buildings) {
      const bx = toMmX(b.x - b.w / 2);
      const by = toMmY(b.z - b.d / 2);
      const bw = Math.max(2.5, (b.w / (MM_MAX_X - MM_MIN_X)) * cw);
      const bd = Math.max(2.5, (b.d / (MM_MAX_Z - MM_MIN_Z)) * ch);
      mmCtx.fillStyle = b.id === selectedId ? '#ffd24a' : b.featured ? '#c8a662' : '#64768f';
      mmCtx.fillRect(bx, by, bw, bd);
    }

    // Camera Viewing Cone & Marker
    const cx = toMmX(camera.position.x);
    const cy = toMmY(camera.position.z);
    camera.getWorldDirection(camDir2D);
    const heading = Math.atan2(camDir2D.z, camDir2D.x);

    mmCtx.fillStyle = 'rgba(255, 210, 74, 0.24)';
    mmCtx.beginPath();
    mmCtx.moveTo(cx, cy);
    mmCtx.arc(cx, cy, 22, heading - 0.46, heading + 0.46);
    mmCtx.closePath();
    mmCtx.fill();

    mmCtx.fillStyle = '#4ade80';
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, 3.3, 0, Math.PI * 2);
    mmCtx.fill();

    // Closest quad readout
    let nearestQuad = 'Campus';
    let bestD = Infinity;
    for (const q of quadsInfo) {
      const d = Math.hypot(targetPos.x - q.x, targetPos.z - q.z);
      if (d < bestD) {
        bestD = d;
        nearestQuad = q.name;
      }
    }
    coordsReadout.textContent = `${nearestQuad} · (${Math.round(targetPos.x)}, ${Math.round(targetPos.z)})`;
  }

  renderDirectory();
  setSelectedBuilding('main-building');

  return {
    setSelectedBuilding,
    syncModeUI,
    updateTourBanner,
    updateWorldPins,
    drawMinimap,
    setFPS: (fps) => {
      fpsCounter.textContent = `${fps} FPS`;
    },
  };
}
