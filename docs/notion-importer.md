# Notion API 配置与文章导入

本文说明如何为 Notion Importer 配置 API Token，并在 macOS、Linux 和 Windows 上导入 Notion 页面。

## 工具位置

导入器位于：

```text
tools/notion-importer/
```

对应命令：

```bash
npm run import:notion -- --help
```

## 一、创建 Notion Integration

1. 打开 Notion 的设置页面。
2. 进入 `Connections` 或 `My connections`。
3. 创建一个新的 Integration。
4. 为 Integration 开启读取内容权限（`Read content` / `read_content`）。
5. 复制生成的 Internal Integration Secret。

Token 通常以 `ntn_` 开头，例如：

```text
ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 二、共享目标页面

创建 Integration 后，还必须把要导入的页面共享给它：

1. 打开目标 Notion 页面。
2. 点击右上角 `...`。
3. 选择 `Connect to`。
4. 选择刚才创建的 Integration。
5. 确认授权。

没有页面授权时，API 通常会返回页面不存在或没有权限。

## 三、配置 API Token

Importer 默认从环境变量 `NOTION_API_KEY` 读取 Token。Token 不要写入仓库、命令行参数或公开文档。

### macOS（zsh）

仅对当前终端有效：

```bash
export NOTION_API_KEY="ntn_xxx"
```

永久写入当前用户的 zsh 配置：

```bash
echo 'export NOTION_API_KEY="ntn_xxx"' >> ~/.zshrc
source ~/.zshrc
```

### Linux（bash）

仅对当前终端有效：

```bash
export NOTION_API_KEY="ntn_xxx"
```

永久写入当前用户的 bash 配置：

```bash
echo 'export NOTION_API_KEY="ntn_xxx"' >> ~/.bashrc
source ~/.bashrc
```

如果使用 zsh，将 `~/.bashrc` 替换为 `~/.zshrc`。

### Windows PowerShell

仅对当前 PowerShell 会话有效：

```powershell
$env:NOTION_API_KEY = "ntn_xxx"
```

永久写入当前用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable(
  "NOTION_API_KEY",
  "ntn_xxx",
  "User"
)
```

设置后重新打开 PowerShell，使新的环境变量生效。

### Windows CMD

仅对当前 CMD 窗口有效：

```cmd
set NOTION_API_KEY=ntn_xxx
```

永久写入当前用户环境变量：

```cmd
setx NOTION_API_KEY "ntn_xxx"
```

执行 `setx` 后需要重新打开 CMD 或 PowerShell。

## 四、检查 Token 是否已设置

下面的命令只检查变量是否存在，不会打印 Token 内容。

macOS / Linux：

```bash
if [ -n "$NOTION_API_KEY" ]; then
  echo "NOTION_API_KEY 已设置"
else
  echo "NOTION_API_KEY 未设置"
fi
```

Windows PowerShell：

```powershell
if ($env:NOTION_API_KEY) {
  "NOTION_API_KEY 已设置"
} else {
  "NOTION_API_KEY 未设置"
}
```

Windows CMD：

```cmd
if defined NOTION_API_KEY (echo NOTION_API_KEY 已设置) else (echo NOTION_API_KEY 未设置)
```

## 五、导入 Notion 页面

`--page` 可以使用完整 Notion URL，也可以使用带横线或不带横线的 32 位页面 ID。

macOS / Linux：

```bash
npm run import:notion -- \
  --page "https://kielas520.notion.site/3b1a064aa178805ba73fd624787d2954" \
  --title "具身智能" \
  --description "我认为的具身智能方向" \
  --category thoughts \
  --published-at 2026-08-03 \
  --file-name embodied-future \
  --draft false \
  --tags "具身智能" \
  --type article
```

Windows PowerShell：

```powershell
npm run import:notion -- `
  --page "https://kielas520.notion.site/3b1a064aa178805ba73fd624787d2954" `
  --title "具身智能" `
  --description "我认为的具身智能方向" `
  --category thoughts `
  --published-at 2026-08-03 `
  --file-name embodied-future `
  --draft false `
  --tags "具身智能" `
  --type article
```

Windows CMD 可以写成单行：

```cmd
npm run import:notion -- --page "https://kielas520.notion.site/3b1a064aa178805ba73fd624787d2954" --title "具身智能" --description "我认为的具身智能方向" --category thoughts --published-at 2026-08-03 --file-name embodied-future --draft false --tags "具身智能" --type article
```

导入结果写入：

```text
src/content/blogs/<category>/<file-name>.md
```

必填参数：

- `--page`
- `--title`
- `--description`
- `--category`
- `--published-at`
- `--file-name`

注意：`--category thoughts` 的拼写必须正确，不要写成 `thoghts`。

## 六、媒体和代理

Notion 图片、音频和视频默认会尝试转存到项目现有的媒体存储配置。只导入文字、不处理图片时可以使用：

```bash
npm run import:notion -- --skip-images ...
```

Notion API 或媒体下载需要代理时，可以明确指定：

```bash
npm run import:notion -- --proxy "http://127.0.0.1:7897" ...
```

强制直连：

```bash
npm run import:notion -- --no-proxy ...
```

页面存在权限缺失或内容截断时，工具默认停止，避免生成残缺文章。确认可以接受后才使用：

```bash
--allow-incomplete
```

## 七、安全注意事项

- 不要把 `NOTION_API_KEY` 提交到 Git。
- 不要把 Token 写入 `package.json`、脚本或 Markdown 内容。
- 不要使用 `--token` 等命令行参数传递 Token；Importer 默认只读取环境变量。
- 如果 Token 泄露，应立即在 Notion Integration 设置中重新生成并废弃旧 Token。
- 导入完成后建议执行：

```bash
npm run check
npm run build
```
