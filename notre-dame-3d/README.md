# 圣母大学 3D 全景数字孪生 · University of Notre Dame 3D Digital Twin

基于 **Three.js + GLSL 自定义着色器 + 程序化 PBR 纹理** 构建的美国印第安纳州圣母大学（*University of Notre Dame du Lac*）全校园交互式 3D 数字孪生系统。

## 核心还原亮点

- **真实地理坐标校准（1 单位 = 1 米）**：以金顶行政主楼 `(0, 0)`（`41.7031°N, 86.2389°W`）为原点，精准复刻上帝草坪（God Quad）、南草坪（South Quad）、北草坪（North Quad）、球馆草坪（Fieldhouse Mall）、德巴托洛草坪（DeBartolo Quad）、西草坪（West Quad）、现代草坪（Mod Quad）、爱尔兰绿地（Irish Green）与圣母大道轴线。
- **地标级定制建模与历史细节**：
  - **金顶行政主楼（Main Building）**：法兰西第二帝国黄砖翼楼、南门科林斯柱廊台阶（未毕业本科生禁行传统）、白色古典鼓座、23.9K 纯金箔穹顶与 5.8 米高圣母玛利亚镀金雕像。
  - **圣心大教堂（Basilica of the Sacred Heart）**：66.4 米全美最高大学教堂哥特尖塔、拉丁十字耳堂、14 组飞扶壁、玫瑰花窗与 44 扇加尔默罗会彩色玻璃花窗。
  - **露德圣母岩洞（The Grotto）**：冰川巨石洞窟、圣母与圣女伯尔纳德雕像，以及 220 支彻夜摇曳发光的祈福蜡烛。
  - **赫斯伯格图书馆（Hesburgh Library & Touchdown Jesus）**：64 米高 14 层主塔、南立面 40×20 米《生命之言》花岗岩马赛克壁画、明镜倒影池与西门“First Down Moses”铜像。
  - **圣母大学体育场（Notre Dame Stadium & Campus Crossroads）**：完整碗形双层看台、中场金色 ND 徽记、南北达阵区指向金顶主楼的 **9 道 42° 斜线（1842 创校密码）**、北端区直视“达阵耶稣”的真实视线走廊、南端区巨型记分屏、Knute Rockne 铜像与比赛日探照灯塔。
  - **双湖与全校建筑群**：GLSL 动态水波还原圣玛丽湖（St. Mary's Lake）与圣约瑟夫湖（St. Joseph's Lake）、原木小教堂（Log Chapel）、老学院楼（Old College）、先贤墓园、巨石阵喷泉（Clarke Fountain）、霍格沃茨式南食堂（South Dining Hall）、邦德厅（Bond Hall）、法学院跨街哥特拱桥、奥肖内西文学院、门多萨商学院、乔丹科学馆（天文圆顶与玻璃温室）、格雷斯楼顶 `#1` 红色霓虹标志、乔伊斯中心双椭圆白穹顶，以及全部 **33 座本科生宿舍院**。
- **动态昼夜、四季与比赛日氛围**：支持 24 小时连续太阳轨迹与夜景泛光照明（晨雾、正午、落日熔金、星夜烛光）、四季切换（深秋红叶、春樱新绿、盛夏浓荫、南本德初雪）及橄榄球 **Game Day 盛典模式**（点亮球场灯塔、`#1` 霓虹与空中巡航飞艇）。
- **三种交互模式**：自由航拍鸟瞰（`1`）、第一人称校园漫步（`2`）、12 站电影级全景导览（`3`），搭配可瞬移的 2D 校园雷达小地图与全建筑点击检索。

## 目录内置 ZIP 压缩包

为便于单独下载子目录源码或直接静态部署，本目录内置两份最新打包压缩文件：

- **[`notre-dame-3d.zip`](./notre-dame-3d.zip)**：完整独立工程包（包含全部源码 `src/`、`package.json`、Vite 配置及预构建好的 `dist/` 生产包，不含 `node_modules`）。
- **[`notre-dame-3d-dist.zip`](./notre-dame-3d-dist.zip)**：纯生产静态产物包（解压即得 `index.html` 与 `assets/`，可直接部署至任意静态服务器或 CDN）。

## 本地运行与打包构建

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 生产环境打包构建（输出至 dist/ 目录，已配置相对路径支持 GitHub Pages 部署）
npm run build

# 预览打包产物
npm run preview
```
