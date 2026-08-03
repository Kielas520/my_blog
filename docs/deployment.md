# GitHub 与 Cloudflare Pages 部署

## 正式架构

```text
本地源码
  → GitHub main 分支
  → Cloudflare Pages 自动安装依赖并执行 npm run build
  → Cloudflare 全球节点托管 dist/
  → https://kielasovo.com
```

正式网站不再依赖本机 `1314` 端口、`web start` 或 Cloudflare Tunnel。本机关闭、重启或断网
不会影响已经发布的网站。

## Pages 项目配置

Cloudflare Pages 项目名为 `kielasovo`，GitHub 仓库为 `Kielas520/my_blog`。

| 配置 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空 |
| `NODE_VERSION` | `22` |

正式域名 `kielasovo.com` 和 `www.kielasovo.com` 应在 Pages 项目的 `Custom domains` 中显示
为 `Active`。规范域名是 `https://kielasovo.com`；`www` 可通过 Cloudflare Redirect Rules 做
301 跳转。

## 日常发布

修改完成后先在本地验证：

```powershell
cd D:\project\kielasWEB
npm run build
git status
```

确认待提交文件正确，再提交并推送：

```powershell
git add <需要发布的文件>
git commit -m "Update blog"
git push origin main
```

推送 `main` 后，Pages 会自动构建和部署。不要提交自动生成的 `dist/`，也不需要在 Cloudflare
控制台手动上传文件。

## 检查部署

在 Cloudflare 控制台进入：

```text
Workers & Pages → kielasovo → Deployments
```

最新 Production 部署显示成功后，验证：

```powershell
curl.exe -I https://kielasovo.com
curl.exe -I https://kielasovo.pages.dev
```

两者应返回 `200`。如果部署失败，打开对应部署的构建日志，优先修复第一次出现的错误，然后
重新推送提交。

## 预览部署与回滚

非 `main` 分支和 Pull Request 可以生成独立的 Pages 预览地址，不会覆盖正式站点。需要回滚时，
优先在 Git 中 revert 有问题的提交并推送 `main`，让源码历史与线上状态保持一致：

```powershell
git revert <commit>
git push origin main
```

## 本地服务的定位

以下命令只用于本地开发或检查，不会发布线上网站：

```powershell
npm run dev
npm run preview
web start
web check
web stop
```

旧 Tunnel 可以保持禁用。除非将来需要发布本机动态服务，否则不要再把正式域名指向
`*.cfargotunnel.com`。
