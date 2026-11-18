import * as THREE from 'three';
import { CAMPUS_BOUNDS, ROADS, WATER_BODIES, LANDMARKS } from '../data/campusData.js';

const SEASON_PALETTES = {
  spring: {
    ground: 0x4f8a49,
    ginkgo: 0x7bc257,
    cherry: 0xf4b6ca,
    camphor: 0x438248,
    willow: 0x6ab85e,
    leafCarpetOpacity: 0.0,
    label: '春樱海棠 · 日湖烂漫',
  },
  summer: {
    ground: 0x3f7b3c,
    ginkgo: 0x4b9441,
    cherry: 0x3d8244,
    camphor: 0x326e3b,
    willow: 0x4d994a,
    leafCarpetOpacity: 0.0,
    label: '盛夏绿茵 · 江湾大草原',
  },
  autumn: {
    ground: 0x567c44,
    ginkgo: 0xebb938,
    cherry: 0xcf6a44,
    camphor: 0x3e7640,
    willow: 0x8fa644,
    leafCarpetOpacity: 0.72,
    label: '银杏大道 · 望道秋色',
  },
  winter: {
    ground: 0x5c7350,
    ginkgo: 0x9c8656,
    cherry: 0x7d6b5d,
    camphor: 0x3d6642,
    willow: 0x6c7d53,
    leafCarpetOpacity: 0.18,
    label: '晴冬朗日 · 静谧书香',
  },
};

/**
 * 构建日湖、月湖与校内水系的自定义 GLSL 波光着色器（支持“满湖碎金”高光与昼夜天色反射）
 */
function createWaterShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.4).normalize() },
      uSunColor: { value: new THREE.Color(0xfff1d0) },
      uSkyColor: { value: new THREE.Color(0x7eb6e6) },
      uDeepColor: { value: new THREE.Color(0x1b4d5c) },
      uShallowColor: { value: new THREE.Color(0x2d767f) },
      uNightFactor: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uNightFactor;
      varying vec3 vWorldPos;

      float wave(vec2 p, vec2 dir, float freq, float speed) {
        return sin(dot(p, dir) * freq + uTime * speed);
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float h1 = wave(p, normalize(vec2(1.0, 0.35)), 0.28, 1.45);
        float h2 = wave(p, normalize(vec2(-0.6, 0.8)), 0.43, 1.85);
        float h3 = wave(p, normalize(vec2(0.3, -0.95)), 0.75, 2.35);
        float h4 = sin(p.x * 1.3 + uTime * 2.8) * cos(p.y * 1.3 - uTime * 2.1);

        vec3 normal = normalize(vec3(
          (h1 * 0.4 + h2 * 0.35 + h4 * 0.25) * 0.085,
          1.0,
          (h2 * 0.4 + h3 * 0.35 - h4 * 0.25) * 0.085
        ));

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

        vec3 waterBase = mix(uShallowColor, uDeepColor, clamp(0.35 + h1 * 0.15, 0.0, 1.0));
        waterBase *= mix(1.0, 0.28, uNightFactor);

        vec3 reflColor = mix(waterBase, uSkyColor, clamp(fresnel * 0.78 + 0.14, 0.0, 0.88));

        // 太阳高光“满湖碎金” (Sun Specular Glints)
        vec3 halfVec = normalize(uSunDir + viewDir);
        float specBroad = pow(max(dot(normal, halfVec), 0.0), 48.0);
        float specSparkle = pow(max(dot(normal, halfVec), 0.0), 220.0);
        float sunVis = 1.0 - smoothstep(0.55, 0.95, uNightFactor);
        vec3 glint = uSunColor * (specBroad * 0.42 + specSparkle * 1.35) * sunVis;

        gl_FragColor = vec4(reflColor + glint, 0.94);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export class CampusLandscape {
  constructor(scene, groundTextures) {
    this.scene = scene;
    this.textures = groundTextures;
    this.waterMat = createWaterShaderMaterial();
    this.dynamicVehicles = [];
    this.dynamicCyclists = [];
    this.egrets = [];
    this.leafCarpets = [];
    this.lampGlobeMat = new THREE.MeshStandardMaterial({
      color: 0xfff5d8,
      emissive: 0xffc96b,
      emissiveIntensity: 0.12,
      roughness: 0.3,
    });

    this.groundMat = new THREE.MeshStandardMaterial({
      map: this.textures.grassTex,
      color: SEASON_PALETTES.autumn.ground,
      roughness: 0.94,
      metalness: 0.02,
    });

    this.treeCanopyMats = {
      ginkgo: new THREE.MeshStandardMaterial({ color: SEASON_PALETTES.autumn.ginkgo, roughness: 0.82 }),
      cherry: new THREE.MeshStandardMaterial({ color: SEASON_PALETTES.autumn.cherry, roughness: 0.82 }),
      camphor: new THREE.MeshStandardMaterial({ color: SEASON_PALETTES.autumn.camphor, roughness: 0.84 }),
      willow: new THREE.MeshStandardMaterial({ color: SEASON_PALETTES.autumn.willow, roughness: 0.84 }),
    };

    this.buildBaseGround();
    this.buildWaterNetwork();
    this.buildRoadNetwork();
    this.buildSportsSurfaces();
    this.buildCampusFence();
    this.buildVegetationAndLamps();
    this.buildLivingTrafficAndEgrets();
    this.buildSurroundingSkyline();
  }

  // ==================== 1. 大地基座 ====================
  buildBaseGround() {
    // 远景无接缝大地面（直抵天际雾效边界）
    const outerPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9600, 9600),
      new THREE.MeshStandardMaterial({ color: 0x435446, roughness: 0.96 })
    );
    outerPlane.rotation.x = -Math.PI / 2;
    outerPlane.position.y = -0.22;
    outerPlane.receiveShadow = true;
    this.scene.add(outerPlane);

    // 1600亩校区草地主基底
    const campusW = CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + 180;
    const campusD = CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ + 180;
    const campusPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(campusW, campusD),
      this.groundMat
    );
    campusPlane.rotation.x = -Math.PI / 2;
    campusPlane.position.set(
      (CAMPUS_BOUNDS.minX + CAMPUS_BOUNDS.maxX) * 0.5,
      0,
      (CAMPUS_BOUNDS.minZ + CAMPUS_BOUNDS.maxZ) * 0.5
    );
    campusPlane.receiveShadow = true;
    this.scene.add(campusPlane);
  }

  // ==================== 2. 日湖、月湖与生态河网 ====================
  buildWaterNetwork() {
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0xd8cebc,
      roughness: 0.78,
    });

    // 构建自然曲线湖面 (日湖 + 月湖)
    [WATER_BODIES.riLake, WATER_BODIES.yueLake].forEach((lake) => {
      const shape = new THREE.Shape();
      const pts = lake.points.map(([x, z]) => new THREE.Vector2(x, -z));
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % pts.length];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5;
        shape.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      shape.closePath();

      // 外扩石砌湖岸压边（顶面 Y ≈ +0.10，低于清澈湖面 Y = +0.19）
      const bankGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 2.8,
        bevelThickness: 0.08,
      });
      bankGeo.rotateX(-Math.PI / 2);
      const bankMesh = new THREE.Mesh(bankGeo, bankMat);
      bankMesh.position.y = -0.14;
      bankMesh.receiveShadow = true;
      this.scene.add(bankMesh);

      const lakeGeo = new THREE.ShapeGeometry(shape, 32);
      lakeGeo.rotateX(-Math.PI / 2);
      const lakeMesh = new THREE.Mesh(lakeGeo, this.waterMat);
      lakeMesh.position.y = 0.19;
      this.scene.add(lakeMesh);
    });

    // 日湖西畔亲水木栈道（正对李兆基图书馆东侧）
    const boardwalk = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.35, 42),
      new THREE.MeshStandardMaterial({ color: 0x8b6240, roughness: 0.85 })
    );
    boardwalk.position.set(192, 0.25, -56);
    boardwalk.receiveShadow = true;
    this.scene.add(boardwalk);

    // 校内纵横水网河道 (卿云河、纬五河、日月连通河、护校河)
    WATER_BODIES.canals.forEach((c) => {
      const len = Math.hypot(c.x2 - c.x1, c.z2 - c.z1);
      const ang = Math.atan2(c.z2 - c.z1, c.x2 - c.x1);
      const mx = (c.x1 + c.x2) * 0.5;
      const mz = (c.z1 + c.z2) * 0.5;

      // 驳岸护石
      const bank = new THREE.Mesh(
        new THREE.PlaneGeometry(len + 2, c.width + 3.2),
        bankMat
      );
      bank.rotation.x = -Math.PI / 2;
      bank.rotation.z = -ang;
      bank.position.set(mx, 0.05, mz);
      this.scene.add(bank);

      // 水面
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(len + 1, c.width),
        this.waterMat
      );
      water.rotation.x = -Math.PI / 2;
      water.rotation.z = -ang;
      water.position.set(mx, 0.13, mz);
      this.scene.add(water);
    });
  }

  // ==================== 3. 五经七纬校内道路与周边城市干道 ====================
  buildRoadNetwork() {
    const campusAsphalt = new THREE.MeshStandardMaterial({
      color: 0x464b53,
      roughness: 0.86,
    });
    const cityAsphalt = new THREE.MeshStandardMaterial({
      color: 0x353940,
      roughness: 0.88,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xcac2b4,
      roughness: 0.82,
    });
    const plazaRoadMat = new THREE.MeshStandardMaterial({
      map: this.textures.plazaTex,
      roughness: 0.76,
    });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xe9e4d5 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xe6b432,
      roughness: 0.9,
      transparent: true,
      opacity: SEASON_PALETTES.autumn.leafCarpetOpacity,
    });
    this.leafCarpetMat = leafMat;

    ROADS.forEach((r) => {
      const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
      const ang = Math.atan2(r.z2 - r.z1, r.x2 - r.x1);
      const mx = (r.x1 + r.x2) * 0.5;
      const mz = (r.z1 + r.z2) * 0.5;

      const roadGroup = new THREE.Group();
      roadGroup.position.set(mx, 0, mz);
      roadGroup.rotation.y = -ang;

      // 两侧浅色花岗岩人行道
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(len + 2, 0.18, r.width + 4.4),
        sidewalkMat
      );
      sw.position.y = 0.09;
      sw.receiveShadow = true;
      roadGroup.add(sw);

      // 机动车道面层
      const roadMat =
        r.type === 'city'
          ? cityAsphalt
          : r.type === 'plaza-road'
          ? plazaRoadMat
          : campusAsphalt;
      const surf = new THREE.Mesh(
        new THREE.PlaneGeometry(len + 2, r.width),
        roadMat
      );
      surf.rotation.x = -Math.PI / 2;
      surf.position.y = 0.2;
      surf.receiveShadow = true;
      roadGroup.add(surf);

      // 淞沪路中央景观绿化隔离带
      if (r.id === 'songhu-rd') {
        const median = new THREE.Mesh(
          new THREE.BoxGeometry(len, 0.36, 3.6),
          new THREE.MeshStandardMaterial({ color: 0x3e7a44, roughness: 0.9 })
        );
        median.position.y = 0.22;
        roadGroup.add(median);
      }

      // 道路虚线标线
      if (r.type !== 'plaza-road') {
        const step = 18;
        for (let x = -len * 0.48; x < len * 0.48; x += step) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 0.24), dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(x, 0.22, 0);
          roadGroup.add(dash);
        }
      }

      // 金秋银杏大道落叶地毯（纬七路望道路 & 韶华大道）
      if (r.treeType === 'ginkgo') {
        [-r.width * 0.5 - 1.1, r.width * 0.5 + 1.1].forEach((lz) => {
          const carpet = new THREE.Mesh(
            new THREE.PlaneGeometry(len - 8, 2.2),
            leafMat
          );
          carpet.rotation.x = -Math.PI / 2;
          carpet.position.set(0, 0.21, lz);
          roadGroup.add(carpet);
          this.leafCarpets.push(carpet);
        });
      }

      this.scene.add(roadGroup);
    });

    // 六号门跨殷行路醒目人行斑马线
    for (let i = -4.5; i <= 4.5; i += 1.5) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 16),
        dashMat
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-378 + i, 0.23, 486);
      this.scene.add(stripe);
    }
  }

  // ==================== 4. 田径场与西区球场地面高精度贴图 ====================
  buildSportsSurfaces() {
    // 400米标准田径场地面 (-332, 328)
    const stadiumSurf = new THREE.Mesh(
      new THREE.PlaneGeometry(124, 188),
      new THREE.MeshStandardMaterial({
        map: this.textures.stadiumTex,
        roughness: 0.82,
      })
    );
    stadiumSurf.rotation.x = -Math.PI / 2;
    stadiumSurf.position.set(-328, 0.19, 328);
    stadiumSurf.receiveShadow = true;
    this.scene.add(stadiumSurf);

    // 五号门南侧8片篮球/网球场面层 (-380, 173)
    const courtMat = new THREE.MeshStandardMaterial({
      map: this.textures.courtTex,
      roughness: 0.78,
    });
    for (let row = -1; row <= 1; row += 2) {
      for (let col = -1.5; col <= 1.5; col += 1) {
        const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 32), courtMat);
        cMesh.rotation.x = -Math.PI / 2;
        cMesh.rotation.z = Math.PI / 2;
        cMesh.position.set(-380 + col * 21, 0.19, 173 + row * 17);
        cMesh.receiveShadow = true;
        this.scene.add(cMesh);
      }
    }
  }

  // ==================== 5. 欧式铁艺石柱校园围墙 ====================
  buildCampusFence() {
    const f = CAMPUS_BOUNDS.mainFence;
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe3d8c5, roughness: 0.75 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2c343c, metalness: 0.6, roughness: 0.4 });

    const segments = [
      // 东围墙（留出一号门 Z∈[14,76] 与二号门 Z∈[-270,-238]）
      [f.maxX, -545, f.maxX, -272],
      [f.maxX, -236, f.maxX, 12],
      [f.maxX, 78, f.maxX, 460],
      // 西围墙（留出五号门 Z∈[106,138]）
      [f.minX, -545, f.minX, 104],
      [f.minX, 140, f.minX, 460],
      // 北围墙（留出四号门 X∈[-212,-178]）
      [-445, f.minZ, -214, f.minZ],
      [-176, f.minZ, 442, f.minZ],
      // 南围墙（留出六号门 X∈[-394,-362]）
      [-445, f.maxZ, -396, f.maxZ],
      [-360, f.maxZ, 442, f.maxZ],
    ];

    const posts = [];
    segments.forEach(([x1, z1, x2, z2]) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 1.7, 0.22), railMat);
      rail.position.set((x1 + x2) * 0.5, 1.15, (z1 + z2) * 0.5);
      rail.rotation.y = -ang;
      this.scene.add(rail);

      const steps = Math.floor(len / 18);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        posts.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t]);
      }
    });

    const postInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.85, 2.5, 0.85),
      postMat,
      posts.length
    );
    const dummy = new THREE.Object3D();
    posts.forEach(([px, pz], idx) => {
      dummy.position.set(px, 1.25, pz);
      dummy.updateMatrix();
      postInst.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(postInst);
  }

  // ==================== 6. 3000+ 实例化四时树木、湿地芦苇、欧式路灯与单车棚 ====================
  isBlockedForTree(x, z) {
    // 中央大草坪开阔视线保护
    if (x > -35 && x < 410 && z > 18 && z < 72) return true;
    // 日湖与月湖保护区
    if (x > 184 && x < 406 && z > -118 && z < 0) return true;
    if (x > -130 && x < 180 && z > 338 && z < 426) return true;

    // 河道保护
    for (const c of WATER_BODIES.canals) {
      const minX = Math.min(c.x1, c.x2) - c.width * 0.65;
      const maxX = Math.max(c.x1, c.x2) + c.width * 0.65;
      const minZ = Math.min(c.z1, c.z2) - c.width * 0.65;
      const maxZ = Math.max(c.z1, c.z2) + c.width * 0.65;
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true;
    }

    // 道路路面净空保护
    for (const r of ROADS) {
      const minX = Math.min(r.x1, r.x2) - r.width * 0.56;
      const maxX = Math.max(r.x1, r.x2) + r.width * 0.56;
      const minZ = Math.min(r.z1, r.z2) - r.width * 0.56;
      const maxZ = Math.max(r.z1, r.z2) + r.width * 0.56;
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true;
    }

    // 所有建筑占地净空保护
    for (const lm of LANDMARKS) {
      if (lm.archType === 'lake-marker') continue;
      const pad = 7;
      if (
        Math.abs(x - lm.x) < lm.w * 0.5 + pad &&
        Math.abs(z - lm.z) < lm.d * 0.5 + pad
      ) {
        return true;
      }
    }
    return false;
  }

  buildVegetationAndLamps() {
    const treesBySpecies = {
      ginkgo: [],
      cherry: [],
      camphor: [],
      willow: [],
    };
    const lampPositions = [];

    // 1) 沿所有林荫大道精准种植双排行道树 + 欧式古典路灯
    ROADS.forEach((r) => {
      if (r.type === 'city' && r.id !== 'songhu-rd') return;
      const isHorizontal = Math.abs(r.z1 - r.z2) < 1;
      const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
      const species = r.treeType || 'camphor';
      const offset = r.width * 0.5 + 3.4;
      const lampOffset = r.width * 0.5 + 1.6;

      for (let d = 14; d < len - 14; d += 15) {
        const t = d / len;
        const bx = r.x1 + (r.x2 - r.x1) * t;
        const bz = r.z1 + (r.z2 - r.z1) * t;

        [-1, 1].forEach((side) => {
          const tx = isHorizontal ? bx : bx + side * offset;
          const tz = isHorizontal ? bz + side * offset : bz;
          if (!this.isBlockedForTree(tx, tz)) {
            treesBySpecies[species].push({ x: tx, z: tz, s: 0.92 + ((d * 17) % 10) * 0.03 });
          }
        });

        if (d % 30 < 15 && r.type !== 'city') {
          const lx = isHorizontal ? bx : bx + lampOffset;
          const lz = isHorizontal ? bz + lampOffset : bz;
          lampPositions.push([lx, lz]);
        }
      }
    });

    // 2) 日湖与月湖沿岸垂柳与春樱海棠环绕
    WATER_BODIES.riLake.points.forEach(([px, pz], idx) => {
      const cx = WATER_BODIES.riLake.center.x;
      const cz = WATER_BODIES.riLake.center.z;
      const vx = px + (px - cx) * 0.14;
      const vz = pz + (pz - cz) * 0.18;
      if (!this.isBlockedForTree(vx, vz)) {
        treesBySpecies[idx % 2 === 0 ? 'willow' : 'cherry'].push({ x: vx, z: vz, s: 1.15 });
      }
    });
    WATER_BODIES.yueLake.points.forEach(([px, pz], idx) => {
      const cx = WATER_BODIES.yueLake.center.x;
      const cz = WATER_BODIES.yueLake.center.z;
      const vx = px + (px - cx) * 0.12;
      const vz = pz + (pz - cz) * 0.22;
      if (!this.isBlockedForTree(vx, vz)) {
        treesBySpecies[idx % 2 === 0 ? 'willow' : 'cherry'].push({ x: vx, z: vz, s: 1.1 });
      }
    });

    // 3) “江湾大草原”林地群落散点自然树丛
    let seed = 2005;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const speciesKeys = ['camphor', 'ginkgo', 'cherry', 'willow'];
    for (let i = 0; i < 1650; i++) {
      const x = -435 + rand() * 870;
      const z = -530 + rand() * 1270;
      if (z > 455 && (z < 520 || x > -100)) continue;
      if (!this.isBlockedForTree(x, z)) {
        const sp = speciesKeys[Math.floor(rand() * speciesKeys.length)];
        treesBySpecies[sp].push({ x, z, s: 0.78 + rand() * 0.58 });
      }
    }

    // 构建树干与树冠 InstancedMesh
    const allTrees = Object.values(treesBySpecies).flat();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4634, roughness: 0.9 });
    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.24, 0.38, 3.6, 6),
      trunkMat,
      allTrees.length
    );
    trunkInst.castShadow = true;
    const dummy = new THREE.Object3D();
    allTrees.forEach((t, idx) => {
      dummy.position.set(t.x, 1.8 * t.s, t.z);
      dummy.scale.set(t.s, t.s, t.s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(trunkInst);

    const canopyGeo = new THREE.DodecahedronGeometry(3.2, 1);
    Object.entries(treesBySpecies).forEach(([sp, list]) => {
      if (!list.length) return;
      const inst = new THREE.InstancedMesh(canopyGeo, this.treeCanopyMats[sp], list.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      list.forEach((t, idx) => {
        dummy.position.set(t.x, 5.4 * t.s, t.z);
        const sy = sp === 'ginkgo' ? 1.28 : sp === 'willow' ? 1.05 : 0.95;
        dummy.scale.set(t.s, t.s * sy, t.s);
        dummy.rotation.y = (idx * 1.37) % Math.PI;
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
      });
      this.scene.add(inst);
    });

    // 4) 纬五河与卿云河湿地摇曳芦苇丛 ("骑单车路过桥边随风摆动的芦苇")
    const reedCoords = [];
    for (let rx = -210; rx <= 220; rx += 5.5) {
      reedCoords.push([rx, -214], [rx, -234]);
    }
    for (let rz = -480; rz <= 410; rz += 7) {
      reedCoords.push([-213, rz], [-231, rz]);
    }
    const reedInst = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.42, 2.2, 5),
      new THREE.MeshStandardMaterial({ color: 0xc8b575, roughness: 0.88 }),
      reedCoords.length
    );
    reedCoords.forEach(([rx, rz], idx) => {
      dummy.position.set(rx, 1.0, rz);
      dummy.scale.set(1, 0.85 + (idx % 4) * 0.14, 1);
      dummy.rotation.set(0.08 * Math.sin(idx), idx, 0);
      dummy.updateMatrix();
      reedInst.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(reedInst);

    // 5) 欧式古典铸铁街灯 InstancedMesh
    const poleInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.09, 0.16, 5.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x262d34, metalness: 0.65, roughness: 0.4 }),
      lampPositions.length
    );
    const globeInst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.32, 8, 8),
      this.lampGlobeMat,
      lampPositions.length
    );
    lampPositions.forEach(([lx, lz], idx) => {
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(lx, 2.6, lz);
      dummy.updateMatrix();
      poleInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(lx, 5.35, lz);
      dummy.updateMatrix();
      globeInst.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(poleInst);
    this.scene.add(globeInst);
  }

  // ==================== 7. 动态邯郸—江湾校车、移动餐车、骑行学子与日湖月湖白鹭 ====================
  buildLivingTrafficAndEgrets() {
    // 1) 静态江湾移动餐车（南食堂东侧广场 & 纬二路生科院旁）
    [
      [-236, 142],
      [25, -366],
    ].forEach(([fx, fz]) => {
      const truck = new THREE.Group();
      truck.position.set(fx, 0, fz);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 2.6, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xf0d699, roughness: 0.5 })
      );
      body.position.y = 1.65;
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.35, 2.7),
        new THREE.MeshStandardMaterial({ color: 0xb94a38, roughness: 0.5 })
      );
      roof.position.y = 3.05;
      truck.add(body, roof);
      this.scene.add(truck);
    });

    // 2) 动态车辆与复旦校车（淞沪路、殷行路及校内经一路校车线）
    const busColors = [0x24569c, 0xd8dce2, 0x2c68b0, 0x424a54, 0xc94a3c];
    const routes = [
      { x1: 465, z1: -580, x2: 465, z2: 760, speed: 24, isBus: true },
      { x1: 479, z1: 760, x2: 479, z2: -580, speed: 26, isBus: false },
      { x1: -480, z1: 482, x2: 460, z2: 482, speed: 21, isBus: true },
      { x1: 460, z1: 490, x2: -480, z2: 490, speed: 22, isBus: false },
      { x1: -192, z1: 215, x2: -192, z2: -480, speed: 10, isBus: true }, // 校内摆渡车
    ];

    routes.forEach((rt, idx) => {
      for (let k = 0; k < 2; k++) {
        const isShuttle = rt.isBus && k === 0;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(isShuttle ? 10.5 : 4.6, isShuttle ? 3.2 : 1.65, isShuttle ? 2.6 : 2.0),
          new THREE.MeshStandardMaterial({
            color: isShuttle ? 0x1e4e8c : busColors[(idx + k) % busColors.length],
            roughness: 0.42,
            metalness: 0.25,
          })
        );
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.dynamicVehicles.push({
          mesh,
          ...rt,
          y: isShuttle ? 1.75 : 1.0,
          t: (k * 0.5 + idx * 0.19) % 1,
        });
      }
    });

    // 3) 纬七路（望道路）与经二路（穿智华楼桥洞！）骑单车赶课的江湾学子
    const bikePaths = [
      { x1: -410, z1: 125, x2: 310, z2: 125, speed: 6.2 },
      { x1: 310, z1: 119, x2: -410, z2: 119, speed: 5.8 },
      { x1: -17, z1: 220, x2: -17, z2: -420, speed: 6.5 }, // 径直穿过智华楼桥洞一路向北！
      { x1: -23, z1: -420, x2: -23, z2: 220, speed: 6.0 },
    ];
    bikePaths.forEach((bp, i) => {
      for (let c = 0; c < 4; c++) {
        const rider = new THREE.Group();
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.9, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x3a6ea5 })
        );
        frame.position.y = 0.65;
        const person = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.26, 0.85, 4, 8),
          new THREE.MeshStandardMaterial({ color: c % 2 === 0 ? 0xe8dfd1 : 0x365b8c })
        );
        person.position.y = 1.45;
        rider.add(frame, person);
        this.scene.add(rider);
        this.dynamicCyclists.push({
          group: rider,
          ...bp,
          t: (c * 0.25 + i * 0.13) % 1,
        });
      }
    });

    // 4) 日湖与月湖上空展翅低徊的白鹭 ("倏一下，会有几只白鹭轻轻地飞了起来")
    const egretMat = new THREE.MeshStandardMaterial({ color: 0xfafcff, roughness: 0.5 });
    [
      { cx: 295, cz: -58, r: 46 },
      { cx: 270, cz: -45, r: 34 },
      { cx: 22, cz: 382, r: 52 },
      { cx: 65, cz: 376, r: 36 },
    ].forEach((cfg, idx) => {
      const bird = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.5, 6), egretMat);
      body.rotation.z = -Math.PI / 2;
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 1.4), egretMat);
      wingL.position.z = 0.7;
      const wingR = wingL.clone();
      wingR.position.z = -0.7;
      bird.add(body, wingL, wingR);
      this.scene.add(bird);
      this.egrets.push({ bird, wingL, wingR, ...cfg, phase: idx * 1.6 });
    });
  }

  // ==================== 8. 新江湾城周边城市天际线远景轮廓 ====================
  buildSurroundingSkyline() {
    const warmUrbanMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4ae,
      roughness: 0.86,
      metalness: 0.08,
    });
    const dummy = new THREE.Object3D();
    const blocks = [];

    // 淞沪路东侧（尚浦领世 / 新江湾城生态低密社区错落群落）
    let seed = 881;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 36; i++) {
      const z = -580 + rand() * 1340;
      const x = 575 + rand() * 260;
      blocks.push({
        x,
        z,
        w: 24 + rand() * 34,
        d: 22 + rand() * 32,
        h: 18 + rand() * 58,
        ry: (rand() - 0.5) * 0.25,
      });
    }
    // 西侧与南侧新江湾城低密生态住宅点缀（拉远距离并错落高低）
    for (let i = 0; i < 26; i++) {
      const z = -540 + rand() * 1280;
      const x = -610 - rand() * 260;
      blocks.push({
        x,
        z,
        w: 28 + rand() * 26,
        d: 16 + rand() * 18,
        h: 16 + rand() * 34,
        ry: (rand() - 0.5) * 0.2,
      });
    }

    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), warmUrbanMat, blocks.length);
    blocks.forEach((b, idx) => {
      dummy.position.set(b.x, b.h * 0.5, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, b.ry, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
    });
    this.scene.add(inst);
  }

  /**
   * 四季色彩实时切换
   */
  setSeason(seasonKey) {
    const pal = SEASON_PALETTES[seasonKey] || SEASON_PALETTES.autumn;
    this.groundMat.color.setHex(pal.ground);
    this.treeCanopyMats.ginkgo.color.setHex(pal.ginkgo);
    this.treeCanopyMats.cherry.color.setHex(pal.cherry);
    this.treeCanopyMats.camphor.color.setHex(pal.camphor);
    this.treeCanopyMats.willow.color.setHex(pal.willow);
    if (this.leafCarpetMat) {
      this.leafCarpetMat.opacity = pal.leafCarpetOpacity;
      this.leafCarpetMat.visible = pal.leafCarpetOpacity > 0.02;
    }
    return pal.label;
  }

  /**
   * 每帧更新水面波光、摆渡校车、单车学子与白鹭飞翔
   */
  update(elapsed, dt, sunDir, sunColor, skyColor, nightFactor) {
    this.waterMat.uniforms.uTime.value = elapsed;
    this.waterMat.uniforms.uSunDir.value.copy(sunDir);
    this.waterMat.uniforms.uSunColor.value.copy(sunColor);
    this.waterMat.uniforms.uSkyColor.value.copy(skyColor);
    this.waterMat.uniforms.uNightFactor.value = nightFactor;

    this.lampGlobeMat.emissiveIntensity = 0.1 + nightFactor * 2.2;

    // 车辆循环行驶
    this.dynamicVehicles.forEach((v) => {
      const dist = Math.hypot(v.x2 - v.x1, v.z2 - v.z1);
      v.t = (v.t + (dt * v.speed) / dist) % 1;
      const x = v.x1 + (v.x2 - v.x1) * v.t;
      const z = v.z1 + (v.z2 - v.z1) * v.t;
      v.mesh.position.set(x, v.y, z);
      v.mesh.rotation.y = -Math.atan2(v.z2 - v.z1, v.x2 - v.x1);
    });

    // 纬七路与经二路骑行学子
    this.dynamicCyclists.forEach((c) => {
      const dist = Math.hypot(c.x2 - c.x1, c.z2 - c.z1);
      c.t = (c.t + (dt * c.speed) / dist) % 1;
      const x = c.x1 + (c.x2 - c.x1) * c.t;
      const z = c.z1 + (c.z2 - c.z1) * c.t;
      c.group.position.set(x, 0.18, z);
      c.group.rotation.y = -Math.atan2(c.z2 - c.z1, c.x2 - c.x1);
    });

    // 日湖与月湖白鹭盘旋振翅
    this.egrets.forEach((e) => {
      const ang = elapsed * 0.28 + e.phase;
      const bx = e.cx + Math.cos(ang) * e.r;
      const bz = e.cz + Math.sin(ang) * e.r * 0.65;
      const by = 8.5 + Math.sin(elapsed * 0.9 + e.phase) * 2.2;
      e.bird.position.set(bx, by, bz);
      e.bird.rotation.y = -ang + Math.PI / 2;
      const flap = Math.sin(elapsed * 5.2 + e.phase) * 0.42;
      e.wingL.rotation.x = flap;
      e.wingR.rotation.x = -flap;
    });
  }
}
