// Master Spatial, Topographical & Pilgrimage Coordinate Plan for Otowa-san Kiyomizu-dera (音羽山 清水寺)
// World Units: 1 unit = 1 meter
// Axes: +X = East (uphill into Mt. Otowa), -X = West (downhill overlooking Kyoto City)
//       -Z = North (Joju-in / Jishu Shrine), +Z = South (Kin'un-kei Gorge & Koyasu Pagoda)
//       +Y = Elevation above lower Kiyomizu-zaka baseline (m)

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function boxInfluence(x, z, cx, cz, hx, hz, feather = 6.0) {
  const dx = Math.abs(x - cx) - hx;
  const dz = Math.abs(z - cz) - hz;
  const outside = Math.max(dx, dz);
  if (outside <= 0) return 1.0;
  if (outside >= feather) return 0.0;
  return 1.0 - smoothstep(0, feather, outside);
}

function segmentInfluence(x, z, ax, az, bx, bz, halfWidth, feather = 4.0) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / lenSq));
  const px = ax + abx * t;
  const pz = az + abz * t;
  const dist = Math.hypot(x - px, z - pz);
  let w = 1.0;
  if (dist > halfWidth) {
    w = dist >= halfWidth + feather ? 0.0 : 1.0 - smoothstep(0, feather, dist - halfWidth);
  }
  return { weight: w, t, dist };
}

// Graded flat terraces across the mountainside
export const TERRACES = [
  // T1: Nio-mon, Umatodome & Shoro lower precinct
  { id: 'niomon_court', cx: -96, cz: -2, hx: 11, hz: 16, y: 10.5, feather: 5.5, wallSouth: true, wallWest: true },
  // Shoro & Zuigu-do terrace
  { id: 'shoro_terrace', cx: -82, cz: -11, hx: 8, hz: 7, y: 12.0, feather: 4.5 },
  { id: 'zuigudo_terrace', cx: -64, cz: -14, hx: 11, hz: 9, y: 14.2, feather: 5.0 },
  // Daikodo northern terrace
  { id: 'daikodo_terrace', cx: -82, cz: -44, hx: 17, hz: 14, y: 13.5, feather: 6.5 },
  // T2: Sai-mon, Sanju-no-to, Kyo-do, Tamura-do upper terrace
  { id: 'saimon_pad', cx: -77, cz: 6, hx: 7, hz: 6.5, y: 15.2, feather: 4.0, wallSouth: true, wallWest: true },
  { id: 'pagoda_terrace', cx: -43, cz: 8, hx: 26, hz: 11, y: 16.8, feather: 5.0, wallSouth: true },
  // T3: Todoroki-mon, Asakura-do & Kasuga-sha forecourt
  { id: 'todoroki_court', cx: -10, cz: -6, hx: 14, hz: 15, y: 18.0, feather: 5.5 },
  // T4: Joju-in & Tsuki-no-Niwa northern sanctuary
  { id: 'jojuin_terrace', cx: -17, cz: -52, hx: 22, hz: 22, y: 19.0, feather: 7.0 },
  // T5: Hondo northern bedrock (Shodo sits on flat rock; Gejin & Stage overhang the cliff to +Z!)
  { id: 'hondo_bedrock', cx: 24, cz: -5, hx: 21, hz: 9.5, y: 18.4, feather: 3.2 },
  // T6: Jishu Jinja elevated northern shrine terrace
  { id: 'jishu_terrace', cx: 24, cz: -37, hx: 16, hz: 12, y: 23.5, feather: 5.5 },
  // T7: Shaka-do, Amida-do & Okuno-in cliffside ledge
  { id: 'shakado_ledge', cx: 61, cz: -10, hx: 11, hz: 9, y: 19.8, feather: 4.5 },
  { id: 'amidado_ledge', cx: 71, cz: 4, hx: 9, hz: 8.5, y: 19.2, feather: 4.0 },
  { id: 'okunoin_bedrock', cx: 76, cz: 18, hx: 7.5, hz: 9.0, y: 19.0, feather: 3.2 },
  // T8: Otowa Waterfall plaza & valley floor
  { id: 'otowa_plaza', cx: 53, cz: 30, hx: 12, hz: 9, y: 5.5, feather: 5.5 },
  { id: 'benten_plaza', cx: -60, cz: 31, hx: 12, hz: 8, y: 6.4, feather: 6.0 },
  // T9: Koyasu-no-to & Taisan-ji southern ridge
  { id: 'koyasu_ridge', cx: 14, cz: 92, hx: 16, hz: 12, y: 20.5, feather: 7.5 },
];

