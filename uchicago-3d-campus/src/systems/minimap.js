import * as THREE from 'three';
import { LANDMARKS, STREETS_NS, STREETS_EW } from '../data/campusData.js';

export function createMinimap(canvas, onMapClick) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // World bounds mapped to radar canvas
  const X_MIN = -480;
  const X_MAX = 780;
  const Z_MIN = -700;
  const Z_MAX = 660;

  const toMapX = (wx) => ((wx - X_MIN) / (X_MAX - X_MIN)) * W;
  const toMapY = (wz) => ((wz - Z_MIN) / (Z_MAX - Z_MIN)) * H;
  const toWorldX = (mx) => X_MIN + (mx / W) * (X_MAX - X_MIN);
  const toWorldZ = (my) => Z_MIN + (my / H) * (Z_MAX - Z_MIN);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;
    if (onMapClick) onMapClick(toWorldX(mx), toWorldZ(my));
  });

  const dirVec = new THREE.Vector3();

  function render(camera, activeId, hoveredId) {
    ctx.clearRect(0, 0, W, H);

    // Base Hyde Park ground
    ctx.fillStyle = '#1b201d';
    ctx.fillRect(0, 0, W, H);

    // Main Quadrangles Botanic Green highlight
    const qx = toMapX(-82);
    const qy = toMapY(-230);
    const qw = toMapX(128) - qx;
    const qh = toMapY(210) - qy;
    ctx.fillStyle = 'rgba(78, 120, 68, 0.35)';
    ctx.fillRect(qx, qy, qw, qh);

    // Midway Plaisance green boulevard band
    const my0 = toMapY(210);
    const my1 = toMapY(410);
    ctx.fillStyle = 'rgba(72, 118, 64, 0.42)';
    ctx.fillRect(0, my0, toMapX(700), my1 - my0);

    // Lake Michigan water edge on right
    const lx = toMapX(730);
    ctx.fillStyle = 'rgba(38, 96, 132, 0.55)';
    ctx.fillRect(lx, 0, W - lx, H);

    // Street Grid
    ctx.strokeStyle = 'rgba(216, 207, 191, 0.22)';
    ctx.lineWidth = 1;
    for (const st of STREETS_NS) {
      const sx = toMapX(st.x);
      const y0 = toMapY(st.zMin ?? Z_MIN);
      const y1 = toMapY(st.zMax ?? Z_MAX);
      ctx.beginPath();
      ctx.moveTo(sx, y0);
      ctx.lineTo(sx, y1);
      ctx.stroke();
    }
    for (const st of STREETS_EW) {
      const sy = toMapY(st.z);
      const x0 = toMapX(st.xMin ?? X_MIN);
      const x1 = toMapX(st.xMax ?? X_MAX);
      ctx.beginPath();
      ctx.moveTo(x0, sy);
      ctx.lineTo(x1, sy);
      ctx.stroke();
    }

    // Building Footprints
    for (const lm of LANDMARKS) {
      if (lm.id === 'midway') continue;
      const cx = toMapX(lm.pos[0]);
      const cy = toMapY(lm.pos[2]);
      const bw = Math.max(3.5, (lm.footprint[0] / (X_MAX - X_MIN)) * W);
      const bh = Math.max(3.5, (lm.footprint[1] / (Z_MAX - Z_MIN)) * H);

      const isSel = lm.id === activeId;
      const isHov = lm.id === hoveredId;

      ctx.fillStyle = isSel
        ? '#b81d2c'
        : isHov
          ? '#e5b96e'
          : lm.featured
            ? '#dfd6c5'
            : 'rgba(205, 196, 180, 0.62)';
      ctx.fillRect(cx - bw * 0.5, cy - bh * 0.5, bw, bh);
    }

    // Camera Viewing Frustum Cone & Position Dot
    const camX = THREE.MathUtils.clamp(toMapX(camera.position.x), 4, W - 4);
    const camY = THREE.MathUtils.clamp(toMapY(camera.position.z), 4, H - 4);
    camera.getWorldDirection(dirVec);
    const heading = Math.atan2(dirVec.z, dirVec.x);

    ctx.save();
    ctx.translate(camX, camY);
    ctx.rotate(heading);
    ctx.fillStyle = 'rgba(232, 190, 112, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 26, -0.48, 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f2c97d';
    ctx.strokeStyle = '#800000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(camX, camY, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Key Street Axis Labels
    ctx.fillStyle = 'rgba(229, 221, 206, 0.68)';
    ctx.font = '9px monospace';
    ctx.fillText('55TH', 4, toMapY(-650) - 2);
    ctx.fillText('57TH', 4, toMapY(-230) - 2);
    ctx.fillText('MIDWAY', 4, toMapY(315));
    ctx.fillText('ELLIS', toMapX(-82) + 2, 10);
    ctx.fillText('LAKE', W - 28, H - 6);
  }

  return { render };
}
