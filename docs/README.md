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

- 首页场景：`public/images/pixel-room.svg`，原创像素小屋；头像仍由 `public/config.json` 配置。
- `backgroundImage` 为空表示使用全局 CSS 平铺背景；填写图片地址可切换自定义背景。
- 相册错落布局在 `astro:page-load` 时初始化，每次站内返回都会恢复随机排列和旋转；同一页面节点只初始化一次。
- 音乐盒初版使用 `public/audio/window-music-box.wav` 的本地合成原创短曲，替换原有混合歌单。点击播放后可跨站内页面继续播放，不自动播放。
- `/music` 保留两个 B站参考视频入口，第二个链接固定第 82 集。原视频 BGM 曲名未确认，未转载视频、插画或音轨。
- 修改歌单仍编辑 `src/data/music.json`，每项为 `name` 和可播放的 `link`；正式替换音乐前确认使用权限。