// Sloped stone roads & stairs connecting terraces
export const RAMPS_AND_PATHS = [
  // Kiyomizu-zaka approach road
  { ax: -172, az: 4, ay: 0.4, bx: -114, bz: 4, by: 6.0, halfWidth: 5.2, feather: 5.0 },
  // Grand Nio-mon staircase
  { ax: -114, az: 4, ay: 6.0, bx: -104, bz: 4, by: 10.5, halfWidth: 4.6, feather: 2.5, isStair: true, steps: 18 },
  // Nio-mon to Sai-mon staircase
  { ax: -90, az: 6, ay: 10.6, bx: -81, bz: 6, by: 15.2, halfWidth: 3.4, feather: 2.2, isStair: true, steps: 16 },
  // Nio-mon north path to Zuigu-do & Todoroki-mon
  { ax: -90, az: -3, ay: 10.6, bx: -54, bz: -4, by: 16.2, halfWidth: 3.6, feather: 3.2 },
  { ax: -54, az: -4, ay: 16.2, bx: -22, bz: 1, by: 18.0, halfWidth: 4.0, feather: 3.0 },
  // Hondo to Jishu Jinja stairs
  { ax: 24, az: -15, ay: 18.5, bx: 24, bz: -25, by: 23.5, halfWidth: 2.8, feather: 2.0, isStair: true, steps: 18 },
  // Hondo east promenade to Shaka-do & Amida-do
  { ax: 43, az: -3, ay: 18.5, bx: 54, bz: -7, by: 19.6, halfWidth: 3.2, feather: 2.8 },
  { ax: 64, az: -3, ay: 19.5, bx: 70, bz: 12, by: 19.0, halfWidth: 3.0, feather: 2.5 },
  // Cliffside stone staircase descending from East of Hondo/Okuno-in down to Otowa Waterfall
  { ax: 54, az: 4, ay: 18.6, bx: 48, bz: 23, by: 5.6, halfWidth: 2.2, feather: 2.4, isStair: true, steps: 42 },
  // Valley floor maple promenade under Hondo stage back toward Nio-mon
  { ax: 50, az: 29, ay: 5.5, bx: 18, bz: 28, by: 5.3, halfWidth: 3.2, feather: 4.0 },
  { ax: 18, az: 28, ay: 5.3, bx: -62, bz: 30, by: 6.4, halfWidth: 3.2, feather: 4.5 },
  { ax: -62, az: 30, ay: 6.4, bx: -108, bz: 12, by: 7.2, halfWidth: 3.0, feather: 4.0 },
  // Mountain trail from Okuno-in south around Kin'un-kei gorge to Koyasu-no-to
  { ax: 71, az: 27, ay: 18.6, bx: 54, bz: 64, by: 18.8, halfWidth: 2.4, feather: 4.5 },
  { ax: 54, az: 64, ay: 18.8, bx: 24, bz: 88, by: 20.5, halfWidth: 2.4, feather: 4.5 },
];

