import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getWalkableHeight } from '../world/terrain.js';
import { CAMERA_PRESETS, VALLEY_CONFIG } from '../data/landmarks.js';
import { clamp, lerp } from '../utils/noise.js';

export function createNavigationSystem({ camera, domElement, onPresetReached }) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.minPolarAngle = 0.12;
  orbit.maxPolarAngle = Math.PI * 0.85;
  orbit.minDistance = 1.8;
  orbit.maxDistance = 135;

  let mode = 'orbit'; // 'orbit' | 'walk' | 'tour'
  const keys = new Set();

  // Walk-mode state
  const walkPos = new THREE.Vector3(1.9, 3.3, 74.4);
  let walkYaw = 0.62;
  let walkPitch = 0.14;
  let isDraggingLook = false;
  let prevPointer = { x: 0, y: 0 };
  let stepBobPhase = 0;

  // Smooth camera transition tween
  let tween = null;

  // Guided Sansha-Mairi Tour state
  let tourIndex = 0;
  let tourHoldTimer = 0;

  // Ritual bow animation offset
  let bowTimer = -1;

  function flyToPreset(preset, duration = 1.9) {
    if (mode === 'walk') {
      walkPos.set(preset.pos[0], getWalkableHeight(preset.pos[0], preset.pos[2]) + 1.66, preset.pos[2]);
      const dx = preset.target[0] - preset.pos[0];
      const dz = preset.target[2] - preset.pos[2];
      const dy = preset.target[1] - preset.pos[1];
      walkYaw = Math.atan2(-dx, -dz);
      walkPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.65, 0.65);
      camera.fov = preset.fov || 48;
      camera.updateProjectionMatrix();
      if (onPresetReached) onPresetReached(preset);
      return;
    }

    tween = {
      elapsed: 0,
      duration,
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(...preset.pos),
      startTarget: orbit.target.clone(),
      endTarget: new THREE.Vector3(...preset.target),
      startFov: camera.fov,
      endFov: preset.fov || 48,
      preset
    };
  }

  function setMode(nextMode) {
    mode = nextMode;
    tween = null;

    if (mode === 'orbit') {
      orbit.enabled = true;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      orbit.target.copy(camera.position).addScaledVector(forward, 12);
    } else if (mode === 'walk') {
      orbit.enabled = false;
      walkPos.copy(camera.position);
      const groundY = getWalkableHeight(walkPos.x, walkPos.z);
      walkPos.y = groundY + 1.66;
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      walkYaw = euler.y;
      walkPitch = clamp(euler.x, -0.75, 0.75);
    } else if (mode === 'tour') {
      orbit.enabled = false;
      tourIndex = 0;
      tourHoldTimer = 0;
      flyToPreset(CAMERA_PRESETS[0], 2.4);
    }
  }

  function triggerRitualBow(lookTarget) {
    bowTimer = 0;
    if (lookTarget && mode === 'orbit') {
      orbit.target.lerp(new THREE.Vector3(...lookTarget), 0.6);
    }
  }

  // Keyboard & Pointer Listeners for Seamless Walk Mode
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  domElement.addEventListener('pointerdown', (e) => {
    if (mode === 'walk') {
      isDraggingLook = true;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
    } else if (mode === 'tour') {
      // Clicking viewport exits auto-tour gracefully into Orbit mode
      setMode('orbit');
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (mode === 'walk' && isDraggingLook) {
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      walkYaw -= dx * 0.0032;
      walkPitch = clamp(walkPitch - dy * 0.0028, -0.82, 0.82);
    }
  });

  window.addEventListener('pointerup', () => {
    isDraggingLook = false;
  });

  function update(dt) {
    // Handle camera fly-to tween
    if (tween) {
      tween.elapsed += dt;
      const rawT = clamp(tween.elapsed / tween.duration, 0, 1);
      // Quintic smoothstep
      const ease = rawT * rawT * rawT * (rawT * (rawT * 6 - 15) + 10);

      camera.position.lerpVectors(tween.startPos, tween.endPos, ease);
      orbit.target.lerpVectors(tween.startTarget, tween.endTarget, ease);
      camera.fov = lerp(tween.startFov, tween.endFov, ease);
      camera.updateProjectionMatrix();
      camera.lookAt(orbit.target);

      if (rawT >= 1) {
        const finishedPreset = tween.preset;
        tween = null;
        if (onPresetReached && finishedPreset) onPresetReached(finishedPreset);
      }
    } else if (mode === 'orbit') {
      // Allow WASD gentle panning even in Orbit mode for effortless exploration!
      const panSpeed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 22 : 11) * dt;
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() > 0.001) fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(fwd);
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(fwd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);

      if (move.lengthSq() > 0.001) {
        move.normalize().multiplyScalar(panSpeed);
        camera.position.add(move);
        orbit.target.add(move);
      }
      orbit.update();
      const minOrbitY = getWalkableHeight(camera.position.x, camera.position.z) + 0.45;
      if (camera.position.y < minOrbitY) {
        camera.position.y = minOrbitY;
        camera.lookAt(orbit.target);
      }
    } else if (mode === 'walk') {
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9.2 : 4.8) * dt;
      const forward = new THREE.Vector3(-Math.sin(walkYaw), 0, -Math.cos(walkYaw));
      const right = new THREE.Vector3(Math.cos(walkYaw), 0, -Math.sin(walkYaw));

      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(forward);
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(forward);
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);

      let headBob = 0;
      if (move.lengthSq() > 0.001) {
        move.normalize().multiplyScalar(speed);
        walkPos.x = clamp(walkPos.x + move.x, VALLEY_CONFIG.xMin + 8, VALLEY_CONFIG.xMax - 8);
        walkPos.z = clamp(walkPos.z + move.z, VALLEY_CONFIG.zMin + 8, VALLEY_CONFIG.zMax - 8);
        stepBobPhase += dt * 9.5;
        headBob = Math.sin(stepBobPhase) * 0.045;
      }

      const targetEyeY = getWalkableHeight(walkPos.x, walkPos.z) + 1.66 + headBob;
      walkPos.y = lerp(walkPos.y, targetEyeY, Math.min(1, dt * 12));

      camera.position.copy(walkPos);
      const euler = new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    } else if (mode === 'tour') {
      // Hold gently with subtle cinematic drift, then glide to next landmark
      tourHoldTimer += dt;
      camera.position.x += Math.sin(tourHoldTimer * 0.5) * dt * 0.22;
      camera.lookAt(orbit.target);
      if (tourHoldTimer > 4.8) {
        tourHoldTimer = 0;
        tourIndex = (tourIndex + 1) % CAMERA_PRESETS.length;
        flyToPreset(CAMERA_PRESETS[tourIndex], 3.4);
      }
    }

    // Apply Nirei-Nihakushu-Ichirei (二礼二拍手一礼) respectful bow pitch curve when praying!
    if (bowTimer >= 0) {
      bowTimer += dt;
      let bowAngle = 0;
      // Bow 1 (0..0.9s), Bow 2 (1.0..1.9s), Two Claps (2.0..2.9s), Final Bow (3.1..4.0s)
      if (bowTimer < 0.9) bowAngle = Math.sin((bowTimer / 0.9) * Math.PI) * 0.32;
      else if (bowTimer > 1.0 && bowTimer < 1.9) bowAngle = Math.sin(((bowTimer - 1.0) / 0.9) * Math.PI) * 0.32;
      else if (bowTimer > 3.1 && bowTimer < 4.0) bowAngle = Math.sin(((bowTimer - 3.1) / 0.9) * Math.PI) * 0.28;
      else if (bowTimer >= 4.1) bowTimer = -1;

      if (bowAngle > 0) {
        camera.rotateX(-bowAngle);
      }
    }
  }

  return {
    orbit,
    flyToPreset,
    setMode,
    getMode: () => mode,
    triggerRitualBow,
    update
  };
}
