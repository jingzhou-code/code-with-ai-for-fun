import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createNavigationController({
  camera,
  domElement,
  tourStops,
  getGroundHeight,
  onTourStopChange,
  onModeChange,
}) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.maxPolarAngle = Math.PI * 0.488;
  orbit.minDistance = 14;
  orbit.maxDistance = 1250;
  orbit.target.set(0, 18, 25);

  let mode = 'orbit'; // 'orbit' | 'walk' | 'tour'
  const keys = new Set();

  // Smooth Camera Tween State
  const tween = {
    active: false,
    elapsed: 0,
    duration: 1.6,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  };

  // First-Person Walk State
  const walkState = {
    yaw: 0,
    pitch: 0.06,
    dragging: false,
    lastX: 0,
    lastY: 0,
    eyeHeight: 1.85,
  };

  // Guided Tour State
  const tour = {
    index: 0,
    paused: false,
    dwellTimer: 0,
    dwellDuration: 8.5,
  };

  function flyTo(camPos, targetPos, duration = 1.65) {
    tween.active = true;
    tween.elapsed = 0;
    tween.duration = duration;
    tween.fromPos.copy(camera.position);
    tween.toPos.set(camPos[0], camPos[1], camPos[2]);
    tween.fromTarget.copy(orbit.target);
    tween.toTarget.set(targetPos[0], targetPos[1], targetPos[2]);
  }

  function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    tween.active = false;

    if (mode === 'orbit') {
      orbit.enabled = true;
      if (camera.position.y < 14) {
        camera.position.y = 48;
      }
    } else if (mode === 'walk') {
      orbit.enabled = false;
      // Place walker near current target or God Quad axis looking toward the Golden Dome
      const dist = Math.hypot(camera.position.x - orbit.target.x, camera.position.z - orbit.target.z);
      if (dist > 180) {
        camera.position.set(0, getGroundHeight(0, 138) + walkState.eyeHeight, 138);
        walkState.yaw = 0;
        walkState.pitch = 0.12;
      } else {
        const gy = getGroundHeight(camera.position.x, camera.position.z);
        camera.position.y = gy + walkState.eyeHeight;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        walkState.yaw = Math.atan2(-dir.x, -dir.z);
        walkState.pitch = THREE.MathUtils.clamp(Math.asin(dir.y), -0.65, 0.75);
      }
    } else if (mode === 'tour') {
      orbit.enabled = true;
      tour.paused = false;
      goToTourStop(tour.index);
    }

    onModeChange?.(mode);
  }

  function goToTourStop(idx) {
    tour.index = (idx + tourStops.length) % tourStops.length;
    tour.dwellTimer = 0;
    const stop = tourStops[tour.index];
    flyTo(stop.camPos, stop.lookAt, 2.2);
    onTourStopChange?.(stop, tour.index, tourStops.length, tour.paused);
  }

  function toggleTourPause() {
    tour.paused = !tour.paused;
    const stop = tourStops[tour.index];
    onTourStopChange?.(stop, tour.index, tourStops.length, tour.paused);
    return tour.paused;
  }

  // Keyboard Listeners
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code);
    if (e.code === 'Digit1') setMode('orbit');
    if (e.code === 'Digit2') setMode('walk');
    if (e.code === 'Digit3') setMode('tour');
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  // Mouse drag look in Walk mode (works seamlessly without requiring browser pointer-lock permission!)
  domElement.addEventListener('pointerdown', (e) => {
    if (mode === 'walk') {
      walkState.dragging = true;
      walkState.lastX = e.clientX;
      walkState.lastY = e.clientY;
    } else if (tween.active && mode === 'orbit') {
      tween.active = false;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (mode === 'walk' && walkState.dragging) {
      const dx = e.clientX - walkState.lastX;
      const dy = e.clientY - walkState.lastY;
      walkState.lastX = e.clientX;
      walkState.lastY = e.clientY;
      walkState.yaw -= dx * 0.0036;
      walkState.pitch = THREE.MathUtils.clamp(walkState.pitch - dy * 0.003, -0.85, 0.92);
    }
  });

  window.addEventListener('pointerup', () => {
    walkState.dragging = false;
  });

  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  function update(delta) {
    // 1. Active Smooth Camera Flight
    if (tween.active) {
      tween.elapsed += delta;
      const t = Math.min(1, tween.elapsed / tween.duration);
      const ease = 1 - Math.pow(1 - t, 3.2);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, ease);
      orbit.target.lerpVectors(tween.fromTarget, tween.toTarget, ease);
      if (mode === 'walk') {
        camera.lookAt(orbit.target);
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        walkState.yaw = Math.atan2(-dir.x, -dir.z);
        walkState.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.9, 0.9));
      } else {
        orbit.update();
      }
      if (t >= 1) {
        tween.active = false;
      }
      return;
    }

    // 2. Guided Cinematic Tour Mode
    if (mode === 'tour') {
      if (!tour.paused) {
        tour.dwellTimer += delta;
        // Subtle cinematic orbital drift around the landmark
        const offset = camera.position.clone().sub(orbit.target);
        offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, delta * 0.085);
        camera.position.copy(orbit.target).add(offset);
        if (tour.dwellTimer >= tour.dwellDuration) {
          goToTourStop(tour.index + 1);
        }
      }
      orbit.update();
      return;
    }

    // 3. First-Person Campus Walk Mode
    if (mode === 'walk') {
      const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.35 : 1.0;
      const speed = 22.0 * sprint * delta;

      forwardVec.set(-Math.sin(walkState.yaw), 0, -Math.cos(walkState.yaw));
      rightVec.set(Math.cos(walkState.yaw), 0, -Math.sin(walkState.yaw));

      if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.addScaledVector(forwardVec, speed);
      if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.addScaledVector(forwardVec, -speed);
      if (keys.has('KeyD') || keys.has('ArrowRight')) camera.position.addScaledVector(rightVec, speed);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) camera.position.addScaledVector(rightVec, -speed);

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -820, 820);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -620, 820);
      const groundY = getGroundHeight(camera.position.x, camera.position.z);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, groundY + walkState.eyeHeight, 0.25);

      euler.set(walkState.pitch, walkState.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      orbit.target.copy(camera.position).addScaledVector(forwardVec, 20);
      return;
    }

    // 4. Aerial Orbit / Free Drone Mode (+ WASD/QE glide)
    const panSpeed = (Math.max(35, camera.position.y * 0.95)) * delta;
    camera.getWorldDirection(forwardVec);
    forwardVec.y = 0;
    if (forwardVec.lengthSq() > 0.0001) forwardVec.normalize();
    rightVec.crossVectors(forwardVec, THREE.Object3D.DEFAULT_UP).normalize();

    const move = new THREE.Vector3();
    if (keys.has('KeyW') || keys.has('ArrowUp')) move.addScaledVector(forwardVec, panSpeed);
    if (keys.has('KeyS') || keys.has('ArrowDown')) move.addScaledVector(forwardVec, -panSpeed);
    if (keys.has('KeyD') || keys.has('ArrowRight')) move.addScaledVector(rightVec, panSpeed);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) move.addScaledVector(rightVec, -panSpeed);

    if (move.lengthSq() > 0) {
      camera.position.add(move);
      orbit.target.add(move);
    }
    if (keys.has('KeyE')) camera.position.y = Math.min(900, camera.position.y + panSpeed * 0.7);
    if (keys.has('KeyQ')) camera.position.y = Math.max(8, camera.position.y - panSpeed * 0.7);

    orbit.update();
  }

  return {
    orbit,
    flyTo,
    setMode,
    getMode: () => mode,
    goToTourStop,
    nextTourStop: () => goToTourStop(tour.index + 1),
    prevTourStop: () => goToTourStop(tour.index - 1),
    toggleTourPause,
    update,
  };
}
