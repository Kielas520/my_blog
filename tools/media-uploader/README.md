# Media Uploader

使用本机 PicGo 的三个 S3 配置上传文件。成功时在终端输出最终 URL，并追加记录到同目录的 `upload.log`。

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
