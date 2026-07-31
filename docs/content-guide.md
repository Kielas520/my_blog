# Blog 内容管理

## 内容原则

网站不会自动同步整个 Notion `INDEX`。工作流是：

1. 从 Notion 导出 `INDEX` 下的内容。
2. 人工选择适合公开的文章。
3. 整理附件、标题、摘要和标签。
4. 放入 `src/content/blogs/` 对应分类目录。
5. 检查并构建网站。

不要把求职档案、工作日志或私人记忆直接批量发布。

## Notion 分类

`category` 必须使用以下值之一：

| Notion 分类 | Frontmatter 值 | 适合内容 |
| --- | --- | --- |
| `_INIT` | `init` | 环境、命令和工具手册 |
| `Stuff` | `stuff` | 项目、比赛和杂项 |
| `TECH_` | `tech` | 通用技术、课程和观点 |
| `MACHINE_LEARNING` | `machine-learning` | 机器学习理论与实战 |
| `EMBODIED_AI` | `embodied-ai` | 具身智能、机械臂和 ROS |
| `Memory` | `memory` | 精选日记、回忆和随想 |

建议使用与分类一致的子目录：

```text
src/content/blogs/
├─ init/
├─ stuff/
├─ tech/
├─ machine-learning/
├─ embodied-ai/
└─ memory/
```

目录会成为文章 URL 的一部分。例如：

```text
src/content/blogs/machine-learning/what-is-yolo.md
→ /blogs/machine-learning/what-is-yolo
```

## 创建文章

复制 `_template.md`：

```powershell
New-Item -ItemType Directory `
  -Path .\src\content\blogs\machine-learning `
  -Force

Copy-Item `
  .\src\content\blogs\_template.md `
  .\src\content\blogs\machine-learning\what-is-yolo.md
```

填写 Frontmatter：

```yaml
---
title: YOLO 是什么
description: 从检测任务出发理解 YOLO 的基本结构和推理过程。
category: machine-learning
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
| `category` | 是 | Notion 一级分类 |
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

- 与文章强相关的小图片放在 `public/images/blogs/<slug>/`。
- 大文件、音频和原始数据放在独立资源站。
- Markdown 使用站点绝对路径引用：

```markdown
![手眼标定示意图](/images/blogs/hand-eye/calibration.png)
```

## 发布检查

```powershell
npm run check
npm run build
```

检查文章列表、正文、图片、移动端布局和所有外部链接后，再重启静态服务。
