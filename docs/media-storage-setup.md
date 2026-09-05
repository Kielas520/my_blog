# Cloudflare R2 与 PicGo 环境配置

本文用于从零配置本项目的图片、音频和视频上传环境。项目使用 Cloudflare R2 保存媒体文件，使用 PicGo 的 S3 兼容插件上传。

## 一、准备条件

需要准备：

- Cloudflare 账户；
- 一个已经添加到 Cloudflare 的域名；
- Node.js 和 npm；
- PicGo 桌面客户端；
- R2 API Token；
- 三个 R2 Bucket，或根据实际需求使用已有 Bucket。

仓库不保存任何 R2 密钥。Access Key ID 和 Secret Access Key 只应保存在本机环境变量或 PicGo 配置中。

## 二、创建 R2 Bucket

1. 登录 Cloudflare Dashboard。
2. 进入 `R2 Object Storage`。
3. 创建图片、音频、视频 Bucket。
4. 为三个 Bucket 分别绑定自定义域名。

项目约定的配置名称和公网域名如下：

| 媒体 | PicGo 配置名 | 公网域名 |
| --- | --- | --- |
| 图片 | `kielas-nas-picture` | `https://image.kielasovo.com` |
| 音频 | `kielas-nas-music` | `https://sound.kielasovo.com` |
| 视频 | `Kielas-nas-video` | `https://video.kielasovo.com` |

自定义域名必须已经在 R2 Bucket 的 `Settings → Custom Domains` 中绑定，并且 DNS、HTTPS 均正常。

## 三、创建 R2 API Token

在 Cloudflare 中打开 `R2 Object Storage → Manage R2 API Tokens`，创建一个专用 Token。

权限至少需要覆盖这三个 Bucket 的对象读写。创建完成后保存：

```text
Access Key ID
Secret Access Key
```

Secret Access Key 通常只显示一次。不要把它写进 Markdown、JSON、日志或 Git 仓库。

## 四、安装 PicGo

从 PicGo Releases 页面下载对应系统的桌面客户端：

```text
https://github.com/Molunerfinn/PicGo/releases
```

安装后启动 PicGo，在插件设置中安装支持 AWS S3 兼容服务的 S3 插件。插件名称可能显示为 `S3` 或 `picgo-plugin-s3`，以 PicGo 当前版本能够正常安装并提供 S3 图床配置为准。

## 五、配置 PicGo 的三套 S3 图床

在 PicGo 的图床设置中选择 S3，分别新建三条配置。每条配置填写：

| 字段 | 填写内容 |
| --- | --- |
| 配置名 | 见下方三套名称，大小写必须一致 |
| AccessKeyID | R2 API Token 的 Access Key ID |
| SecretAccessKey | R2 API Token 的 Secret Access Key |
| Bucket | 对应的 R2 Bucket 名称 |
| Region / Area | `auto` |
| Endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| Path | `%Y/%m/` |
| Custom URL | 对应的公网域名 |

三套配置分别是：

```text
kielas-nas-picture → https://image.kielasovo.com
kielas-nas-music   → https://sound.kielasovo.com
Kielas-nas-video   → https://video.kielasovo.com
```

`<ACCOUNT_ID>` 是 Cloudflare 账户 ID。Endpoint 填 R2 S3 API 地址，Custom URL 填公开访问域名，不能互换。

## 六、一键配置 PicGo

如果已经设置 `R2_ENDPOINT`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，可以在项目根目录执行：

```bash
npm run setup:picgo
```

脚本会按当前系统安装 PicGo CLI 和 S3 插件，创建或更新三套配置。三种媒体默认都
使用现有的 `kielas-blog-assets` Bucket：

```text
kielas-blog-assets
```

只有在你准备重命名或拆分 Bucket 时，才需要在提示处输入其他名称；直接按回车就使用
当前这个 Bucket。脚本会先备份原有 `data.json`，不会输出密钥，也不会修改环境变量。
配置完成后再执行上传测试。Windows、macOS、Linux 均使用同一条 npm 命令。

下面的环境变量章节因此改为第七节。

## 七、保存项目使用的环境变量

项目上传器支持用环境变量覆盖当前 PicGo 配置中的 Endpoint 和两个密钥。需要保存的变量只有：

```text
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### macOS / Linux zsh 永久保存

```bash
cat >> ~/.zshrc <<'EOF'

export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
EOF

source ~/.zshrc
```

### Linux bash 永久保存

```bash
cat >> ~/.bashrc <<'EOF'

export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
EOF

source ~/.bashrc
```

### Windows PowerShell 永久保存

```powershell
[Environment]::SetEnvironmentVariable("R2_ENDPOINT", "https://<ACCOUNT_ID>.r2.cloudflarestorage.com", "User")
[Environment]::SetEnvironmentVariable("R2_ACCESS_KEY_ID", "...", "User")
[Environment]::SetEnvironmentVariable("R2_SECRET_ACCESS_KEY", "...", "User")
```

执行后关闭并重新打开 PowerShell。不要在公共机器上永久保存生产密钥；如已泄露，应立即在 Cloudflare 中撤销并重新创建 Token。

## 八、验证配置

先使用 PicGo 图形界面上传一个小图片，确认 URL 类似：

```text
https://image.kielasovo.com/2026/09/example.jpg
```


已验证：使用本项目的 `upload:file` 命令可以在 macOS 上通过 PicGo CLI 上传到
`kielas-blog-assets`，并返回包含文件名的完整 URL。测试完成后应删除测试对象。
然后直接在浏览器打开 URL。图片必须返回文件，而不是 `403` 或 R2 XML 错误。

再测试项目命令：

```bash
npm install
npm run upload:file -- --type image --source "./test.jpg"
```

音频和视频分别测试：

```bash
npm run upload:file -- --type sound --source "./test.mp3"
npm run upload:file -- --type video --source "./test.mp4"
```

成功后命令会输出公网 URL，并追加写入：

```text
tools/media-uploader/upload.log
```

## 九、常见问题

### 找不到 PicGo 配置或 CLI

确认 PicGo 已安装、至少成功配置过一次 S3 图床，并且 PicGo 的 CLI 或插件目录存在。上传器会按系统尝试查找：

```text
Windows: %APPDATA%\picgo
macOS:   ~/Library/Application Support/picgo、~/.config/picgo、~/.picgo
Linux:   ~/.config/picgo、~/.picgo
```

### 返回 403

检查 R2 API Token 是否拥有对应 Bucket 的读写权限，Bucket 名称是否正确，公开访问域名是否绑定到正确 Bucket。

### 上传成功但 URL 不正确

检查三套 PicGo 配置的 Custom URL。必须分别使用 `image.kielasovo.com`、`sound.kielasovo.com` 和 `video.kielasovo.com`。

### 音频或视频无法播放

检查自定义域名 HTTPS、CORS、正确的 `Content-Type`，以及对象存储是否支持 Range 请求。