// Natural mountain + Kin'un-kei gorge height before terrace grading
export function getNaturalMountainHeight(x, z) {
  // West-to-East slope of Higashiyama / Mt. Otowa
  let h = 8.5 + (x + 115) * 0.165;

  // Higher eastern peak of Mt. Otowa behind Okuno-in & Jishu Shrine
  if (x > 40) {
    h += Math.pow((x - 40) / 55, 1.45) * 14.5;
  }
  // Gentle downhill drop into Kyoto Basin to the West
  if (x < -115) {
    h = 8.5 + (x + 115) * 0.105;
  }

  // Northern ridge rise (behind Joju-in & Jishu Jinja)
  if (z < -28) {
    h += Math.min(26, Math.pow((-28 - z) / 42, 1.35) * 13.0);
  }

  // Organic multi-frequency mountain ridge undulations
  h += Math.sin(x * 0.031 + z * 0.024) * 1.6 + Math.cos(x * 0.067 - z * 0.052) * 0.85;

  // Carve the dramatic Kin'un-kei Gorge (錦雲渓) directly South of Hondo & West of Otowa-no-taki!
  // Gorge axis curves slightly around z = 30..44 from x = -95 to x = +64
  const gorgeCenterZ = 31 + Math.sin((x - 10) * 0.022) * 5.5 + (x > 30 ? (x - 30) * 0.12 : 0);
  const gorgeDistZ = Math.abs(z - gorgeCenterZ);
  const gorgeXMask = smoothstep(-118, -72, x) * (1.0 - smoothstep(56, 76, x));
  if (gorgeXMask > 0.001) {
    const gorgeHalfWidth = 27.0;
    if (gorgeDistZ < gorgeHalfWidth) {
      const profile = Math.cos((gorgeDistZ / gorgeHalfWidth) * (Math.PI * 0.5));
      const valleyFloor = 4.6 + Math.max(0, (x + 60) * 0.012);
      const carve = Math.pow(profile, 1.35) * gorgeXMask;
      h = h * (1.0 - carve) + valleyFloor * carve;
    }
  }

  // Steep cliff cut right under Hondo Stage (x in [5..43], z in [4..28]) so the 13m drop is authentic!
  const stageCliffX = boxInfluence(x, z, 24, 15.5, 19.5, 11.5, 5.5);
  if (stageCliffX > 0) {
    // Slope rapidly from y = 18.2 at z = 3.5 down to y = 5.1 at z = 19.5
    const tSlope = Math.max(0, Math.min(1, (z - 3.2) / 15.2));
    const targetCliff = 18.2 - smoothstep(0, 1, tSlope) * 13.1;
    h = h * (1 - stageCliffX * 0.92) + targetCliff * (stageCliffX * 0.92);
  }

  // Steep cliff drop under Okuno-in Stage (facing West toward x = 58..66)
  const okunoCliff = boxInfluence(x, z, 65.5, 18, 7.5, 8.5, 4.5);
  if (okunoCliff > 0) {
    const tOkuno = Math.max(0, Math.min(1, (71.5 - x) / 13.0));
    const targetOkuno = 18.8 - smoothstep(0, 1, tOkuno) * 12.6;
    h = h * (1 - okunoCliff * 0.88) + targetOkuno * (okunoCliff * 0.88);
  }

  // Southern ridge rise around Koyasu-no-to (z > 62)
  if (z > 56 && x > -55 && x < 95) {
    const southRise = smoothstep(56, 86, z) * smoothstep(-55, -10, x) * (1 - smoothstep(68, 105, x));
    h = Math.max(h, h * (1 - southRise * 0.65) + 20.2 * (southRise * 0.65));
  }

  return h;
}

// Final sculpted terrain height including flat temple terraces and sloped stone paths
export function getTerrainHeight(x, z) {
  let h = getNaturalMountainHeight(x, z);

  for (let i = 0; i < TERRACES.length; i++) {
    const t = TERRACES[i];
    const w = boxInfluence(x, z, t.cx, t.cz, t.hx, t.hz, t.feather);
    if (w > 0) {
      h = h * (1 - w) + t.y * w;
    }
  }

  for (let i = 0; i < RAMPS_AND_PATHS.length; i++) {
    const r = RAMPS_AND_PATHS[i];
    const { weight, t } = segmentInfluence(x, z, r.ax, r.az, r.bx, r.bz, r.halfWidth, r.feather);
    if (weight > 0) {
      const targetY = r.ay + (r.by - r.ay) * t;
      h = h * (1 - weight * 0.92) + targetY * (weight * 0.92);
    }
  }

  // Shallow basin carve for Joju-in Tsuki-no-Niwa Moon Pond
  const moonPond = boxInfluence(x, z, -18, -65, 8.5, 5.0, 2.2);
  if (moonPond > 0) {
    h -= moonPond * 1.15;
  }

  // Shallow basin carve for Benten Pond in valley
  const bentenPond = boxInfluence(x, z, -60, 34, 6.5, 4.2, 2.0);
  if (bentenPond > 0) {
    h -= bentenPond * 1.05;
  }

  return h;
}

