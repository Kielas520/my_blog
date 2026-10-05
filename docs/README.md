# Kielasovo 使用文档

Kielasovo 是一个基于 Astro SSG 的静态个人站点。界面采用暖粉奶油色的 QQ空间与原创
像素小窝风格，文章只分「日志」与「技术笔记」，分别记录心境经历与技术、实用资料。

## 文档目录

- [数据管理、开发与 Pages 发布（日常维护手册）](./maintenance-guide.md)
- [Cloudflare R2 与 PicGo 环境配置](./media-storage-setup.md)
- [安装与运行](./getting-started.md)
- [项目架构](./architecture.md)
- [Blog 内容管理](./content-guide.md)
- [名言、链接、媒体与 Tools 配置](./configuration.md)
- [Notion API 配置与文章导入](./notion-importer.md)
- [GitHub 与 Cloudflare Pages 部署](./deployment.md)
- [常见问题](./troubleshooting.md)

## 最常用命令

```powershell
npm install
npm run dev
npm run check
npm run build
git status
git add <文件>
git commit -m "Update blog"
git push origin main
```

推送 `main` 分支后，Cloudflare Pages 自动构建并发布。`web start`、`web check` 和 `web stop`
仅作为可选的本地静态预览命令，不参与正式部署。

本地源站端口为 `1314`：

- 开发模式：`http://localhost:1314`
- Pages 预览入口：`https://kielasovo.pages.dev`
- 公网入口：`https://kielasovo.com`

## 常用配置入口

| 用途 | 文件 |
| --- | --- |
| 主页 | `src/pages/index.astro` |
| 精选文章 | `src/content/blogs/` |
| Blog 分类和字段 | `src/content.config.ts` |
| 随机名言 | `public/fun_words/words.json` |
| 短链接 | `src/data/short-links.json` |
| 有趣链接 | `src/data/intrest-links.json` |
| 图片墙 | `src/data/picture.json` |
| 音乐列表 | `src/data/music.json` |
| Tools 页面 | `src/pages/tools/` |
| 全局样式 | `src/styles/global.css` |
| 域名和端口 | `astro.config.mjs`、`package.json` |

## 空间皮肤与音乐

- 首页场景目录：`src/data/room-scenes.json`，五个原创像素小窝（雪夜、雨天书房、春日花房、夏夜海边、秋日厨房）均使用真实 GIF 循环动图：飘雪与星星灯、雨与茶杯热气、落花、海面波光与风扇、落叶与茶壶热气。GIF 和 SVG 原稿均使用 `image.kielasovo.com` 外链，不再保留仓库内图片。每次进入或刷新首页随机选择，图片、天气、场景名与小句子同步更新；当前会话内避免连续重复。禁用 JavaScript 时显示雪夜 GIF；系统启用“减少动态效果”时，`picture` 使用对应 `poster` 静态 SVG。
- 运行 `node scripts/generate-room-gifs.mjs <仓库外输出目录>` 可读取场景 `poster` 的远程 SVG 和图床上的光标原稿，重建五张 720×448、40 帧、4 秒无限循环 GIF，以及 20×20 的 `pixel-star.png`。例如输出到 `D:/Pictures/kielas-generated`；生成器拒绝仓库内输出目录。SVG 仍以 32×32 坐标绘制。生成后通过已有 PicGo 配置上传并更新 URL；原稿编辑也在仓库外完成，重新上传后更新 `poster` 或生成器的光标原稿 URL。
- 默认头像、标签页图标和 20×20 奶油粉像素光标均引用图床链接，`public/config.json` 和构建默认值保持一致。光标点击热点为 `(0, 0)`；普通链接、按钮和文章目录统一使用该光标，输入框保留文字光标，工具执行时保留等待光标。
- `backgroundImage` 为空表示使用全局 CSS 平铺背景；填写图片地址可切换自定义背景。
- 首页 `Hi There` 作为独立问候显示，不拼接“的空间”“的小小世界”等主人称呼；个人资料中的主人名称独立维护。
- 相册错落布局在 `astro:page-load` 时初始化，每次站内返回都会恢复随机排列和旋转；同一页面节点只初始化一次。
- 相册 `src/data/picture.json` 保留 `BV1zbhm62Evo` 中的 11 张静态少女插画（不含阿狸），以及 `BV1uYAFzrEHJ` 中的 7 张真实 GIF 像素动图：第 82 集的圣诞小屋、第 20 集午後的窗台、第 26 集夜間的海邊、第 34 集窗邊的雨、第 36 集陽光花房、第 38 集庭院春景、第 52 集雨中的咖啡館。七张 GIF 都来自原视频 2–6 秒片段，640×320、40 帧、4 秒无限循环；圣诞小屋由先前提取的动画 WebP 转换，其余六张重新从视频提取。少女插画视频的切图转场和压缩噪声不作为动画。画面内署名保留；网站与对照素材都使用图床链接，不再保存本地图片。相册底部仍提供两个视频来源链接；这些是视频提取画面，不是原始高清插画。数据顺序仍为前 11 项少女插画、后 7 项像素场景，与页面替代文字对应。
- 音乐盒歌单共两首：温暖的圣诞夜（`christmas-room-soundtrack.mp3`，来自 `BV1uYAFzrEHJ` 第 82 集，约 129.61 秒）和夜的钢琴曲五 · 石进（用户提供的 `夜的钢琴曲五 - 纯音乐网.mp3`，约 127.15 秒）。第二首已替换此前约 12.91 秒的少女插画视频片段，使用上传地址 `https://sound.kielasovo.com/2026/10/c9f24e6c89d8c1d1a4d713d1268293b3.mp3`；第一首原曲曲名尚未确认。四首合成短曲及其本地源文件、专用生成脚本已移除。第一首源文件保留在 `public/audio/`，第二首上传源文件位于用户下载目录，旧片段不再保留。支持选曲、上一首、下一首和首尾循环切换。点击播放后可跨站内页面继续播放，不自动播放。
- `/music` 的“那年的画面，那年的声音”只保留四个简洁链接：EOND 的 2007 年 Enakei 作品站记录、好听纯音乐网（`http://www.htcyy.com/`，纯音乐与钢琴曲）、Tofu 像素动图作品页和 MusMus 轻柔音乐分类。不链接参考视频或壁纸族，不显示介绍段落及卡片解释。Enakei 现行官网未核实，旧站记录不当作作者官网；MusMus 是发现音乐的外链，不是当前视频原声的曲目来源。相册仍保留视频来源标注，首页仍使用原创小窝场景。
- 修改歌单仍编辑 `src/data/music.json`，每项为 `name` 和可播放的 `link`。视频音轨经 FFmpeg 转为 MP3 后使用现有音频上传工具上传；更新源文件后同步修改远程地址。
- 场景和音频通过已有 `upload:file` 工具分别使用 PicGo 的 `kielas-nas-picture` 与 `kielas-nas-music` 配置上传；源文件到 URL 的记录保存在 `tools/media-uploader/upload.log`。重新绘制或合成后需重新上传并更新对应数据 JSON，生成器不会自动替换远程地址。

