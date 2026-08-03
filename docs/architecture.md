# 项目架构

## 目录结构

```text
kielasWEB/
├─ docs/                       使用文档
├─ public/
│  ├─ fun_words/words.json    运行时随机名言
│  ├─ images/kiana.jpg        主页头像
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ Nav.astro
│  │  ├─ Footer.astro
│  │  └─ FunWords.astro
│  ├─ content/blogs/          精选 Blog Markdown
│  ├─ data/                   短链、有趣链接、图片和音乐数据
│  ├─ layouts/BaseLayout.astro
│  ├─ pages/
│  │  ├─ index.astro          主页
│  │  ├─ blogs/               Blog 列表和文章路由
│  │  ├─ tools/               工具页
│  │  ├─ link/                短链接目录
│  │  ├─ picture/             随机图片墙
│  │  ├─ music/               音乐播放器
│  │  └─ [...short].astro     短链接跳转页生成器
│  ├─ styles/global.css
│  └─ content.config.ts
├─ astro.config.mjs
├─ package.json
└─ dist/                       自动生成的静态站点
```

## 页面关系

```text
/
├─ /blogs
│  └─ /blogs/<文章路径>
├─ /tools
│  ├─ /tools/ip-inspector
│  └─ /tools/speed-test
├─ /link
├─ /picture
├─ /music
└─ /<short>  → 外部目标地址
```

## 内容流

Blog 内容采用构建时生成：

```text
Markdown
  → Astro Content Collection
  → /blogs/[...slug]
  → dist/blogs/.../index.html
```

随机名言采用运行时读取：

```text
dist/fun_words/words.json
  → 浏览器 fetch
  → 随机文字、对齐和动画
```

短链接采用构建时生成：

```text
src/data/short-links.json
  → Astro getStaticPaths()
  → dist/<short>/index.html
  → meta refresh + JavaScript 跳转
```

因此：

- 修改 Blog 或短链接后需要重新构建。
- 修改 `public/fun_words/words.json` 后需要重新构建并通过 GitHub 发布。
- 重新构建会清空并重建 `dist/`。

## 设计边界

- Notion 用于管理原始内容和分类习惯。
- 网站只收录人工选出的公开文章，不自动发布整个 Notion 数据库。
- Blog、Tools、Link 相互独立，避免功能和内容耦合。
- Picture 和 Music 通过独立 JSON 数据文件维护。
- GitHub 保存正式源码，Cloudflare Pages 从 `main` 分支构建并托管静态产物。
- 本地服务和 Cloudflare Tunnel 不参与正式站点的访问链路。
