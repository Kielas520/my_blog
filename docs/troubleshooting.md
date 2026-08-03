# 常见问题

## 本地开发的 1314 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 1314 -State Listen
```

查看进程：

```powershell
$listener = Get-NetTCPConnection -LocalPort 1314 -State Listen
Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
```

不要在没有确认进程身份的情况下强制终止端口占用者。

如果占用者是当前网站且由管理脚本启动，直接执行 `web stop`；`web start` 也会先停止脚本记录的
旧实例。若占用者不是 `.web-service.pid` 中记录的进程，脚本不会擅自终止它。

## 推送后新页面仍然出现 404

先确认本地构建包含该页面，再检查 Pages 的最新 Production 部署是否成功：

```powershell
npm run build
git status
```

如果文件尚未提交，提交并推送到 `main`。如果 Pages 构建失败，打开 Deployments 中对应记录的
构建日志，修复第一处错误后重新推送。

## 本地预览的 `web` 不是可识别的命令

在项目目录重新执行安装脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-web-command.ps1
```

随后关闭并重新打开终端，使用户 `PATH` 生效。

## 本地后台预览存在但无法访问

```powershell
web check
Get-Content D:\project\kielasWEB\.web-service.error.log -Tail 50
```

确认 `KIELAS_WEB_ROOT` 指向正确项目，且 `KIELAS_WEB_HOST`、`KIELAS_WEB_PORT` 没有被设置成
意外值。修正后执行 `web start`。

## 正式域名显示 530、522 或仍指向旧站点

正式域名应绑定到 Cloudflare Pages，而不是 Tunnel。依次检查：

1. `https://kielasovo.pages.dev` 是否正常。
2. Pages 项目的 `Custom domains` 中，根域名和 `www` 是否为 `Active`。
3. DNS 中是否还残留指向 `*.cfargotunnel.com` 的同名记录。
4. Tunnel 中是否还保留正式域名的 Published application route。

公网测试：

```powershell
curl.exe -I https://kielasovo.pages.dev
curl.exe -I https://kielasovo.com
```

## Pages 无法添加自定义域名

进入 `DNS → Records`，删除同名的旧 Tunnel CNAME，然后必须从 Pages 项目的 `Custom domains`
重新执行 `Set up a custom domain`。不要只手动创建 Pages CNAME。

## 修改名言后没有变化

确认编辑的是源文件：

```text
public/fun_words/words.json
```

执行 `npm run build`，提交并推送到 `main`，等待 Pages 部署成功后刷新页面。

## 新增短链后 404

短链是静态构建路由。编辑 `src/data/short-links.json` 后必须执行：

```powershell
npm run build
```

并提交、推送到 `main`，等待 Pages 重新部署。

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
