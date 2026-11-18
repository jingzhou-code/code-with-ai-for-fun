import {
  CAMERA_PRESETS,
  SANSHA_SHRINES,
  MIZUURA_FORTUNES,
  MUSUBIBUMI_PRESETS,
  VALLEY_CONFIG
} from '../data/landmarks.js';
import { getRiverCenterX, getRoadCenterX } from '../world/terrain.js';

export function createUISystem({
  navigation,
  atmosphere,
  audio,
  onPrayAtShrine,
  onFloatMizuura,
  onTieMusubibumi
}) {
  const visitedShrines = new Set();
  let activePresetId = 'omotesando';
  let hudHidden = false;

  // Populate 12 Camera Preset Buttons
  const presetListEl = document.getElementById('preset-list');
  CAMERA_PRESETS.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `preset-btn-${preset.id}`;
    btn.className = `preset-chip ${preset.id === activePresetId ? 'is-active' : ''}`;
    btn.innerHTML = `
      <span class="preset-zone">${preset.zone}</span>
      <span class="preset-name">${index + 1}. ${preset.title}</span>
    `;
    btn.addEventListener('click', () => {
      if (navigation.getMode() === 'tour') {
        navigation.setMode('orbit');
        syncNavButtons();
      }
      selectPreset(preset);
      navigation.flyToPreset(preset, 1.8);
    });
    presetListEl.appendChild(btn);
  });

  function selectPreset(preset) {
    activePresetId = preset.id;
    document.querySelectorAll('.preset-chip').forEach((el) => {
      el.classList.toggle('is-active', el.id === `preset-btn-${preset.id}`);
    });
    document.getElementById('lore-title').textContent = preset.loreTitle;
    document.getElementById('lore-sub').textContent = preset.loreJapanese;
    document.getElementById('lore-body').textContent = preset.loreBody;
  }

  // Initialize Lore Card with default preset
  selectPreset(CAMERA_PRESETS[0]);

  // Lore Card Collapse Toggle
  const loreCard = document.getElementById('lore-card');
  const loreToggleBtn = document.getElementById('btn-toggle-lore');
  loreToggleBtn.addEventListener('click', () => {
    const collapsed = loreCard.classList.toggle('is-collapsed');
    loreToggleBtn.textContent = collapsed ? '由緒を開く' : '閉じる';
  });

  // Navigation Mode Buttons ('orbit' | 'walk' | 'tour')
  function syncNavButtons() {
    const m = navigation.getMode();
    document.querySelectorAll('[data-nav-mode]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.navMode === m);
    });
    const hintEl = document.getElementById('controls-hint');
    if (m === 'walk') {
      hintEl.textContent = '参拝歩行モード：WASD / 矢印キーで石段や橋を歩行・ドラッグで視線移動（Shiftで早足）';
    } else if (m === 'tour') {
      hintEl.textContent = '三社詣自動巡礼カメラ運行中：画面クリックで自由視点に戻ります';
    } else {
      hintEl.textContent = '自由俯瞰モード：左ドラッグ回転・右ドラッグ平行移動・ホイール拡大縮小・WASD移動';
    }
  }

  document.querySelectorAll('[data-nav-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigation.setMode(btn.dataset.navMode);
      syncNavButtons();
    });
  });

  // Season & Time-of-Day & Rain & Audio Toggles
  document.querySelectorAll('[data-season]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season;
      atmosphere.applyState({ season });
      document.querySelectorAll('[data-season]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.season === season);
      });
    });
  });

  document.querySelectorAll('[data-time]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const timeMode = btn.dataset.time;
      atmosphere.applyState({ timeMode });
      document.querySelectorAll('[data-time]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.time === timeMode);
      });
    });
  });

  const rainBtn = document.getElementById('btn-rain');
  rainBtn.addEventListener('click', () => {
    const nextRain = !atmosphere.getState().rain;
    atmosphere.applyState({ rain: nextRain });
    audio.setRain(nextRain);
    rainBtn.classList.toggle('is-active', nextRain);
  });

  const audioBtn = document.getElementById('btn-audio');
  audioBtn.addEventListener('click', () => {
    const on = audio.toggle();
    audioBtn.classList.toggle('is-active', on);
    audioBtn.textContent = on ? '渓谷音響 ON' : '渓谷音響 OFF';
  });

  // Hide HUD Photo Mode ('H' key or button)
  const photoBtn = document.getElementById('btn-photo-mode');
  function toggleHudVisibility() {
    hudHidden = !hudHidden;
    document.body.classList.toggle('hud-hidden', hudHidden);
    photoBtn.textContent = hudHidden ? 'UIを表示 (H)' : '写真モード (H)';
  }
  photoBtn.addEventListener('click', toggleHudVisibility);
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyH') toggleHudVisibility();
  });

  // ============================================================================
  // MODAL 1: MIZUURA-MIKUJI (水占みくじ — Interactive Water Fortune Experience!)
  // ============================================================================
  const mizuuraModal = document.getElementById('modal-mizuura');
  const mizuuraCanvas = document.getElementById('mizuura-canvas');
  const mctx = mizuuraCanvas.getContext('2d');
  let mizuuraAnimId = null;

  function openMizuuraExperience() {
    mizuuraModal.classList.add('is-open');
    if (onFloatMizuura) onFloatMizuura();
    audio.playSacredWaterChime();

    const fortune = MIZUURA_FORTUNES[Math.floor(Math.random() * MIZUURA_FORTUNES.length)];
    let revealProgress = 0;
    let startTime = performance.now();

    if (mizuuraAnimId) cancelAnimationFrame(mizuuraAnimId);

    function renderSlip(now) {
      const elapsed = (now - startTime) * 0.001;
      revealProgress = Math.min(1, elapsed / 3.2);

      const w = mizuuraCanvas.width;
      const h = mizuuraCanvas.height;
      mctx.clearRect(0, 0, w, h);

      // Crystal sacred spring water background with expanding concentric ripples
      const waterGrad = mctx.createRadialGradient(w * 0.5, h * 0.5, 18, w * 0.5, h * 0.5, w * 0.65);
      waterGrad.addColorStop(0, '#2c686a');
      waterGrad.addColorStop(1, '#153639');
      mctx.fillStyle = waterGrad;
      mctx.fillRect(0, 0, w, h);

      for (let r = 0; r < 5; r++) {
        const rad = ((elapsed * 46 + r * 52) % 260) + 12;
        const alpha = Math.max(0, 1 - rad / 270) * 0.26;
        mctx.strokeStyle = `rgba(195, 240, 242, ${alpha})`;
        mctx.lineWidth = 1.6;
        mctx.beginPath();
        mctx.arc(w * 0.5, h * 0.5, rad, 0, Math.PI * 2);
        mctx.stroke();
      }

      // Floating wet translucent Washi fortune strip
      mctx.save();
      const driftY = Math.sin(elapsed * 1.6) * 3.5;
      const driftRot = Math.sin(elapsed * 1.1) * 0.018;
      mctx.translate(w * 0.5, h * 0.5 + driftY);
      mctx.rotate(driftRot);

      const sw = 246;
      const sh = 356;
      mctx.shadowColor = 'rgba(0, 15, 20, 0.45)';
      mctx.shadowBlur = 18;
      // Paper becomes slightly translucent as sacred water soaks in!
      const soakAlpha = 0.96 - revealProgress * 0.1;
      mctx.fillStyle = `rgba(247, 244, 236, ${soakAlpha})`;
      mctx.fillRect(-sw / 2, -sh / 2, sw, sh);
      mctx.shadowBlur = 0;

      // Vermilion header border (always faintly visible, deepens on contact with water)
      mctx.strokeStyle = `rgba(198, 45, 32, ${0.35 + revealProgress * 0.55})`;
      mctx.lineWidth = 2;
      mctx.strokeRect(-sw / 2 + 10, -sh / 2 + 10, sw - 20, sh - 20);

      mctx.fillStyle = `rgba(198, 45, 32, ${0.4 + revealProgress * 0.58})`;
      mctx.font = '700 15px "Noto Serif JP", "Noto Serif SC", serif';
      mctx.textAlign = 'center';
      mctx.fillText('貴布禰総本宮 水占御神籤', 0, -sh / 2 + 34);

      // Revealed Fortune Rank & Sacred Text emerging from water!
      const textAlpha = Math.pow(revealProgress, 1.5);
      if (textAlpha > 0.02) {
        mctx.fillStyle = `rgba(186, 36, 26, ${textAlpha})`;
        mctx.font = '700 34px "Noto Serif JP", "Noto Serif SC", serif';
        mctx.fillText(`【 ${fortune.rank} 】`, 0, -sh / 2 + 78);

        // Waka poem
        mctx.fillStyle = `rgba(28, 30, 32, ${textAlpha * 0.92})`;
        mctx.font = '500 13px "Noto Serif JP", "Noto Serif SC", serif';
        const lines = fortune.poem.split('\n');
        lines.forEach((ln, idx) => {
          mctx.fillText(ln, 0, -sh / 2 + 112 + idx * 20);
        });

        mctx.fillStyle = `rgba(82, 92, 90, ${textAlpha * 0.88})`;
        mctx.font = '400 11.5px "Noto Serif SC", "Noto Serif JP", sans-serif';
        mctx.fillText(fortune.translation, 0, -sh / 2 + 156);

        // Divider
        mctx.strokeStyle = `rgba(198, 45, 32, ${textAlpha * 0.35})`;
        mctx.beginPath();
        mctx.moveTo(-sw / 2 + 22, -sh / 2 + 174);
        mctx.lineTo(sw / 2 - 22, -sh / 2 + 174);
        mctx.stroke();

        // Detailed items
        mctx.textAlign = 'left';
        fortune.items.forEach(([label, desc], i) => {
          const itemAlpha = Math.max(0, Math.min(1, (revealProgress - 0.18 - i * 0.09) * 2.2));
          if (itemAlpha <= 0) return;
          const yPos = -sh / 2 + 200 + i * 31;
          mctx.fillStyle = `rgba(180, 42, 28, ${itemAlpha})`;
          mctx.font = '700 12px "Noto Serif JP", "Noto Serif SC", serif';
          mctx.fillText(label, -sw / 2 + 22, yPos);

          mctx.fillStyle = `rgba(32, 35, 36, ${itemAlpha * 0.92})`;
          mctx.font = '400 11.5px "Noto Serif JP", "Noto Serif SC", sans-serif';
          mctx.fillText(desc, -sw / 2 + 22, yPos + 15);
        });
      }

      mctx.restore();

      if (mizuuraModal.classList.contains('is-open')) {
        mizuuraAnimId = requestAnimationFrame(renderSlip);
      }
    }

    mizuuraAnimId = requestAnimationFrame(renderSlip);
  }

  document.getElementById('btn-open-mizuura').addEventListener('click', openMizuuraExperience);
  document.getElementById('btn-redraw-mizuura').addEventListener('click', openMizuuraExperience);

  // ============================================================================
  // MODAL 2: SANSHA-MAIRI GOSHUINCHO (三社詣 御朱印帳 — Sacred Pilgrimage Seals!)
  // ============================================================================
  const goshuinModal = document.getElementById('modal-goshuin');
  const goshuinGrid = document.getElementById('goshuin-pages');

  function renderGoshuinPages() {
    goshuinGrid.innerHTML = '';
    SANSHA_SHRINES.forEach((shrine) => {
      const stamped = visitedShrines.has(shrine.id);
      const card = document.createElement('div');
      card.className = `goshuin-page ${stamped ? 'is-stamped' : ''}`;
      card.innerHTML = `
        <div class="goshuin-order">第${shrine.order}番・${shrine.name}（${shrine.reading}）</div>
        <div class="goshuin-sheet">
          ${
            stamped
              ? `
            <div class="vermilion-seal">
              <span>${shrine.sealTitle}</span>
              <strong>印</strong>
            </div>
            <div class="goshuin-calligraphy">
              <span class="goshuin-sub">奉拝</span>
              <strong class="goshuin-main">${shrine.sealCenter}</strong>
              <span class="goshuin-date">令和八年霜月吉日</span>
            </div>
          `
              : `
            <div class="goshuin-empty">
              <span>未参拝</span>
              <small>${shrine.deity}</small>
            </div>
          `
          }
        </div>
        <div class="goshuin-blessing">${shrine.blessing}</div>
        <button type="button" class="goshuin-pray-btn" data-pray-shrine="${shrine.id}">
          ${stamped ? '再び参拝する' : `${shrine.name}へ移動して参拝`}
        </button>
      `;
      goshuinGrid.appendChild(card);
    });

    goshuinGrid.querySelectorAll('[data-pray-shrine]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sId = btn.dataset.prayShrine;
        goshuinModal.classList.remove('is-open');
        performShrinePrayer(sId, true);
      });
    });

    document.getElementById('sansha-progress').textContent = `${visitedShrines.size} / 3`;
  }

  function performShrinePrayer(shrineId, flyFirst = false) {
    const shrine = SANSHA_SHRINES.find((s) => s.id === shrineId);
    if (!shrine) return;

    if (flyFirst) {
      const presetMap = { hongu: 'hongu_haiden', okumiya: 'okumiya_gate', yui: 'yui' };
      const targetPreset = CAMERA_PRESETS.find((p) => p.id === presetMap[shrineId]);
      if (targetPreset) {
        selectPreset(targetPreset);
        navigation.flyToPreset(targetPreset, 1.4);
      }
    }

    visitedShrines.add(shrineId);
    audio.playPrayerRitualSound();
    navigation.triggerRitualBow(shrine.lookTarget);
    if (onPrayAtShrine) onPrayAtShrine(shrineId);
    renderGoshuinPages();

    showToast(
      visitedShrines.size === 3
        ? `祝・貴船神社「三社詣（本宮・奥宮・結社）」満願成就！御朱印が全て揃いました`
        : `${shrine.name}にて参拝（二礼二拍手一礼）を修め、御朱印を拝受しました`
    );
  }

  renderGoshuinPages();
  document.getElementById('btn-open-goshuin').addEventListener('click', () => {
    renderGoshuinPages();
    goshuinModal.classList.add('is-open');
  });

  // ============================================================================
  // MODAL 3: MUSUBIBUMI WISH TYING (結社・薄緑の結び文祈願)
  // ============================================================================
  const musubiModal = document.getElementById('modal-musubibumi');
  const musubiInput = document.getElementById('musubi-input');
  const musubiPresetContainer = document.getElementById('musubi-presets');

  MUSUBIBUMI_PRESETS.forEach((text) => {
    const pBtn = document.createElement('button');
    pBtn.type = 'button';
    pBtn.className = 'musubi-preset-item';
    pBtn.textContent = text;
    pBtn.addEventListener('click', () => {
      musubiInput.value = text;
    });
    musubiPresetContainer.appendChild(pBtn);
  });

  document.getElementById('btn-open-musubi').addEventListener('click', () => {
    musubiModal.classList.add('is-open');
  });

  document.getElementById('btn-submit-musubi').addEventListener('click', () => {
    const wish = musubiInput.value.trim() || MUSUBIBUMI_PRESETS[0];
    musubiModal.classList.remove('is-open');
    audio.playSacredWaterChime();
    if (onTieMusubibumi) onTieMusubibumi(wish);
    const yuiPreset = CAMERA_PRESETS.find((p) => p.id === 'yui');
    if (yuiPreset) {
      selectPreset(yuiPreset);
      navigation.flyToPreset(yuiPreset, 1.5);
    }
    showToast(`結社の結び所に薄緑の結び文を奉納しました：「${wish.slice(0, 24)}…」`);
  });

  // Close buttons for all modals
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.shrine-modal').classList.remove('is-open');
    });
  });

  // Contextual Nearby Action Prompt Button (`E` key or click!)
  const promptEl = document.getElementById('proximity-prompt');
  const promptTextEl = document.getElementById('proximity-text');
  let activePromptTarget = null;

  function triggerActivePrompt() {
    if (!activePromptTarget) return;
    if (activePromptTarget.type === 'pray') {
      performShrinePrayer(activePromptTarget.shrineId, false);
    } else if (activePromptTarget.type === 'mizuura') {
      openMizuuraExperience();
    } else if (activePromptTarget.type === 'musubibumi') {
      musubiModal.classList.add('is-open');
    }
  }

  promptEl.addEventListener('click', triggerActivePrompt);
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyE' && activePromptTarget) {
      triggerActivePrompt();
    }
  });

  // Toast Banner Helper
  const toastEl = document.getElementById('shrine-toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 4200);
  }

  // ============================================================================
  // INTERACTIVE KIFUNE VALLEY PRECINCT MINIMAP (貴船渓谷 境内図)
  // ============================================================================
  const mapCanvas = document.getElementById('minimap-canvas');
  const mapCtx = mapCanvas.getContext('2d');

  function worldToMinimap(wx, wz) {
    const w = mapCanvas.width;
    const h = mapCanvas.height;
    // North (-Z = -175) at TOP of map, South (+Z = +115) at BOTTOM of map!
    const ny = (wz - -175) / (115 - -175);
    const nx = (wx - -48) / (38 - -48);
    return {
      px: Math.max(8, Math.min(w - 8, nx * (w - 20) + 10)),
      py: Math.max(8, Math.min(h - 8, ny * (h - 20) + 10))
    };
  }

  mapCanvas.addEventListener('click', (e) => {
    const rect = mapCanvas.getBoundingClientRect();
    const cy = ((e.clientY - rect.top) / rect.height) * mapCanvas.height;
    // Map clicked Y to world Z and fly to closest preset!
    const clickedZ = -175 + ((cy - 10) / (mapCanvas.height - 20)) * (115 - -175);
    let best = CAMERA_PRESETS[0];
    let bestDist = Infinity;
    CAMERA_PRESETS.forEach((p) => {
      const d = Math.abs(p.target[2] - clickedZ);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    });
    selectPreset(best);
    navigation.flyToPreset(best, 1.6);
  });

  function drawMinimap(camera) {
    const w = mapCanvas.width;
    const h = mapCanvas.height;
    mapCtx.clearRect(0, 0, w, h);

    // Subtle sumi map background
    mapCtx.fillStyle = 'rgba(16, 20, 22, 0.72)';
    mapCtx.fillRect(0, 0, w, h);

    // Draw Kibune River ribbon
    mapCtx.strokeStyle = '#3b8c94';
    mapCtx.lineWidth = 4.5;
    mapCtx.beginPath();
    for (let z = -170; z <= 112; z += 8) {
      const pt = worldToMinimap(getRiverCenterX(z), z);
      if (z === -170) mapCtx.moveTo(pt.px, pt.py);
      else mapCtx.lineTo(pt.px, pt.py);
    }
    mapCtx.stroke();

    // Draw Pilgrimage Street
    mapCtx.strokeStyle = 'rgba(210, 202, 184, 0.45)';
    mapCtx.lineWidth = 2;
    mapCtx.beginPath();
    for (let z = -120; z <= 110; z += 8) {
      const pt = worldToMinimap(getRoadCenterX(z), z);
      if (z === -120) mapCtx.moveTo(pt.px, pt.py);
      else mapCtx.lineTo(pt.px, pt.py);
    }
    mapCtx.stroke();

    // Draw 3 Sacred Shrine Precinct Zones (奥宮, 結社, 本宮)
    const zones = [
      { label: '奥宮', x: -8, z: -140, color: '#d84532' },
      { label: '結社', x: -25, z: -40, color: '#78b884' },
      { label: '本宮', x: -24, z: 24, color: '#e0523c' },
      { label: '二ノ鳥居', x: -1, z: 70, color: '#d99c48' }
    ];
    zones.forEach((zn) => {
      const p = worldToMinimap(zn.x, zn.z);
      mapCtx.fillStyle = zn.color;
      mapCtx.beginPath();
      mapCtx.arc(p.px, p.py, 4.2, 0, Math.PI * 2);
      mapCtx.fill();

      mapCtx.fillStyle = '#efe9dc';
      mapCtx.font = '600 10px "Noto Serif JP", "Noto Serif SC", sans-serif';
      mapCtx.fillText(zn.label, p.px - 28, p.py + 3);
    });

    // Draw Live Camera Position & View Cone!
    const camPt = worldToMinimap(camera.position.x, camera.position.z);
    const dirX = -Math.sin(camera.rotation.y);
    const dirZ = -Math.cos(camera.rotation.y);
    const angle = Math.atan2(dirZ, dirX);

    mapCtx.fillStyle = 'rgba(245, 205, 105, 0.28)';
    mapCtx.beginPath();
    mapCtx.moveTo(camPt.px, camPt.py);
    mapCtx.arc(camPt.px, camPt.py, 16, angle - 0.45, angle + 0.45);
    mapCtx.closePath();
    mapCtx.fill();

    mapCtx.fillStyle = '#ffd56b';
    mapCtx.beginPath();
    mapCtx.arc(camPt.px, camPt.py, 3.8, 0, Math.PI * 2);
    mapCtx.fill();
  }

  function update(camera, interactiveTargets) {
    drawMinimap(camera);

    // Check proximity to interactive rituals (Hongu/Yui/Okumiya Haiden, Mizuura-Yuniwa, Musubibumi)
    let closest = null;
    let minD = 12.5;
    for (const target of interactiveTargets) {
      const d = camera.position.distanceTo(target.position);
      if (d < minD) {
        minD = d;
        closest = target;
      }
    }
    activePromptTarget = closest;
    if (closest) {
      promptTextEl.textContent = `${closest.label} [クリック / E]`;
      promptEl.classList.add('is-visible');
    } else {
      promptEl.classList.remove('is-visible');
    }
  }

  return {
    selectPreset,
    openMizuuraExperience,
    performShrinePrayer,
    showToast,
    update
  };
}
