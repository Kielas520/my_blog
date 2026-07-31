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

## 正式运行

```powershell
npm start
```

该命令会先检查并构建站点，然后仅在 `127.0.0.1:1314` 提供 `dist/` 中的纯静态文件。
Cloudflare Tunnel 与源站位于同一台机器，因此不需要把正式服务暴露到局域网。

也可以安装后台服务管理命令（只需执行一次）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-web-command.ps1
```

重新打开终端后，可在任意目录运行：

```powershell
web start  # 关闭旧服务、重新构建，并在后台启动
web check  # 检查进程及 HTTP 状态
web stop   # 停止后台服务
```

用户环境变量 `KIELAS_WEB_ROOT` 会指向本项目，`scripts` 会加入用户 `PATH`。
可选变量 `KIELAS_WEB_HOST` 和 `KIELAS_WEB_PORT` 可覆盖默认的 `127.0.0.1:1314`。

## Cloudflare Tunnel

在 Cloudflare 控制台进入 `Networking → Tunnels → 选择隧道 → Routes`，添加
`Published application`：

```text
Hostname:    kielasovo.com
Path:        留空（匹配全部路径）
Service URL: http://localhost:1314
```

保存后 Cloudflare 会为该主机名创建指向隧道的 DNS 记录。Cloudflare 负责公网 HTTPS，
本机源站无需单独配置证书，也无需修改 Windows hosts 文件。

如果 1314 端口被占用，可用 `Get-NetTCPConnection -LocalPort 1314` 查看占用进程。

## 内容维护

- 精选文章：`src/content/blogs/`
- 文章模板：`src/content/blogs/_template.md`（`draft: true`，不会发布）
- Blog 分类：`dairy`、`thoughts`、`ticktick`、`get-a-job`
- 工具页面：`src/pages/tools/`
- 有趣链接：`src/data/intrest-links.json`
- 图片墙：`src/data/picture.json`
- 音乐列表：`src/data/music.json`
- 构建静态站点：`npm run build`
- 在 1314 端口提供静态构建：`npm run serve`

## 随机名言

源文件为 `public/fun_words/words.json`，构建后复制到 `dist/fun_words/words.json`。
页面会在浏览器运行时读取它，因此可以直接修改部署目录中的 JSON，无需重新构建；但下一次
执行 `npm run build` 时，`dist` 中的版本会被源文件覆盖。

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
