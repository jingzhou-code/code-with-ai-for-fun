import * as THREE from 'three';
import { createPlaqueTexture } from './textures.js';

/**
 * 按真实米制尺寸缩放 BoxGeometry 的 UV，保证每层楼高 ~4.4m、每开间宽 ~3.8m，绝不拉伸贴图
 */
function createScaledWallBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const tileW = 28; // 512px 贴图对应约 28m 宽（8列窗）
  const tileH = 22; // 512px 贴图对应约 22m 高（5层楼）

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (each 4 vertices)
  const faceDims = [
    [d, h], // +X
    [d, h], // -X
    [w, d], // +Y (top)
    [w, d], // -Y (bottom)
    [w, h], // +Z
    [w, h], // -Z
  ];

  for (let f = 0; f < 6; f++) {
    const [fw, fh] = faceDims[f];
    const rx = Math.max(0.25, fw / tileW);
    const ry = f === 2 || f === 3 ? Math.max(0.25, fh / tileW) : Math.max(0.25, fh / tileH);
    const base = f * 4;
    uv.setXY(base + 0, 0, ry);
    uv.setXY(base + 1, rx, ry);
    uv.setXY(base + 2, 0, 0);
    uv.setXY(base + 3, rx, 0);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * 构建正四坡欧式屋顶 (Hip Roof BufferGeometry)
 */
function createHipRoofGeometry(w, d, roofH, overhang = 1.1) {
  const hw = w * 0.5 + overhang;
  const hd = d * 0.5 + overhang;
  const ridgeAlongX = w >= d;
  const ridgeHalf = ridgeAlongX ? Math.max(0.5, hw - hd * 0.78) : Math.max(0.5, hd - hw * 0.78);

  const p0 = [-hw, 0, hd];
  const p1 = [hw, 0, hd];
  const p2 = [hw, 0, -hd];
  const p3 = [-hw, 0, -hd];

  let r0;
  let r1;
  if (ridgeAlongX) {
    r0 = [-ridgeHalf, roofH, 0];
    r1 = [ridgeHalf, roofH, 0];
  } else {
    r0 = [0, roofH, ridgeHalf];
    r1 = [0, roofH, -ridgeHalf];
  }

  const positions = [];
  const uvs = [];
  const pushTri = (a, b, c, uScale = 12) => {
    positions.push(...a, ...b, ...c);
    const lenAB = Math.hypot(b[0] - a[0], b[2] - a[2]) / uScale;
    const slopeH = Math.hypot(c[1] - a[1], (ridgeAlongX ? c[2] - a[2] : c[0] - a[0])) / 8;
    uvs.push(0, 0, lenAB, 0, lenAB * 0.5, slopeH);
  };

  if (ridgeAlongX) {
    // Front (+Z) quad: p0, p1, r1, r0
    pushTri(p0, p1, r1);
    pushTri(p0, r1, r0);
    // Back (-Z) quad: p2, p3, r0, r1
    pushTri(p2, p3, r0);
    pushTri(p2, r0, r1);
    // Left (-X) hip: p3, p0, r0
    pushTri(p3, p0, r0);
    // Right (+X) hip: p1, p2, r1
    pushTri(p1, p2, r1);
  } else {
    // Right (+X) quad: p1, p2, r1, r0
    pushTri(p1, p2, r1);
    pushTri(p1, r1, r0);
    // Left (-X) quad: p3, p0, r0, r1
    pushTri(p3, p0, r0);
    pushTri(p3, r0, r1);
    // Front (+Z) hip: p0, p1, r0
    pushTri(p0, p1, r0);
    // Back (-Z) hip: p2, p3, r1
    pushTri(p2, p3, r1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * 构建三角山花 (Classical Triangular Pediment)
 */
function createPedimentGeometry(width, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.25,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

export class CampusArchitect {
  constructor(facadeSet, roofMats) {
    this.facades = facadeSet.materials;
    this.emissiveList = facadeSet.emissiveMaterials;
    this.roofs = roofMats;

    this.stoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0xebe1cf,
      roughness: 0.72,
      metalness: 0.05,
    });
    this.graniteBaseMat = new THREE.MeshStandardMaterial({
      color: 0xbcb19f,
      roughness: 0.82,
      metalness: 0.06,
    });
    this.whiteMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xf1ece2,
      roughness: 0.58,
      metalness: 0.06,
    });
    this.bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x6f5a38,
      roughness: 0.42,
      metalness: 0.72,
    });
    this.glassAtriumMat = new THREE.MeshStandardMaterial({
      color: 0x7ab2d8,
      emissive: 0xffe0a3,
      emissiveIntensity: 0.08,
      roughness: 0.18,
      metalness: 0.55,
      transparent: true,
      opacity: 0.82,
    });
    this.drumGlowMat = new THREE.MeshStandardMaterial({
      color: 0xe6dac4,
      emissive: 0xffd791,
      emissiveIntensity: 0.05,
      roughness: 0.65,
    });
    this.lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d1,
      emissive: 0xffcf75,
      emissiveIntensity: 0.15,
      roughness: 0.35,
    });

    this.nightGlowMaterials = [this.glassAtriumMat, this.drumGlowMat, this.lanternGlowMat];
    this.pickableMeshes = [];
  }

  registerPickable(group, landmark) {
    group.userData.landmark = landmark;
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.landmark = landmark;
        this.pickableMeshes.push(child);
      }
    });
  }

  getWallMat(tone = 'limestone') {
    return this.facades[tone] || this.facades.limestone;
  }

  getRoofMat(type = 'slate') {
    if (type === 'terracotta') return this.roofs.terracotta;
    return this.roofs.slate;
  }

  /**
   * 通用新古典主义建筑体块：花岗岩台基 + 分缝石材墙身 + 挑檐线脚 + 四坡瓦顶
   */
  makeClassicalBlock(w, h, d, wallMat, roofMat, opts = {}) {
    const group = new THREE.Group();
    const plinthH = opts.plinthH ?? 1.4;
    const roofH = opts.roofH ?? Math.min(5.2, Math.max(2.6, Math.min(w, d) * 0.19));

    // 台基
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.2, plinthH, d + 1.2),
      this.graniteBaseMat
    );
    plinth.position.y = plinthH * 0.5;
    group.add(plinth);

    // 主体立面
    const bodyH = Math.max(3, h - plinthH);
    const body = new THREE.Mesh(createScaledWallBox(w, bodyH, d), wallMat);
    body.position.y = plinthH + bodyH * 0.5;
    group.add(body);

    // 顶部古典挑檐 (Cornice)
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.5, 0.85, d + 1.5),
      this.stoneTrimMat
    );
    cornice.position.y = h + 0.35;
    group.add(cornice);

    // 坡屋顶
    if (!opts.flatRoof) {
      const roof = new THREE.Mesh(
        createHipRoofGeometry(w, d, roofH, 1.05),
        roofMat
      );
      roof.position.y = h + 0.75;
      group.add(roof);
    }

    return group;
  }

  /**
   * 科林斯/爱奥尼巨柱式三角山花门廊 (Portico)
   */
  makePortico(width, height, depth, numCols = 6, roofMat = this.roofs.slate) {
    const group = new THREE.Group();

    // 台阶序列
    for (let s = 0; s < 3; s++) {
      const stepW = width + (3 - s) * 1.6;
      const stepD = depth + (3 - s) * 1.4;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, 0.45, stepD),
        this.graniteBaseMat
      );
      step.position.y = 0.22 + s * 0.45;
      step.position.z = (2 - s) * 0.55;
      group.add(step);
    }

    const baseH = 1.35;
    const colH = height - baseH - 2.1;
    const colRadius = Math.min(0.68, width / (numCols * 4.2));
    const colGeo = new THREE.CylinderGeometry(colRadius * 0.88, colRadius, colH, 14);

    for (let i = 0; i < numCols; i++) {
      const t = numCols === 1 ? 0.5 : i / (numCols - 1);
      const cx = -width * 0.44 + t * width * 0.88;
      const col = new THREE.Mesh(colGeo, this.whiteMarbleMat);
      col.position.set(cx, baseH + colH * 0.5, depth * 0.36);
      group.add(col);

      // 柱头与柱础
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(colRadius * 2.5, 0.55, colRadius * 2.5),
        this.stoneTrimMat
      );
      cap.position.set(cx, baseH + colH + 0.2, depth * 0.36);
      group.add(cap);
    }

    // 额枋与檐部 (Entablature)
    const entab = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.8, 1.75, depth),
      this.stoneTrimMat
    );
    entab.position.y = height - 0.9;
    group.add(entab);

    // 三角山花 (Pediment)
    const pedH = Math.min(4.6, width * 0.19);
    const pediment = new THREE.Mesh(
      createPedimentGeometry(width + 1.4, pedH, depth + 0.4),
      this.stoneTrimMat
    );
    pediment.position.y = height + pedH * 0.5 - 0.05;
    group.add(pediment);

    // 门廊双坡顶背景收口
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, pedH * 0.55, depth * 0.9),
      roofMat
    );
    roofCap.position.y = height + pedH * 0.26;
    group.add(roofCap);

    return group;
  }

  /**
   * 罗曼式肋拱大穹顶（廖凯原法学楼 / 李兆基图书馆 / 行政中心）
   */
  makeClassicalDome(radius, drumH, domeH, domeMat, withLantern = true) {
    const group = new THREE.Group();

    // 方形过渡基座
    const sqBase = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2.15, 2.2, radius * 2.15),
      this.stoneTrimMat
    );
    sqBase.position.y = 1.1;
    group.add(sqBase);

    // 多边形古典柱廊鼓座 (Colonnaded Drum)
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.04, drumH, 24),
      this.drumGlowMat
    );
    drum.position.y = 2.2 + drumH * 0.5;
    group.add(drum);

    // 鼓座外圈16根壁柱
    const pilasterGeo = new THREE.CylinderGeometry(0.28, 0.32, drumH - 0.4, 8);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const pil = new THREE.Mesh(pilasterGeo, this.whiteMarbleMat);
      pil.position.set(
        Math.cos(ang) * (radius + 0.18),
        2.2 + drumH * 0.5,
        Math.sin(ang) * (radius + 0.18)
      );
      group.add(pil);
    }

    // 鼓座檐口环
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.09, radius * 1.07, 0.85, 28),
      this.stoneTrimMat
    );
    ring.position.y = 2.2 + drumH + 0.3;
    group.add(ring);

    // 半球肋拱穹顶
    const domeGeo = new THREE.SphereGeometry(radius * 1.02, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    domeGeo.scale(1, domeH / radius, 1);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 2.2 + drumH + 0.5;
    group.add(dome);

    // 顶部采光亭 (Cupola Lantern)
    if (withLantern) {
      const topY = 2.2 + drumH + 0.5 + domeH;
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.22, radius * 0.25, 3.2, 12),
        this.lanternGlowMat
      );
      lantern.position.y = topY + 1.2;
      group.add(lantern);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.27, 2.2, 12),
        domeMat
      );
      cap.position.y = topY + 3.8;
      group.add(cap);

      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.14, 2.4, 8),
        this.bronzeMat
      );
      spire.position.y = topY + 5.6;
      group.add(spire);
    }

    return group;
  }

  /**
   * 定制地标构建入口
   */
  buildLandmark(lm) {
    const group = new THREE.Group();
    group.position.set(lm.x, 0, lm.z);

    const wallMat = this.getWallMat(lm.wallTone);
    const roofMat = this.getRoofMat(lm.roofType);

    switch (lm.archType) {
      case 'main-gate':
        this.populateMainGate(group);
        break;
      case 'lawn-monument':
        this.populateCentralLawn(group, lm);
        break;
      case 'classical-palace':
        this.populateAdminPalace(group, lm, wallMat);
        break;
      case 'library-classical':
        this.populateLibrary(group, lm, wallMat);
        break;
      case 'law-dome':
        this.populateLawBuilding(group, lm, wallMat);
        break;
      case 'zhihua-bridge':
        this.populateZhihuaComplex(group, lm, wallMat);
        break;
      case 'science-courtyard':
      case 'courtyard-classical':
        this.populateCourtyardScience(group, lm, wallMat, roofMat);
        break;
      case 'mega-science-e':
        this.populateMegaChemistry(group, lm, wallMat, roofMat);
        break;
      case 'mega-science-twin':
        this.populateTwinCourtyardScience(group, lm, wallMat, roofMat);
        break;
      case 'math-villa':
        this.populateMathCenter(group, lm, wallMat, roofMat);
        break;
      case 'gymnasium-arch':
        this.populateGymnasium(group, lm);
        break;
      case 'stadium':
        this.populateStadium(group, lm);
        break;
      case 'ball-courts':
        this.populateBallCourts(group, lm);
        break;
      case 'canteen-classical':
      case 'utility-classical':
        this.populateCanteenOrService(group, lm, wallMat, roofMat);
        break;
      case 'north-dorm-cluster':
        this.populateNorthDorms(group);
        break;
      case 'living-park-cluster':
        this.populateLivingPark(group);
        break;
      case 'sub-gate':
        this.populateSubGate(group, lm);
        break;
      case 'metro-station':
        this.populateMetroStation(group);
        break;
      case 'lake-marker': {
        // 湖畔亲水观景石台与铭牌拾取体
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(14, 0.6, 6),
          this.stoneTrimMat
        );
        deck.position.set(0, 0.35, -lm.d * 0.35);
        group.add(deck);
        break;
      }
      default:
        group.add(this.makeClassicalBlock(lm.w, lm.h, lm.d, wallMat, roofMat));
    }

    this.registerPickable(group, lm);
    return group;
  }

  // ==================== 1. 一号门（淞沪路2005号欧式凯旋柱廊大门） ====================
  populateMainGate(group) {
    // 门前花岗岩广场垫层
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.35, 64),
      this.graniteBaseMat
    );
    pad.position.y = 0.18;
    group.add(pad);

    // 中央三联凯旋拱门主楼 (面向 +X 淞沪路)
    const pierPositions = [-13.5, -5.2, 5.2, 13.5];
    pierPositions.forEach((pz, idx) => {
      const isOuter = idx === 0 || idx === 3;
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(isOuter ? 5.2 : 4.2, 13.2, isOuter ? 4.8 : 3.6),
        this.whiteMarbleMat
      );
      pier.position.set(0, 6.6, pz);
      group.add(pier);

      // 双排科林斯附壁石柱
      [-2.5, 2.5].forEach((px) => {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.52, 10.6, 12),
          this.stoneTrimMat
        );
        col.position.set(px, 6.1, pz);
        group.add(col);
      });
    });

    // 凯旋门顶层横楣与阁楼压顶 (Attic Entablature)
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 3.4, 33.5),
      this.whiteMarbleMat
    );
    lintel.position.set(0, 14.6, 0);
    group.add(lintel);

    const topCap = new THREE.Mesh(
      new THREE.BoxGeometry(7.0, 1.1, 35.2),
      this.stoneTrimMat
    );
    topCap.position.set(0, 16.6, 0);
    group.add(topCap);

    // “復旦大學”鎏金匾额 (朝东面向淞沪路 + 朝西面向校内)
    const plaqueTex = createPlaqueTexture('復 旦 大 學', {
      bg: '#ebe0cc',
      fg: '#7b591c',
      border: '#b5944e',
    });
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.45,
      metalness: 0.25,
    });
    const plaqueE = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.4), plaqueMat);
    plaqueE.position.set(3.15, 14.6, 0);
    plaqueE.rotation.y = Math.PI / 2;
    group.add(plaqueE);

    const plaqueW = plaqueE.clone();
    plaqueW.position.set(-3.15, 14.6, 0);
    plaqueW.rotation.y = -Math.PI / 2;
    group.add(plaqueW);

    // 两侧对称弧形柱廊与古典门卫亭
    [-25, 25].forEach((sideZ) => {
      const pavilion = this.makeClassicalBlock(
        8.5,
        8.2,
        9.5,
        this.facades.limestone,
        this.roofs.slate,
        { roofH: 2.8 }
      );
      pavilion.position.set(-1.5, 0, sideZ);
      group.add(pavilion);

      // 连接主门与门亭的古典石柱翼廊
      const wingBeam = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.2, 9.5),
        this.stoneTrimMat
      );
      wingBeam.position.set(0, 8.6, sideZ * 0.72);
      group.add(wingBeam);

      [-2.5, 2.5].forEach((dz) => {
        const c = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.42, 8.0, 10),
          this.whiteMarbleMat
        );
        c.position.set(0, 4.0, sideZ * 0.72 + dz);
        group.add(c);
      });
    });
  }

  // ==================== 2. 韶华大道与江湾中央大草坪 ====================
  populateCentralLawn(group, lm) {
    // 翠绿模纹主草坪垫高台
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x468844,
      roughness: 0.92,
    });
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(lm.w, 0.28, lm.d),
      this.stoneTrimMat
    );
    border.position.y = 0.14;
    group.add(border);

    // 5块法式几何分割大草坪 + 横向石板步道
    const segments = 5;
    const segW = (lm.w - 24) / segments;
    for (let i = 0; i < segments; i++) {
      const sx = -lm.w * 0.5 + 12 + segW * (i + 0.5);
      const turf = new THREE.Mesh(
        new THREE.BoxGeometry(segW - 4.5, 0.34, lm.d - 5),
        lawnMat
      );
      turf.position.set(sx, 0.2, 0);
      group.add(turf);
    }

    // 西端升旗礼仪石台（正对行政会议中心）
    const flagPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.9, 20),
      this.whiteMarbleMat
    );
    flagPlatform.position.set(-lm.w * 0.5 + 14, 0.45, 0);
    group.add(flagPlatform);

    [-4.5, 0, 4.5].forEach((fz, idx) => {
      const h = idx === 1 ? 21 : 17;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.18, h, 8),
        new THREE.MeshStandardMaterial({ color: 0xdadfe4, metalness: 0.85, roughness: 0.2 })
      );
      pole.position.set(-lm.w * 0.5 + 14, h * 0.5 + 0.9, fz);
      group.add(pole);

      if (idx === 1) {
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 2.6, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.65 })
        );
        flag.position.set(-lm.w * 0.5 + 16.2, h - 0.5, 0);
        group.add(flag);
      }
    });
  }

  // ==================== 3. 行政会议中心（中心轴线西端宫殿群） ====================
  populateAdminPalace(group, lm, wallMat) {
    // 门前礼仪花岗岩大广场 (面向 +X 东侧大草坪)
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(46, 0.32, 86),
      this.graniteBaseMat
    );
    plaza.position.set(36, 0.16, 0);
    group.add(plaza);

    // 主体宫殿
    const mainHall = this.makeClassicalBlock(42, 24, 52, wallMat, this.roofs.slate, { roofH: 4.5 });
    group.add(mainHall);

    // 南北对称侧翼楼
    [-34, 34].forEach((sz) => {
      const wing = this.makeClassicalBlock(54, 19, 18, wallMat, this.roofs.slate, { roofH: 3.6 });
      wing.position.set(8, 0, sz);
      group.add(wing);
    });

    // 东向8柱巨型科林斯门廊
    const portico = this.makePortico(28, 21, 11, 8, this.roofs.slate);
    portico.rotation.y = Math.PI / 2;
    portico.position.set(24, 0, 0);
    group.add(portico);

    // 中央铜绿色古典大穹顶
    const dome = this.makeClassicalDome(9.5, 6.2, 8.5, this.roofs.copperDome, true);
    dome.position.set(-1, 24, 0);
    group.add(dome);
  }

  // ==================== 4. 李兆基图书馆（伴水欧式经典馆舍） ====================
  populateLibrary(group, lm, wallMat) {
    // 南向与东向亲水花岗岩台地
    const terrace = new THREE.Mesh(
      new THREE.BoxGeometry(lm.w + 22, 0.5, lm.d + 18),
      this.graniteBaseMat
    );
    terrace.position.set(4, 0.25, 2);
    group.add(terrace);

    // 主馆四层厚重欧式主体
    const core = this.makeClassicalBlock(68, 21.5, 48, wallMat, this.roofs.slate, { roofH: 4.2 });
    group.add(core);

    // 四角古典凸出塔楼 (Corner Pavilions)
    [
      [-32, -21],
      [32, -21],
      [-32, 21],
      [32, 21],
    ].forEach(([cx, cz]) => {
      const pav = this.makeClassicalBlock(16, 23.5, 16, wallMat, this.roofs.slate, { roofH: 4.4 });
      pav.position.set(cx, 0, cz);
      group.add(pav);
    });

    // 南向正门柱廊（面向韶华大道与中央大草坪）
    const southPortico = this.makePortico(24, 19.5, 9, 6, this.roofs.slate);
    southPortico.position.set(0, 0, 27);
    group.add(southPortico);

    // 东向临日湖半圆弧形阅览大厅凸窗 (Rotunda Reading Room overlooking Ri Lake)
    const rotunda = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11.4, 18.5, 20),
      this.glassAtriumMat
    );
    rotunda.position.set(37, 10.2, 0);
    group.add(rotunda);

    const rotundaCap = new THREE.Mesh(
      new THREE.ConeGeometry(12, 4.2, 20),
      this.roofs.slateDome
    );
    rotundaCap.position.set(37, 21.5, 0);
    group.add(rotundaCap);

    // 馆顶中央八角采光穹顶
    const dome = this.makeClassicalDome(8.2, 4.5, 6.8, this.roofs.slateDome, true);
    dome.position.set(0, 21.5, 0);
    group.add(dome);
  }

  // ==================== 5. 廖凯原法学楼（巨型肋拱穹顶 + 獬豸神兽广场） ====================
  populateLawBuilding(group, lm, wallMat) {
    // 青石礼仪广场
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(lm.w + 18, 0.42, lm.d + 22),
      this.graniteBaseMat
    );
    plaza.position.y = 0.21;
    group.add(plaza);

    // 对称回字形四翼法学大楼主体
    const mainCenter = this.makeClassicalBlock(48, 22.5, 36, wallMat, this.roofs.slate, { roofH: 3.8 });
    group.add(mainCenter);

    // 东西对称翼楼
    [-36, 36].forEach((wx) => {
      const wing = this.makeClassicalBlock(22, 21, 60, wallMat, this.roofs.slate, { roofH: 4.0 });
      wing.position.set(wx, 0, 0);
      group.add(wing);
    });

    // 北向正门巨柱门廊（面向纬七路与中央大草坪）
    const northPortico = this.makePortico(28, 21, 11, 8, this.roofs.slate);
    northPortico.rotation.y = Math.PI;
    northPortico.position.set(0, 0, -22);
    group.add(northPortico);

    // 南向门廊
    const southPortico = this.makePortico(24, 19.5, 9, 6, this.roofs.slate);
    southPortico.position.set(0, 0, 22);
    group.add(southPortico);

    // 标志性国会/万神殿式高耸石材肋拱大穹顶！
    const grandDome = this.makeClassicalDome(11.2, 8.2, 10.6, this.roofs.grandStoneDome, true);
    grandDome.position.set(0, 22.5, 0);
    group.add(grandDome);

    // 门前青石长阶两侧守护神兽“獬豸”雕塑 (Twin Xiezhi Guardian Statues)
    [-11.5, 11.5].forEach((sx) => {
      const ped = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.2, 3.4),
        this.whiteMarbleMat
      );
      ped.position.set(sx, 1.3, -31.5);
      group.add(ped);

      // 獬豸躯干、昂首与独角
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.45, 2.2), this.bronzeMat);
      body.position.set(sx, 3.1, -31.4);
      group.add(body);

      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 1.1), this.bronzeMat);
      chest.position.set(sx, 3.65, -32.2);
      group.add(chest);

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 6), this.bronzeMat);
      horn.position.set(sx, 4.95, -32.4);
      horn.rotation.x = -0.25;
      group.add(horn);
    });
  }

  // ==================== 6. 智华楼（JA/JB教学楼 + 跨经二路标志性三连拱长桥洞） ====================
  populateZhihuaComplex(group, lm, wallMat) {
    // 智华楼中心位于 (-20, 173)，正跨经二路 (X = -20 -> 局部 X = 0)！
    // 局部 X ∈ [-11, +11] 为经二路与两侧非机动车道/人行拱洞净空！

    // 东翼 JA 教学楼（U形围合院落，局部 X > +12）
    const jaMain = this.makeClassicalBlock(38, 20.5, 18, wallMat, this.roofs.terracotta);
    jaMain.position.set(33, 0, -20);
    group.add(jaMain);

    const jaSouth = this.makeClassicalBlock(38, 20.5, 18, wallMat, this.roofs.terracotta);
    jaSouth.position.set(33, 0, 20);
    group.add(jaSouth);

    const jaEast = this.makeClassicalBlock(16, 21.5, 56, wallMat, this.roofs.terracotta);
    jaEast.position.set(46, 0, 0);
    group.add(jaEast);

    // 西翼 JB 教学楼（U形围合院落，局部 X < -12）
    const jbMain = this.makeClassicalBlock(38, 20.5, 18, wallMat, this.roofs.terracotta);
    jbMain.position.set(-33, 0, -20);
    group.add(jbMain);

    const jbSouth = this.makeClassicalBlock(38, 20.5, 18, wallMat, this.roofs.terracotta);
    jbSouth.position.set(-33, 0, 20);
    group.add(jbSouth);

    const jbWest = this.makeClassicalBlock(16, 21.5, 56, wallMat, this.roofs.terracotta);
    jbWest.position.set(-46, 0, 0);
    group.add(jbWest);

    // 西侧扇形/八角阶梯大报告厅 (JC 报告厅)
    const lectureHall = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 15, 14, 8),
      wallMat
    );
    lectureHall.position.set(-66, 7, 0);
    group.add(lectureHall);
    const lectureRoof = new THREE.Mesh(
      new THREE.ConeGeometry(16, 4.5, 8),
      this.roofs.terracotta
    );
    lectureRoof.position.set(-66, 16.2, 0);
    group.add(lectureRoof);

    // 核心灵魂：横跨经二路的“长长的三连拱桥洞”过街天桥楼！(局部 X ∈ [-15, +15], Z ∈ [-18, +18])
    // 4座厚重花岗岩桥墩（留出中央 9m 主车行拱洞 + 两侧各 4.6m 单车/行人拱洞，完全不挡路！）
    const archPierX = [-13.2, -5.6, 5.6, 13.2];
    const bridgeDepth = 34; // 长长的桥洞纵深 34 米！
    archPierX.forEach((px) => {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 9.2, bridgeDepth),
        this.graniteBaseMat
      );
      pier.position.set(px, 4.6, 0);
      group.add(pier);
    });

    // 拱券顶饰（南北两端做出精致半圆石拱门楣效果）
    [-bridgeDepth / 2 + 0.8, bridgeDepth / 2 - 0.8].forEach((az) => {
      [
        { cx: 0, span: 8.6 },
        { cx: -9.4, span: 5.0 },
        { cx: 9.4, span: 5.0 },
      ].forEach(({ cx, span }) => {
        const archRing = new THREE.Mesh(
          new THREE.TorusGeometry(span * 0.5, 0.55, 8, 18, Math.PI),
          this.whiteMarbleMat
        );
        archRing.position.set(cx, 6.2, az);
        group.add(archRing);
      });
    });

    // 桥洞上方 3-5 层过街连廊教学楼 (Y = 9.2m 至 22m)
    const upperBridgeBody = new THREE.Mesh(
      createScaledWallBox(30, 11.8, bridgeDepth),
      wallMat
    );
    upperBridgeBody.position.set(0, 9.2 + 5.9, 0);
    group.add(upperBridgeBody);

    const upperCornice = new THREE.Mesh(
      new THREE.BoxGeometry(31.4, 0.9, bridgeDepth + 1.4),
      this.stoneTrimMat
    );
    upperCornice.position.set(0, 21.4, 0);
    group.add(upperCornice);

    const bridgeRoof = new THREE.Mesh(
      createHipRoofGeometry(30, bridgeDepth, 4.4, 1.1),
      this.roofs.terracotta
    );
    bridgeRoof.position.set(0, 21.8, 0);
    group.add(bridgeRoof);

    // 桥楼南北两侧古典钟楼山花
    [-bridgeDepth / 2 - 0.3, bridgeDepth / 2 + 0.3].forEach((gz) => {
      const ped = new THREE.Mesh(
        createPedimentGeometry(15, 3.6, 1.2),
        this.whiteMarbleMat
      );
      ped.position.set(0, 22.8, gz);
      group.add(ped);
    });
  }

  // ==================== 7. 北区标准围合院落科研大楼（生科、物理、环科、先材、交叉一号等） ====================
  populateCourtyardScience(group, lm, wallMat, roofMat) {
    const { w, d, h } = lm;
    const wingT = Math.min(17, Math.max(13, Math.min(w, d) * 0.26));

    // 南北主楼 + 东西连翼 -> 围合成欧式学术内院
    const northWing = this.makeClassicalBlock(w, h, wingT, wallMat, roofMat);
    northWing.position.z = -d * 0.5 + wingT * 0.5;
    group.add(northWing);

    const southWing = this.makeClassicalBlock(w, h, wingT, wallMat, roofMat);
    southWing.position.z = d * 0.5 - wingT * 0.5;
    group.add(southWing);

    const sideD = Math.max(8, d - wingT * 1.6);
    [-w * 0.5 + wingT * 0.5, w * 0.5 - wingT * 0.5].forEach((sx) => {
      const sideWing = this.makeClassicalBlock(wingT, h - 1.2, sideD, wallMat, roofMat);
      sideWing.position.x = sx;
      group.add(sideWing);
    });

    // 主入口古典门廊
    const portico = this.makePortico(Math.min(20, w * 0.28), h - 2.5, 7, 4, roofMat);
    portico.position.set(0, 0, d * 0.5 + 2.2);
    group.add(portico);

    // 生命科学大楼专属细节：门前院名泰山巨石 + 东侧科研生态玻璃温室！
    if (lm.hasBoulder) {
      const boulderGeo = new THREE.DodecahedronGeometry(3.2, 1);
      boulderGeo.scale(1.65, 0.95, 0.72);
      const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x8e8679,
        roughness: 0.88,
      });
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.position.set(-16, 2.2, d * 0.5 + 8.5);
      group.add(boulder);

      const inscTex = createPlaqueTexture('生命科学学院', {
        bg: '#8a8275',
        fg: '#a62626',
        border: '#756e63',
      });
      const insc = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 1.35),
        new THREE.MeshStandardMaterial({ map: inscTex, roughness: 0.8 })
      );
      insc.position.set(-16, 2.4, d * 0.5 + 10.85);
      group.add(insc);
    }

    if (lm.hasGreenhouse) {
      const gh = new THREE.Mesh(
        new THREE.BoxGeometry(16, 8.5, 24),
        this.glassAtriumMat
      );
      gh.position.set(w * 0.5 + 9, 4.25, 0);
      group.add(gh);
    }

    // 环境科学楼专属细节：屋顶白色气象雷达圆顶与大气通量观测塔！
    if (lm.hasWeatherDome) {
      const radarBase = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.5, 2.6, 14),
        this.whiteMarbleMat
      );
      radarBase.position.set(w * 0.26, h + 3.2, -d * 0.5 + wingT * 0.5);
      group.add(radarBase);

      const radome = new THREE.Mesh(
        new THREE.SphereGeometry(3.8, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0xf6f8fa, roughness: 0.35 })
      );
      radome.position.set(w * 0.26, h + 6.8, -d * 0.5 + wingT * 0.5);
      group.add(radome);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.35, 11, 8),
        new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.7 })
      );
      mast.position.set(-w * 0.26, h + 7.5, -d * 0.5 + wingT * 0.5);
      group.add(mast);
    }
  }

  // ==================== 8. 化学与高分子楼（6万㎡ E字形三院落旗舰实验群） ====================
  populateMegaChemistry(group, lm, wallMat, roofMat) {
    const { w, d, h } = lm;
    // 西侧南北向主脊楼
    const spine = this.makeClassicalBlock(18, h, d, wallMat, roofMat);
    spine.position.x = -w * 0.5 + 9;
    group.add(spine);

    // 三条东西向平行实验长翼（北翼、中翼、南翼）
    [-d * 0.38, 0, d * 0.38].forEach((wz, idx) => {
      const wing = this.makeClassicalBlock(w - 14, idx === 1 ? h + 1.5 : h, 17, wallMat, roofMat);
      wing.position.set(7, 0, wz);
      group.add(wing);

      // 屋顶实验室洁净排风阁楼罩
      for (let rx = -16; rx <= 24; rx += 20) {
        const vent = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 2.2, 3.2),
          this.stoneTrimMat
        );
        vent.position.set(rx, h + 3.2, wz);
        group.add(vent);
      }
    });

    // 东向与南向双柱廊入口
    const westPortico = this.makePortico(20, h - 3, 7, 6, roofMat);
    westPortico.rotation.y = -Math.PI / 2;
    westPortico.position.set(-w * 0.5 - 2, 0, 0);
    group.add(westPortico);
  }

  // ==================== 9. 二号交叉学科楼 / 融合创新二号楼（双中庭采光巨型综合体） ====================
  populateTwinCourtyardScience(group, lm, wallMat, roofMat) {
    const { w, d, h } = lm;
    const barD = 16;

    // 北翼、中脊、南翼
    [-d * 0.5 + barD * 0.5, 0, d * 0.5 - barD * 0.5].forEach((bz, i) => {
      const bar = this.makeClassicalBlock(w, i === 1 ? h + 1.2 : h, barD, wallMat, roofMat);
      bar.position.z = bz;
      group.add(bar);
    });

    // 西翼、中央连廊、东翼
    [-w * 0.5 + 8, 0, w * 0.5 - 8].forEach((bx) => {
      const conn = this.makeClassicalBlock(16, h, d - barD * 1.4, wallMat, roofMat);
      conn.position.x = bx;
      group.add(conn);
    });

    // 中央玻璃采光穹顶中庭（呼应交叉二号楼明亮中庭与抹云咖啡厅）
    [-w * 0.22, w * 0.22].forEach((ax) => {
      const skylight = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.24, 2.4, d * 0.32),
        this.glassAtriumMat
      );
      skylight.position.set(ax, h + 0.6, 0);
      group.add(skylight);
    });

    const southPortico = this.makePortico(22, h - 3, 8, 6, roofMat);
    southPortico.position.set(0, 0, d * 0.5 + 2.5);
    group.add(southPortico);
  }

  // ==================== 10. 上海数学中心（典雅围合书院别墅） ====================
  populateMathCenter(group, lm, wallMat, roofMat) {
    const { w, d, h } = lm;
    const t = 12.5;
    // 精致四合书院
    [-d * 0.5 + t * 0.5, d * 0.5 - t * 0.5].forEach((z) => {
      const b = this.makeClassicalBlock(w, h, t, wallMat, roofMat);
      b.position.z = z;
      group.add(b);
    });
    [-w * 0.5 + t * 0.5, w * 0.5 - t * 0.5].forEach((x) => {
      const b = this.makeClassicalBlock(t, h - 1, d - t * 1.4, wallMat, roofMat);
      b.position.x = x;
      group.add(b);
    });
    // 中庭学者花园圆形镜面水池
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 6.8, 0.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x3b7a8c, roughness: 0.15, metalness: 0.4 })
    );
    pond.position.y = 0.35;
    group.add(pond);

    const portico = this.makePortico(16, h - 1.5, 6, 4, roofMat);
    portico.position.set(0, 0, d * 0.5 + 2);
    group.add(portico);
  }

  // ==================== 11. 综合体育馆与室内游泳馆（大跨度银灰金属拱顶 + 石材柱廊） ====================
  populateGymnasium(group, lm) {
    // 体育馆台基
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(lm.w + 10, 1.8, lm.d + 10),
      this.graniteBaseMat
    );
    podium.position.y = 0.9;
    group.add(podium);

    // 主比赛馆（西侧大馆）+ 恒温游泳馆（东侧副馆）
    const mainGlass = new THREE.Mesh(
      new THREE.BoxGeometry(68, 15.5, 58),
      this.glassAtriumMat
    );
    mainGlass.position.set(-18, 9.5, 0);
    group.add(mainGlass);

    const poolGlass = new THREE.Mesh(
      new THREE.BoxGeometry(42, 12.5, 48),
      this.glassAtriumMat
    );
    poolGlass.position.set(38, 8.0, 2);
    group.add(poolGlass);

    // 四周欧式古典石柱外廊（使现代大跨度场馆与江湾欧式风貌浑然一体）
    for (let x = -50; x <= 56; x += 8.8) {
      [-31, 31].forEach((z) => {
        if (x > 16 && Math.abs(z) > 27) return;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.58, 14, 10),
          this.stoneTrimMat
        );
        col.position.set(x, 8.8, z);
        group.add(col);
      });
    }

    // 大跨度弧形金属拱顶（主馆 + 泳池馆双拱）
    const mainVaultGeo = new THREE.CylinderGeometry(33, 33, 74, 24, 1, false, -Math.PI * 0.36, Math.PI * 0.72);
    mainVaultGeo.rotateZ(Math.PI / 2);
    mainVaultGeo.scale(1, 0.38, 1.04);
    const mainVault = new THREE.Mesh(mainVaultGeo, this.roofs.arenaSilver);
    mainVault.position.set(-18, 10.2, 0);
    group.add(mainVault);

    const poolVaultGeo = new THREE.CylinderGeometry(26, 26, 46, 20, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
    poolVaultGeo.rotateZ(Math.PI / 2);
    poolVaultGeo.scale(1, 0.34, 1.0);
    const poolVault = new THREE.Mesh(poolVaultGeo, this.roofs.arenaSilver);
    poolVault.position.set(38, 8.8, 2);
    group.add(poolVault);
  }

  // ==================== 12. 室外标准400米田径运动场与看台灯塔 ====================
  populateStadium(group, lm) {
    // 跑道与足球场面层在 landscape.js 中高精度贴图铺设，此处构建西侧挑篷看台、球门与四座高杆灯塔
    // 西看台阶梯席位
    for (let tier = 0; tier < 6; tier++) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(11 - tier * 1.4, 1.2, 86),
        tier % 2 === 0 ? this.stoneTrimMat : this.graniteBaseMat
      );
      stand.position.set(-lm.w * 0.44 - tier * 0.7, 0.6 + tier * 1.15, 0);
      group.add(stand);
    }

    // 现代张拉膜白色悬挑雨棚
    const canopyGeo = new THREE.CylinderGeometry(14, 14, 92, 16, 1, false, 0, Math.PI * 0.45);
    canopyGeo.rotateX(Math.PI / 2);
    const canopy = new THREE.Mesh(
      canopyGeo,
      new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4, side: THREE.DoubleSide })
    );
    canopy.position.set(-lm.w * 0.48, 11.5, 0);
    group.add(canopy);

    // 南北标准足球门
    [-44, 44].forEach((gz) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(7.32, 2.44, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true })
      );
      bar.position.set(4, 1.25, gz);
      group.add(bar);
    });

    // 四座28米高球场照明灯塔
    [
      [-54, -76],
      [56, -76],
      [-54, 76],
      [56, 76],
    ].forEach(([lx, lz]) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.55, 28, 8),
        new THREE.MeshStandardMaterial({ color: 0xcfd5dc, metalness: 0.75, roughness: 0.3 })
      );
      pole.position.set(lx, 14, lz);
      group.add(pole);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 2.2, 1.0),
        this.lanternGlowMat
      );
      panel.position.set(lx, 28.2, lz);
      panel.lookAt(lm.x, 0, lm.z);
      group.add(panel);
    });
  }

  // ==================== 13. 西区篮排网球场群（篮架与球网） ====================
  populateBallCourts(group) {
    const hoopMat = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.6 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    for (let row = -1; row <= 1; row += 2) {
      for (let col = -1.5; col <= 1.5; col += 1) {
        const cx = col * 21;
        const cz = row * 17;
        [-11.5, 11.5].forEach((dz) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 6), hoopMat);
          post.position.set(cx, 1.7, cz + dz);
          group.add(post);

          const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.1), boardMat);
          board.position.set(cx, 3.05, cz + dz * 0.92);
          group.add(board);
        });
      }
    }
  }

  // ==================== 14. 食堂与公共活动中心（南食堂 / 北食堂 / 光华Mall） ====================
  populateCanteenOrService(group, lm, wallMat, roofMat) {
    const main = this.makeClassicalBlock(lm.w, lm.h, lm.d, wallMat, roofMat);
    group.add(main);

    // 首层暖光通透拱廊门厅
    const arcade = new THREE.Mesh(
      new THREE.BoxGeometry(lm.w * 0.62, 6.2, 5.5),
      this.glassAtriumMat
    );
    arcade.position.set(0, 3.4, lm.d * 0.5 + 1.8);
    group.add(arcade);

    const portico = this.makePortico(Math.min(18, lm.w * 0.34), lm.h - 1.5, 6.5, 4, roofMat);
    portico.position.set(0, 0, lm.d * 0.5 + 2.4);
    group.add(portico);
  }

  // ==================== 15. 北区新建学生宿舍群（一/二期 8栋庭院书院公寓 + 后勤公寓） ====================
  populateNorthDorms(group) {
    const dormWall = this.facades.dormitory;
    const roof = this.roofs.terracotta;
    // 中心 (-355, -415) -> 8栋 7层坡顶公寓分列东西两列四排 + 北缘后勤公寓
    const offsets = [
      [-38, -54], [38, -54],
      [-38, -18], [38, -18],
      [-38, 18], [38, 18],
      [-38, 54], [38, 54],
    ];
    offsets.forEach(([ox, oz]) => {
      const bldg = this.makeClassicalBlock(48, 24.5, 16.5, dormWall, roof, { roofH: 3.8 });
      bldg.position.set(ox, 0, oz);
      group.add(bldg);
    });
  }

  // ==================== 16. 江湾生活园区（国权北路1380号 · 13幢/1-17号宿舍楼群） ====================
  populateLivingPark(group) {
    const dormWall = this.facades.dormitory;
    const roof = this.roofs.terracotta;

    // 园区独立围墙四角门柱与绿化步道托盘
    const parkPad = new THREE.Mesh(
      new THREE.BoxGeometry(326, 0.18, 232),
      new THREE.MeshStandardMaterial({ color: 0x457943, roughness: 0.94 })
    );
    parkPad.position.y = 0.08;
    group.add(parkPad);

    // 真实还原13幢宿舍楼（5-6、7-8、9-10、11-12、13-14号为长体量双联幢，其余为独立幢，15号物业浴室在西侧，中央留给光华Mall）
    const dormLayout = [
      // 北排四幢 (1, 2, 3, 4号楼)
      { x: -112, z: -82, w: 46, d: 15, h: 20.5 },
      { x: -46, z: -82, w: 46, d: 15, h: 20.5 },
      { x: 46, z: -82, w: 46, d: 15, h: 20.5 },
      { x: 112, z: -82, w: 46, d: 15, h: 20.5 },
      // 中北双联幢 (5-6号楼, 7-8号楼)
      { x: -92, z: -38, w: 72, d: 15.5, h: 21.5 },
      { x: 92, z: -38, w: 72, d: 15.5, h: 21.5 },
      // 中南双联幢 (9-10号楼, 11-12号楼)
      { x: -92, z: 32, w: 72, d: 15.5, h: 21.5 },
      { x: 92, z: 32, w: 72, d: 15.5, h: 21.5 },
      // 南排双联幢与独立幢 (13-14号楼, 15号物业/浴室, 16号楼, 17号楼)
      { x: -98, z: 78, w: 68, d: 15.5, h: 21 },
      { x: -18, z: 78, w: 38, d: 15, h: 16 },
      { x: 48, z: 78, w: 48, d: 15.5, h: 21 },
      { x: 112, z: 78, w: 48, d: 15.5, h: 21 },
      // 园区北大门门廊（正对主校区六号门）
      { x: -110, z: -116, w: 22, d: 7, h: 9.5 },
    ];

    dormLayout.forEach((cfg) => {
      const b = this.makeClassicalBlock(cfg.w, cfg.h, cfg.d, dormWall, roof, { roofH: 3.4 });
      b.position.set(cfg.x, 0, cfg.z);
      group.add(b);
    });
  }

  // ==================== 17. 二/四/五/六号校门与地铁10号线站点 ====================
  populateSubGate(group, lm) {
    const isEW = lm.gateOrient === 'east' || lm.gateOrient === 'west';
    const spanAxisZ = isEW;

    [-9, 9].forEach((offset) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 9.2, 3.2),
        this.whiteMarbleMat
      );
      pillar.position.set(spanAxisZ ? 0 : offset, 4.6, spanAxisZ ? offset : 0);
      group.add(pillar);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 10, 10),
        this.lanternGlowMat
      );
      lamp.position.set(spanAxisZ ? 0 : offset, 9.6, spanAxisZ ? offset : 0);
      group.add(lamp);
    });

    // 侧旁欧式门卫室
    const guard = this.makeClassicalBlock(6.5, 6.2, 6.5, this.facades.limestone, this.roofs.slate);
    guard.position.set(spanAxisZ ? -2 : 14.5, 0, spanAxisZ ? 14.5 : 2);
    group.add(guard);
  }

  populateMetroStation(group) {
    // 上海地铁10号线现代弧形玻璃出入口雨棚（国帆路站 + 新江湾城站）
    [0, 690].forEach((dz) => {
      const sub = new THREE.Group();
      sub.position.z = dz;
      const base = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 20), this.graniteBaseMat);
      base.position.y = 0.6;
      sub.add(base);

      const shell = new THREE.Mesh(new THREE.BoxGeometry(8.6, 5.2, 16), this.glassAtriumMat);
      shell.position.y = 3.2;
      sub.add(shell);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(10.4, 0.6, 18.5),
        new THREE.MeshStandardMaterial({ color: 0x6f4b8b, roughness: 0.4 }) // 上海地铁10号线淡紫标识带
      );
      roof.position.y = 6.0;
      sub.add(roof);
      group.add(sub);
    });
  }

  // ==================== 18. 14座欧式汉白玉栏杆石拱桥 ====================
  buildBridge(b) {
    const group = new THREE.Group();
    group.position.set(b.x, 0, b.z);
    if (b.axis === 'z') {
      group.rotation.y = Math.PI / 2;
    }

    const span = b.span;
    const width = b.width;

    // 拱桥石板路面微拱
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(span + 4, 0.9, width),
      this.graniteBaseMat
    );
    deck.position.y = 0.65;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    // 桥侧汉白玉古典护栏 + 桥头望柱与球灯
    [-width * 0.5 + 0.45, width * 0.5 - 0.45].forEach((rz) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(span + 4, 1.15, 0.65),
        this.whiteMarbleMat
      );
      rail.position.set(0, 1.65, rz);
      rail.castShadow = true;
      group.add(rail);

      [-(span * 0.5 + 1.6), 0, span * 0.5 + 1.6].forEach((px) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.85, 1.1),
          this.whiteMarbleMat
        );
        post.position.set(px, 1.85, rz);
        group.add(post);

        if (b.grand || px !== 0) {
          const globe = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 10, 10),
            this.lanternGlowMat
          );
          globe.position.set(px, 3.05, rz);
          group.add(globe);
        }
      });
    });

    return group;
  }

  /**
   * 随时间平滑更新全校建筑灯火强度
   */
  updateNightLighting(nightFactor) {
    this.emissiveList.forEach((mat) => {
      mat.emissiveIntensity = nightFactor * 1.15;
    });
    this.glassAtriumMat.emissiveIntensity = 0.06 + nightFactor * 0.85;
    this.drumGlowMat.emissiveIntensity = 0.03 + nightFactor * 0.72;
    this.lanternGlowMat.emissiveIntensity = 0.15 + nightFactor * 1.65;
  }
}
