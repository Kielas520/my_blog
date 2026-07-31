# 构建与 Cloudflare Tunnel 部署

## 部署结构

```text
浏览器
  → https://kielasovo.com
  → Cloudflare
  → Cloudflare Tunnel
  → http://localhost:1314
  → sirv
  → dist/
```

Cloudflare 负责公网 HTTPS。本机源站使用 HTTP 即可，不需要本地证书，也不需要开放公网入站端口。

## 构建

```powershell
cd D:\project\kielasWEB
npm install
npm run build
```

构建必须以零错误、零警告结束。

## 启动源站

```powershell
web start
web check
```

首次使用时，先在项目目录执行
`powershell -ExecutionPolicy Bypass -File .\scripts\install-web-command.ps1` 并重新打开终端。
`web start` 会停止旧实例、重新构建并在后台启动源站。

正式源站仅监听：

```text
127.0.0.1:1314
```

验证：

```powershell
Invoke-WebRequest http://127.0.0.1:1314 -UseBasicParsing
```

## Cloudflare Tunnel 路由

在 Cloudflare Zero Trust 中进入：

```text
Networks
→ Tunnels & Mesh
→ 选择 5060Ti-NAS
→ Published application routes
```

路由配置：

```text
Hostname:    kielasovo.com
Path:        留空
Service:     HTTP
URL:         localhost:1314
```

`Path` 使用正则表达式。匹配全部路径时必须留空，不要填写单独的 `*`。

如果保留 `www.kielasovo.com`，可添加第二条相同源站的路由，或使用 Cloudflare Redirect Rules
将 `www` 301 重定向到根域名。

## DNS

Tunnel 主机名应使用 CNAME 指向：

```text
<TUNNEL_UUID>.cfargotunnel.com
```

DNS 记录应保持 Proxied（橙色云）。同一个主机名不能同时存在冲突的 A、AAAA 和 CNAME 记录。

不要在 DNS Target 中填写：

- `http://`
- `localhost`
- 端口 `1314`
- URL 路径

这些只属于 Tunnel 的 Service URL。

## 更新网站

```powershell
web start
web check
```

`web start` 已包含检查、构建和重启。完成后再访问公网地址确认 Cloudflare 返回了新版本。
需要停止源站时执行：

```powershell
web stop
```

## 开机后恢复

`cloudflared` 已作为 Windows 自动服务运行。站点源站由后台脚本管理，不依赖终端窗口，但它不是
Windows 开机自启服务。电脑重启后执行：

```powershell
web start
```

若需要开机自动恢复，可另行配置 Windows 任务计划运行 `web start`。
