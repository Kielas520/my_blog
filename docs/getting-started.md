# 安装与运行

## 环境要求

- Windows 10/11
- Node.js 22 或更高版本
- npm
- 可选：Cloudflare Tunnel，用于公网访问

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

## 启动正式静态服务

首次启动或电脑重启后执行：

```powershell
npm start
```

`npm start` 会先检查并构建，再在 `127.0.0.1:1314` 启动静态服务。

如果已经构建，只启动现有 `dist/`：

```powershell
npm run serve
```

注意：静态服务器启动后重新执行构建，应重启 `npm run serve`，让它重新加载目录。

## npm scripts

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Astro 开发服务器 |
| `npm run check` | 执行 Astro 和 TypeScript 检查 |
| `npm run build` | 检查并构建静态站点 |
| `npm run serve` | 在 1314 端口提供已有的 `dist/` |
| `npm start` | 构建后启动正式静态服务 |
| `npm run preview` | 使用 Astro Preview 预览构建结果 |

