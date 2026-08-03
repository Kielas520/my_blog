# 安装与运行

## 环境要求

- Windows 10/11
- Node.js 22 或更高版本
- npm
- Git，用于提交和发布

查看当前版本：

```powershell
node --version
npm --version
```

## 安装依赖

在项目目录中执行：

```powershell
cd D:\project\kielasWEB
npm install
```

## 开发模式

```powershell
npm run dev
```

开发服务器监听 `0.0.0.0:1314`，支持文件修改后自动刷新：

```text
http://localhost:1314
```

开发模式适合编辑页面和调试，不建议长期暴露到公网。

## 类型检查

```powershell
npm run check
```

提交内容或部署前，应确认结果为：

```text
0 errors
0 warnings
0 hints
```

## 构建静态站点

```powershell
npm run build
```

构建结果输出到 `dist/`。该目录是自动生成的，不应作为内容源长期维护。

## 发布到正式网站

正式网站由 Cloudflare Pages 托管。确认构建成功后，将修改提交并推送到 GitHub 的 `main`
分支：

```powershell
git status
git add <需要发布的文件>
git commit -m "Update blog"
git push origin main
```

Pages 会自动执行 `npm run build` 并发布 `dist/`。本地不需要启动长期后台服务。部署状态在
Cloudflare 的 `Workers & Pages → kielasovo → Deployments` 中查看。

## 可选的本地静态服务

需要检查构建后的静态文件时，可以运行：

```powershell
npm run preview
```

旧的后台管理命令仍可用于本地测试，但不会更新正式网站：

```powershell
web start
web check
web stop
```

是否运行这些本地命令不会影响 `kielasovo.com`。

## npm scripts

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Astro 开发服务器 |
| `npm run check` | 执行 Astro 和 TypeScript 检查 |
| `npm run build` | 检查并构建静态站点 |
| `npm run serve` | 在 1314 端口提供已有的 `dist/` |
| `npm start` | 构建后启动正式静态服务 |
| `npm run preview` | 使用 Astro Preview 预览构建结果 |