// Walkable surface height for First-Person Pilgrimage Mode (includes cantilevered wooden stages & corridors!)
export function getWalkableHeight(x, z, currentFeetY = null) {
  const groundY = getTerrainHeight(x, z);

  // 1. National Treasure Hondo & Stage of Kiyomizu wooden deck (y = 18.65m)
  // Main hall floor: x in [6, 42], z in [-12, 11.5]; Convex Stage: x in [13, 35], z in [11.5, 19.2]
  const onHondoMain = x >= 6.0 && x <= 42.0 && z >= -12.0 && z <= 11.8;
  const onHondoStage = x >= 13.0 && x <= 35.0 && z >= 11.5 && z <= 19.2;
  if (onHondoMain || onHondoStage) {
    // Allow walking UNDER the stage if player is down on the valley path (currentFeetY < 12.5)!
    if (currentFeetY === null || currentFeetY > 12.5) {
      return 18.65;
    }
  }

  // 2. Covered Corridor (Kairo) from Todoroki-mon to Hondo West entrance
  if (x >= -6.0 && x <= 7.0 && z >= -1.0 && z <= 5.0) {
    if (currentFeetY === null || currentFeetY > 14.0) {
      return 18.55;
    }
  }

  // 3. Okuno-in Hall & Cantilevered Stage (y = 19.15m)
  if (x >= 65.2 && x <= 80.5 && z >= 10.0 && z <= 26.0) {
    if (currentFeetY === null || currentFeetY > 13.0) {
      return 19.15;
    }
  }

  return groundY;
}

