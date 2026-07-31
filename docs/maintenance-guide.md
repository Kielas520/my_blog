# 数据管理、更新、构建与启动

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
| 网站名称、图标、头像、背景、光标 | `public/config.json` | 推荐构建；也可临时修改 `dist/config.json` |
| 随机名言 | `public/fun_words/words.json` | 推荐构建；也可临时修改 `dist/fun_words/words.json` |
| 短链接 | `src/data/short-links.json` | 必须构建 |
| 有趣网页 | `src/data/intrest-links.json` | 必须构建 |
| 图片墙列表 | `src/data/picture.json` | 必须构建 |
| 音乐列表 | `src/data/music.json` | 必须构建 |
| Blog 文章 | `src/content/blogs/` | 必须构建 |
| 本地图片及其他静态文件 | `public/images/` 等 | 必须构建，或手动同步到 `dist/` |
| Tools 页面代码 | `src/pages/tools/` | 必须构建 |

最稳妥的规则是：修改源文件后统一执行 `npm run build`。只有 `config.json` 和随机名言支持在
已经部署的 `dist/` 中临时热更新。

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

## 十一、启动正式服务

构建并启动：

```powershell
npm start
```

该命令等同于：

```powershell
npm run build
npm run serve
```

如果已经构建完成，只启动 `dist/`：

```powershell
npm run serve
```

正式静态服务监听：

```text
http://127.0.0.1:1314
```

Cloudflare Tunnel 的源站地址保持：

```text
http://localhost:1314
```

运行服务的终端窗口不能关闭。按 `Ctrl+C` 会停止网站源站。

## 十二、网站更新流程

日常更新推荐按以下顺序执行：

1. 修改 `src/` 或 `public/` 中的数据。
2. 使用 `npm run dev` 在本地检查页面。
3. 执行 `npm run build`。
4. 检查主页、修改过的页面、图片和链接。
5. 重启正在运行的 `npm run serve`。
6. 访问 `https://kielasovo.com` 验证公网结果。

如果 1314 端口已经有旧服务，先查询监听进程：

```powershell
Get-NetTCPConnection -LocalPort 1314 -State Listen
```

确认 `OwningProcess` 确实属于当前网站后停止它：

```powershell
Stop-Process -Id <OwningProcess>
```

然后重新启动：

```powershell
npm run serve
```

不要在未确认进程用途时直接终止它。

## 十三、临时热更新

下面两个构建结果会被浏览器运行时读取：

```text
dist/config.json
dist/fun_words/words.json
```

临时修改它们后刷新网页即可，不需要重新构建。但是下一次执行 `npm run build` 时，这些修改会被
`public/` 中的源文件覆盖。确认效果后，应把相同改动同步回：

```text
public/config.json
public/fun_words/words.json
```

其他 `src/data` 文件和 Blog 不支持这种方式，必须重新构建。

