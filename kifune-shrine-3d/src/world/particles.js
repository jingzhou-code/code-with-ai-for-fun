import * as THREE from 'three';
import { getRiverCenterX, getRiverWaterY } from './terrain.js';
import { VALLEY_CONFIG } from '../data/landmarks.js';

function createSoftCircleTexture(innerHex = '#ffffff', outerRgba = 'rgba(255,255,255,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, innerHex);
  g.addColorStop(0.45, innerHex);
  g.addColorStop(1, outerRgba);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAtmosphericParticles() {
  const group = new THREE.Group();
  group.name = 'KifuneAtmosphericParticles';

  const softDotTex = createSoftCircleTexture('#ffffff', 'rgba(255,255,255,0)');
  const fireflyTex = createSoftCircleTexture('#e8ff7a', 'rgba(180,255,60,0)');

  // 1. Falling Autumn Momiji Leaves / Spring Petals (follows camera region)
  const leafCount = 320;
  const leafPos = new Float32Array(leafCount * 3);
  const leafSeed = new Float32Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    leafPos[i * 3] = (Math.random() - 0.5) * 70;
    leafPos[i * 3 + 1] = Math.random() * 26;
    leafPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    leafSeed[i] = Math.random() * 100;
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  const leafMat = new THREE.PointsMaterial({
    size: 0.34,
    map: softDotTex,
    color: 0xd93b22,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const leafPoints = new THREE.Points(leafGeo, leafMat);
  group.add(leafPoints);

  // 2. Winter Snowflakes (follows camera region)
  const snowCount = 750;
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 85;
    snowPos[i * 3 + 1] = Math.random() * 32;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 85;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    size: 0.28,
    map: softDotTex,
    color: 0xf5f9ff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.visible = false;
  group.add(snowPoints);

  // 3. Sacred Rain Streaks (LineSegments following camera region)
  const rainCount = 900;
  const rainVerts = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * 75;
    const ry = Math.random() * 30;
    const rz = (Math.random() - 0.5) * 75;
    rainVerts[i * 6] = rx;
    rainVerts[i * 6 + 1] = ry;
    rainVerts[i * 6 + 2] = rz;
    rainVerts[i * 6 + 3] = rx - 0.08;
    rainVerts[i * 6 + 4] = ry - 1.15;
    rainVerts[i * 6 + 5] = rz;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainVerts, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xbdd6eb,
    transparent: true,
    opacity: 0.42
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  group.add(rainLines);

  // 4. Golden Genji Fireflies (源氏蛍) along Kibune River, Hotaru-iwa, Yui-no-Yashiro & Omoi-gawa!
  const ffCount = 220;
  const ffBase = [];
  const ffPos = new Float32Array(ffCount * 3);
  for (let i = 0; i < ffCount; i++) {
    let bx, by, bz;
    if (i < 150) {
      bz = -95 + Math.random() * 205;
      bx = getRiverCenterX(bz) + (Math.random() - 0.5) * 9.5;
      by = getRiverWaterY(bz) + 0.4 + Math.random() * 2.2;
    } else if (i < 190) {
      // Around Izumi Shikibu's Waka Monument at Yui-no-Yashiro!
      bx = -29.0 + (Math.random() - 0.5) * 10.0;
      bz = -36.0 + (Math.random() - 0.5) * 10.0;
      by = VALLEY_CONFIG.yuiY + 0.5 + Math.random() * 2.4;
    } else {
      // Omoi-gawa purification stream
      bx = -14 + Math.random() * 18;
      bz = -84 + (Math.random() - 0.5) * 5;
      by = 5.4 + Math.random() * 2.0;
    }
    ffBase.push({ bx, by, bz, phase: Math.random() * Math.PI * 2 });
    ffPos[i * 3] = bx;
    ffPos[i * 3 + 1] = by;
    ffPos[i * 3 + 2] = bz;
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    size: 0.46,
    map: fireflyTex,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const fireflyPoints = new THREE.Points(ffGeo, ffMat);
  fireflyPoints.visible = false;
  group.add(fireflyPoints);

  // 5. Okumiya Ryuketsu (龍穴) Sacred Spiritual Mist rising gently beneath Okumiya Honden!
  const ryuCount = 90;
  const ryuPos = new Float32Array(ryuCount * 3);
  for (let i = 0; i < ryuCount; i++) {
    const a = (i / ryuCount) * Math.PI * 2;
    const r = 1.2 + Math.random() * 3.4;
    ryuPos[i * 3] = -6.0 + Math.cos(a) * r;
    ryuPos[i * 3 + 1] = VALLEY_CONFIG.okumiyaY + Math.random() * 5.0;
    ryuPos[i * 3 + 2] = -153.5 + Math.sin(a) * r;
  }
  const ryuGeo = new THREE.BufferGeometry();
  ryuGeo.setAttribute('position', new THREE.BufferAttribute(ryuPos, 3));
  const ryuMat = new THREE.PointsMaterial({
    size: 0.85,
    map: softDotTex,
    color: 0x9de6e8,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ryuketsuPoints = new THREE.Points(ryuGeo, ryuMat);
  group.add(ryuketsuPoints);

  let currentSeason = 'autumn';
  let currentTimeMode = 'dusk';
  let isRaining = false;

  function configure({ season, timeMode, rain }) {
    currentSeason = season;
    currentTimeMode = timeMode;
    isRaining = rain;

    leafPoints.visible = season === 'autumn' || season === 'spring';
    leafMat.color.setHex(season === 'autumn' ? 0xd9381e : 0xa5e06c);
    leafMat.size = season === 'autumn' ? 0.35 : 0.25;

    snowPoints.visible = season === 'winter';
    rainLines.visible = Boolean(rain) && season !== 'winter';

    const isDark = timeMode === 'dusk' || timeMode === 'night';
    fireflyPoints.visible = season === 'summer' || (isDark && season !== 'winter');
    ryuMat.opacity = isDark ? 0.36 : 0.16;
  }

  function update(dt, elapsed, cameraPos) {
    // Update drifting leaves around camera
    if (leafPoints.visible) {
      const p = leafGeo.attributes.position;
      for (let i = 0; i < leafCount; i++) {
        let x = p.getX(i) + Math.sin(elapsed * 1.2 + leafSeed[i]) * dt * 0.65;
        let y = p.getY(i) - dt * 1.15;
        let z = p.getZ(i) + Math.cos(elapsed * 0.9 + leafSeed[i]) * dt * 0.55;

        if (y < cameraPos.y - 6) y = cameraPos.y + 18;
        if (x < cameraPos.x - 35) x += 70;
        if (x > cameraPos.x + 35) x -= 70;
        if (z < cameraPos.z - 35) z += 70;
        if (z > cameraPos.z + 35) z -= 70;

        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }

    // Update falling winter snow around camera
    if (snowPoints.visible) {
      const p = snowGeo.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        let x = p.getX(i) + Math.sin(elapsed * 0.8 + i) * dt * 0.4;
        let y = p.getY(i) - dt * 2.1;
        let z = p.getZ(i) + Math.cos(elapsed * 0.7 + i * 0.5) * dt * 0.35;

        if (y < cameraPos.y - 8) y = cameraPos.y + 22;
        if (x < cameraPos.x - 42) x += 84;
        if (x > cameraPos.x + 42) x -= 84;
        if (z < cameraPos.z - 42) z += 84;
        if (z > cameraPos.z + 42) z -= 84;

        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }

    // Update rain streaks around camera
    if (rainLines.visible) {
      const p = rainGeo.attributes.position;
      for (let i = 0; i < rainCount; i++) {
        let x = p.getX(i * 2) - dt * 1.2;
        let y = p.getY(i * 2) - dt * 22.0;
        let z = p.getZ(i * 2);

        if (y < cameraPos.y - 8) {
          y = cameraPos.y + 22;
          x = cameraPos.x + (Math.random() - 0.5) * 70;
          z = cameraPos.z + (Math.random() - 0.5) * 70;
        }
        p.setXYZ(i * 2, x, y, z);
        p.setXYZ(i * 2 + 1, x - 0.08, y - 1.18, z);
      }
      p.needsUpdate = true;
    }

    // Update bioluminescent Fireflies
    if (fireflyPoints.visible) {
      const p = ffGeo.attributes.position;
      for (let i = 0; i < ffCount; i++) {
        const b = ffBase[i];
        const x = b.bx + Math.sin(elapsed * 0.9 + b.phase) * 0.85;
        const y = b.by + Math.sin(elapsed * 1.5 + b.phase * 1.7) * 0.42;
        const z = b.bz + Math.cos(elapsed * 0.8 + b.phase) * 0.85;
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
      ffMat.opacity = currentSeason === 'summer' && (currentTimeMode === 'dusk' || currentTimeMode === 'night')
        ? 0.95
        : 0.65 + Math.sin(elapsed * 2.5) * 0.2;
    }

    // Update Okumiya Ryuketsu spiritual rising aura
    const rp = ryuGeo.attributes.position;
    for (let i = 0; i < ryuCount; i++) {
      const angle = elapsed * 0.35 + (i / ryuCount) * Math.PI * 2;
      const rad = 1.4 + ((i * 7) % 10) * 0.26;
      let y = rp.getY(i) + dt * 0.52;
      if (y > VALLEY_CONFIG.okumiyaY + 6.5) y = VALLEY_CONFIG.okumiyaY + 0.2;
      rp.setXYZ(i, -6.0 + Math.cos(angle) * rad, y, -153.5 + Math.sin(angle) * rad);
    }
    rp.needsUpdate = true;
  }

  return { group, configure, update };
}
