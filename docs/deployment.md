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
npm run serve
```

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
npm run check
npm run build
```

如果静态服务已经运行，构建完成后重启它。先确认 1314 端口对应的是 Kielasovo 的 `sirv`
进程，再终止旧进程并执行：

```powershell
npm run serve
```

## 开机后恢复

`cloudflared` 已作为 Windows 自动服务运行，但站点静态服务目前不是 Windows 系统服务。
电脑重启后需要在项目目录执行：

```powershell
npm start
```

如果以后需要真正的无人值守运行，可以再配置 Windows 任务计划或专用服务包装器。

