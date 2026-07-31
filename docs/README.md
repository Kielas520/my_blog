# Kielasovo 使用文档

Kielasovo 是一个基于 Astro SSG 的静态个人站点。主页采用克制的 Frutiger Aero
风格，内容按照 Notion `INDEX` 的分类方式管理。

## 文档目录

- [数据管理、更新、构建与启动（日常维护手册）](./maintenance-guide.md)
- [安装与运行](./getting-started.md)
- [项目架构](./architecture.md)
- [Blog 内容管理](./content-guide.md)
- [名言、链接、媒体与 Tools 配置](./configuration.md)
- [构建与 Cloudflare Tunnel 部署](./deployment.md)
- [常见问题](./troubleshooting.md)

## 最常用命令

```powershell
npm install
npm run dev
npm run check
npm run build
npm run serve
```

本地源站端口为 `1314`：

- 开发模式：`http://localhost:1314`
- 正式静态服务：`http://127.0.0.1:1314`
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
