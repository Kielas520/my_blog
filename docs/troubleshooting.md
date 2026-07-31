# 常见问题

## 1314 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 1314 -State Listen
```

查看进程：

```powershell
$listener = Get-NetTCPConnection -LocalPort 1314 -State Listen
Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
```

不要在没有确认进程身份的情况下强制终止端口占用者。

## 构建后新页面出现 404

`sirv` 可能仍然使用启动时的旧目录索引。停止并重新执行：

```powershell
npm run serve
```

## Cloudflare 显示 502 Bad Gateway

依次检查：

1. `cloudflared` Connector 是否为 Connected。
2. 本地是否正在监听 `127.0.0.1:1314`。
3. Published application route 是否使用 `http://localhost:1314`。
4. Path 是否留空。

本地测试：

```powershell
curl.exe http://127.0.0.1:1314/
```

## Cloudflare 无法创建 DNS 记录

进入域名的 `DNS → Records`，检查相同主机名是否已有 A、AAAA 或 CNAME。Tunnel DNS 应为：

```text
Type:         CNAME
Name:         @ 或 www
Target:       <TUNNEL_UUID>.cfargotunnel.com
Proxy status: Proxied
TTL:          Auto
```

## 修改名言后没有变化

确认编辑的是当前服务器读取的文件：

```text
dist/fun_words/words.json
```

刷新页面。脚本已经禁用该 JSON 的浏览器缓存。如果执行过构建，需要重新检查 `dist` 中的内容。

## 新增短链后 404

短链是静态构建路由。编辑 `src/data/short-links.json` 后必须执行：

```powershell
npm run build
```

并重启静态服务。

## Blog 不显示

检查：

- 文件是否位于 `src/content/blogs/`。
- 扩展名是否为 `.md` 或 `.mdx`。
- `draft` 是否仍为 `true`。
- `category` 是否使用允许的六个值之一。
- Frontmatter 日期是否有效。

执行诊断：

```powershell
npm run check
```

## npm 报告安全漏洞

```powershell
npm audit
```

不要直接执行 `npm audit fix --force`。强制升级可能引入不兼容版本，应先确认漏洞来源和可用的
非破坏性升级方案。

