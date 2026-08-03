# Notion Importer

从 Notion 页面直接导入 `src/content/blogs`。工具使用 Notion Enhanced Markdown API 获取正文，将图片、音频和视频的临时 URL 转存到现有 R2 配置，然后调用 `markdown-importer` 生成 frontmatter 和目标文件。

## 配置 Notion

1. 在 Notion 创建一个 Integration，并启用读取内容（`read_content`）权限。
2. 在目标页面的连接设置中，把页面共享给这个 Integration。
3. 在当前 PowerShell 会话设置 Token：

```powershell
$env:NOTION_API_KEY = "ntn_xxx"
```

Token 只从环境变量读取，不应写进仓库或放在 CLI 参数中。

## 导入页面

`--page` 可以是浏览器中的完整 Notion URL，也可以是带横线或不带横线的 32 位页面 ID。

```powershell
npm run import:notion -- `
  --page "https://www.notion.so/example-0123456789abcdef0123456789abcdef" `
  --title "被牵着走" `
  --description "端午回家、陪母亲骑行，以及在成长中愈发强烈的念家。" `
  --category dairy `
  --published-at 2026-06-20 `
  --file-name being-led `
  --draft false `
  --tags "忆" `
  --type article
```

生成的文件包含与原导入器一致的 frontmatter：

```yaml
---
title: "被牵着走"
description: "端午回家、陪母亲骑行，以及在成长中愈发强烈的念家。"
category: "dairy"
publishedAt: 2026-06-20
draft: false
tags: ["忆"]
type: article
---
```

以下原有参数会原样传递给 `markdown-importer`：

- 必填：`--title`、`--description`、`--category`、`--published-at`、`--file-name`
- 可选：`--draft`、`--tags`、`--type`、`--updated-at`、`--series`、`--order`
- 控制：`--keep-source-header`、`--skip-images`、`--force`

`--source` 和 `--content` 被 `--page` 取代。完整帮助：

```powershell
npm run import:notion -- --help
```

## 媒体处理

- Markdown 图片和 HTML `<img>` 上传到 `image.kielasovo.com`。
- Notion `<audio>` 和 `<video>` 分别上传到声音、视频 R2 配置。
- 每次上传仍会追加记录到 `tools/media-uploader/upload.log`。
- `--skip-images` 会保留 Notion 返回的图片 URL；这些通常是短期有效的签名 URL，不适合正式发布。
- 当前上传器没有普通文件和 PDF 类型，这两类内容会保留原 URL 并显示警告。

页面被 Notion 截断或包含未授权子区块时，工具默认停止，避免导入残缺文章。确认可以接受后可添加 `--allow-incomplete`。

Notion API 请求和媒体下载遇到断线、超时、限流或临时服务器错误时会自动重试，最多尝试 4 次（通常间隔 1、2、4 秒；HTTP `Retry-After` 会优先采用）。

工具依次读取 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量和 PicGo 图片配置中的代理。也可以通过 `--proxy "http://127.0.0.1:7897"` 明确指定，或使用 `--no-proxy` 强制直连。
