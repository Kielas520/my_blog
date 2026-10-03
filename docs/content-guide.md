# Blog 内容管理

## 内容原则

网站不会自动同步整个 Notion `INDEX`。工作流是：

1. 从 Notion 导出 `INDEX` 下的内容。
2. 人工选择适合公开的文章。
3. 整理附件、标题、摘要和标签。
4. 放入 `src/content/blogs/` 对应分类目录。
5. 检查并构建网站。

不要把求职档案、工作日志或私人记忆直接批量发布。

## 日志与技术笔记

`category` 只接受以下两个值：

| 栏目 | Frontmatter 值 | 适合内容 |
| --- | --- | --- |
| 日志 | `journal` | 心境、生活、比赛与求职经历 |
| 技术笔记 | `notes` | 技术理解、观点、开发规范与求职实用资料 |

列表默认显示日志，按年月倒序排列；`/blogs?category=notes` 显示技术笔记，
`/blogs?category=all` 显示全部。刷新和返回文章列表会保留所选栏目。
标签可选，不要求按情绪再分类。

文章目录与栏目统一为 `journal/` 和 `notes/`。已发布文章通过 frontmatter `slug` 保留原地址：
例如 `notes/ai-coding.md` 中的 `slug: "thoughts/ai-coding"` 仍生成 `/blogs/thoughts/ai-coding`。
移动已发布文章时保持 `slug` 不变；新文章不填 `slug` 时默认按目录和文件名生成地址。

正文面板宽度最多 740px；有二、三级标题的文章自动生成折叠目录。
文章页音乐盒默认收起，手机阅读时移至页尾，不覆盖正文。

## 创建文章

复制 `_template.md`：

```powershell
New-Item -ItemType Directory `
  -Path .\src\content\blogs\notes `
  -Force

Copy-Item `
  .\src\content\blogs\_template.md `
  .\src\content\blogs\notes\new-article.md
```

填写 Frontmatter：

```yaml
---
title: 新文章标题
description: 用一两句话概括文章内容，供列表和 SEO 使用。
category: notes
publishedAt: 2026-08-01
updatedAt: 2026-08-03
draft: false
tags: [机器学习, YOLO, 目标检测]
type: article
---
```

## 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `description` | 是 | 列表和 SEO 使用的摘要 |
| `category` | 是 | `journal` 或 `notes`，与所在目录保持一致 |
| `slug` | 否 | 固定发布地址（不含 `/blogs/`）；迁移后的旧文章已填写，移动或更新时保留 |
| `publishedAt` | 是 | 发布日期，格式为 `YYYY-MM-DD` |
| `updatedAt` | 否 | 最近更新日期 |
| `draft` | 否 | 默认为 `false`；`true` 时不生成公开路由 |
| `tags` | 否 | 标签数组 |
| `type` | 否 | `article`、`series`、`project` 或 `note` |
| `series` | 否 | 系列名称 |
| `order` | 否 | 系列中的排序数字 |

## 系列文章

专题内容不必照搬 Notion 的父子页面。建议每个步骤独立成文，并使用相同的 `series`：

```yaml
type: series
series: 手搓 YOLO Pose
order: 1
```

后续步骤使用 `order: 2`、`order: 3` 等。

## 图片与附件

Notion 导出的附件不应继续引用临时 Notion 地址。建议：

- 图片在仓库外保存，先通过 `upload:file` 上传到 `image.kielasovo.com`，不提交本地图片。
- 大文件、音频和原始数据放在独立资源站。
- Markdown 使用上传后的完整 HTTPS 地址：

```markdown
![像素小窝示意图](https://image.kielasovo.com/2026/10/8d5edfa09a0e9b3bb6d8f5dbe645d235.svg)
```

## 发布检查

```powershell
npm run check
npm run build
```

检查文章列表、正文、图片、移动端布局和所有外部链接后，再重启静态服务。