// Complete Official Pilgrimage Landmarks (14 Major Spots across the Precinct)
export const LANDMARKS = [
  {
    id: 'okunoin_panorama',
    number: '絶景',
    name: '奥の院展望 · 清水全景',
    subtitle: '定番遠望 · 本堂舞台・三重塔・京都市街',
    heritage: '世界文化遺産 代表景観',
    year: '寛永10年 (1633) 伽藍軸線',
    reading: 'PANORAMIC VIEW FROM OKUNO-IN · 錦雲渓越しの国宝本堂と京都盆地',
    description:
      '自奥之院悬造舞台向西北远眺的传世视角：前景是凌空挑出锦云溪红叶海的国宝本堂与清水舞台，中景耸立朱涂三重塔，远景则是鸭川流经的京都盆地、京都塔与西山连峰。',
    metrics: [
      { label: '本堂舞台落差', value: '約 13.3 m' },
      { label: '境内敷地面積', value: '約 13万 ㎡' },
      { label: '創建年', value: '宝亀9年 (778)' },
    ],
    cameraPos: [65.8, 22.8, 21.5],
    target: [14.0, 17.0, 8.5],
    mapPos: [70, 18],
  },
  {
    id: 'niomon',
    number: '01',
    name: '仁王門（赤門）',
    subtitle: '正門 · 三間一戸楼門 · 檜皮葺',
    heritage: '重要文化財 · ICP',
    year: '明応9年 (1500) 頃再建',
    reading: 'NIŌ-MON GATE · 正面約10m・側面約5m・棟高約14m',
    description:
      '清水寺正门，俗称「赤门」。应仁之乱烧毁后于1500年前后重建，高耸于清水坂大石段顶端。正面悬挂平安时代名笔藤原行成所书「清水寺」扁额，左右安置镰仓末期金刚力士（仁王）巨像，门前镇守罕见的双开口「阿阿」狛犬。',
    metrics: [
      { label: '建築形式', value: '三間一戸楼門' },
      { label: '屋根様式', value: '入母屋・檜皮葺' },
      { label: '棟高', value: '約 14.0 m' },
    ],
    cameraPos: [-126.0, 13.2, 13.5],
    target: [-101.0, 15.2, 4.0],
    mapPos: [-101, 4],
  },
  {
    id: 'shoro',
    number: '02',
    name: '鐘楼・馬駐',
    subtitle: '六本柱桃山様式 · 梵鐘 (1478)',
    heritage: '重要文化財 · ICP',
    year: '慶長12年 (1607) 再建',
    reading: 'SHŌRŌ BELL TOWER & UMATODOME · 牡丹懸魚・六本柱制',
    description:
      '穿过仁王门左侧即见朱涂钟楼，为罕见的六柱支撑制，凝聚桃山时代绚烂雕饰，悬吊文明十年（1478）铸造的重文梵钟（可点击顶部「撞鐘」聆听低沉余韵）。北侧并立室町后期遗构「马驻」，供古人参拜系马。',
    metrics: [
      { label: '柱構造', value: '六本柱・四方転び' },
      { label: '梵鐘鋳造', value: '文明10年 (1478)' },
      { label: '馬駐年代', value: '室町時代後期' },
    ],
    cameraPos: [-96.5, 16.2, 3.0],
    target: [-83.5, 15.4, -10.0],
    mapPos: [-83, -10],
  },
  {
    id: 'saimon',
    number: '03',
    name: '西門（日想観聖所）',
    subtitle: '八脚門 · 極彩色組物 · 軒唐破風',
    heritage: '重要文化財 · ICP',
    year: '寛永10年 (1633) 再建',
    reading: 'SAI-MON WEST GATE · 西方極楽浄土を観想する日想観の門',
    description:
      '立于石垣高台之上的丹涂八脚门，正面设向拜、背面饰优美的轩唐破风，轩下斗栱与蟇股施以江户初期极彩色。自此西望京都落日余晖，古来即为观想西方极乐净土的「日想观」圣地。',
    metrics: [
      { label: '建築形式', value: '八脚門・切妻造' },
      { label: '背面意匠', value: '軒唐破風・極彩色' },
      { label: '信仰意義', value: '日想観聖所' },
    ],
    cameraPos: [-94.5, 18.8, 15.5],
    target: [-77.5, 18.2, 6.0],
    mapPos: [-78, 6],
  },
  {
    id: 'sanjunoto',
    number: '04',
    name: '三重塔',
    subtitle: '国内最大級 · 総高約30.1m',
    heritage: '重要文化財 · ICP',
    year: '寛永9年 (1632) 再建',
    reading: 'SANJŪ-NO-TŌ PAGODA · 和様三層本瓦葺・大日如来奉安',
    description:
      '总高逾30米，为日本最大级别的三重塔，亦是自京都市街仰望东山最醒目的象征。承和14年（847）创建，1632年重建，昭和大修理复原了鲜艳的丹涂柱身、白漆喰壁与极彩色密教斗栱，塔顶高耸青铜九轮相轮。',
    metrics: [
      { label: '総高', value: '約 30.1 m' },
      { label: '屋根様式', value: '本瓦葺・三層' },
      { label: '奉安本尊', value: '大日如来像' },
    ],
    cameraPos: [-80.0, 25.0, 31.0],
    target: [-58.0, 27.5, 13.0],
    mapPos: [-58, 13],
  },
  {
    id: 'zuigudo_kyodo',
    number: '05',
    name: '随求堂・経堂・田村堂',
    subtitle: '胎内めぐり · 一切経蔵 · 開山堂',
    heritage: '重要文化財群',
    year: '寛永10年 (1633) / 享保20年 (1735)',
    reading: 'ZUIGU-DŌ, KYŌ-DŌ & TAMURA-DŌ · 教学と開山顕彰の諸堂',
    description:
      '参道北侧的随求堂供奉大随求菩萨，以地下暗闇巡礼「胎内巡」闻名；南侧与三重塔并立的五间瓦葺「经堂」内绘冈村信基笔墨绘圆龙，紧邻的「田村堂（开山堂）」则奉祀创建清水寺的延镇上人与坂上田村麻吕夫妻像。',
    metrics: [
      { label: '経堂規模', value: '五間堂・入母屋造' },
      { label: '田村堂', value: '三間堂・極彩色厨子' },
      { label: '随求堂体験', value: '胎内めぐり' },
    ],
    cameraPos: [-48.0, 22.8, -5.0],
    target: [-32.0, 19.8, 9.5],
    mapPos: [-39, 11],
  },
  {
    id: 'todorokimon_asakurado',
    number: '06',
    name: '轟門・朝倉堂・回廊',
    subtitle: '本堂前門 · 五間瓦葺堂 · 鎮守春日社',
    heritage: '重要文化財 · ICP',
    year: '寛永8〜16年 (1631–1639)',
    reading: 'TODOROKI-MON & ASAKURA-DŌ · 本堂へ誘う八脚門と連なる回廊',
    description:
      '进入本堂结界的正门「轰门」，由此经木造回廊直通国宝本堂西侧车寄。北侧并立越前朝仓贞景寄进渊源的五间堂「朝仓堂」以及室町后期精美神社建筑「镇守堂（春日社）」。',
    metrics: [
      { label: '轟門形式', value: '八脚門・本瓦葺' },
      { label: '朝倉堂', value: '入母屋造・五間堂' },
      { label: '接続構造', value: '木造吹放し回廊' },
    ],
    cameraPos: [-25.5, 22.0, 5.5],
    target: [-6.0, 20.0, -3.5],
    mapPos: [-8, 2],
  },
  {
    id: 'hondo_stage',
    number: '07',
    name: '国宝 本堂・清水の舞台',
    subtitle: '寄棟造檜皮葺 · 左右翼廊 · 檜舞台',
    heritage: '国宝 · NATIONAL TREASURE',
    year: '寛永10年 (1633) 徳川家光寄進再建',
    reading: 'NATIONAL TREASURE HONDŌ · 間口36m・奥行31m・棟高18m',
    description:
      '德川家光寄进重建的国宝木造巨构。主体九间×七间外巡裳阶，巨型寄栋造桧皮葺大屋顶温润厚重，南面东西两侧突出入母屋造「翼廊（乐舍）」，中央铺设166枚桧木板构成的凸型「清水舞台」，凌空俯瞰锦云溪。',
    metrics: [
      { label: '平面規模', value: '間口36m × 奥行31m' },
      { label: '舞台面積', value: '約 190 ㎡ (檜板166枚)' },
      { label: '本尊（秘仏）', value: '十一面千手観音' },
    ],
    cameraPos: [4.0, 24.5, 36.0],
    target: [24.0, 20.5, 5.0],
    mapPos: [24, 4],
  },
  {
    id: 'kakezukuri_understage',
    number: '08',
    name: '舞台下 · 懸造り百三十九本柱',
    subtitle: '釘一本使わぬ伝統木組 · 欅巨柱と通し貫',
    heritage: '国宝構造 · 伝統木造建築の極致',
    year: '樹齢400年超 欅材・六段通し貫',
    reading: 'KAKEZUKURI SUBSTRUCTURE · 舞台主柱18本・床下総束柱139本',
    description:
      '自锦云溪崖底仰望清水舞台：高达13米的断崖斜面上林立树龄四百年以上的榉木巨柱（前排6根十六角形巨柱长达12米以上、周长逾2米），纵横六层「通贯」穿透柱身并以木楔紧锁，贯顶更设细巧「雨除小伞」防潮防腐，未用一钉而屹立四百年地震不倒。可开启「懸造透視」细察内部木架。',
    metrics: [
      { label: '舞台主柱 / 総柱', value: '18本 / 139本' },
      { label: '水平連結', value: '六段通し貫・楔留' },
      { label: '鉄釘使用', value: '零（完全木組）' },
    ],
    cameraPos: [15.5, 8.8, 31.5],
    target: [24.0, 14.2, 13.5],
    mapPos: [24, 21],
  },
  {
    id: 'jishu_shrine',
    number: '09',
    name: '地主神社 · 恋占いの石',
    subtitle: '鎮守社 · 極彩色本殿 · 縄文恋占石',
    heritage: '重要文化財 · 世界遺産構成資産',
    year: '寛永10年 (1633) 再建',
    reading: 'JISHU JINJA SHRINE · 大国主命・18m間隔の恋占いの石',
    description:
      '位于本堂正北高台上的古老镇守社，主祭缘结之神大国主命。朱漆鸟居后方矗立极彩色双毗卢遮那权现造社殿，庭前相距18米安置一对绳文时代遗留的「恋占之石」，相传闭目自一石走到另一石即可良缘成就。',
    metrics: [
      { label: '社殿様式', value: '入母屋・檜皮葺極彩色' },
      { label: '恋占いの石', value: '二石間隔 約18 m' },
      { label: '主祭神', value: '大国主命' },
    ],
    cameraPos: [24.0, 26.8, -19.5],
    target: [24.0, 25.5, -39.0],
    mapPos: [24, -37],
  },
  {
    id: 'shakado_amidado',
    number: '10',
    name: '釈迦堂・阿弥陀堂',
    subtitle: '東崖諸堂 · 常行念仏最初道場',
    heritage: '重要文化財 · ICP',
    year: '寛永8年 (1631) 再建',
    reading: 'SHAKA-DŌ & AMIDA-DŌ · 檜皮葺寄棟造と本瓦葺入母屋造の対比',
    description:
      '沿本堂东侧山腹石阶前行，北起依次排列寄栋造桧皮葺「释迦堂」、百体地藏堂与入母屋造瓦葺「阿弥陀堂」。文治四年（1188）法然上人曾于此首倡常行念佛，为净土信仰圣迹。',
    metrics: [
      { label: '釈迦堂', value: '三間堂・檜皮葺' },
      { label: '阿弥陀堂', value: '三間堂・本瓦葺' },
      { label: '霊場札所', value: '法然上人第13番' },
    ],
    cameraPos: [52.5, 22.4, 2.5],
    target: [67.0, 21.0, -3.0],
    mapPos: [65, -3],
  },
  {
    id: 'okunoin',
    number: '11',
    name: '奥の院',
    subtitle: '音羽の滝真上 · 懸造舞台 · 秘仏三面千手観音',
    heritage: '重要文化財 · ICP',
    year: '寛永10年 (1633) 再建',
    reading: 'OKUNO-IN INNER SANCTUARY · 行叡居士・延鎮上人草庵旧跡',
    description:
      '建于音羽之泷正上方断崖的五间堂，相传为行叡居士与开山延镇上人结庵修行之故地。与本堂同样采用寄栋造桧皮葺与悬造舞台结构，是隔谷观赏国宝本堂全貌的最佳露台。',
    metrics: [
      { label: '建築規模', value: '五間堂・寄棟檜皮葺' },
      { label: '舞台構造', value: '断崖懸造り' },
      { label: '奉安秘仏', value: '三面千手観音坐像' },
    ],
    cameraPos: [56.0, 21.2, 27.5],
    target: [73.5, 20.5, 18.0],
    mapPos: [73, 18],
  },
  {
    id: 'otowa_falls',
    number: '12',
    name: '音羽の滝（金色水・延命水）',
    subtitle: '清水寺開創起源 · 三筋の霊水 · 音羽茶屋',
    heritage: '寺号発祥聖地',
    year: '宝亀9年 (778) 霊泉湧出伝承',
    reading: 'OTOWA-NO-TAKI WATERFALL · 六根清浄を祈る三本の筧',
    description:
      '「清水寺」寺名之源。千年不竭的山泉自奥之院崖下石壁经三支石笕分流飞泻，古称「金色水」「延命水」，分别寄托学业、恋爱与延命长寿之祈愿。崖前设朱桥、泷之堂及铺设绯毛毡床几的音羽茶屋。',
    metrics: [
      { label: '霊水条数', value: '三筋の筧 (金色水)' },
      { label: '標高位置', value: '錦雲渓谷底 (+5.5m)' },
      { label: '祀仏', value: '不動明王' },
    ],
    cameraPos: [43.5, 8.2, 34.5],
    target: [59.5, 7.6, 30.0],
    mapPos: [58, 30],
  },
  {
    id: 'jojuin_moon_garden',
    number: '13',
    name: '成就院 · 名勝「月の庭」',
    subtitle: '清水寺本坊 · 池泉観賞式庭園 · 千体石仏群',
    heritage: '国指定名勝 · SCENIC BEAUTY',
    year: '室町相阿弥作庭・小堀遠州改修伝',
    reading: 'JŌJU-IN & TSUKI-NO-NIWA GARDEN · 雪月花三名園・音羽山借景',
    description:
      '穿北总门与千体石佛群抵达的清水寺本坊「成就院」。书院北侧展开国指定名胜「月之庭」，以音羽山重峦为借景，镜池倒映乌帽子石、手水钵与修剪杜鹃刈込，尽显室町至江户初期幽玄庭园美学。',
    metrics: [
      { label: '庭園形式', value: '借景式池泉庭園' },
      { label: '文化財指定', value: '国の名勝' },
      { label: '隣接名所', value: '北総門・千体石仏' },
    ],
    cameraPos: [-30.0, 23.0, -68.0],
    target: [-17.5, 19.5, -56.5],
    mapPos: [-18, -56],
  },
  {
    id: 'koyasu_pagoda',
    number: '14',
    name: '子安塔・泰産寺',
    subtitle: '錦雲渓南尾根 · 檜皮葺三重塔 · 高さ約15m',
    heritage: '重要文化財 · ICP',
    year: '明応9年 (1500) 再建・明治44年移築',
    reading: 'KOYASU-NO-TŌ PAGODA · 安産祈願・南山腹より本堂を望む',
    description:
      '跨越锦云溪幽谷，伫立于南侧松枫山脊上的纤美三重塔，高约15米（约为仁王门旁三重塔之半），屋顶采用罕见的温润桧皮葺。自塔前北望，可将国宝本堂南立面、双翼廊与悬造舞台尽收眼底。',
    metrics: [
      { label: '塔高', value: '約 15.0 m' },
      { label: '屋根様式', value: '檜皮葺・三層' },
      { label: '信仰伝承', value: '聖武天皇・光明皇后祈願' },
    ],
    cameraPos: [30.0, 25.5, 108.0],
    target: [18.0, 25.5, 92.0],
    mapPos: [18, 92],
  },
];