## 图片外链迁移清单

2026-10-03：仓库内 40 个图片文件（24,143,245 字节）已全部备份到 `image.kielasovo.com`，下载后的 SHA-256 与本地文件逐个一致，再移除本地图片。35 个复用已上传且核验一致的链接，5 个补充上传；网站代码、文章和文档保留，音频不在本次图片迁移范围内。后续图片在仓库外准备、上传并填写 HTTPS 外链，禁止把图片重新放入仓库。原文件名仅用于对照和从服务器下载恢复，不是网站的本地依赖路径。

| 原图片名称 | 图床备份 |
| --- | --- |
| `favicon.svg` | [服务器文件](https://image.kielasovo.com/2026/10/3cbafe36a480e6bd4b8ae82483f853cd.svg) |
| `cursors/pixel-star.png` | [服务器文件](https://image.kielasovo.com/2026/10/85a5e0ade6ca166e36e53b0ff1f710c5.png) |
| `cursors/pixel-star.svg` | [服务器文件](https://image.kielasovo.com/2026/10/4c9667b7b1d1461363851ef6886caddf.svg) |
| `images/kiana.jpg` | [服务器文件](https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg) |
| `images/frutiger_aero.jpg` | [服务器文件](https://image.kielasovo.com/2026/10/2e008f846817076ee43fa21703eb6d88.jpg) |
| `images/pixel-room.svg` | [服务器文件](https://image.kielasovo.com/2026/10/8d5edfa09a0e9b3bb6d8f5dbe645d235.svg) |
| `images/pixel-room.gif` | [服务器文件](https://image.kielasovo.com/2026/10/9a15f89d30b364cf12c9db813693c550.gif) |
| `images/pixel-room-rain.svg` | [服务器文件](https://image.kielasovo.com/2026/10/2b9530325468ca1c15dc8db4e45024aa.svg) |
| `images/pixel-room-rain.gif` | [服务器文件](https://image.kielasovo.com/2026/10/62f8b3ad985b145f9c3cf40210d86ad7.gif) |
| `images/pixel-room-spring.svg` | [服务器文件](https://image.kielasovo.com/2026/10/e0f9dd7e5396457aec8348c1616e4644.svg) |
| `images/pixel-room-spring.gif` | [服务器文件](https://image.kielasovo.com/2026/10/9fce17a0083fa9d0ed1e6fdae60eb783.gif) |
| `images/pixel-room-summer.svg` | [服务器文件](https://image.kielasovo.com/2026/10/2a591323f6b8e53fecf5448b5c1acd19.svg) |
| `images/pixel-room-summer.gif` | [服务器文件](https://image.kielasovo.com/2026/10/a7cbc8e0d831b351bf23570b44ad7696.gif) |
| `images/pixel-room-autumn.svg` | [服务器文件](https://image.kielasovo.com/2026/10/bae77ce06e0d34d20a2915450654617e.svg) |
| `images/pixel-room-autumn.gif` | [服务器文件](https://image.kielasovo.com/2026/10/273024cb127a98365e3f3ce47f98380b.gif) |
| `images/album/qq-memory-02.webp` | [服务器文件](https://image.kielasovo.com/2026/10/468bcb47b49e0fab41e7b0415fa1f974.webp) |
| `images/album/qq-memory-03.webp` | [服务器文件](https://image.kielasovo.com/2026/10/21ce7ee87df555c72b8912dfaef6d909.webp) |
| `images/album/qq-memory-04.webp` | [服务器文件](https://image.kielasovo.com/2026/10/a940643b8fe5deb41b18df1b5cf81632.webp) |
| `images/album/qq-memory-05.webp` | [服务器文件](https://image.kielasovo.com/2026/10/dd31183086b2e6727fad95b12153b6a0.webp) |
| `images/album/qq-memory-06.webp` | [服务器文件](https://image.kielasovo.com/2026/10/f4f07ceba1be50b08a1f3dc6aafacb91.webp) |
| `images/album/qq-memory-07.webp` | [服务器文件](https://image.kielasovo.com/2026/10/c83a155894131cad75e59317fb187fd2.webp) |
| `images/album/qq-memory-08.webp` | [服务器文件](https://image.kielasovo.com/2026/10/efb98b8267c4c90f9e20d6f74fa48059.webp) |
| `images/album/qq-memory-09.webp` | [服务器文件](https://image.kielasovo.com/2026/10/784cad7b6741fa768f33bd5f43da62d9.webp) |
| `images/album/qq-memory-10.webp` | [服务器文件](https://image.kielasovo.com/2026/10/8a72570993f81df1ee221e9f53ce1d26.webp) |
| `images/album/qq-memory-11.webp` | [服务器文件](https://image.kielasovo.com/2026/10/4e064d6b8cac52b08071891dbad825cc.webp) |
| `images/album/qq-memory-12.webp` | [服务器文件](https://image.kielasovo.com/2026/10/4eaec89dc856cb8a9dc95f9d08031788.webp) |
| `images/album/christmas-room.webp` | [服务器文件](https://image.kielasovo.com/2026/10/e99ff263b690a796ae11780589549c28.webp) |
| `images/album/christmas-room.gif` | [服务器文件](https://image.kielasovo.com/2026/10/d55b5eb44470e64ef6bcf2332129af55.gif) |
| `images/album/pixel-scene-p20.webp` | [服务器文件](https://image.kielasovo.com/2026/10/4cbd09504dcaa6cf94eb5fb3a7605f08.webp) |
| `images/album/pixel-scene-p20.gif` | [服务器文件](https://image.kielasovo.com/2026/10/74dda161d680068d59eeaf8a499de547.gif) |
| `images/album/pixel-scene-p26.webp` | [服务器文件](https://image.kielasovo.com/2026/10/469262dd7fe3e08c7f46a2fcb472862e.webp) |
| `images/album/pixel-scene-p26.gif` | [服务器文件](https://image.kielasovo.com/2026/10/64ea31996b11261aeb9d2e28df18c112.gif) |
| `images/album/pixel-scene-p34.webp` | [服务器文件](https://image.kielasovo.com/2026/10/ec6df1de9e9db624f57f4da3a0faa6fc.webp) |
| `images/album/pixel-scene-p34.gif` | [服务器文件](https://image.kielasovo.com/2026/10/8011a71e24d79e8643787f22477445e1.gif) |
| `images/album/pixel-scene-p36.webp` | [服务器文件](https://image.kielasovo.com/2026/10/7674272d782bde6e3d4b6ce0914239bf.webp) |
| `images/album/pixel-scene-p36.gif` | [服务器文件](https://image.kielasovo.com/2026/10/adcd719cb42e4fcf47914a5cb8789eab.gif) |
| `images/album/pixel-scene-p38.webp` | [服务器文件](https://image.kielasovo.com/2026/10/1d2a57187bf5021728dc675be3a7bf25.webp) |
| `images/album/pixel-scene-p38.gif` | [服务器文件](https://image.kielasovo.com/2026/10/9d0bd851c74deb77dfdeec6d9a7e3dc1.gif) |
| `images/album/pixel-scene-p52.webp` | [服务器文件](https://image.kielasovo.com/2026/10/950b9830242afd2d444a42e4b8b5395c.webp) |
| `images/album/pixel-scene-p52.gif` | [服务器文件](https://image.kielasovo.com/2026/10/3af5626ed208840dba4783f0d7523df3.gif) |
