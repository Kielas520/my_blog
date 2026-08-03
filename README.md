# Kielasovo

基于 Astro 的静态个人站点，规范域名为 `kielasovo.com`。

完整使用手册见 [`docs/README.md`](./docs/README.md)。

日常更新网站时，可直接查看
[`docs/maintenance-guide.md`](./docs/maintenance-guide.md)。

## 开发模式

```powershell
npm install
npm run dev
```

开发服务器监听 `0.0.0.0:1314`。

## 正式部署

正式网站由 Cloudflare Pages 托管。修改完成后执行：

```powershell
npm run build
git status
git add <需要发布的文件>
git commit -m "Update blog"
git push origin main
```

推送 `main` 分支会触发 Pages 自动构建并发布到 `kielasovo.com`。本机、1314 端口和
Cloudflare Tunnel 均不参与线上服务。完整流程见 [`docs/deployment.md`](./docs/deployment.md)。

## 内容维护

- 精选文章：`src/content/blogs/`
- 文章模板：`src/content/blogs/_template.md`（`draft: true`，不会发布）
- Blog 分类：`dairy`、`thoughts`、`ticktick`、`get-a-job`
- 工具页面：`src/pages/tools/`
- 有趣链接：`src/data/intrest-links.json`
- 图片墙：`src/data/picture.json`
- 音乐列表：`src/data/music.json`
- 构建静态站点：`npm run build`
- 本地预览静态构建：`npm run preview`

## 随机名言

源文件为 `public/fun_words/words.json`，构建后复制到 `dist/fun_words/words.json`。线上内容必须
修改源文件并通过 GitHub 推送发布，不要直接维护自动生成的 `dist/`。

每条内容可以控制对齐与动画：

```json
{
  "interval": 6500,
  "words": [
    { "text": "一整段话", "align": "random", "motion": "random" }
  ]
}
```

`align` 支持 `left`、`center`、`right`、`random`；`motion` 支持 `fade`、`up`、
`left`、`right`、`random`。

## 短链接

编辑 `src/data/short-links.json`：

```json
[
  {
    "name": "profile",
    "short": "kielasovo.com/me",
    "target": "https://example.com/profile",
    "description": "个人主页"
  }
]
```

`target` 必须是原始 URL，不要写成 Markdown 链接。短链页面在构建时生成，修改配置后需要
重新执行 `npm run build`。
