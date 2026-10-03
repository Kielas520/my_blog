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

- 首页场景目录：`src/data/room-scenes.json`，五个原创像素小窝（雪夜、雨天书房、春日花房、夏夜海边、秋日厨房）均使用真实 GIF 循环动图：飘雪与星星灯、雨与茶杯热气、落花、海面波光与风扇、落叶与茶壶热气。网站引用已上传的 `image.kielasovo.com` 地址，本地 GIF 和 SVG 源图保留在 `public/images/pixel-room*`。每次进入或刷新首页随机选择，图片、天气、场景名与小句子同步更新；当前会话内避免连续重复。禁用 JavaScript 时显示雪夜 GIF；系统启用“减少动态效果”时，`picture` 使用对应 `poster` 静态 SVG。
- 运行 `node scripts/generate-room-gifs.mjs` 可从原 SVG 重建五张 720×448、40 帧、4 秒无限循环 GIF，同时从 `public/cursors/pixel-star.svg` 重建 20×20 的 `pixel-star.png` 光标；SVG 仍以 32×32 坐标绘制，由渲染器缩小输出。渲染器和 GIF 编码器在 npm 开发依赖中。重新生成后需通过现有 PicGo 图片配置上传 GIF，并更新场景的 `src`；`poster` 保留静态图地址。
- 默认光标为奶油粉像素箭头配星星，`public/config.json` 和构建默认值均引用 `/cursors/pixel-star.png`，点击热点为 `(0, 0)`。普通链接、按钮和文章目录统一使用该光标；输入框保留文字光标，工具执行时保留等待光标。
- `backgroundImage` 为空表示使用全局 CSS 平铺背景；填写图片地址可切换自定义背景。
- 首页 `Hi There` 作为独立问候显示，不拼接“的空间”“的小小世界”等主人称呼；个人资料中的主人名称独立维护。
- 相册错落布局在 `astro:page-load` 时初始化，每次站内返回都会恢复随机排列和旋转；同一页面节点只初始化一次。
- 相册 `src/data/picture.json` 保留 `BV1zbhm62Evo` 中的 11 张静态少女插画（不含阿狸），以及 `BV1uYAFzrEHJ` 中的 7 张真实 GIF 像素动图：第 82 集的圣诞小屋、第 20 集午後的窗台、第 26 集夜間的海邊、第 34 集窗邊的雨、第 36 集陽光花房、第 38 集庭院春景、第 52 集雨中的咖啡館。七张 GIF 都来自原视频 2–6 秒片段，640×320、40 帧、4 秒无限循环；圣诞小屋由之前保留的动画 WebP 转换，其余六张重新从视频提取。少女插画视频的切图转场和压缩噪声不作为动画。保留画面内署名；本地 GIF 与此前 WebP 对照素材在 `public/images/album/`，网站引用 PicGo `kielas-nas-picture` 上传后的 GIF 地址。相册底部仍提供两个视频来源链接；这些是视频提取画面，不是原始高清插画。数据顺序仍为前 11 项少女插画、后 7 项像素场景，与页面替代文字对应。
- 音乐盒歌单共六首，前两首为视频音轨：`christmas-room-soundtrack.mp3`（`BV1uYAFzrEHJ` 第 82 集，CID 41640526917，约 129.61 秒）和 `girl-illustration-soundtrack.mp3`（`BV1zbhm62Evo`，CID 42202630843，约 12.91 秒）；后四首保留本地合成原创短曲。前两首名称按画面标注为视频原声，不代表已确认的原曲曲名。网站引用已上传的 `sound.kielasovo.com` 地址，本地源文件保留在 `public/audio/`。支持选曲、上一首、下一首和首尾循环切换。点击播放后可跨站内页面继续播放，不自动播放。
- 新增三首短曲的旋律和合成器保存在 `scripts/generate-space-audio.mjs`；运行 `node scripts/generate-space-audio.mjs` 可重建雨天、春日、海边音频，不使用第三方采样。原雪夜曲保留 `window-music-box.wav`。
- `/music` 的“那年的画面，那年的声音”只保留四个简洁链接：EOND 的 2007 年 Enakei 作品站记录、Pixel Scenery 场景收藏、Tofu 像素动图作品页和 MusMus 轻柔音乐分类。不链接参考视频或壁纸族，不显示介绍段落及卡片解释。Enakei 现行官网未核实，旧站记录不当作作者官网；MusMus 是发现音乐的外链，不是当前视频原声的曲目来源。相册仍保留视频来源标注，首页仍使用原创小窝场景。
- 修改歌单仍编辑 `src/data/music.json`，每项为 `name` 和可播放的 `link`。视频音轨经 FFmpeg 转为 MP3 后使用现有音频上传工具上传；更新源文件后同步修改远程地址。
- 场景和音频通过已有 `upload:file` 工具分别使用 PicGo 的 `kielas-nas-picture` 与 `kielas-nas-music` 配置上传；源文件到 URL 的记录保存在 `tools/media-uploader/upload.log`。重新绘制或合成后需重新上传并更新对应数据 JSON，生成器不会自动替换远程地址。
