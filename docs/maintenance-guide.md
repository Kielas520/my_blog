# 数据管理、开发与 Pages 发布

这份文档用于 Kielasovo 的日常维护。项目目录为：

```text
D:\project\kielasWEB
```

## 一、先分清 `src`、`public` 和 `dist`

```text
src/       页面、文章和构建时读取的数据源
public/    图片、JSON、光标等公开静态资源的源文件
dist/      npm run build 自动生成的正式网站
```

长期内容应维护在 `src/` 或 `public/` 中。`dist/` 是构建结果，下一次构建会重新生成，不能把它
当作唯一的数据源。

## 二、数据文件一览

| 内容 | 源文件 | 修改后是否需要构建 |
| --- | --- | --- |
| 网站名称、图标、头像、背景、光标 | `public/config.json` | 必须构建并发布 |
| 随机名言 | `public/fun_words/words.json` | 必须构建并发布 |
| 短链接 | `src/data/short-links.json` | 必须构建 |
| 有趣网页 | `src/data/intrest-links.json` | 必须构建 |
| 图片墙列表 | `src/data/picture.json` | 必须构建 |
| 音乐列表 | `src/data/music.json` | 必须构建 |
| Blog 文章 | `src/content/blogs/` | 必须构建 |
| 本地图片及其他静态文件 | `public/images/` 等 | 必须构建，或手动同步到 `dist/` |
| Tools 页面代码 | `src/pages/tools/` | 必须构建 |

统一规则是：修改源文件后执行 `npm run build`，再提交并推送到 GitHub。Cloudflare Pages 上的
`dist/` 是自动生成的部署产物，不能直接编辑。

## 三、管理网站外观

编辑：

```text
public/config.json
```

格式：

```json
{
  "siteName": "Hi There",
  "icon": "/images/kiana.jpg",
  "avatar": "/images/kiana.jpg",
  "backgroundImage": "/images/frutiger_aero.jpg",
  "cursor": "/cursors/vista-glass.svg"
}
```

路径以网站根目录 `/` 开头。例如：

```text
/images/kiana.jpg
```

对应本地文件：

```text
public/images/kiana.jpg
```

不要在网页路径里写 `public`，也不要使用 Windows 反斜杠路径。

## 四、管理随机名言

编辑：

```text
public/fun_words/words.json
```

示例：

```json
{
  "interval": 6500,
  "words": [
    {
      "text": "互联网是一片有潮汐的海。",
      "align": "random",
      "motion": "random"
    }
  ]
}
```

- `interval`：切换间隔，单位为毫秒，最低 3200。
- `align`：`left`、`center`、`right` 或 `random`。
- `motion`：`fade`、`up`、`left`、`right` 或 `random`。

## 五、管理链接数据

### 短链接

编辑 `src/data/short-links.json`：

```json
[
  {
    "name": "profile",
    "short": "me",
    "target": "https://example.com/profile",
    "description": "个人主页"
  }
]
```

以上内容会生成：

```text
https://kielasovo.com/me
```

`target` 必须填写原始 URL，不能写成 Markdown 的 `[名称](URL)` 格式。短链接会生成独立静态
页面，因此修改后必须重新构建。

### 有趣网页

编辑 `src/data/intrest-links.json`：

```json
[
  {
    "name": "example",
    "target": "https://example.com",
    "description": "网页说明"
  }
]
```

文件名当前就是 `intrest-links.json`，不要自行改成其他拼写，否则页面无法读取。

## 六、管理 Picture 和 Music

### Picture

编辑 `src/data/picture.json`：

```json
[
  "/images/kiana.jpg",
  "https://image.example.com/photo.jpg"
]
```

支持两类图片：

- 本地图片：文件放入 `public/images/`，JSON 填写 `/images/文件名.jpg`。
- 远程图片：JSON 直接填写完整的 `https://` URL。

### Music

编辑 `src/data/music.json`：

```json
[
  {
    "name": "heatwaves",
    "link": "https://sound.kielasovo.com/example.flac"
  }
]
```

`name` 是显示标题，`link` 是浏览器直接读取的音频地址。是否能播放 FLAC 等格式取决于浏览器
自身的解码支持。

## 七、管理 Blog

文章目录：

```text
src/content/blogs/
├─ dairy/
├─ thoughts/
├─ ticktick/
└─ get-a-job/
```

新文章可以复制模板：

```powershell
Copy-Item `
  .\src\content\blogs\_template.md `
  .\src\content\blogs\thoughts\new-article.md
```

至少填写：

```yaml
---
title: 文章标题
description: 文章摘要
category: thoughts
publishedAt: 2026-08-01
draft: false
tags: [标签]
type: article
---
```

设为 `draft: true` 的文章不会生成公开页面。文章图片建议放在：

```text
public/images/blogs/<文章名>/
```

Markdown 中使用：

```markdown
![图片说明](/images/blogs/文章名/example.jpg)
```

## 八、JSON 修改规则

JSON 格式严格，最常见的错误是漏逗号、多逗号或引号不完整。注意：

- 键名和字符串必须使用英文双引号。
- 数组最后一项后面不要添加逗号。
- URL 直接写字符串，不要写 Markdown 链接。
- 保存后执行构建，让检查程序发现格式问题。

正确：

```json
[
  { "name": "one", "target": "https://example.com/one" },
  { "name": "two", "target": "https://example.com/two" }
]
```

## 九、开发和预览

首次使用先安装依赖：

```powershell
cd D:\project\kielasWEB
npm install
```

编辑页面时启动开发模式：

```powershell
npm run dev
```

访问：

```text
http://localhost:1314
```

开发模式支持自动刷新，适合反复修改页面、文章和数据。按 `Ctrl+C` 停止服务。

## 十、检查和构建

只检查代码和内容：

```powershell
npm run check
```

正式构建：

```powershell
npm run build
```

`npm run build` 会先执行 Astro 与 TypeScript 检查，再把网站生成到 `dist/`。成功结果应包含：

```text
0 errors
0 warnings
0 hints
```

如果构建失败，不要继续发布。根据终端给出的文件名和行号修复后重新构建。

## 十一、正式托管方式

正式站点由 Cloudflare Pages 托管，来源是 GitHub 仓库的 `main` 分支。本机开发服务器、后台
静态服务、1314 端口以及 Cloudflare Tunnel 都不参与线上访问。本机关闭不会影响网站。

## 十二、网站更新流程

日常更新推荐按以下顺序执行：

1. 修改 `src/` 或 `public/` 中的数据。
2. 使用 `npm run dev` 在本地检查页面。
3. 执行 `npm run build`，确认零错误、零警告、零提示。
4. 执行 `git status`，确认只包含本次需要发布的文件。
5. 精确添加文件、提交并推送：

```powershell
git add <需要发布的文件>
git commit -m "Update blog"
git push origin main
```

6. 在 Cloudflare `Workers & Pages → kielasovo → Deployments` 确认 Production 部署成功。
7. 访问 `https://kielasovo.com` 检查主页、文章、图片和链接。

## 十三、不要维护 `dist/`

所有长期修改都必须写入 `src/` 或 `public/`。`dist/` 会在本地构建和 Pages 部署时重新生成，
不应手动修改或提交。即使只是改名言或站点配置，也要修改源文件并通过 GitHub 发布。
