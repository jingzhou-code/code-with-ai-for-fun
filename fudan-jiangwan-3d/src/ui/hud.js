import * as THREE from 'three';
import {
  CAMPUS_BOUNDS,
  CATEGORY_META,
  LANDMARKS,
  ROADS,
  WATER_BODIES,
} from '../data/campusData.js';

export class CampusHUD {
  constructor({ camera, navigator, atmosphere, landscape, architect }) {
    this.camera = camera;
    this.navigator = navigator;
    this.atmosphere = atmosphere;
    this.landscape = landscape;
    this.architect = architect;

    this.selectedLandmark = null;
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.labelsEnabled = true;

    this.initLabelLayer();
    this.initSidebar();
    this.initInspector();
    this.initEnvControls();
    this.initHeaderButtons();
    this.initMinimap();
  }

  // ==================== 1. 三维悬浮建筑铭牌层 ====================
  initLabelLayer() {
    this.labelLayer = document.createElement('div');
    this.labelLayer.id = 'label-layer';
    document.body.appendChild(this.labelLayer);

    this.labelRecords = LANDMARKS.map((lm) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `campus-label${lm.major ? ' major' : ''}`;
      el.textContent = lm.name.replace(/（.*?）/, '');
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectLandmark(lm, true);
      });
      this.labelLayer.appendChild(el);
      return {
        lm,
        el,
        worldPos: new THREE.Vector3(lm.x, Math.max(8, lm.h + 7.5), lm.z),
      };
    });
  }

  updateLabels() {
    if (!this.labelsEnabled || document.body.classList.contains('clean-view')) {
      this.labelLayer.style.display = 'none';
      return;
    }
    this.labelLayer.style.display = 'block';

    const w = window.innerWidth;
    const h = window.innerHeight;
    const proj = new THREE.Vector3();
    const camPos = this.camera.position;

    this.labelRecords.forEach(({ lm, el, worldPos }) => {
      const dist = camPos.distanceTo(worldPos);
      const isSelected = this.selectedLandmark && this.selectedLandmark.id === lm.id;

      // 智能距离分级显示，避免远景标签重叠拥挤
      const maxDist = lm.major ? 960 : 420;
      if (!isSelected && dist > maxDist) {
        el.style.display = 'none';
        return;
      }

      proj.copy(worldPos).project(this.camera);
      if (proj.z > 1 || proj.z < -1) {
        el.style.display = 'none';
        return;
      }

      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-proj.y * 0.5 + 0.5) * h;

      const sideMargin = w > 780 ? 295 : 40;
      if (sx < sideMargin || sx > w - sideMargin || sy < 78 || sy > h - 52) {
        el.style.display = 'none';
        return;
      }

      el.style.display = 'block';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.classList.toggle('active', Boolean(isSelected));
    });
  }

  // ==================== 2. 左侧分类与检索导览栏 ====================
  initSidebar() {
    this.listEl = document.getElementById('landmark-list');
    this.countBadge = document.getElementById('landmark-count-badge');
    const searchInput = document.getElementById('landmark-search-input');

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderLandmarkList();
    });

    document.querySelectorAll('#category-tabs .cat-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#category-tabs .cat-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.cat;
        this.renderLandmarkList();
      });
    });

    this.renderLandmarkList();
  }

  renderLandmarkList() {
    const filtered = LANDMARKS.filter((lm) => {
      if (this.activeCategory !== 'all' && lm.category !== this.activeCategory) return false;
      if (!this.searchQuery) return true;
      const hay = `${lm.name} ${lm.en} ${lm.depts} ${lm.desc}`.toLowerCase();
      return hay.includes(this.searchQuery);
    });

    this.countBadge.textContent = `${filtered.length} 处地标`;
    this.listEl.innerHTML = '';

    filtered.forEach((lm) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `landmark-item${this.selectedLandmark?.id === lm.id ? ' selected' : ''}`;
      item.dataset.id = lm.id;

      const meta = CATEGORY_META[lm.category] || { color: '#d4b26a' };
      item.innerHTML = `
        <span class="landmark-item-main">
          <span class="landmark-item-name">${lm.name}</span>
          <span class="landmark-item-sub">${lm.depts}</span>
        </span>
        <span class="landmark-dot" style="background:${meta.color}"></span>
      `;
      item.addEventListener('click', () => this.selectLandmark(lm, true));
      this.listEl.appendChild(item);
    });
  }

  // ==================== 3. 建筑详情档案面板 ====================
  initInspector() {
    this.inspectorEl = document.getElementById('inspector-card');
    this.inspCat = document.getElementById('inspector-category');
    this.inspTitle = document.getElementById('inspector-title');
    this.inspEn = document.getElementById('inspector-en');
    this.inspMetrics = document.getElementById('inspector-metrics');
    this.inspDesc = document.getElementById('inspector-desc');

    document.getElementById('inspector-close-btn').addEventListener('click', () => {
      this.selectedLandmark = null;
      this.inspectorEl.classList.add('hidden');
      this.renderLandmarkList();
    });

    document.getElementById('inspector-fly-btn').addEventListener('click', () => {
      if (this.selectedLandmark) this.navigator.flyToLandmark(this.selectedLandmark);
    });

    document.getElementById('inspector-walk-btn').addEventListener('click', () => {
      if (this.selectedLandmark) this.navigator.walkInFrontOf(this.selectedLandmark);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.selectedLandmark) {
        this.selectedLandmark = null;
        this.inspectorEl.classList.add('hidden');
        this.renderLandmarkList();
      }
    });
  }

  selectLandmark(lm, fly = true) {
    this.selectedLandmark = lm;
    const catMeta = CATEGORY_META[lm.category] || { label: '校园地标' };
    this.inspCat.textContent = catMeta.label;
    this.inspTitle.textContent = lm.name;
    this.inspEn.textContent = lm.en;
    this.inspDesc.textContent = lm.desc;

    this.inspMetrics.innerHTML = `
      <div class="metric-cell">
        <span class="metric-label">建筑规模</span>
        <span class="metric-val">${lm.area || '校园核心空间'}</span>
      </div>
      <div class="metric-cell">
        <span class="metric-label">层数与形制</span>
        <span class="metric-val">${lm.floors || '欧式古典主义'}</span>
      </div>
    `;

    this.inspectorEl.classList.remove('hidden');
    this.renderLandmarkList();

    if (fly) {
      this.navigator.flyToLandmark(lm);
    }
  }

  // ==================== 4. 时间光影与四季切换 ====================
  initEnvControls() {
    const slider = document.getElementById('time-slider');
    const clockReadout = document.getElementById('clock-readout');
    const seasonDesc = document.getElementById('season-desc');

    const applyHour = (hour) => {
      slider.value = String(hour);
      const state = this.atmosphere.setTimeOfDay(hour);
      clockReadout.textContent = state.clockStr;
      this.architect.updateNightLighting(state.nightFactor);
    };

    slider.addEventListener('input', (e) => {
      document.querySelectorAll('#time-presets .pill-btn').forEach((b) => b.classList.remove('active'));
      applyHour(parseFloat(e.target.value));
    });

    document.querySelectorAll('#time-presets .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#time-presets .pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyHour(parseFloat(btn.dataset.hour));
      });
    });

    document.querySelectorAll('#season-presets .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#season-presets .pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const label = this.landscape.setSeason(btn.dataset.season);
        seasonDesc.textContent = label;
      });
    });

    applyHour(15.5);
  }

  // ==================== 5. 顶栏漫游模式、铭牌开关与巡礼字幕 ====================
  initHeaderButtons() {
    const modeBtns = document.querySelectorAll('.camera-mode-bar .mode-btn');
    const crosshair = document.getElementById('walk-crosshair');
    const tourCaption = document.getElementById('tour-caption');
    const hintText = document.getElementById('controls-hint-text');

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.navigator.setMode(btn.dataset.mode);
      });
    });

    this.navigator.onModeChange = (mode) => {
      modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
      crosshair.classList.toggle('hidden', mode !== 'walk' && mode !== 'bike');
      tourCaption.classList.toggle('hidden', mode !== 'drone');

      if (mode === 'walk') {
        hintText.innerHTML =
          '<strong>第一人称漫步（人眼高 1.72m）：</strong>按住左键拖拽环视四周 · <strong>WASD / 方向键</strong>漫步 · 按住 <strong>Shift</strong> 小跑 · 点击小地图可瞬移';
      } else if (mode === 'bike') {
        hintText.innerHTML =
          '<strong>江湾单车骑行模式：</strong>正在对准智华楼三连拱桥洞！<strong>WASD</strong> 蹬车追风（Shift 加速冲刺） · 按住鼠标左键拖拽看风景';
      } else if (mode === 'drone') {
        hintText.innerHTML =
          '<strong>无人机航拍巡礼：</strong>自动巡游江湾十大经典机位 · 点击右侧“下一站”可手动切换 · 按 <strong>1</strong> 键随时返回自由鸟瞰';
      } else {
        hintText.innerHTML =
          '<strong>操作指南：</strong>左键拖拽旋转 · 右键/双指平移 · 滚轮远近缩放 · <strong>WASD / 方向键</strong>移动 · 点击任意建筑查看档案 · 快捷键 <strong>1-4</strong> 切换漫游模式';
      }
    };

    this.navigator.onTourStep = (stop, idx, total) => {
      document.getElementById('tour-step-badge').textContent = `巡礼 ${String(idx + 1).padStart(2, '0')} / ${total}`;
      document.getElementById('tour-spot-name').textContent = stop.title;
      document.getElementById('tour-spot-quote').textContent = stop.quote;
    };

    document.getElementById('tour-next-btn').addEventListener('click', () => {
      this.navigator.nextTourStop();
    });

    const labelsBtn = document.getElementById('toggle-labels-btn');
    labelsBtn.addEventListener('click', () => {
      this.labelsEnabled = !this.labelsEnabled;
      labelsBtn.classList.toggle('active', this.labelsEnabled);
    });

    const uiBtn = document.getElementById('toggle-ui-btn');
    uiBtn.addEventListener('click', () => {
      const clean = document.body.classList.toggle('clean-view');
      uiBtn.classList.toggle('active', clean);
      uiBtn.textContent = clean ? '退出纯净' : '纯净视图';
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'KeyL') labelsBtn.click();
      if (e.code === 'KeyH') uiBtn.click();
    });
  }

  // ==================== 6. 五经七纬实时交互导览小地图 ====================
  initMinimap() {
    this.mapCanvas = document.getElementById('minimap-canvas');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.coordsReadout = document.getElementById('coords-readout');

    // 预渲染静态校园底图缓存
    this.staticMapCanvas = document.createElement('canvas');
    this.staticMapCanvas.width = this.mapCanvas.width;
    this.staticMapCanvas.height = this.mapCanvas.height;
    this.renderStaticMinimap(this.staticMapCanvas.getContext('2d'));

    this.mapCanvas.addEventListener('click', (e) => {
      const rect = this.mapCanvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const { wx, wz } = this.minimapToWorld(nx, ny);
      this.navigator.flyToWorldPoint(wx, wz);
    });
  }

  worldToMinimap(wx, wz) {
    const W = this.mapCanvas.width;
    const H = this.mapCanvas.height;
    const pad = 12;
    const nx = (wx - CAMPUS_BOUNDS.minX) / (CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX);
    const nz = (wz - CAMPUS_BOUNDS.minZ) / (CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ);
    return {
      px: pad + nx * (W - pad * 2),
      py: pad + nz * (H - pad * 2),
    };
  }

  minimapToWorld(nx, ny) {
    const W = this.mapCanvas.width;
    const H = this.mapCanvas.height;
    const pad = 12;
    const ux = (nx * W - pad) / (W - pad * 2);
    const uz = (ny * H - pad) / (H - pad * 2);
    return {
      wx: CAMPUS_BOUNDS.minX + THREE.MathUtils.clamp(ux, 0, 1) * (CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX),
      wz: CAMPUS_BOUNDS.minZ + THREE.MathUtils.clamp(uz, 0, 1) * (CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ),
    };
  }

  renderStaticMinimap(ctx) {
    const W = this.staticMapCanvas.width;
    const H = this.staticMapCanvas.height;
    ctx.fillStyle = '#13202e';
    ctx.fillRect(0, 0, W, H);

    // 主校区与生活园区绿地范围
    const drawRectZone = (f, fill, stroke) => {
      const p1 = this.worldToMinimap(f.minX, f.minZ);
      const p2 = this.worldToMinimap(f.maxX, f.maxZ);
      ctx.fillStyle = fill;
      ctx.fillRect(p1.px, p1.py, p2.px - p1.px, p2.py - p1.py);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(p1.px, p1.py, p2.px - p1.px, p2.py - p1.py);
    };
    drawRectZone(CAMPUS_BOUNDS.mainFence, '#1d3629', 'rgba(218,188,128,0.28)');
    drawRectZone(CAMPUS_BOUNDS.livingParkFence, '#20352a', 'rgba(218,188,128,0.28)');

    // 中央大草坪高亮绿毯
    drawRectZone({ minX: -10, maxX: 360, minZ: 18, maxZ: 72 }, '#2d5c38', 'rgba(130,200,130,0.3)');

    // 河道与日湖、月湖
    ctx.strokeStyle = '#3388a8';
    WATER_BODIES.canals.forEach((c) => {
      const a = this.worldToMinimap(c.x1, c.z1);
      const b = this.worldToMinimap(c.x2, c.z2);
      ctx.lineWidth = Math.max(1.8, c.width * 0.14);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    });

    ctx.fillStyle = '#3189aa';
    [WATER_BODIES.riLake, WATER_BODIES.yueLake].forEach((lake) => {
      ctx.beginPath();
      lake.points.forEach(([lx, lz], idx) => {
        const p = this.worldToMinimap(lx, lz);
        if (idx === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      });
      ctx.closePath();
      ctx.fill();
    });

    // 五经七纬道路
    ROADS.forEach((r) => {
      const a = this.worldToMinimap(r.x1, r.z1);
      const b = this.worldToMinimap(r.x2, r.z2);
      ctx.strokeStyle = r.type === 'city' ? 'rgba(160,172,188,0.42)' : 'rgba(215,206,188,0.46)';
      ctx.lineWidth = r.type === 'city' ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    });

    // 所有建筑色块
    LANDMARKS.forEach((lm) => {
      if (lm.archType === 'lake-marker' || lm.archType === 'lawn-monument') return;
      const p1 = this.worldToMinimap(lm.x - lm.w * 0.5, lm.z - lm.d * 0.5);
      const p2 = this.worldToMinimap(lm.x + lm.w * 0.5, lm.z + lm.d * 0.5);
      const meta = CATEGORY_META[lm.category] || { color: '#d4b26a' };
      ctx.fillStyle = meta.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(p1.px, p1.py, Math.max(2.5, p2.px - p1.px), Math.max(2.5, p2.py - p1.py));
    });
    ctx.globalAlpha = 1.0;
  }

  updateMinimap() {
    const ctx = this.mapCtx;
    ctx.drawImage(this.staticMapCanvas, 0, 0);

    // 选中建筑脉冲圈
    if (this.selectedLandmark) {
      const sp = this.worldToMinimap(this.selectedLandmark.x, this.selectedLandmark.z);
      ctx.strokeStyle = '#ffdf85';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sp.px, sp.py, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 实时相机位置与朝向视锥
    const camPos = this.camera.position;
    const cp = this.worldToMinimap(camPos.x, camPos.z);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const heading = Math.atan2(dir.z, dir.x);

    ctx.fillStyle = 'rgba(255, 214, 112, 0.24)';
    ctx.beginPath();
    ctx.moveTo(cp.px, cp.py);
    ctx.arc(cp.px, cp.py, 24, heading - 0.45, heading + 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd670';
    ctx.beginPath();
    ctx.arc(cp.px, cp.py, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // 实时区域语义定位提示
    this.coordsReadout.textContent = this.describeZone(camPos.x, camPos.z);
  }

  describeZone(x, z) {
    if (z > 505 && x < -90) return '江湾生活园区 · 光华Mall';
    if (z < -230 && x > -180) return '北区基础理科与交叉创新群';
    if (z < -230 && x <= -180) return '北区学生宿舍与北食堂';
    if (x > 185 && z > -120 && z < 15) return '日湖亲水景观区';
    if (z > 330 && x > -130 && x < 180) return '月湖生态景观区';
    if (x < -230 && z > 120) return '西区体育场馆与南食堂';
    if (z > 110 && z < 235) return '纬七路银杏大道 · 智华楼/法学楼';
    return '韶华大道 · 江湾中央大草坪';
  }
}
