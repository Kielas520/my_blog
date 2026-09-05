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

## 附录：PicGo 与 Cloudflare R2 媒体存储

网站媒体文件使用 Cloudflare R2，通过 PicGo 的 S3 兼容插件上传。仓库不保存 R2
密钥；Access Key 和 Secret Access Key 只能保存在本机 PicGo 配置中。

### 1. 准备 R2

在 Cloudflare Dashboard 中打开 `R2 Object Storage`，为图片、音频、视频分别准备
Bucket。建议每种媒体使用独立 Bucket，并为每个 Bucket 绑定对应的自定义域名：

| 类型 | PicGo 配置名 | 公网域名 |
| --- | --- | --- |
| 图片 | `kielas-nas-picture` | `https://image.kielasovo.com` |
| 音频 | `kielas-nas-music` | `https://sound.kielasovo.com` |
| 视频 | `Kielas-nas-video` | `https://video.kielasovo.com` |

在 R2 的 `Manage R2 API Tokens` 创建密钥，至少授予这三个 Bucket 的对象读写权限。
只把密钥填入 PicGo，不要写入 Markdown、JSON 或 Git 仓库。

### 2. 安装 PicGo

从 PicGo 官方发布页安装桌面客户端：

```text
https://github.com/Molunerfinn/PicGo/releases
```

安装后，在 PicGo 的插件设置中搜索并安装 S3 插件。不同 PicGo 版本的插件名称可能
显示为 `S3` 或 `picgo-plugin-s3`；选择支持 AWS S3 兼容服务的插件。

### 3. 添加 R2 配置

在 PicGo 的图床设置中选择 S3，分别创建三条配置。字段按以下方式填写：

| PicGo 字段 | Cloudflare R2 填法 |
| --- | --- |
| AccessKeyID | R2 API Token 的 Access Key ID |
| SecretAccessKey | R2 API Token 的 Secret Access Key |
| Bucket | 对应的 R2 Bucket 名称 |
| Region / Area | `auto` |
| Endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| Path | `%Y/%m/` |
| Custom URL | 对应的 `image`、`sound` 或 `video` 域名 |

`<ACCOUNT_ID>` 替换为 Cloudflare 账户 ID。Endpoint 必须使用 R2 S3 API 地址，不能
填写自定义域名；Custom URL 才填写 `https://image.kielasovo.com` 等公开访问域名。

三条配置的 Bucket 和 Custom URL 必须一一对应，配置名称必须保持大小写完全一致。
### 3.1 环境变量说明

R2 的 `Endpoint`、`AccessKeyID` 和 `SecretAccessKey` 才是需要保存的连接信息。
R2 的公网 URL 由上传脚本按媒体类型固定校验，不需要通过环境变量保存：

```text
image.kielasovo.com
sound.kielasovo.com
video.kielasovo.com
```

如果采用环境变量方案，真正需要保存的是 R2 的连接地址和凭据：

```bash
export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
```

`R2_BUCKET` 仍然需要在 PicGo 的三套配置中分别填写；`R2_CUSTOM_URL` 不需要保存，
公网域名由上传脚本按媒体类型校验。上传器会读取上述三个 `R2_*` 变量，并在变量
完整设置时覆盖所选 PicGo 配置的 Endpoint 和 Access Key；未设置时使用 PicGo 原值。
#### macOS / Linux（zsh，永久写入当前用户）

```bash
cat >> ~/.zshrc <<'EOF'

export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
EOF

source ~/.zshrc
```

#### Linux（bash，永久写入当前用户）

```bash
cat >> ~/.bashrc <<'EOF'

export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
EOF

source ~/.bashrc
```

#### Windows PowerShell（永久写入当前用户）

```powershell
[Environment]::SetEnvironmentVariable("R2_ENDPOINT", "https://<ACCOUNT_ID>.r2.cloudflarestorage.com", "User")
[Environment]::SetEnvironmentVariable("R2_ACCESS_KEY_ID", "...", "User")
[Environment]::SetEnvironmentVariable("R2_SECRET_ACCESS_KEY", "...", "User")
```

执行后关闭并重新打开 PowerShell。

以上命令会永久保存 `R2_*` 变量。上传器会在启动时读取它们；如果只设置其中一部分，
会直接报错。Bucket 和 Custom URL 仍然必须保留在 PicGo 的三套配置中。

