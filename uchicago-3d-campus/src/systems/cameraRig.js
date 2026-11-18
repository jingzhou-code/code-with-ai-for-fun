import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUIDED_TOUR_STOPS, LANDMARKS } from '../data/campusData.js';

export function createCameraRig(camera, domElement, callbacks = {}) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.maxPolarAngle = Math.PI * 0.488;
  orbit.minDistance = 12;
  orbit.maxDistance = 1150;
  orbit.screenSpacePanning = false;

  // Initial Hero Vista: Sweeping panorama of Midway Plaisance, Main Quads, Harper, Rockefeller, Mansueto, Skyline & Lake Michigan!
  camera.position.set(-78, 148, 372);
  orbit.target.set(52, 10, 12);
  orbit.update();

  let mode = 'orbit'; // 'orbit' | 'walk' | 'tour'
  const keys = new Set();

  // First-person walk state
  let walkYaw = 0;
  let walkPitch = 0.04;
  let isDraggingLook = false;
  let prevMouse = { x: 0, y: 0 };

  // Smooth fly-to state
  let flyAnim = null;

  // Guided tour state
  let tourIndex = 0;
  let tourElapsed = 0;
  const tourFromPos = new THREE.Vector3();
  const tourFromLook = new THREE.Vector3();

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  domElement.addEventListener('pointerdown', (e) => {
    if (mode === 'walk') {
      isDraggingLook = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (mode === 'walk' && isDraggingLook) {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };
      walkYaw -= dx * 0.0032;
      walkPitch = THREE.MathUtils.clamp(walkPitch - dy * 0.0026, -0.75, 0.85);
    }
  });
  window.addEventListener('pointerup', () => {
    isDraggingLook = false;
  });

  function setMode(nextMode) {
    mode = nextMode;
    flyAnim = null;

    if (mode === 'orbit') {
      orbit.enabled = true;
      if (camera.position.y < 14) {
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        orbit.target.copy(camera.position).addScaledVector(fwd, 45);
        orbit.target.y = 4;
        camera.position.y = 48;
      }
      orbit.update();
    } else if (mode === 'walk') {
      orbit.enabled = false;
      // Drop into Main Quad near Flagpole / Cobb Hall if currently high in the sky
      if (camera.position.y > 24) {
        camera.position.set(22, 1.85, 38);
        walkYaw = 0;
        walkPitch = 0.06;
      } else {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        walkYaw = Math.atan2(-dir.x, -dir.z);
        walkPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.7, 0.7));
        camera.position.y = 1.85;
      }
    } else if (mode === 'tour') {
      orbit.enabled = false;
      startTourStop(0);
    }

    if (callbacks.onModeChange) callbacks.onModeChange(mode);
  }

  function startTourStop(idx) {
    tourIndex = ((idx % GUIDED_TOUR_STOPS.length) + GUIDED_TOUR_STOPS.length) % GUIDED_TOUR_STOPS.length;
    tourElapsed = 0;
    tourFromPos.copy(camera.position);
    tourFromLook.copy(orbit.target);
    const stop = GUIDED_TOUR_STOPS[tourIndex];
    const lm = LANDMARKS.find((l) => l.id === stop.landmarkId);
    if (callbacks.onTourStop) callbacks.onTourStop(stop, lm, tourIndex, GUIDED_TOUR_STOPS.length);
  }

  function nextTourStop(delta = 1) {
    if (mode !== 'tour') setMode('tour');
    startTourStop(tourIndex + delta);
  }

  function flyToPoint(x, z, offset = [0, 58, 92], targetY = 10) {
    if (mode === 'tour') {
      mode = 'orbit';
      orbit.enabled = true;
      if (callbacks.onModeChange) callbacks.onModeChange('orbit');
    }

    if (mode === 'walk') {
      camera.position.set(x + Math.sign(offset[0] || 1) * 26, 1.85, z + Math.sign(offset[2] || 1) * 26);
      walkYaw = Math.atan2(-(x - camera.position.x), -(z - camera.position.z));
      walkPitch = 0.08;
      return;
    }

    flyAnim = {
      elapsed: 0,
      duration: 1.45,
      startPos: camera.position.clone(),
      startTarget: orbit.target.clone(),
      endTarget: new THREE.Vector3(x, targetY, z),
      endPos: new THREE.Vector3(x + offset[0], offset[1], z + offset[2])
    };
  }

  function flyToLandmark(lm) {
    if (!lm) return;
    flyToPoint(lm.pos[0], lm.pos[2], lm.camOffset || [45, 42, 65], 11);
  }

  function resetOverview() {
    if (mode !== 'orbit') setMode('orbit');
    flyAnim = {
      elapsed: 0,
      duration: 1.6,
      startPos: camera.position.clone(),
      startTarget: orbit.target.clone(),
      endTarget: new THREE.Vector3(52, 10, 12),
      endPos: new THREE.Vector3(-78, 148, 372)
    };
  }

  function update(dt) {
    if (flyAnim) {
      flyAnim.elapsed += dt;
      const rawT = Math.min(1, flyAnim.elapsed / flyAnim.duration);
      const ease = 1 - Math.pow(1 - rawT, 3);
      camera.position.lerpVectors(flyAnim.startPos, flyAnim.endPos, ease);
      orbit.target.lerpVectors(flyAnim.startTarget, flyAnim.endTarget, ease);
      orbit.update();
      if (rawT >= 1) flyAnim = null;
      return;
    }

    if (mode === 'orbit') {
      // Allow smooth WASD / Arrow panning even in Orbit mode!
      const panSpeed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 165 : 85) * dt;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(forward);
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(forward);
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(panSpeed);
        camera.position.add(move);
        orbit.target.add(move);
      }
      orbit.update();
    } else if (mode === 'walk') {
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 32 : 14) * dt;
      if (keys.has('ArrowLeft')) walkYaw += 1.5 * dt;
      if (keys.has('ArrowRight')) walkYaw -= 1.5 * dt;

      const fwd = new THREE.Vector3(-Math.sin(walkYaw), 0, -Math.cos(walkYaw));
      const right = new THREE.Vector3(Math.cos(walkYaw), 0, -Math.sin(walkYaw));

      if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.addScaledVector(fwd, speed);
      if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.addScaledVector(fwd, -speed);
      if (keys.has('KeyD')) camera.position.addScaledVector(right, speed);
      if (keys.has('KeyA')) camera.position.addScaledVector(right, -speed);

      // Ground height adaptation (sunken Midway Plaisance vs street/quad level)
      const inMidwayBowl = camera.position.z > 255 && camera.position.z < 365;
      const targetEyeY = inMidwayBowl ? 0.72 : 1.9;
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetEyeY, Math.min(1, dt * 8));

      const euler = new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    } else if (mode === 'tour') {
      const stop = GUIDED_TOUR_STOPS[tourIndex];
      tourElapsed += dt;
      const t = Math.min(1, tourElapsed / stop.duration);
      const smooth = t < 0.28 ? 1 - Math.pow(1 - t / 0.28, 3) : 1;

      const targetCam = new THREE.Vector3(...stop.camPos);
      const targetLook = new THREE.Vector3(...stop.lookAt);

      // Gentle cinematic drift once arrived at keyframe
      const driftAngle = tourElapsed * 0.22;
      targetCam.x += Math.sin(driftAngle) * 8;
      targetCam.z += Math.cos(driftAngle) * 6;

      camera.position.lerpVectors(tourFromPos, targetCam, smooth);
      orbit.target.lerpVectors(tourFromLook, targetLook, smooth);
      camera.lookAt(orbit.target);

      if (tourElapsed >= stop.duration) {
        startTourStop(tourIndex + 1);
      }
    }
  }

  return {
    update,
    setMode,
    getMode: () => mode,
    flyToLandmark,
    flyToPoint,
    resetOverview,
    nextTourStop,
    orbit
  };
}
