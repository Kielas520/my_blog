# Markdown Importer

为 `src/content/blogs` 创建带有合法 frontmatter 的 Markdown 文档。新分类目录会自动创建，目标文件默认不会被覆盖。

```powershell
npm run import:markdown -- `
  --title "一张纸" `
  --description "一次回家时，在父亲四平方米的办公室里看到一张练字纸。" `
  --category dairy `
  --published-at 2026-06-18 `
  --file-name a-sheet `
  --draft false `
  --tags "忆" `
  --type article `
  --source .\待导入正文.md
```

`--source` 文件如果带有自己的 `---` frontmatter，导入时会将它移除，只保留正文。也可以用 `--content "正文"` 直接提供内容；两者都不传时会创建正文为空的文章。

参数名支持三种形式，例如 `--publishedAt`、`--published-at` 和 `--published_at` 等价。`--tags` 可写成 `"忆,家庭"` 或 `"[忆, 家庭]"`。

使用 `npm run import:markdown -- --help` 查看完整参数。
