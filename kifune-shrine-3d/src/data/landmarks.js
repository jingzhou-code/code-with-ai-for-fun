// Master geographical coordinates, curated camera presets, Sansha-Mairi shrines,
// Mizuura-mikuji fortunes, and historical lore for Kifune Shrine (貴布禰総本宮 貴船神社).

export const VALLEY_CONFIG = {
  zMin: -182,
  zMax: 122,
  xMin: -82,
  xMax: 76,
  honguY: 10.0,
  honguInnerY: 11.5,
  yuiY: 8.8,
  okumiyaY: 6.8,
  okumiyaInnerY: 7.6
};

export const CAMERA_PRESETS = [
  {
    id: 'omotesando',
    zone: '本宮',
    title: '表参道・春日灯籠石段',
    subtitle: '二ノ鳥居を潜り望む八十四段の石段と三十七基の朱塗り灯籠',
    pos: [-1.81, 3.05, 69.44],
    target: [-21.5, 11.8, 44.6],
    fov: 48,
    loreTitle: '表参道と春日灯籠（おもてさんどう・かすがどうろう）',
    loreJapanese: 'Omotesando Stone Steps & Kasuga Lanterns',
    loreBody:
      '貴船神社を象徴する表参道。朱塗りの二ノ鳥居をくぐると、貴船石で組まれた八十四段の石段が山門まで一直線に続き、両脇には三十七基の朱塗り木製春日灯籠が立ち並びます。新緑の青もみじ、秋の錦秋ライトアップ、冬の雪化粧と、四季折々に洛北随一の幽玄な景観を織りなします。'
  },
  {
    id: 'ninotorii',
    zone: '渓谷',
    title: '二ノ鳥居・貴船街道',
    subtitle: '清流貴船川と料理旅館の川床が連なる門前風景',
    pos: [6.8, 3.4, 79.5],
    target: [-4.5, 5.2, 65.5],
    fov: 48,
    loreTitle: '二ノ鳥居と貴船川（にのとりい・きぶねがわ）',
    loreJapanese: 'Ni-no-Torii & Kibune River Valley',
    loreBody:
      '鴨川の源流である貴船川に沿って北上すると現れる高さ約6.5メートルの明神鳥居。地名は「きぶね」と濁りますが、水の神を祀る神社名は清らかな水が濁らぬよう「きふね」と清音で読みます。'
  },
  {
    id: 'hongu_haiden',
    zone: '本宮',
    title: '本宮・拝殿と本殿',
    subtitle: '高龗神を祀る平成御造営の木曽檜社殿と権殿',
    pos: [-24.5, 12.35, 35.6],
    target: [-24.5, 13.1, 16.5],
    fov: 52,
    loreTitle: '貴船神社 本宮（ほんぐう）— 水神総本宮',
    loreJapanese: 'Hongu Haiden, Honden & Gonden',
    loreBody:
      '天喜三年（1055年）に奥宮の地より遷座。御祭神は降雨・止雨を司る龍神「高龗神（たかおかみのかみ）」。現在の社殿は平成の御造営事業により木曽檜と銅板葺きで一新され、拝殿の奥に三間社流造の本殿、さらにその西隣に仮殿である権殿（ごんでん）が並び立ちます。'
  },
  {
    id: 'mizuura',
    zone: '本宮',
    title: '水占齋庭・御神水',
    subtitle: '貴船山の霊泉に浮かべ文字が浮かび上がる水占みくじ',
    pos: [-20.8, 11.45, 21.0],
    target: [-16.8, 10.25, 17.2],
    fov: 42,
    loreTitle: '御神水と水占齋庭（ごしんすい・みずうらゆにわ）',
    loreJapanese: 'Sacred Spring & Mizuura-Mikuji Basin',
    loreBody:
      '本殿前の石垣からこんこんと湧き出る御神水は、貴船山の弱アルカリ性霊泉で一度も枯れたことがないと伝わります。白紙のおみくじを水占齋庭の御神水に浮かべると、水の霊力によって吉凶の文字が浮かび上がる「水占みくじ」発祥の地として知られます。'
  },
  {
    id: 'katsura',
    zone: '本宮',
    title: '御神木「桂」と南門',
    subtitle: '樹齢四百年・樹高三十メートル、昇龍の如く聳える御神木',
    pos: [-25.5, 11.5, 33.0],
    target: [-16.2, 16.5, 40.2],
    fov: 54,
    loreTitle: '本宮 御神木「桂（かつら）」',
    loreJapanese: 'Sacred 400-Year Katsura Tree',
    loreBody:
      '樹齢約400年、樹高30メートルに及ぶ巨大な桂の御神木。根元から幾つもの枝が天に向かって伸び八方に広がる姿は、大地のエネルギー（氣）が龍の如く天へ昇る姿を象徴し、「氣生根（きふね）」の御神徳を体現しています。'
  },
  {
    id: 'ryusenkaku',
    zone: '本宮',
    title: '龍船閣と神馬像',
    subtitle: '絵馬発祥を伝える黒馬・白馬像と渓谷を見下ろす懸造展望閣',
    pos: [-21.5, 11.7, 24.0],
    target: [-12.2, 11.3, 29.0],
    fov: 48,
    loreTitle: '龍船閣と絵馬発祥の神馬像（りゅうせんかく・しんめぞう）',
    loreJapanese: 'Ryusenkaku Pavilion & Sacred Horses (Birthplace of Ema)',
    loreBody:
      '古来、歴代朝廷は雨乞いには「黒馬」を、晴天祈願には「白馬」を貴船神社へ奉納しました。やがて生馬に代えて板に馬を描いた「板立馬」が奉納されたことが日本の「絵馬」の起源です。神馬像の奥には石垣からせり出す懸造の休憩展望閣「龍船閣」が建ちます。'
  },
  {
    id: 'sekitei',
    zone: '本宮',
    title: '石庭「天津磐境」',
    subtitle: '重森三玲作庭・全て貴船石で組まれた船形の神聖庭園',
    pos: [-30.5, 12.2, 18.8],
    target: [-36.8, 10.2, 13.2],
    fov: 46,
    loreTitle: '石庭「天津磐境（あまついわさか）」',
    loreJapanese: 'Amatsu-Iwasaka Stone Boat Garden by Mirei Shigemori',
    loreBody:
      '昭和40年（1965年）、昭和を代表する作庭家・重森三玲が古代の祭場「天津磐境」と玉依姫命の黄船伝説を主題に、すべて貴船川産の銘石「貴船石」を用いて作庭した石庭。庭全体が船の姿を表し、中央の椿が帆柱（マスト）を象徴します。'
  },
  {
    id: 'kawadoko',
    zone: '渓谷',
    title: '貴船川・川床料理席',
    subtitle: '京の奥座敷・白波立つ小滝の真上に設えられた納涼川床',
    pos: [17.8, 2.5, 62.5],
    target: [18.8, 2.0, 49.5],
    fov: 48,
    loreTitle: '貴船川の清流と川床（かわどこ）',
    loreJapanese: 'Kibune River Cascades & Traditional Kawadoko Decks',
    loreBody:
      '京都市街より気温が約5〜10度低い「京の奥座敷」貴船。貴船川の小滝のすぐ水面に組まれた座敷「川床（かわどこ）」では、赤い毛氈と簾、雪洞（ぼんぼり）の灯りのもと、せせらぎと飛沫に包まれる京都ならではの風情が広がります。'
  },
  {
    id: 'yui',
    zone: '結社',
    title: '結社（中宮）・天乃磐船',
    subtitle: '磐長姫命を祀る恋の宮・重さ六トンの自然石船と薄緑の結び文',
    pos: [-21.5, 10.5, -31.0],
    target: [-25.5, 9.8, -42.5],
    fov: 48,
    loreTitle: '結社（ゆいのやしろ / 中宮）と天乃磐船・和泉式部歌碑',
    loreJapanese: 'Yui-no-Yashiro (Nakamiya), Ama-no-Iwafune & Izumi Shikibu Stele',
    loreBody:
      '本宮と奥宮の中間に鎮座する縁結びの社。御祭神・磐長姫命が「吾ここに留まりて人々の良縁を授けよう」と鎮座されたと伝わり、平安の歌人・和泉式部が蛍舞う沢で恋の和歌を捧げ復縁を叶えた「恋の宮」です。境内には重さ6トンの船形自然石「天乃磐船」と薄緑色の結び文掛けが並びます。'
  },
  {
    id: 'aioi',
    zone: '参道',
    title: '相生の杉・思ひ川橋',
    subtitle: '樹齢千年の夫婦杉と和泉式部ゆかりの禊の清流「思ひ川」',
    pos: [-2.2, 7.6, -60.5],
    target: [-6.8, 8.8, -74.0],
    fov: 50,
    loreTitle: '相生の杉（あいおいのすぎ）と思ひ川（おもいがわ）',
    loreJapanese: '1,000-Year Aioi Twin Cedars & Omoi-gawa Purification Stream',
    loreBody:
      '同じ根から二本の巨杉が寄り添うように伸びる「相生の杉」は樹齢千年を超え、「相老（夫婦共に長寿）」の象徴です。その北側を流れる「思ひ川（御物忌川）」は、かつて奥宮参拝前に身を清めた禊の川であり、朱の奥宮鳥居と杉並木が神域へと誘います。'
  },
  {
    id: 'okumiya_gate',
    zone: '奥宮',
    title: '奥宮・神門と拝殿',
    subtitle: '千年杉の深い森に浮かび上がる朱の神門と貴船創建の聖域',
    pos: [-6.0, 8.55, -104.6],
    target: [-6.0, 9.25, -126.0],
    fov: 50,
    loreTitle: '貴船神社 奥宮（おくみや）— 創建の聖地',
    loreJapanese: 'Okumiya Crimson Shinmon & Forest Haiden',
    loreBody:
      '貴船神社創建の故地。深い杉木立の参道を抜けると鮮やかな朱塗りの神門が現れ、その左手には杉と楓が合体した御神木「連理の杉」と日吉社、正面には静寂に包まれた奥宮拝殿が鎮座します。'
  },
  {
    id: 'okumiya_inner',
    zone: '奥宮',
    title: '奥宮・船形石と本殿（龍穴）',
    subtitle: '玉依姫命の黄船を包む船形石と日本三大龍穴の上の本殿',
    pos: [-14.2, 9.2, -135.0],
    target: [-10.5, 8.2, -150.5],
    fov: 50,
    loreTitle: '船形石（ふながたいし）と奥宮本殿・日本三大龍穴',
    loreJapanese: 'Funagata-ishi Stone Boat & Okumiya Honden over the Dragon Hole',
    loreBody:
      '神武天皇の皇母・玉依姫命が浪速から水源を求めて遡上された「黄船」を人目に触れぬよう小石で覆い隠したと伝わる長さ10メートルの「船形石」。そして奥宮本殿の真下には誰も覗くことを許されない神秘の大穴「龍穴（日本三大龍穴）」が開いていると伝えられます。'
  }
];

