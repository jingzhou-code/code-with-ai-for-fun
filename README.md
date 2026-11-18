# Code with AI for Fun — Three.js 3D 数字复原与数字孪生作品集

本仓库以独立子目录收纳各 Three.js 三维项目，每个子目录内均附带 **完整项目压缩包（`<project>.zip`，含源码与 `dist/`）** 及 **纯静态部署包（`<project>-dist.zip`）**，可直接作为网盘归档下载使用。

## 项目目录与一键下载索引

| 项目名称 | 子目录 | 完整项目包（源码 + `dist`） | 纯静态产物包（`dist`） | 简介 |
| :--- | :--- | :--- | :--- | :--- |
| **音羽山 清水寺 3D 全境复原** | [`./kiyomizu-dera-3d/`](./kiyomizu-dera-3d/) | [`kiyomizu-dera-3d.zip`](./kiyomizu-dera-3d/kiyomizu-dera-3d.zip) | [`kiyomizu-dera-3d-dist.zip`](./kiyomizu-dera-3d/kiyomizu-dera-3d-dist.zip) | 京都世界文化遗产清水寺全伽蓝复原：国宝本堂与 139 根榉木六段通贯无钉悬造舞台、仁王门、三重塔、奥之院、音羽之泷、地主神社、四季昼夜与观音慈悲之光 |
| **小仓山 常寂光寺 3D 复原** | [`./jojakko-ji-3d/`](./jojakko-ji-3d/) | [`jojakko-ji-3d.zip`](./jojakko-ji-3d/jojakko-ji-3d.zip) | [`jojakko-ji-3d-dist.zip`](./jojakko-ji-3d/jojakko-ji-3d-dist.zip) | 京都嵯峨野小仓山常寂光寺（仁王门、本堂、多宝塔、苔庭石阶与红叶山林）三维复原 |
| **复旦大学江湾校区 3D 数字孪生** | [`./fudan-jiangwan-3d/`](./fudan-jiangwan-3d/) | [`fudan-jiangwan-3d.zip`](./fudan-jiangwan-3d/fudan-jiangwan-3d.zip) | [`fudan-jiangwan-3d-dist.zip`](./fudan-jiangwan-3d/fudan-jiangwan-3d-dist.zip) | 淞沪路 2005 号 1,600 亩新古典主义建筑群（廖凯原法学楼、李兆基图书馆、智华楼等）与日月湖水系 `1:1` 三维漫游 |
| **复旦大学邯郸校区 3D 数字孪生** | [`./fudan-handan-3d/`](./fudan-handan-3d/) | [`fudan-handan-3d.zip`](./fudan-handan-3d/fudan-handan-3d.zip) | [`fudan-handan-3d-dist.zip`](./fudan-handan-3d/fudan-handan-3d-dist.zip) | 邯郸路 220 号 1,383 亩本部、北区、东区、南区全境（光华楼、相辉堂、子彬院、正大体育馆、燕园曦园等）`1:1` 三维漫游 |
| **圣母大学（Notre Dame）3D 数字孪生** | [`./notre-dame-3d/`](./notre-dame-3d/) | [`notre-dame-3d.zip`](./notre-dame-3d/notre-dame-3d.zip) | [`notre-dame-3d-dist.zip`](./notre-dame-3d/notre-dame-3d-dist.zip) | 美国圣母大学校园（Golden Dome 主楼、圣心大教堂、双湖与体育场等）三维数字孪生漫游 |
| **芝加哥大学（UChicago）3D 数字孪生** | [`./uchicago-3d-campus/`](./uchicago-3d-campus/) | [`uchicago-3d-campus.zip`](./uchicago-3d-campus/uchicago-3d-campus.zip) | [`uchicago-3d-campus-dist.zip`](./uchicago-3d-campus/uchicago-3d-campus-dist.zip) | 芝加哥大学英式哥特建筑群（Main Quadrangles、Rockefeller Chapel、Mansueto 玻璃穹顶图书馆等）`1:1` 三维漫游 |
| **贵布祢总本宫 贵船神社 3D 全境复原** | [`./kifune-shrine-3d/`](./kifune-shrine-3d/) | [`kifune-shrine-3d.zip`](./kifune-shrine-3d/kifune-shrine-3d.zip) | [`kifune-shrine-3d-dist.zip`](./kifune-shrine-3d/kifune-shrine-3d-dist.zip) | 京都洛北水神总本宫全境复原：本宫 / 结社 / 奥宫三社、表参道 84 级石段 37 基春日灯笼、贵船川床、四季昼夜与水占神签 |

## 本地运行任一子项目

进入任一子目录（或解压对应的 `<project>.zip`）后执行：

```bash
npm install
npm run dev
```

若仅需本地直接运行静态网页，解压 `<project>-dist.zip` 后通过任意静态服务器（如 `npx serve dist`）即可打开预览。
