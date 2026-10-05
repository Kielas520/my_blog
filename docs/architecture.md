# 项目架构

## 目录结构

```text
kielasWEB/
├─ docs/                       使用文档
├─ public/
│  ├─ fun_words/words.json    运行时随机名言
│  ├─ config.json             站名与头像、图标、光标外链
│  └─ audio/                  本次图片迁移未改动的音频源文件
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

图片素材（含 GIF、头像、光标和 SVG 原稿）全部存放在 `image.kielasovo.com`，仓库只保存图片 URL、代码及说明，不再包含本地图片目录。迁移清单与恢复链接见 `docs/README.md`；图片生成器读取远程 SVG，并要求输出到仓库外。

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

首页「小窝便签」在 `src/pages/index.astro` 中维护：称呼、正文段落和两行祝福分别排版，使用奶油色纸面与分隔线，不再用横线背景穿过文字；正文长句按语意显式分行，避免将“到处看看”“珍贵的财富”拆到下一行；窄屏沿用独立段落和右对齐祝福。

首页收藏入口仅展示图标、标题和箭头，不附加介绍或装饰文案；音乐页播放器展示唱片和当前曲名，不附加曲目来源及操作说明。歌曲列表与播放交互保持不变。

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
