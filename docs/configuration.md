# 网站外观、名言、链接、媒体与 Tools 配置

## 网站外观

全站外观配置位于：

```text
public/config.json
```

```json
{
  "siteName": "Hi There",
  "icon": "https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg",
  "avatar": "https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg",
  "backgroundImage": "",
  "cursor": "https://image.kielasovo.com/2026/10/85a5e0ade6ca166e36e53b0ff1f710c5.png"
}
```

`siteName` 是浏览器标签页名称，也用于导航左上角；`icon` 是标签页图标；`avatar` 是主页头像；
`backgroundImage` 是所有页面共用的背景，空字符串表示使用 CSS 平铺背景；`cursor` 是网页光标。
所有图片字段都使用上传到 `image.kielasovo.com` 的完整 HTTPS URL，不再填写本地公开路径或将图片放入仓库。
默认光标为 20×20 的奶油粉像素箭头配星星，热点在左上角 `(0, 0)`。SVG 原稿也存放在图床，下载到仓库外编辑后重新上传。运行 `node scripts/generate-room-gifs.mjs <仓库外输出目录>` 可从远程 SVG 重建 PNG 和首页小窝 GIF；SVG 保持 32×32 绘制坐标，PNG 按 20×20 输出，生成器不向仓库写图片。


构建配置通过 `src/config/site.ts` 直接导入 `public/config.json`，让初始 HTML 的站点名称与标题就使用配置值，不依赖浏览器请求完成后再覆盖默认名称。不要用相对 `import.meta.url` 的文件系统读取替代 JSON 导入：打包后模块位置变化会导致读取失败并回退到默认值。

页面首次加载及每次站内导航后，都会以 `no-store` 方式重新读取这份配置，并更新站点名称、页面标题和配置的图片样式，避免切页恢复为构建时的旧值。正式网站由 Pages 托管，因此必须修改
`public/config.json`，再通过 GitHub 提交和发布；不要直接修改自动生成的 `dist/config.json`。

## 随机名言

源文件：

```text
public/fun_words/words.json
```

构建后位置：

```text
dist/fun_words/words.json
```

基本格式：

```json
{
  "interval": 6500,
  "words": [
    {
      "text": "深夜的海边，浪声没停过，但你不觉得吵…",
      "align": "random",
      "motion": "fade"
    },
    {
      "text": "未定义，也是一种定义。",
      "align": "right",
      "motion": "left"
    }
  ]
}
```

字段：

| 字段 | 可选值 | 说明 |
| --- | --- | --- |
| `interval` | 毫秒数字 | 每段话的切换间隔，最低 3200ms |
| `text` | 字符串 | 完整的一段话 |
| `align` | `left`、`center`、`right`、`random` | 文字对齐方式 |
| `motion` | `fade`、`up`、`left`、`right`、`random` | 出入场动画 |

页面使用 `cache: no-store` 读取该文件。直接编辑正在提供服务的
`dist/fun_words/words.json` 后，刷新网页即可看到新内容。

注意：`npm run build` 会重新生成整个 `dist/`，覆盖直接修改的版本。需要长期保存的内容应同步
写回 `public/fun_words/words.json`。

## 短链接

配置文件：

```text
src/data/short-links.json
```

示例：

```json
[
  {
    "name": "profile",
    "short": "kielasovo.com/me",
    "target": "https://example.com/profile",
    "description": "个人主页"
  },
  {
    "name": "github",
    "short": "gh",
    "target": "https://github.com/Kielas520",
    "description": "GitHub"
  }
]
```

`short` 支持三种写法：

```text
me
kielasovo.com/me
https://kielasovo.com/me
```

它们都会生成 `/me`。`target` 必须填写原始 URL，不要使用 Markdown 的
`[名称](URL)` 格式。

短链在构建时生成。修改后执行：

```powershell
npm run build
```

短链接目录位于 `/link`，具体跳转页位于 `/<short>`。

## 有趣链接

配置文件：

```text
src/data/intrest-links.json
```

格式：

```json
[
  {
    "name": "frutigeraero",
    "target": "https://frutigeraeroarchive.org",
    "description": "千禧年的梦"
  }
]
```

这些链接显示在 `/link` 的 Shortcuts 下方，并在新标签页打开。

## Picture

图片墙的数据位于：

```text
src/data/picture.json
```

文件只保存图片 URL：

```json
[
  "https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg",
  "https://image.kielasovo.com/2026/10/62f8b3ad985b145f9c3cf40210d86ad7.gif"
]
```

这里只填写完整的远程 HTTPS URL。新图片在仓库外准备，使用 `npm run upload:file -- --type image --source <图片文件>` 上传后，把返回的 `image.kielasovo.com` 地址写入列表；不提交本地图片。

`/picture` 是一级导航页面，会在浏览器中随机排列图片，并为相框随机设置左、中、右位置和轻微旋转。

## Music

音乐列表位于：

```text
src/data/music.json
```

格式：

```json
[
  {
    "name": "heatwaves",
    "link": "https://sound.kielasovo.com/example.flac"
  }
]
```

`/music` 是一级导航页面，使用一个播放器和曲目列表。浏览器是否能播放某种格式取决于其音频解码支持。

## Tools

入口和两个工具页面分别位于：

```text
src/pages/tools/index.astro
src/pages/tools/ip-inspector.astro
src/pages/tools/speed-test.astro
```

IP Inspector 调用 `api.ipapi.is` 的公开接口，展示网络归属及 VPN、Proxy、Tor、Datacenter
等数据库标记。结果只能作为参考，不能视作绝对判断。

Speed Test 使用 `@cloudflare/speedtest`，连接 Cloudflare 边缘节点测量延迟、抖动和上下行带宽。
配置关闭了结果日志上传，也没有启用依赖 TURN 的丢包测试。
