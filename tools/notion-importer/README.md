# Notion Importer

从 Notion 页面直接导入 `src/content/blogs`。工具使用 Notion Enhanced Markdown API 获取正文，将图片、音频和视频的临时 URL 转存到现有 R2 配置，然后调用 `markdown-importer` 生成 frontmatter 和目标文件。

跨平台的 API Token 配置和导入教程见 [`docs/notion-importer.md`](../../docs/notion-importer.md)。

## 配置 Notion

1. 在 Notion 创建一个 Integration，并启用读取内容（`read_content`）权限。
2. 在目标页面的连接设置中，把页面共享给这个 Integration。
3. 在当前 PowerShell 会话设置 Token：

```powershell
$env:NOTION_API_KEY = "ntn_xxx"
```

Token 只从环境变量读取，不应写进仓库或放在 CLI 参数中。

## 导入页面

`--page` 可以是浏览器中的完整 Notion URL，也可以是带横线或不带横线的 32 位页面 ID。URL 的查询参数（如视图 ID）和片段（如区块 ID）不会替换路径中的页面 ID。

```bash
npm run import:notion -- \
  --page "https://app.notion.com/p/kielas520/3efa064aa17880a19bd2c503d4c505bb" \
  --title "短暂的长假" \
  --description "最好的家" \
  --category journal \
  --published-at 2026-10-04 \
  --file-name short-vacation \
  --draft false \
  --tags "忆" \
  --type article
```

PowerShell 使用反引号 `` ` `` 换行：

```powershell
npm run import:notion -- `
  --page "https://app.notion.com/p/kielas520/3efa064aa17880a19bd2c503d4c505bb" `
  --title "短暂的长假" `
  --description "最好的家" `
  --category journal `
  --published-at 2026-10-04 `
  --file-name short-vacation `
  --draft false `
  --tags "忆" `
  --type article
```

生成的文件包含与原导入器一致的 frontmatter：

```yaml
---
title: "被牵着走"
description: "端午回家、陪母亲骑行，以及在成长中愈发强烈的念家。"
category: "journal"
publishedAt: 2026-06-20
draft: false
tags: ["忆"]
type: article
---
```

以下原有参数经检查并规范化后传递给 `markdown-importer`（日期、文件名、类型、顺序以及目标文件覆盖冲突会在访问 API 和上传媒体前拒绝）：

- 必填：`--title`、`--description`、`--category`、`--published-at`、`--file-name`
- 可选：`--draft`、`--tags`、`--type`、`--updated-at`、`--series`、`--order`
- 控制：`--keep-source-header`、`--skip-images`、`--force`

不接受未知或重复参数。布尔开关可写成 `--force`、`--force=true` 或 `--force true`；`false` 同理。`--proxy` 与 `--no-proxy` 不能同时使用。

`--category` 只接受 `journal`（日志）或 `notes`（技术与实用笔记），非法分类在访问 API
前拒绝。文章目录统一为 `journal/` 和 `notes/`；已发布文章通过 frontmatter `slug`
保留原 URL。按当前目录与原文件名使用 `--force` 更新时会保留已有 `slug`。

通过绝对路径从其他工作目录运行时，内部导入器和上传器仍按本工具的位置定位；
文章输出则始终写入当前工作目录的 `src/content/blogs`。可在临时目录验证真实导入，
不覆盖项目中的现有文章。

`--source` 和 `--content` 被 `--page` 取代。完整帮助：

```powershell
npm run import:notion -- --help
```

## 媒体处理

- Markdown 图片（包括引用式图片）和 HTML `<img>` 上传到 `image.kielasovo.com`；代码示例不参与媒体发现和 URL 替换，正文中的普通链接不会被一并替换。
- Notion `<audio>` 和 `<video>` 分别上传到声音、视频 R2 配置，并添加播放器 `controls`。
- 每次上传仍会追加记录到 `tools/media-uploader/upload.log`。
- `--skip-images` 会保留 Notion 返回的图片 URL；这些通常是短期有效的签名 URL，不适合正式发布。
- 当前上传器没有普通文件和 PDF 类型，这两类内容转换为可点击的 Markdown 链接，保留原 URL 并显示过期风险警告。
- 下载文件按响应 `Content-Type` 或已知文件扩展名识别类型；不把 HTML 错误页面或未知类型伪装成 JPG/MP3/MP4 上传。

页面被 Notion 截断时，会按 `unknown_block_ids` 递归读取子区块并替换对应占位符（该 Markdown API 没有 cursor 分页）。恢复后仍有无权限/无法加载的区块，工具默认停止，避免导入残缺文章。确认可以接受后可添加 `--allow-incomplete`；可读取部分会保留，剩余占位符转为来源链接。

Notion 的 callout、columns、synced block 容器会展开为正文并移除容器缩进；页面引用、提及和日期转换为普通链接或文本，颜色属性移除。正文开头的 `---` 分隔线不会被当作 frontmatter 删除。API 不支持的 bookmark/embed 等区块保留来源链接并警告，不会虚构缺失内容。

Notion API 请求和媒体下载遇到断线、超时、限流或临时服务器错误时会自动重试，最多尝试 4 次（通常间隔 1、2、4 秒；HTTP `Retry-After` 会优先采用）。

工具依次读取 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量和当前平台 PicGo 图片配置中的代理。也可以通过 `--proxy "http://127.0.0.1:7897"` 明确指定，或使用 `--no-proxy` 强制直连（即使启动时启用了 Node 环境代理）。代理功能需要 Node.js 24+ 或 22.21+；显式代理优先于已有 Node 环境代理，日志不会显示代理用户名或密码。
