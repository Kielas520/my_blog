# Media Uploader

使用本机 PicGo 的三个 S3 配置上传文件。支持 Windows、macOS 和 Linux，并可用
`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` 临时覆盖所选 PicGo 配置
中的 R2 连接参数。成功时输出最终 URL，并追加记录到 `upload.log`。

```powershell
npm run upload:file -- --type image --source ".\photo.png"
npm run upload:file -- --type sound --source ".\music.mp3"
npm run upload:file -- --type video --source ".\movie.mp4"
```

也可以直接运行：

```powershell
python .\tools\media-uploader\upload.py --type image --source ".\photo.png"
```

类型与 PicGo 配置的对应关系：

| type | PicGo 配置 | 返回域名 |
| --- | --- | --- |
| `image` | `kielas-nas-picture` | `image.kielasovo.com` |
| `sound` | `kielas-nas-music` | `sound.kielasovo.com` |
| `video` | `Kielas-nas-video` | `video.kielasovo.com` |

`upload.log` 采用追加写入，工具不会主动清空。上传失败不会写入成功日志。

遇到 TLS 断开、连接重置、超时或 S3 临时服务错误时，工具会自动重试，最多尝试 4 次（间隔 1、2、4 秒）。鉴权或配置错误不会无意义重试。

## 初始化与清理

设置完整的三个 R2 环境变量后运行 `npm run setup:picgo`。PicGo CLI、S3 插件和 AWS SDK
安装在同一个本地 PicGo 配置目录，上传直接通过 Node.js 启动该目录的 CLI，不执行
Windows `.cmd` 包装器。初始化先备份旧配置，再原子替换；R2 配置不设置公共 ACL，
公开访问由 Bucket 绑定的域名控制。

清理默认只预览，不删除普通图片（包括 `kiana.jpg`），仅匹配文件名以
`kielasovo-r2-smoke` 开头的对象，并遍历所有分页：

```powershell
npm run cleanup:r2-test -- --prefix "2026/10/"
npm run cleanup:r2-test -- --bucket kielas-blog-assets --prefix "2026/10/" --delete
```

不传 `--prefix` 会扫描整个 Bucket。上传成功但日志不可写时仍返回 URL，同时输出日志警告；
返回 URL 按完整域名校验，不接受包含目标域名的其他地址。