export const SANSHA_SHRINES = [
  {
    id: 'hongu',
    order: 1,
    name: '本宮',
    reading: 'ほんぐう',
    deity: '高龗神（たかおかみのかみ）',
    blessing: '運氣隆盛・諸願成就・水神守護',
    position: [-24.5, 10.15, 23.5],
    lookTarget: [-24.5, 12.2, 16.0],
    sealTitle: '貴布禰総本宮',
    sealCenter: '貴船神社',
    sealSub: '本宮参拝之証'
  },
  {
    id: 'okumiya',
    order: 2,
    name: '奥宮',
    reading: 'おくみや',
    deity: '高龗神・闇龗神（たかおかみ・くらおかみ）',
    blessing: '心願成就・龍穴開運・航行安全',
    position: [-6.0, 6.95, -133.5],
    lookTarget: [-6.0, 8.5, -142.0],
    sealTitle: '貴船創建聖地',
    sealCenter: '貴船奥宮',
    sealSub: '龍穴神域参拝'
  },
  {
    id: 'yui',
    order: 3,
    name: '結社',
    reading: 'ゆいのやしろ（中宮）',
    deity: '磐長姫命（いわながひめのみこと）',
    blessing: '縁結び・恋愛成就・良縁円満',
    position: [-26.0, 8.85, -39.5],
    lookTarget: [-26.0, 10.0, -44.0],
    sealTitle: '恋之宮御神縁',
    sealCenter: '結社磐長姫',
    sealSub: '良縁成就之証'
  }
];

