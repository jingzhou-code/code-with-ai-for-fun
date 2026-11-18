# Code with AI for Fun — 3D 数字复原与数字孪生作品集

本仓库收纳独立子目录形式的 Three.js 三维项目源码与完整打包压缩包（`.zip`，内含完整源码及 `dist/` 生产静态包）。

## 项目目录与一键下载列表

| 项目名称 | 子目录 | 完整打包压缩包（含源码 + `dist` 静态产物） | 简介 |
| :--- | :--- | :--- | :--- |
| **音羽山 清水寺 3D 全境复原** | [`./kiyomizu-dera-3d/`](./kiyomizu-dera-3d/) | [`kiyomizu-dera-3d.zip`](./kiyomizu-dera-3d/kiyomizu-dera-3d.zip) | 京都世界文化遗产清水寺全伽蓝复原：国宝本堂与 139 根榉木六段通贯无钉悬造舞台、仁王门、三重塔、奥之院、音羽之泷、地主神社、四季昼夜与观音慈悲之光 |
| **复旦大学江湾校区 3D 数字孪生** | [`./fudan-jiangwan-3d/`](./fudan-jiangwan-3d/) | [`fudan-jiangwan-3d.zip`](./fudan-jiangwan-3d/fudan-jiangwan-3d.zip) | 淞沪路 2005 号 1,600 亩新古典主义建筑群（廖凯原法学楼、李兆基图书馆、智华楼等）与日月湖水系 `1:1` 三维漫游 |
| **复旦大学邯郸校区 3D 数字孪生** | [`./fudan-handan-3d/`](./fudan-handan-3d/) | [`fudan-handan-3d.zip`](./fudan-handan-3d/fudan-handan-3d.zip) | 邯郸路 220 号 1,383 亩本部、北区、东区、南区全境（光华楼、相辉堂、子彬院、正大体育馆、燕园曦园等）`1:1` 三维漫游 |

## 本地运行任一子项目

进入对应子目录（或解压对应的 `.zip` 文件）后执行：

```bash
npm install
npm run dev
```

压缩包内已附带预构建完成的 `dist/` 目录，也可直接通过任意静态服务器（如 `npx serve dist`）预览。
