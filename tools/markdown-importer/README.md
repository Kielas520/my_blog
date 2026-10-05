# Markdown Importer

为 `src/content/blogs` 创建带有合法 frontmatter 的 Markdown 文档。分类只接受 `journal`（日志）或 `notes`（技术与实用笔记），目标文件默认不会被覆盖。

```powershell
npm run import:markdown -- `
  --title "一张纸" `
  --description "一次回家时，在父亲四平方米的办公室里看到一张练字纸。" `
  --category journal `
  --published-at 2026-06-18 `
  --file-name a-sheet `
  --draft false `
  --tags "忆" `
  --type article `
  --source .\待导入正文.md
```

`--source` 文件如果以 `---` 独立行开头（支持 UTF-8 BOM、CRLF 和 `---` / `...` 独立结束行），导入时会移除这段已有 frontmatter，只保留正文。正文缩进会保留，不会把开头的四空格代码块变成普通文本。也可以用 `--content "正文"` 直接提供内容；两者都不传时会创建正文为空的文章。

新文章写入**当前工作目录**下的 `src/content/blogs/<category>/<file-name>.md`，在正常使用时请从项目根目录运行，并先执行 `npm install`。上传器与 Markdown/YAML 解析器使用工具自身安装位置，不会从来源文件目录查找脚本。

已发布文章通过 frontmatter `slug` 固定 URL；移动文件时保持 `slug`。`--force` 只保留已有目标文件中解析出的字符串 `slug`（支持引号、别名和多行 YAML），其余 frontmatter 以本次 CLI 参数重新生成；不会继承来源文件的元数据或 `slug`。已有目标的 YAML 无效或 `slug` 不是字符串时会报错，不覆盖文件。

Notion 导出文件如果以一级标题和 `DATE`、`TAG` 开头，导入器会自动移除这段重复头部。例如：

```markdown
# HK打卡

DATE: 2026年8月3日 05:21
TAG: 忆
```

页面标题、日期和标签以 CLI 参数生成的 frontmatter 为准。普通的一级标题不会被删除；需要原样保留 Notion 头部时可添加 `--keep-source-header`。

## 本地图片

导入器默认按 Markdown 语法检查真实图片节点和 HTML `<img>`，不会处理代码块、行内代码、HTML 注释或 `<script>` 中的示例。相对图片路径按照 `--source` Markdown 文件所在目录解析，站点绝对路径按照当前工作目录的 `public` 目录解析（拒绝越出 `public` 的路径）；Windows 盘符绝对路径按本地文件处理。支持 URL 编码路径，查询参数和片段不计入文件名。本地图片会通过 `media-uploader` 的 `image` 配置上传到 R2，并在写入目标 Markdown 前替换为 `image.kielasovo.com` URL。

支持常见形式：

```markdown
![说明](./images/photo.png)
![说明](<./images/photo with spaces.png>)
![说明][photo]
[photo]: ./images/photo.png
![photo][]
![photo]
![括号](./images/photo(1).png "标题")
<img src="./images/photo.png" alt="说明">
<img src=./images/photo.png alt="说明">
```

HTTP(S)、`data:` 等非本地图片不会上传。完整引用、折叠引用和快捷引用均受支持，只有真实图片使用的引用定义会被替换。同一篇文章引用同一实际图片文件时只上传一次（不会在区分大小写的系统上合并不同文件）。所有本地图片均先检查存在且为普通文件，再开始上传。上传记录由 `tools/media-uploader/upload.log` 持久保存。

如需保留本地引用，可添加 `--skip-images`。

## 参数与失败行为

参数名支持三种形式，例如 `--publishedAt`、`--published-at` 和 `--published_at` 等价；支持 `--key value` 和 `--key=value`，后者的值中可以包含 `=` 或以 `--` 开头。布尔开关可直接添加，也可使用 `--force=false` / `--force false`。未知参数、重复参数（包括不同拼写的同一参数）、缺值会报错，避免拼写错误或重复来源被静默忽略。

`--tags` 可写成 `"忆,家庭"` 或 `"[忆, 家庭]"`；数组形式支持带引号、含逗号的字符串，例如 `'["a,b", "家庭"]'`，不接受嵌套数组/对象。`--order` 必须是大于零的 JavaScript 安全整数。日期须为真实的 `YYYY-MM-DD` 日期。

`--file-name` 只接受单个跨平台合法文件名，`.md` 后缀不区分大小写；拒绝路径分隔符、控制字符、尾部空格/点和 Windows 保留设备名称。目标目录或目标文件是符号链接时会拒绝导入，目录不能当作文件覆盖。

工具**每次只导入一篇**，不接受目录或重复的 `--source` 进行批量导入。批量调用时应逐篇传入唯一的 `--file-name`，检查每次退出码；失败会返回非零退出码，不会继续或伪报成功。

默认不会覆盖目标，包含并发导入时的原子防覆盖。内容完整写入同目录临时文件后才发布目标；`--force` 原子替换，不会先截断已有文章。解析、缺图、上传或写入失败时不会改动已有目标；临时文件会清理。上传成功后发生后续失败时，已经上传的远端图片不会自动删除，可根据上传日志处理。

使用 `npm run import:markdown -- --help` 查看完整参数。
