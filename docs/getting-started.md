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

首次安装后台管理命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-web-command.ps1
```

安装脚本会把项目路径写入用户环境变量 `KIELAS_WEB_ROOT`，并把项目的 `scripts` 目录加入
用户 `PATH`。重新打开终端后，可以在任意目录执行：

```powershell
web start
web check
web stop
```

- `web start`：停止由脚本管理的旧服务，执行检查和构建，然后隐藏窗口启动新服务。
- `web check`：同时检查保存的进程和 `http://127.0.0.1:1314/` 的 HTTP 状态。
- `web stop`：停止由脚本管理的后台服务。

后台输出分别保存在项目根目录的 `.web-service.log` 和 `.web-service.error.log`。服务监听
`127.0.0.1:1314`，关闭启动命令所在的终端不会停止服务；Windows 重启后仍需执行
`web start`。

如需临时前台运行，也可以继续使用：

```powershell
npm start
npm run serve
```

`npm start` 会构建后在前台启动，`npm run serve` 只提供已有的 `dist/`。

## 服务环境变量

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `KIELAS_WEB_ROOT` | 安装脚本所在项目 | 项目绝对路径 |
| `KIELAS_WEB_HOST` | `127.0.0.1` | 正式源站监听地址 |
| `KIELAS_WEB_PORT` | `1314` | 正式源站监听端口 |

修改用户环境变量后需要重新打开终端。若修改端口，还要同步修改 Cloudflare Tunnel 的源站地址。

## npm scripts

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Astro 开发服务器 |
| `npm run check` | 执行 Astro 和 TypeScript 检查 |
| `npm run build` | 检查并构建静态站点 |
| `npm run serve` | 在 1314 端口提供已有的 `dist/` |
| `npm start` | 构建后启动正式静态服务 |
| `npm run preview` | 使用 Astro Preview 预览构建结果 |