项目还会读取 Notion Token 和代理变量。

#### macOS / Linux（zsh，当前终端）

```bash
export NOTION_API_KEY="ntn_xxx"
export HTTPS_PROXY="http://127.0.0.1:7897"
export HTTP_PROXY="http://127.0.0.1:7897"
```

#### macOS / Linux（zsh，永久写入当前用户）

```bash
printf '\nexport NOTION_API_KEY="ntn_xxx"\n' >> ~/.zshrc
printf '\nexport HTTPS_PROXY="http://127.0.0.1:7897"\n' >> ~/.zshrc
printf 'export HTTP_PROXY="http://127.0.0.1:7897"\n' >> ~/.zshrc
source ~/.zshrc
```

如果变量已经存在，建议编辑 `~/.zshrc` 修改原值，不要反复追加相同变量。

#### Linux（bash，永久写入当前用户）

```bash
printf '\nexport NOTION_API_KEY="ntn_xxx"\n' >> ~/.bashrc
printf '\nexport HTTPS_PROXY="http://127.0.0.1:7897"\n' >> ~/.bashrc
printf 'export HTTP_PROXY="http://127.0.0.1:7897"\n' >> ~/.bashrc
source ~/.bashrc
```

#### Windows PowerShell（当前终端）

```powershell
$env:NOTION_API_KEY = "ntn_xxx"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
$env:HTTP_PROXY = "http://127.0.0.1:7897"
```

#### Windows PowerShell（永久写入当前用户）

```powershell
[Environment]::SetEnvironmentVariable("NOTION_API_KEY", "ntn_xxx", "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://127.0.0.1:7897", "User")
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "http://127.0.0.1:7897", "User")
```

执行后关闭并重新打开 PowerShell。当前已经打开的进程不会自动获得新变量。

#### Windows CMD（当前窗口）

```cmd
set "NOTION_API_KEY=ntn_xxx"
set "HTTPS_PROXY=http://127.0.0.1:7897"
set "HTTP_PROXY=http://127.0.0.1:7897"
```

代理不是必填项。不使用代理时不要设置这些变量；Notion 导入器也支持用
`--proxy` 临时指定代理，或用 `--no-proxy` 强制直连。

不要把 R2 Secret Access Key 或 Notion Token 提交到 Git、Markdown、JSON 或公开的
`.env` 文件中。

### 4. 首次验证

先在 PicGo 图形界面选择图片配置上传一个小文件，确认返回的 URL 类似：

```text
https://image.kielasovo.com/2026/09/example.jpg
```

然后在浏览器直接打开该 URL。必须能直接读取文件，而不是返回 `403` 或 R2 XML
错误。音频和视频还应确认浏览器可以播放和拖动进度。

### 5. 使用项目上传命令

Windows PowerShell：

```powershell
npm run upload:file -- --type image --source ".\photo.png"
npm run upload:file -- --type sound --source ".\music.mp3"
npm run upload:file -- --type video --source ".\movie.mp4"
```

macOS / Linux：

```bash
npm run upload:file -- --type image --source "./photo.png"
npm run upload:file -- --type sound --source "./music.mp3"
npm run upload:file -- --type video --source "./movie.mp4"
```

上传成功后，命令会打印公网 URL，并追加写入 `tools/media-uploader/upload.log`。

### 6. 在网站中使用

图片可以直接写入 Markdown：

```markdown
![照片](https://image.kielasovo.com/2026/09/example.jpg)
```

音乐写入 `src/data/music.json`：

```json
[
  {
    "name": "example",
    "link": "https://sound.kielasovo.com/2026/09/example.mp3"
  }
]
```

Markdown 导入器会自动上传本地图片：

```bash
npm run import:markdown -- --source "./待导入正文.md" ...
```

如果使用 `--skip-images`，则会保留原始图片 URL，不上传本地图片。

### 7. macOS / Linux 注意事项

当前 `tools/media-uploader/upload.py` 使用 Windows 的 PicGo 配置路径和 `.cmd`
启动文件。PicGo 图形界面在 macOS / Linux 上可以单独使用，但项目提供的
`npm run upload:file` 在这些系统上还不能视为已支持。需要跨平台命令上传时，应先
修改该脚本的配置路径和 PicGo CLI 查找方式；不要把 Windows 的 `data.json` 路径
直接复制到 macOS / Linux 文档中。


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
