// Authentic 10 Landmarks of Ogurayama Jōjakkō-ji (小倉山 常寂光寺)
// Coordinates use: +X = East (Sagano/Kyoto plain), -X = West (climbing Mt. Ogura), -Z = North, +Z = South

export const LANDMARKS = [
  {
    id: 'overview',
    order: '全景',
    name: '小倉山 常寂光寺 全景',
    subtitle: 'Ogurayama Jōjakkō-ji — 无围墙的红叶与青苔古刹',
    era: '文禄五年（1596）日禛上人开创',
    position: [12, 13, 0],
    cameraPos: [62, 26, -24],
    cameraTarget: [-8, 12, 2],
    walkSpawn: [70, 0],
    walkYaw: Math.PI / 2,
    poem: '小倉山 峰のもみぢ葉 心あらば 今ひとたびの みゆき待たなむ',
    poet: '贞信公（藤原忠平）《小仓百人一首》第二十六首 · “小仓山峰红叶若有情，且待圣驾再临莫凋零”',
    description:
      '静卧于京都岚山·嵯峨野小仓山半山腰的日莲宗名刹。文禄五年（1596）由大本山本圀寺第十六世究竟院日禛上人隐栖开创。常寂光寺素有“无围墙之寺（塀のない寺）”美誉，全山顺应小仓山东麓自然坡势，二百余株古枫、丝绒般的杉苔、茅葺仁王门、桃山城移筑本堂与国指定重要文化财多宝塔层叠交映，宛若佛经中的“常寂光土”。'
  },
  {
    id: 'sanmon',
    order: '壱',
    name: '山門・枝垂桜参道',
    subtitle: 'Sanmon Gate & Outer Stone Approach',
    era: '江户时代后期改筑（墨色格子药医门）',
    position: [64, 1.5, 0],
    cameraPos: [76.5, 3.1, 2.8],
    cameraTarget: [44, 3.4, 0],
    walkSpawn: [72, 0.5],
    walkYaw: Math.PI / 2,
    poem: '忍ばれむ ものともなしに 小倉山 軒端の松ぞ 馴れて久しき',
    poet: '藤原定家《拾遗愚草》（常寂光寺别名“轩端寺”之典故）',
    description:
      '寺门入口处的药医门改筑于江户后期，以涂作墨色的粗壮方木构筑通透的木格门扉。即便闭门之时，亦可透过墨色格栅远眺深处石叠参道与层林尽染的红叶，构成京都经典的“画框构图”。步入山门，左侧为拜观受付、展示场与名木枝垂樱，右侧苔庭则立有藤原定家“定家山庄迹”石碑。'
  },
  {
    id: 'niomon',
    order: '弐',
    name: '仁王門（茅葺・運慶作伝仁王像）',
    subtitle: 'Niōmon Thatched Gate & Unkei Guardian Statues',
    era: '贞和年间（1345–1349）建立 · 元和二年（1616）移筑',
    position: [36, 4.5, 0],
    cameraPos: [48.5, 4.6, -2.4],
    cameraTarget: [28, 6.2, 0],
    walkSpawn: [45, 0],
    walkYaw: Math.PI / 2,
    poem: '小倉山 しぐるる頃の 朝な朝な 昨日はうすき 四方のもみぢ葉',
    poet: '藤原定家《拾遗愚草》 · “小仓山时雨朝朝落，四方枫叶日日染深红”',
    description:
      '常寂光寺境内年代最久远的古建筑，原为南北朝贞和年间建造的本圀寺客殿南门，元和二年（1616）移筑至此。罕见的厚重茅葺（芦苇茅草）屋顶北坡自然覆满翠绿青苔，门内左右安置相传出自镰仓雕刻巨匠运庆之手的七尺阿吽仁王像；木栅上悬挂着信众祈求足腰康健而奉纳的巨型草鞋（大わらじ）。'
  },
  {
    id: 'ishidan',
    order: '参',
    name: '仁王門石段・紅葉雲海と杉苔',
    subtitle: '44-Step Mossy Staircase & Crimson Maple Tunnel',
    era: '小仓山表参道 · “敷红叶”绝景名所',
    position: [20, 7.2, 0],
    cameraPos: [31.8, 4.3, 1.0],
    cameraTarget: [6, 12.2, 0],
    walkSpawn: [31, 0],
    walkYaw: Math.PI / 2,
    poem: '秋来ぬと 目にはさやかに 見えねども 風の音にぞ おどろかれぬる',
    poet: '藤原敏行《古今和歌集》秋歌首篇',
    description:
      '穿过茅葺仁王门仰首西望，四十四级古朴花岗岩石阶笔直攀上小仓山腹。穹顶之上真红、朱柿、琥珀色的七裂伊吕波枫交织成漫天红云，石阶两侧则是仿岚山桂川意象铺展的翠绿杉苔（地毯苔）与青竹结界扶手；深秋落叶铺满碧苔，凝成绚烂而静谧的“敷红叶”画卷。'
  },
  {
    id: 'hondo',
    order: '肆',
    name: '本堂（旧伏見桃山城客殿）',
    subtitle: 'Hondō Main Hall — Relocated Momoyama Castle Hall',
    era: '庆长年间（1596–1615）小早川秀秋助力移筑',
    position: [-5.5, 13.5, 0],
    cameraPos: [9.5, 13.4, -4.8],
    cameraTarget: [-7.5, 13.8, 0.5],
    walkSpawn: [5.2, -1.5],
    walkYaw: Math.PI / 2,
    poem: '常寂光 即ち是れ 究竟の楽邦なり',
    poet: '天台智者大师《摩诃止观》 · “常寂光土”寺号渊源',
    description:
      '登临石阶顶端即为本堂。第二世通明院日韶上人得小早川秀秋公资助，将丰臣秀吉伏见桃山城之客殿移筑于此作为本堂，尽显桃山书院造的端庄气韵。昭和七年（1932）大修时改铺优美的平瓦葺入母屋屋顶，向拜檐下悬挂铜钓灯笼并高悬伏见常照院宫御笔“御祈祷处”匾额，堂内供奉十界大曼荼罗。'
  },
  {
    id: 'shoro',
    order: '伍',
    name: '鐘楼（古律黄鐘調梵鐘）',
    subtitle: 'Shōrō Belfry — Interactive Ōshikichō Bronze Bell',
    era: '宽永十八年（1642）建立 · 昭和四十八年（1973）新钟铸造',
    position: [1.5, 13.2, 10.5],
    cameraPos: [10.2, 13.4, 5.2],
    cameraTarget: [0.5, 13.2, 11.2],
    walkSpawn: [5.5, 7.5],
    walkYaw: 2.35,
    poem: '入相の 鐘に花ぞ 散りまがふ 暮れゆく春の 小倉山かな',
    poet: '嵯峨野古咏（点击顶部“撞钟·梵音”、快捷键 B 或直接点击钟楼即可撞响梵钟）',
    description:
      '位于本堂前南侧石垣基坛之上，宽永十八年（1642）由第四世光照院日选上人营建。原钟于二战金属征用中散佚，现存青铜梵钟于昭和四十八年（1973）由京都声学泰斗青木一郎博士精密设计，铸为“古律黄钟调”名钟，每日正午与夕刻五时撞响，悠长差拍泛音回荡于小仓山谷。'
  },
  {
    id: 'myokendo',
    order: '陸',
    name: '酉の妙見堂・石鳥居',
    subtitle: 'Myōken-dō Shrine & Edo Merchant Stone Lanterns',
    era: '享和年间（1801–1803）迁座 · 洛阳十二支妙见（酉）',
    position: [-6.5, 13.2, 18.5],
    cameraPos: [8.0, 13.1, 18.5],
    cameraTarget: [-8.0, 13.4, 18.5],
    walkSpawn: [5.0, 18.5],
    walkYaw: Math.PI / 2,
    poem: '北辰の 星の光は 変はらねど 巡る月日に 秋ぞ深まる',
    poet: '洛阳十二支妙见巡礼 · 京都御所正西“酉之妙见菩萨”札所',
    description:
      '本堂南侧供奉象征北极星与北斗七星的“北辰妙见大菩萨”（庆长年间保津川洪水漂流至角仓町后迎入本山）。因地处京都御所紫宸殿正西（十二支之“酉”位），被尊为“酉之妙见”，江户至昭和年间深受商贾与歌舞伎名伶崇敬。堂前保留神佛习合石鸟居及镌刻大黑屋、松屋等商号的江户石灯笼。'
  },
  {
    id: 'pond',
    order: '漆',
    name: '池泉鑑賞式庭園・書院・庫裏・開山堂',
    subtitle: 'Pond Viewing Garden, Five-Story Stone Pagoda & Kuri',
    era: '江户初期作庭 · 平成十六年（2004）开山堂建立',
    position: [-4.0, 11.5, -15.5],
    cameraPos: [6.5, 13.2, -9.2],
    cameraTarget: [-7.0, 11.4, -19.5],
    walkSpawn: [3.5, -10.5],
    walkYaw: 0.75,
    poem: '七重八重 花は咲けども 山吹の 実の一つだに 無きぞかなしき',
    poet: '兼明亲王《后拾遗和歌集》一一五四（曾葬于常寂光寺北麓之小仓亲王）',
    description:
      '本堂北侧辟有幽邃的池泉鉴赏式庭园，引小仓山清冽涌水入池，池畔伫立五重石塔、雪见灯笼与竹笕蹲踞，水中锦鲤穿行于红叶倒影之间。木造渡廊将本堂与书院、白漆喰木组妻壁的库里相连；拾北西石阶而上，则是纪念开山日禛上人与中兴日法上人的开山堂。'
  },
  {
    id: 'tahoto',
    order: '捌',
    name: '多宝塔「並尊閣」（国指定重要文化財）',
    subtitle: 'Tahōtō Two-Storied Pagoda — Important Cultural Property',
    era: '元和六年（1620）八月建立 · 高十二米 · 桧皮葺',
    position: [-32.0, 24.5, 4.0],
    cameraPos: [-18.5, 22.2, 11.8],
    cameraTarget: [-33.0, 24.8, 3.5],
    walkSpawn: [-22.5, 8.5],
    walkYaw: 1.95,
    poem: '牡鹿なく 小倉の山の 裾近み ただひとりすむ わが心かな',
    poet: '西行法师《山家集》秋歌 · 咏小仓山秋鹿与孤寂禅心',
    description:
      '自妙见堂旁沿石阶登临山腰，即可仰望元和六年（1620）建成的日本国家重要文化财——多宝塔。通高十二米，下层方三间配白漆喰“龟腹（馒头形圆穹）”，上层圆形塔身环绕高栏，覆以曲线轻盈柔美的桧皮葺宝形屋顶与九轮水烟青铜相轮。塔内依《法华经》并座供奉释迦、多宝二佛，正门悬灵元上皇宸笔敕额“并尊阁”。'
  },
  {
    id: 'shiguretei',
    order: '玖',
    name: '歌仙祠・時雨亭跡・小倉竹林',
    subtitle: 'Kasenshi Poets’ Shrine, Shigure-tei Ruins & Bamboo Grove',
    era: '镰仓《小仓百人一首》编纂传承地 · 明治二十三年改筑',
    position: [-31.2, 22.2, 21.8],
    cameraPos: [-21.5, 23.0, 25.5],
    cameraTarget: [-32.5, 22.2, 20.5],
    walkSpawn: [-24.0, 22.5],
    walkYaw: 1.4,
    poem: 'わが庵は 小倉の山の 近ければ 浮き世を鹿と 鳴かぬ日ぞなき',
    poet: '八条院高仓《新敕撰和歌集》秋歌',
    description:
      '多宝塔南侧林间为藤原定家编纂日本和歌圣典《小仓百人一首》的山庄“时雨亭”遗址，至今留存古庵础石与“时雨亭迹”石碑。毗邻的歌仙祠供奉藤原定家、藤原家隆二公神像，门悬近代文人画巨匠富冈铁斋手书“謌僊祠”匾额。南坡孟宗竹林随风摇曳，红枫、翠竹、绯毛毡茶席与小仓山鹿共成风雅。'
  },
  {
    id: 'observatory',
    order: '拾',
    name: '山頂展望台（多宝塔越しの京都一望）',
    subtitle: 'Summit Observation Deck Overlooking Tahōtō & Kyoto Basin',
    era: '小仓山游步道最高点 · 嵯峨野至东山三十六峰全景',
    position: [-47.0, 28.0, -1.0],
    cameraPos: [-45.2, 28.6, -1.2],
    cameraTarget: [-10.0, 22.5, 6.5],
    walkSpawn: [-45.5, -1.2],
    walkYaw: -Math.PI / 2,
    poem: '山里は みな冬がれて 小男鹿の 音にぞ僅かに 秋は残れる',
    poet: '觉性法亲王《出观集》秋歌',
    description:
      '攀至境内最高处的山顶展望台，凭栏东望：近处是重要文化财多宝塔挺拔的青铜相轮、桧皮葺塔顶与漫山翻涌的红叶云海；中景是嵯峨野街巷、桂川（大堰川）与渡月桥；天际线远方则是整个京都盆地与绵延起伏的东山三十六峰、大文字山及比睿山，尽收千年古都的辽阔秋色。'
  }
];
