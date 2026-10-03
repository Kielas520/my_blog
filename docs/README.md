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

- 首页场景目录：`src/data/room-scenes.json`，共五张原创 SVG（雪夜、雨天书房、春日花房、夏夜海边、秋日厨房），网站引用已上传的 `image.kielasovo.com` 地址，本地源文件保留在 `public/images/pixel-room*.svg`。每次进入或刷新首页随机选择，图片、天气、场景名与小句子同步更新；当前会话内避免连续重复。禁用 JavaScript 时显示原雪夜小屋。
- `backgroundImage` 为空表示使用全局 CSS 平铺背景；填写图片地址可切换自定义背景。
- 相册错落布局在 `astro:page-load` 时初始化，每次站内返回都会恢复随机排列和旋转；同一页面节点只初始化一次。
- 相册 `src/data/picture.json` 使用 `BV1zbhm62Evo` 中的 11 张少女插画（不含阿狸），以及 `BV1uYAFzrEHJ` 中的 7 个像素场景：第 82 集 2–6 秒的圣诞小屋循环动图（40 帧）；第 20、26、34、36、38、52 集的 3 秒处静态画面，分别为午後的窗台、夜間的海邊、窗邊的雨、陽光花房、庭院春景、雨中的咖啡館。静态图与动图均使用 WebP，保留画面内署名；本地素材在 `public/images/album/`，网站引用 PicGo `kielas-nas-picture` 上传后的图床地址。相册底部提供两个视频来源链接；这些是视频提取画面，不是原始高清插画。数据顺序为前 11 项少女插画、后 7 项像素场景，与页面替代文字对应。
- 音乐盒使用四首本地合成原创短曲，网站引用已上传的 `sound.kielasovo.com` 地址，本地源文件保留在 `public/audio/`。支持选曲、上一首、下一首和首尾循环切换。点击播放后可跨站内页面继续播放，不自动播放。
- 新增三首短曲的旋律和合成器保存在 `scripts/generate-space-audio.mjs`；运行 `node scripts/generate-space-audio.mjs` 可重建雨天、春日、海边音频，不使用第三方采样。原雪夜曲保留 `window-music-box.wav`。
- `/music` 保留两个 B站参考视频入口，第二个链接固定第 82 集。原视频 BGM 曲名未确认，未转载音轨；相册使用这些视频中提取的画面，首页仍使用原创小窝场景。
- 修改歌单仍编辑 `src/data/music.json`，每项为 `name` 和可播放的 `link`；正式替换音乐前确认使用权限。
- 场景和音频通过已有 `upload:file` 工具分别使用 PicGo 的 `kielas-nas-picture` 与 `kielas-nas-music` 配置上传；源文件到 URL 的记录保存在 `tools/media-uploader/upload.log`。重新绘制或合成后需重新上传并更新对应数据 JSON，生成器不会自动替换远程地址。
