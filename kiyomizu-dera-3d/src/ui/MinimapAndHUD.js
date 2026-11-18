import { LANDMARKS, RAMPS_AND_PATHS } from '../world/SitePlan.js';

export function setupHUDAndMinimap({
  onSelectLandmark,
  onChangeMode,
  onToggleXRay,
  onRingBell,
  onToggleAudio,
  onChangeSeason,
  onChangeTime,
  onMinimapTeleport,
}) {
  const landmarkListEl = document.getElementById('landmark-list');
  const detailHeritageEl = document.getElementById('detail-heritage-tag');
  const detailYearEl = document.getElementById('detail-year-tag');
  const detailTitleEl = document.getElementById('detail-title');
  const detailReadingEl = document.getElementById('detail-jp-reading');
  const detailDescEl = document.getElementById('detail-description');
  const detailMetricsEl = document.getElementById('detail-metrics');
  const atmosphereLabelEl = document.getElementById('hud-atmosphere-label');
  const timeSliderEl = document.getElementById('time-slider');
  const timeReadoutEl = document.getElementById('time-readout');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const mCtx = minimapCanvas.getContext('2d');

  let activeLandmarkId = LANDMARKS[0].id;
  let currentSeason = 'autumn';
  let currentTime = 17.15;

  // Populate Pilgrimage Landmarks Guide List
  LANDMARKS.forEach((lm) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `landmark-item${lm.id === activeLandmarkId ? ' active' : ''}`;
    btn.dataset.id = lm.id;
    btn.innerHTML = `
      <span class="landmark-num">${lm.number}</span>
      <div class="landmark-label-wrap">
        <div class="landmark-name">${lm.name}</div>
        <div class="landmark-meta">${lm.subtitle}</div>
      </div>
    `;
    btn.addEventListener('click', () => {
      setActiveLandmarkCard(lm.id);
      onSelectLandmark(lm);
    });
    landmarkListEl.appendChild(btn);
  });

  function setActiveLandmarkCard(id) {
    const lm = LANDMARKS.find((item) => item.id === id) || LANDMARKS[0];
    activeLandmarkId = lm.id;

    landmarkListEl.querySelectorAll('.landmark-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === lm.id);
    });

    detailHeritageEl.textContent = lm.heritage;
    detailYearEl.textContent = lm.year;
    detailTitleEl.textContent = lm.name;
    detailReadingEl.textContent = lm.reading;
    detailDescEl.textContent = lm.description;

    detailMetricsEl.innerHTML = lm.metrics
      .map(
        (m) => `
        <div class="metric-cell">
          <span class="metric-label">${m.label}</span>
          <span class="metric-val">${m.value}</span>
        </div>
      `
      )
      .join('');
  }
  setActiveLandmarkCard(LANDMARKS[0].id);

  // Drawer Collapse
  const drawerEl = document.getElementById('landmarks-drawer');
  const collapseBtn = document.getElementById('drawer-collapse-btn');
  collapseBtn.addEventListener('click', () => {
    const collapsed = drawerEl.classList.toggle('collapsed');
    collapseBtn.textContent = collapsed ? '展開' : '收起';
  });

  // Camera Mode Buttons
  const modeOrbitBtn = document.getElementById('mode-orbit-btn');
  const modeWalkBtn = document.getElementById('mode-walk-btn');
  const modeTourBtn = document.getElementById('mode-tour-btn');
  const walkOverlay = document.getElementById('walk-overlay');
  const controlsHint = document.getElementById('controls-hint');

  function setModeUI(mode) {
    modeOrbitBtn.classList.toggle('active', mode === 'orbit');
    modeWalkBtn.classList.toggle('active', mode === 'walk');
    modeTourBtn.classList.toggle('active', mode === 'tour');
    walkOverlay.classList.toggle('hidden', mode !== 'walk');

    if (mode === 'orbit') {
      controlsHint.textContent = '左键旋转 · 右键平移 · 滚轮缩放 · 点击建筑聚焦';
    } else if (mode === 'walk') {
      controlsHint.textContent = 'WASD 漫步参道与清水舞台 · Shift 疾行 · ESC 解锁';
    } else {
      controlsHint.textContent = '全境自动巡礼中 · 点击任意处返回自在俯瞰';
    }
  }

  modeOrbitBtn.addEventListener('click', () => {
    setModeUI('orbit');
    onChangeMode('orbit');
  });
  modeWalkBtn.addEventListener('click', () => {
    setModeUI('walk');
    onChangeMode('walk');
  });
  modeTourBtn.addEventListener('click', () => {
    setModeUI('tour');
    onChangeMode('tour');
  });

  // Structural X-Ray, Bell, Audio & Hide HUD Buttons
  const xrayBtn = document.getElementById('xray-toggle-btn');
  xrayBtn.addEventListener('click', () => {
    const active = onToggleXRay();
    xrayBtn.classList.toggle('active', active);
  });

  document.getElementById('bell-ring-btn').addEventListener('click', () => {
    onRingBell();
  });

  const audioBtn = document.getElementById('audio-toggle-btn');
  const audioLabel = document.getElementById('audio-btn-label');
  audioBtn.addEventListener('click', () => {
    const playing = onToggleAudio();
    audioBtn.classList.toggle('active', playing);
    audioLabel.textContent = playing ? '山音: 鳴' : '山音: 静';
  });

  const hudHideBtn = document.getElementById('hud-hide-btn');
  const hudRestoreBtn = document.getElementById('hud-restore-btn');
  function toggleHUDHidden() {
    const hidden = document.body.classList.toggle('hud-hidden');
    hudRestoreBtn.classList.toggle('hidden', !hidden);
  }
  hudHideBtn.addEventListener('click', toggleHUDHidden);
  hudRestoreBtn.addEventListener('click', toggleHUDHidden);

  // Season & Time Controls
  const seasonNames = {
    spring: '春 · 桜雲満開',
    summer: '夏 · 音羽新緑',
    autumn: '秋 · 錦雲紅葉',
    winter: '冬 · 東山雪化粧',
  };

  function updateHeaderAtmosphereCaption() {
    let period = '晴昼';
    if (currentTime < 5.5 || currentTime >= 18.5) period = '夜間特別拝観 · 慈悲の光';
    else if (currentTime < 8.0) period = '東山朝霧';
    else if (currentTime >= 16.3) period = '夕照 · 日想観';
    atmosphereLabelEl.textContent = `${seasonNames[currentSeason]} · ${period} · 全伽藍復原`;
  }

  document.querySelectorAll('.season-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSeason = btn.dataset.season;
      document.querySelectorAll('.season-btn').forEach((b) => b.classList.toggle('active', b === btn));
      updateHeaderAtmosphereCaption();
      onChangeSeason(currentSeason);
    });
  });

  function formatHours(val) {
    const h = Math.floor(val) % 24;
    const m = Math.floor((val - Math.floor(val)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  document.querySelectorAll('.time-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.time);
      currentTime = val;
      timeSliderEl.value = String(val);
      timeReadoutEl.textContent = formatHours(val);
      document.querySelectorAll('.time-btn').forEach((b) => b.classList.toggle('active', b === btn));
      updateHeaderAtmosphereCaption();
      onChangeTime(val);
    });
  });

  timeSliderEl.addEventListener('input', () => {
    const val = parseFloat(timeSliderEl.value);
    currentTime = val;
    timeReadoutEl.textContent = formatHours(val);
    document.querySelectorAll('.time-btn').forEach((b) => b.classList.remove('active'));
    updateHeaderAtmosphereCaption();
    onChangeTime(val);
  });

  // =========================================================================
  // INTERACTIVE 2D PRECINCT MINIMAP (境内伽藍配置図)
  // World X in [-155, +95], World Z in [-78, +106]
  // =========================================================================
  const mapBounds = { minX: -150, maxX: 95, minZ: -78, maxZ: 106 };

  function worldToMap(wx, wz) {
    const u = (wx - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX);
    const v = (wz - mapBounds.minZ) / (mapBounds.maxZ - mapBounds.minZ);
    return [u * minimapCanvas.width, v * minimapCanvas.height];
  }

  function mapToWorld(mx, mz) {
    const u = mx / minimapCanvas.width;
    const v = mz / minimapCanvas.height;
    return [
      mapBounds.minX + u * (mapBounds.maxX - mapBounds.minX),
      mapBounds.minZ + v * (mapBounds.maxZ - mapBounds.minZ),
    ];
  }

  minimapCanvas.addEventListener('click', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * minimapCanvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * minimapCanvas.height;
    const [wx, wz] = mapToWorld(mx, my);

    // Snap to nearest landmark if clicked near one, else fly over clicked coordinates!
    let bestLm = null;
    let bestDist = 14.0;
    for (const lm of LANDMARKS) {
      const dist = Math.hypot(wx - lm.mapPos[0], wz - lm.mapPos[1]);
      if (dist < bestDist) {
        bestDist = dist;
        bestLm = lm;
      }
    }
    if (bestLm) {
      setActiveLandmarkCard(bestLm.id);
      onSelectLandmark(bestLm);
    } else {
      onMinimapTeleport(wx, wz);
    }
  });

  function renderMinimap(camPos, camForward) {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    mCtx.clearRect(0, 0, w, h);

    // Subtle topographic contour rings & Kin'un-kei Gorge shading
    mCtx.fillStyle = 'rgba(20, 19, 17, 0.92)';
    mCtx.fillRect(0, 0, w, h);

    const [gx0, gz0] = worldToMap(-105, 20);
    const [gx1, gz1] = worldToMap(68, 52);
    mCtx.fillStyle = currentSeason === 'autumn' ? 'rgba(168, 52, 32, 0.16)' : 'rgba(64, 96, 62, 0.16)';
    mCtx.fillRect(gx0, gz0, gx1 - gx0, gz1 - gz0);

    // Draw Pilgrimage Paths
    mCtx.strokeStyle = 'rgba(218, 205, 184, 0.28)';
    mCtx.lineWidth = 1.6;
    for (const r of RAMPS_AND_PATHS) {
      const [ax, ay] = worldToMap(r.ax, r.az);
      const [bx, by] = worldToMap(r.bx, r.bz);
      mCtx.beginPath();
      mCtx.moveTo(ax, ay);
      mCtx.lineTo(bx, by);
      mCtx.stroke();
    }

    // Draw Hondo footprint highlight
    const [hx0, hz0] = worldToMap(6, -11);
    const [hx1, hz1] = worldToMap(42, 19);
    mCtx.fillStyle = 'rgba(212, 168, 87, 0.25)';
    mCtx.strokeStyle = 'rgba(212, 168, 87, 0.72)';
    mCtx.lineWidth = 1.2;
    mCtx.fillRect(hx0, hz0, hx1 - hx0, hz1 - hz0);
    mCtx.strokeRect(hx0, hz0, hx1 - hx0, hz1 - hz0);

    // Draw Landmark Pins
    for (const lm of LANDMARKS) {
      if (lm.id === 'okunoin_panorama') continue;
      const [px, py] = worldToMap(lm.mapPos[0], lm.mapPos[1]);
      const isAct = lm.id === activeLandmarkId;
      mCtx.beginPath();
      mCtx.arc(px, py, isAct ? 4.4 : 2.7, 0, Math.PI * 2);
      mCtx.fillStyle = isAct ? '#c9462c' : '#d6ccb8';
      mCtx.fill();
      if (isAct) {
        mCtx.strokeStyle = '#fff5ea';
        mCtx.lineWidth = 1.2;
        mCtx.stroke();
      }
    }

    // Draw Live Camera Position & Viewing Frustum Cone
    const [cx, cy] = worldToMap(camPos.x, camPos.z);
    const angle = Math.atan2(camForward.z, camForward.x);
    mCtx.save();
    mCtx.translate(cx, cy);
    mCtx.rotate(angle);
    mCtx.beginPath();
    mCtx.moveTo(0, 0);
    mCtx.lineTo(22, -11);
    mCtx.lineTo(22, 11);
    mCtx.closePath();
    mCtx.fillStyle = 'rgba(212, 168, 87, 0.24)';
    mCtx.fill();

    mCtx.beginPath();
    mCtx.arc(0, 0, 3.6, 0, Math.PI * 2);
    mCtx.fillStyle = '#f5c469';
    mCtx.fill();
    mCtx.restore();
  }

  return {
    setActiveLandmarkCard,
    setModeUI,
    toggleHUDHidden,
    setXRayButtonActive: (active) => xrayBtn.classList.toggle('active', active),
    renderMinimap,
  };
}
