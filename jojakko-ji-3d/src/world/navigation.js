import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getGroundHeight, POND_SPEC } from './terrain.js';
import { clamp } from '../utils/noise.js';

export function createNavigationController(camera, domElement, landmarks) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.maxDistance = 165;
  orbit.minDistance = 2.5;
  orbit.maxPolarAngle = Math.PI * 0.492;
  orbit.target.set(-8, 12, 1);

  let mode = 'orbit'; // 'orbit' | 'walk'
  let autoTour = false;
  let tourTimer = 0;
  let currentLandmarkIndex = 0;

  // Smooth camera flight state
  const flight = {
    active: false,
    t: 0,
    duration: 2.2,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3()
  };

  // First-person pilgrim walk state
  const walk = {
    pos: new THREE.Vector3(72, 1.7, 0),
    yaw: Math.PI * 0.5, // Facing -X West toward Sanmon & Niomon
    pitch: 0.04,
    bobPhase: 0,
    dragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  };

  const keys = new Set();

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    walk.dragging = false;
  });

  // Drag-look in First-Person Walk Mode (works seamlessly in all browsers & preview panes)
  domElement.addEventListener('pointerdown', (e) => {
    if (mode === 'walk' && e.button === 0) {
      walk.dragging = true;
      walk.lastMouseX = e.clientX;
      walk.lastMouseY = e.clientY;
    } else if (flight.active && mode === 'orbit') {
      flight.active = false;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (mode === 'walk' && walk.dragging) {
      const dx = e.clientX - walk.lastMouseX;
      const dy = e.clientY - walk.lastMouseY;
      walk.lastMouseX = e.clientX;
      walk.lastMouseY = e.clientY;
      walk.yaw -= dx * 0.0042;
      walk.pitch = clamp(walk.pitch - dy * 0.0036, -Math.PI * 0.42, Math.PI * 0.44);
    }
  });

  window.addEventListener('pointerup', () => {
    walk.dragging = false;
  });

  function flyToLandmark(index, onLandmarkChange) {
    const idx = ((index % landmarks.length) + landmarks.length) % landmarks.length;
    currentLandmarkIndex = idx;
    const lm = landmarks[idx];

    if (mode === 'walk') {
      const [wx, wz] = lm.walkSpawn || [lm.cameraPos[0], lm.cameraPos[2]];
      walk.pos.set(wx, getGroundHeight(wx, wz) + 1.68, wz);
      walk.yaw = lm.walkYaw !== undefined ? lm.walkYaw : Math.PI * 0.5;
      walk.pitch = 0.05;
    } else {
      flight.active = true;
      flight.t = 0;
      const dist = camera.position.distanceTo(new THREE.Vector3(...lm.cameraPos));
      flight.duration = clamp(1.35 + dist * 0.018, 1.4, 2.9);
      flight.startPos.copy(camera.position);
      flight.endPos.set(...lm.cameraPos);
      flight.startTarget.copy(orbit.target);
      flight.endTarget.set(...lm.cameraTarget);
    }

    tourTimer = 0;
    if (onLandmarkChange) onLandmarkChange(lm, idx);
  }

  function setMode(nextMode) {
    if (nextMode === mode) return mode;
    mode = nextMode;
    flight.active = false;

    if (mode === 'walk') {
      orbit.enabled = false;
      autoTour = false;
      const lm = landmarks[currentLandmarkIndex] || landmarks[1];
      const [wx, wz] = lm.walkSpawn || [70, 0];
      walk.pos.set(wx, getGroundHeight(wx, wz) + 1.68, wz);
      walk.yaw = lm.walkYaw !== undefined ? lm.walkYaw : Math.PI * 0.5;
      walk.pitch = 0.05;
      camera.rotation.order = 'YXZ';
    } else {
      orbit.enabled = true;
      // Smoothly transition OrbitControls target ahead of current gaze
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      orbit.target.copy(camera.position).addScaledVector(forward, 14);
      camera.position.y = Math.max(camera.position.y, getGroundHeight(camera.position.x, camera.position.z) + 2.5);
    }
    return mode;
  }

  function setAutoTour(enabled, onLandmarkChange) {
    autoTour = enabled;
    tourTimer = 0;
    if (autoTour && mode === 'walk') {
      setMode('orbit');
    }
    if (autoTour) {
      // If on 'overview', start pilgrimage from ① Sanmon!
      const startIdx = currentLandmarkIndex === 0 ? 1 : currentLandmarkIndex;
      flyToLandmark(startIdx, onLandmarkChange);
    }
    return autoTour;
  }

  function update(dt, onLandmarkChange) {
    if (mode === 'walk') {
      updateWalkMode(dt);
      return;
    }

    if (flight.active) {
      flight.t += dt / flight.duration;
      if (flight.t >= 1) {
        flight.t = 1;
        flight.active = false;
      }
      // Quintic smoothstep ease-in-out + gentle vertical arc so camera never clips trees
      const u = flight.t;
      const ease = u * u * u * (u * (u * 6 - 15) + 10);
      camera.position.lerpVectors(flight.startPos, flight.endPos, ease);
      const arcBoost = Math.sin(u * Math.PI) * Math.min(6.5, flight.startPos.distanceTo(flight.endPos) * 0.08);
      camera.position.y += arcBoost;
      orbit.target.lerpVectors(flight.startTarget, flight.endTarget, ease);
    } else if (autoTour) {
      // Gentle contemplative orbit around current landmark, then advance along pilgrimage route!
      tourTimer += dt;
      const offset = camera.position.clone().sub(orbit.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.075);
      camera.position.copy(orbit.target).add(offset);

      if (tourTimer > 9.0) {
        const nextIdx = currentLandmarkIndex + 1 >= landmarks.length ? 1 : currentLandmarkIndex + 1;
        flyToLandmark(nextIdx, onLandmarkChange);
      }
    }

    orbit.update();

    // Prevent Orbit camera from dipping underground on the steep Mt. Ogura slope
    const minGroundY = getGroundHeight(camera.position.x, camera.position.z) + 1.05;
    if (camera.position.y < minGroundY) {
      camera.position.y = minGroundY;
    }
  }

  function updateWalkMode(dt) {
    // Optional keyboard smooth turn with Q / E
    if (keys.has('KeyQ')) walk.yaw += 1.45 * dt;
    if (keys.has('KeyE')) walk.yaw -= 1.45 * dt;

    let moveForward = 0;
    let moveRight = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveForward += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveForward -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveRight += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveRight -= 1;

    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.2 : 4.4;

    if (moveForward !== 0 || moveRight !== 0) {
      const len = Math.hypot(moveForward, moveRight);
      moveForward /= len;
      moveRight /= len;

      const fwdX = -Math.sin(walk.yaw);
      const fwdZ = -Math.cos(walk.yaw);
      const rgtX = Math.cos(walk.yaw);
      const rgtZ = -Math.sin(walk.yaw);

      let nextX = walk.pos.x + (fwdX * moveForward + rgtX * moveRight) * speed * dt;
      let nextZ = walk.pos.z + (fwdZ * moveForward + rgtZ * moveRight) * speed * dt;

      // Keep pilgrim within temple & Mt. Ogura bounds and out of deep pond water
      nextX = clamp(nextX, -52, 82);
      nextZ = clamp(nextZ, -36, 36);

      const pdx = (nextX - POND_SPEC.cx) / (POND_SPEC.rx * 0.92);
      const pdz = (nextZ - POND_SPEC.cz) / (POND_SPEC.rz * 0.92);
      if (Math.hypot(pdx, pdz) < 1.0) {
        // Slide gracefully along pond shore
        const ang = Math.atan2(pdz, pdx);
        nextX = POND_SPEC.cx + Math.cos(ang) * POND_SPEC.rx * 0.94;
        nextZ = POND_SPEC.cz + Math.sin(ang) * POND_SPEC.rz * 0.94;
      }

      walk.pos.x = nextX;
      walk.pos.z = nextZ;
      walk.bobPhase += dt * (speed > 6 ? 11.5 : 7.8);
    } else {
      walk.bobPhase *= 0.9;
    }

    const targetY = getGroundHeight(walk.pos.x, walk.pos.z) + 1.68 + Math.sin(walk.bobPhase) * 0.042;
    walk.pos.y += (targetY - walk.pos.y) * Math.min(1, dt * 12);

    camera.position.copy(walk.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = walk.yaw;
    camera.rotation.x = walk.pitch;
    camera.rotation.z = 0;
  }

  return {
    orbit,
    flyToLandmark,
    setMode,
    getMode: () => mode,
    setAutoTour,
    isAutoTour: () => autoTour,
    getCurrentLandmarkIndex: () => currentLandmarkIndex,
    update
  };
}