export const MIZUURA_FORTUNES = [
  {
    rank: '大吉',
    poem: '水清く 龍昇る谷の 朝光に\nよろづの願ひ 今ぞひらけむ',
    translation: '清澈神泉映照升龙晨光，心中诸般祈愿终将圆满盛放。',
    items: [
      ['願望（愿望）', '心の誠を尽くせば思い通りに叶う'],
      ['恋愛（姻缘）', '深き信頼で結ばれる最良の御縁あり'],
      ['学業（学业）', '積み重ねた努力が大輪の花を咲かす'],
      ['旅行（出行）', '水辺・北方の旅に大いなる吉兆あり'],
      ['方向（吉方）', '北・東の方角に運氣生ず']
    ]
  },
  {
    rank: '中吉',
    poem: '貴船川 岩間をぬひて ゆく水の\nたゆまぬ歩み 海にいたらむ',
    translation: '贵船清流穿行苍翠岩间，步履不息终将奔赴辽阔沧海。',
    items: [
      ['願望（愿望）', '焦らず順を追えば着実に成就する'],
      ['恋愛（姻缘）', '穏やかな語らいから良縁が育まれる'],
      ['学業（学业）', '基礎を固めれば難関も突破できる'],
      ['旅行（出行）', '山紫水明の地にて氣力が蘇る'],
      ['方向（吉方）', '東南・西の方角よし']
    ]
  },
  {
    rank: '吉',
    poem: '山霧の 晴れてさやけき 桂木の\n若葉に宿る 露ぞきらめく',
    translation: '山雾初霁，御神木桂树新叶承露，生机与灵气悄然焕发。',
    items: [
      ['願望（愿望）', '周囲の助けを得て道が開ける'],
      ['恋愛（姻缘）', '素直な心を伝えれば想い通ず'],
      ['学業（学业）', '迷いを捨てて一事に集中せよ'],
      ['旅行（出行）', '同行者と和合し良き思い出となる'],
      ['方向（吉方）', '南・北西の方角に福あり']
    ]
  },
  {
    rank: '末吉',
    poem: '沢の辺に ほのかに灯る 蛍火の\nやがて夜空を 照らす時待つ',
    translation: '溪泽畔微光点点的萤火，静待时机终能照亮幽深夜空。',
    items: [
      ['願望（愿望）', '今は力を養う時、後に大きく実る'],
      ['恋愛（姻缘）', '急がず相手を思いやる心が鍵となる'],
      ['学業（学业）', '日々の復習を怠らねば後半に伸びる'],
      ['旅行（出行）', '無理のない計画で心身を清めよ'],
      ['方向（吉方）', '東の方角に転機あり']
    ]
  }
];

export const MUSUBIBUMI_PRESETS = [
  '良縁成就・大切な人といつまでも仲良く歩めますように',
  '心願成就・新しい挑戦が実を結び道が大きく開けますように',
  '家内安全・家族みんなが健やかで笑顔あふれる日々でありますように',
  '学業技芸上達・日々の研鑽が実り良き師友に恵まれますように'
];
