import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMPUS_BOUNDS, DRONE_TOUR_STOPS } from '../data/campusData.js';

/**
 * 四合一无缝漫游控制器：
 *   1. orbit : 沙盘鸟瞰（阻尼旋转缩放 + WASD/方向键平移 + 平滑飞行聚焦）
 *   2. walk  : 1.72m 第一人称漫步（拖拽环视 + WASD 行走 + Shift 慢跑）
 *   3. bike  : 1.95m 校园单车骑行（惯性加减速 + 轻微骑行律动，畅骑纬七路与智华楼桥洞）
 *   4. drone : 无人机环校十大经典机位自动航拍巡礼
 */
export class CampusNavigator {
  constructor(camera, domElement, callbacks = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.onModeChange = callbacks.onModeChange || (() => {});
    this.onTourStep = callbacks.onTourStep || (() => {});

    this.mode = 'orbit';
    this.keys = new Set();

    // OrbitControls
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.065;
    this.orbit.maxPolarAngle = Math.PI * 0.488;
    this.orbit.minDistance = 14;
    this.orbit.maxDistance = 1180;
    this.orbit.screenSpacePanning = false;

    // 初始机位：自淞沪路东南上空完整收纳一号门、碧波日湖、韶华大道、图书馆、法学楼与智华楼全景
    this.camera.position.set(605, 178, 205);
    this.orbit.target.set(112, 8, 42);
    this.orbit.update();

    // Walk / Bike 状态
    this.yaw = -Math.PI * 0.5;
    this.pitch = -0.04;
    this.velocity = new THREE.Vector3();
    this.walkBobPhase = 0;
    this.isDraggingLook = false;
    this.prevPointer = { x: 0, y: 0 };

    // 平滑相机飞行补间动画
    this.tween = null;

    // Drone 巡礼状态
    this.tourIndex = 0;
    this.tourElapsed = 0;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.code);
      if (e.code === 'Digit1') this.setMode('orbit');
      if (e.code === 'Digit2') this.setMode('walk');
      if (e.code === 'Digit3') this.setMode('bike');
      if (e.code === 'Digit4') this.setMode('drone');
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.domElement.addEventListener('pointerdown', (e) => {
      if (this.mode === 'walk' || this.mode === 'bike') {
        this.isDraggingLook = true;
        this.prevPointer.x = e.clientX;
        this.prevPointer.y = e.clientY;
      } else if (this.tween && this.mode === 'orbit') {
        this.tween = null;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDraggingLook || (this.mode !== 'walk' && this.mode !== 'bike')) return;
      const dx = e.clientX - this.prevPointer.x;
      const dy = e.clientY - this.prevPointer.y;
      this.prevPointer.x = e.clientX;
      this.prevPointer.y = e.clientY;

      this.yaw -= dx * 0.0032;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0026, -1.15, 1.15);
    });

    window.addEventListener('pointerup', () => {
      this.isDraggingLook = false;
    });
  }

  setMode(newMode, customStart = null) {
    if (this.mode === newMode && !customStart) return;
    this.mode = newMode;
    this.tween = null;
    this.velocity.set(0, 0, 0);

    if (newMode === 'orbit') {
      this.orbit.enabled = true;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      if (this.camera.position.y < 18) {
        this.orbit.target.set(
          this.camera.position.x + forward.x * 45,
          6,
          this.camera.position.z + forward.z * 45
        );
        this.camera.position.y = 75;
      }
    } else if (newMode === 'walk' || newMode === 'bike') {
      this.orbit.enabled = false;
      const eyeH = newMode === 'bike' ? 1.98 : 1.72;
      if (customStart) {
        this.camera.position.set(customStart.x, eyeH, customStart.z);
        this.yaw = customStart.yaw ?? 0;
        this.pitch = 0.03;
      } else if (this.camera.position.y > 12) {
        // 默认降落在智华楼桥洞北口或一号门韶华大道！
        if (newMode === 'bike') {
          this.camera.position.set(-20, eyeH, 212); // 正对智华楼三连拱桥洞，骑车向北穿越！
          this.yaw = 0; // 朝向 -Z 正北经二路
          this.pitch = 0.02;
        } else {
          this.camera.position.set(418, eyeH, 45); // 一号门内迎宾广场面向大草坪与日湖
          this.yaw = Math.PI * 0.5; // 朝向 -X 西侧中轴线
          this.pitch = 0.03;
        }
      } else {
        this.camera.position.y = eyeH;
      }
      this.applyFirstPersonRotation();
    } else if (newMode === 'drone') {
      this.orbit.enabled = false;
      this.tourIndex = 0;
      this.tourElapsed = 0;
      this.applyTourStop(0, true);
    }

    this.onModeChange(newMode);
  }

  applyFirstPersonRotation() {
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * 沙盘模式下平滑飞向指定地标或小地图坐标
   */
  flyToLandmark(lm) {
    if (this.mode !== 'orbit') {
      this.setMode('orbit');
    }
    const off = lm.viewOffset || { x: 68, y: 38, z: 68 };
    const endTarget = new THREE.Vector3(lm.x, Math.min(12, lm.h * 0.42), lm.z);
    const endPos = new THREE.Vector3(lm.x + off.x, off.y, lm.z + off.z);

    this.startTween(endPos, endTarget, 1.35);
  }

  flyToWorldPoint(wx, wz) {
    if (this.mode === 'walk' || this.mode === 'bike') {
      this.camera.position.set(wx, this.mode === 'bike' ? 1.98 : 1.72, wz);
      return;
    }
    if (this.mode !== 'orbit') {
      this.setMode('orbit');
    }
    const offset = this.camera.position.clone().sub(this.orbit.target);
    if (offset.length() > 260) {
      offset.setLength(165);
      offset.y = Math.max(55, offset.y * 0.65);
    }
    const endTarget = new THREE.Vector3(wx, 6, wz);
    const endPos = endTarget.clone().add(offset);
    this.startTween(endPos, endTarget, 1.0);
  }

  walkInFrontOf(lm) {
    const off = lm.viewOffset || { x: 45, y: 2, z: 45 };
    const dir = new THREE.Vector2(off.x, off.z).normalize();
    const dist = Math.max(lm.w, lm.d) * 0.58 + 16;
    const startX = lm.x + dir.x * dist;
    const startZ = lm.z + dir.y * dist;
    const yaw = Math.atan2(startX - lm.x, startZ - lm.z);
    this.setMode('walk', { x: startX, z: startZ, yaw });
  }

  startTween(endPos, endTarget, duration = 1.25) {
    this.tween = {
      startPos: this.camera.position.clone(),
      endPos,
      startTarget: this.orbit.target.clone(),
      endTarget,
      elapsed: 0,
      duration,
    };
  }

  nextTourStop() {
    if (this.mode !== 'drone') return;
    this.tourIndex = (this.tourIndex + 1) % DRONE_TOUR_STOPS.length;
    this.tourElapsed = 0;
    this.applyTourStop(this.tourIndex, false);
  }

  applyTourStop(idx, instant = false) {
    const stop = DRONE_TOUR_STOPS[idx];
    this.onTourStep(stop, idx, DRONE_TOUR_STOPS.length);
    if (instant) {
      this.camera.position.set(stop.camPos.x, stop.camPos.y, stop.camPos.z);
      this.camera.lookAt(stop.lookAt.x, stop.lookAt.y, stop.lookAt.z);
      this.currentDroneLook = new THREE.Vector3(stop.lookAt.x, stop.lookAt.y, stop.lookAt.z);
    } else {
      this.droneTransition = {
        fromPos: this.camera.position.clone(),
        toPos: new THREE.Vector3(stop.camPos.x, stop.camPos.y, stop.camPos.z),
        fromLook: this.currentDroneLook
          ? this.currentDroneLook.clone()
          : new THREE.Vector3(0, 10, 0),
        toLook: new THREE.Vector3(stop.lookAt.x, stop.lookAt.y, stop.lookAt.z),
        t: 0,
      };
    }
  }

  update(dt) {
    if (this.mode === 'orbit') {
      this.updateOrbit(dt);
    } else if (this.mode === 'walk' || this.mode === 'bike') {
      this.updateFirstPerson(dt);
    } else if (this.mode === 'drone') {
      this.updateDrone(dt);
    }
  }

  updateOrbit(dt) {
    if (this.tween) {
      this.tween.elapsed += dt;
      const rawT = Math.min(1, this.tween.elapsed / this.tween.duration);
      const ease = 1 - Math.pow(1 - rawT, 3);
      this.camera.position.lerpVectors(this.tween.startPos, this.tween.endPos, ease);
      this.orbit.target.lerpVectors(this.tween.startTarget, this.tween.endTarget, ease);
      if (rawT >= 1) this.tween = null;
    } else {
      // 支持 WASD / 方向键在沙盘模式下丝滑平移观察
      const panSpeed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 190 : 95) * dt;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const delta = new THREE.Vector3();
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) delta.add(forward);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) delta.sub(forward);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) delta.add(right);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) delta.sub(right);

      if (delta.lengthSq() > 0) {
        delta.normalize().multiplyScalar(panSpeed);
        this.camera.position.add(delta);
        this.orbit.target.add(delta);
      }
    }

    this.orbit.target.x = THREE.MathUtils.clamp(this.orbit.target.x, CAMPUS_BOUNDS.minX, CAMPUS_BOUNDS.maxX);
    this.orbit.target.z = THREE.MathUtils.clamp(this.orbit.target.z, CAMPUS_BOUNDS.minZ, CAMPUS_BOUNDS.maxZ);
    this.orbit.update();
  }

  updateFirstPerson(dt) {
    const isBike = this.mode === 'bike';
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.85 : 1.0;
    const maxSpeed = (isBike ? 22 : 9.5) * boost;

    // 左右方向键也可平滑转向
    if (this.keys.has('KeyQ')) this.yaw += 1.4 * dt;
    if (this.keys.has('KeyE')) this.yaw -= 1.4 * dt;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const moveInput = new THREE.Vector3();

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveInput.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveInput.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveInput.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveInput.sub(right);

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize().multiplyScalar(maxSpeed);
    }

    const damping = isBike ? 4.2 : 9.5;
    this.velocity.lerp(moveInput, Math.min(1, damping * dt));
    this.camera.position.addScaledVector(this.velocity, dt);

    // 边界约束
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -495, 505);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -585, 775);

    const speedMag = this.velocity.length();
    if (speedMag > 0.4) {
      this.walkBobPhase += dt * (isBike ? 7.5 : 9.2);
    }
    const baseEye = isBike ? 1.98 : 1.72;
    const bobAmp = isBike ? 0.025 : 0.048;
    this.camera.position.y = baseEye + Math.sin(this.walkBobPhase) * bobAmp * Math.min(1, speedMag / 6);

    this.applyFirstPersonRotation();
  }

  updateDrone(dt) {
    const stop = DRONE_TOUR_STOPS[this.tourIndex];
    this.tourElapsed += dt;

    if (this.droneTransition) {
      this.droneTransition.t = Math.min(1, this.droneTransition.t + dt * 0.55);
      const ease = 1 - Math.pow(1 - this.droneTransition.t, 3);
      this.camera.position.lerpVectors(this.droneTransition.fromPos, this.droneTransition.toPos, ease);
      this.currentDroneLook.lerpVectors(this.droneTransition.fromLook, this.droneTransition.toLook, ease);
      this.camera.lookAt(this.currentDroneLook);
      if (this.droneTransition.t >= 1) this.droneTransition = null;
      return;
    }

    // 环绕微移航拍运动感
    const drift = this.tourElapsed * 0.16;
    this.camera.position.x = stop.camPos.x + Math.sin(drift) * 16;
    this.camera.position.z = stop.camPos.z + Math.cos(drift) * 14;
    this.camera.position.y = stop.camPos.y + Math.sin(drift * 0.7) * 2.5;
    this.currentDroneLook.set(stop.lookAt.x, stop.lookAt.y, stop.lookAt.z);
    this.camera.lookAt(this.currentDroneLook);

    if (this.tourElapsed >= stop.duration) {
      this.nextTourStop();
    }
  }
}
