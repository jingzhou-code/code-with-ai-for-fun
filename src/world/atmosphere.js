import * as THREE from 'three';

/**
 * 江湾校区全天候天空穹顶、落日霞光与璀璨星夜光照系统
 */
export class CampusAtmosphere {
  constructor(scene) {
    this.scene = scene;
    this.sunDir = new THREE.Vector3(0.45, 0.58, 0.35).normalize();
    this.sunColor = new THREE.Color(0xfff1d4);
    this.skyHorizon = new THREE.Color(0xbad6ee);
    this.skyZenith = new THREE.Color(0x4178b8);
    this.nightFactor = 0.0;

    // 半球环境光
    this.hemiLight = new THREE.HemisphereLight(0xdbeeff, 0x5c694f, 0.85);
    scene.add(this.hemiLight);

    // 太阳/月光主方向光（覆盖全校区高精度柔和阴影）
    this.dirLight = new THREE.DirectionalLight(0xfff2d6, 1.95);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 20;
    this.dirLight.shadow.camera.far = 1750;
    const d = 620;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.00045;
    scene.add(this.dirLight);

    // 补光避免背阴死黑
    this.fillLight = new THREE.DirectionalLight(0x9ec0e6, 0.38);
    this.fillLight.position.set(-220, 180, -240);
    scene.add(this.fillLight);

    // 雾效融合远景天际线
    this.fog = new THREE.FogExp2(0xc4d9ec, 0.00062);
    scene.fog = this.fog;

    // 自定义 GLSL 大气散射与晚霞天空球
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: this.skyZenith.clone() },
        uHorizon: { value: this.skyHorizon.clone() },
        uSunDir: { value: this.sunDir.clone() },
        uSunColor: { value: this.sunColor.clone() },
        uNight: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uNight;
        varying vec3 vDir;

        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.58));

          float sunAmt = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
          float halo = pow(sunAmt, 10.0) * 0.36 + pow(sunAmt, 240.0) * 1.25;
          col += uSunColor * halo * (1.0 - uNight * 0.88);

          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5200, 32, 20), this.skyMat);
    scene.add(skyDome);

    // 李兆基图书馆名言：“头顶上灿烂的星空” —— 1400颗星辰粒子系统
    const starCount = 1400;
    const starPos = new Float32Array(starCount * 3);
    let seed = 1905;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < starCount; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(0.12 + rand() * 0.88);
      const r = 4600;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xfff8e8,
      size: 4.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    scene.add(this.stars);

    this.setTimeOfDay(15.5);
  }

  /**
   * 根据小时数 (5.5 ~ 22.5) 实时计算太阳高度角、晚霞色温、阴影与星空透明度
   */
  setTimeOfDay(hour) {
    // 太阳轨迹: 6:00 日出东偏南, 12:15 正午高悬南天, 18:15 日落西偏南
    const dayProgress = (hour - 6.0) / 12.3; // 0 at ~6:00, 1 at ~18:18
    const elevAngle = Math.sin(Math.max(-0.35, Math.min(1.35, dayProgress)) * Math.PI);
    const azimuth = (dayProgress - 0.5) * Math.PI * 0.92;

    // 校园坐标 +X 为东, -X 为西, +Z 为南
    const sx = -Math.sin(azimuth) * Math.cos(Math.max(0.06, elevAngle) * 1.15);
    const sy = Math.max(-0.22, elevAngle * 0.92);
    const sz = 0.42;
    this.sunDir.set(sx, Math.max(0.12, sy), sz).normalize();

    let moodLabel = '午后晴光';
    if (hour < 7.2) {
      moodLabel = '江湾晨曦';
    } else if (hour < 11.2) {
      moodLabel = '清朗上午';
    } else if (hour < 14.2) {
      moodLabel = '正午骄阳';
    } else if (hour < 16.8) {
      moodLabel = '午后晴光';
    } else if (hour < 18.7) {
      moodLabel = '落日熔金';
    } else {
      moodLabel = '星夜灯火';
    }

    // 夜晚因子与晚霞因子平滑插值
    const sunsetFactor = Math.exp(-Math.pow((hour - 17.75) / 0.95, 2));
    const dawnFactor = Math.exp(-Math.pow((hour - 6.35) / 0.85, 2));
    const goldenFactor = Math.min(1, sunsetFactor + dawnFactor * 0.85);
    this.nightFactor = THREE.MathUtils.smoothstep(hour, 18.0, 19.4);

    const dayZenith = new THREE.Color(0x3a73b8);
    const dayHorizon = new THREE.Color(0xc4ddf2);
    const duskZenith = new THREE.Color(0x2d4373);
    const duskHorizon = new THREE.Color(0xe88b5a);
    const nightZenith = new THREE.Color(0x091122);
    const nightHorizon = new THREE.Color(0x162540);

    this.skyZenith
      .copy(dayZenith)
      .lerp(duskZenith, goldenFactor)
      .lerp(nightZenith, this.nightFactor);
    this.skyHorizon
      .copy(dayHorizon)
      .lerp(duskHorizon, goldenFactor)
      .lerp(nightHorizon, this.nightFactor);

    const noonSun = new THREE.Color(0xfff4de);
    const duskSun = new THREE.Color(0xff8e47);
    const moonCol = new THREE.Color(0x7fa3d4);
    this.sunColor
      .copy(noonSun)
      .lerp(duskSun, goldenFactor)
      .lerp(moonCol, this.nightFactor);

    // 同步光源与雾气
    const lightDist = 720;
    if (this.nightFactor > 0.78) {
      // 清朗月光角度
      this.dirLight.position.set(260, 420, 220);
      this.dirLight.intensity = 0.52;
    } else {
      this.dirLight.position.copy(this.sunDir).multiplyScalar(lightDist);
      this.dirLight.intensity = THREE.MathUtils.lerp(2.05, 0.55, this.nightFactor) * (1 - goldenFactor * 0.22);
    }
    this.dirLight.color.copy(this.sunColor);

    this.hemiLight.color.copy(this.skyHorizon).lerp(new THREE.Color(0xffffff), 0.25);
    this.hemiLight.groundColor.setHex(this.nightFactor > 0.5 ? 0x1a222c : 0x5c6850);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.88, 0.36, this.nightFactor);
    this.fillLight.intensity = THREE.MathUtils.lerp(0.36, 0.16, this.nightFactor);

    this.fog.color.copy(this.skyHorizon);
    this.skyMat.uniforms.uZenith.value.copy(this.skyZenith);
    this.skyMat.uniforms.uHorizon.value.copy(this.skyHorizon);
    this.skyMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.skyMat.uniforms.uSunColor.value.copy(this.sunColor);
    this.skyMat.uniforms.uNight.value = this.nightFactor;

    this.starMat.opacity = THREE.MathUtils.smoothstep(this.nightFactor, 0.35, 0.95) * 0.92;

    const hh = Math.floor(hour);
    const mm = Math.floor((hour - hh) * 60);
    const clockStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${moodLabel}`;
    return {
      clockStr,
      nightFactor: this.nightFactor,
      sunDir: this.sunDir,
      sunColor: this.sunColor,
      skyHorizon: this.skyHorizon,
    };
  }
}
