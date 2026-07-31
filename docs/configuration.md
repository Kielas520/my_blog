# 网站外观、名言、链接、媒体与 Tools 配置

## 网站外观

全站外观配置位于：

```text
public/config.json
```

```json
{
  "siteName": "Hi There",
  "icon": "/images/kiana.jpg",
  "avatar": "/images/kiana.jpg",
  "backgroundImage": "/images/frutiger_aero.jpg",
  "cursor": "/cursors/vista-glass.svg"
}
```

`siteName` 是浏览器标签页名称，也用于导航左上角；`icon` 是标签页图标；`avatar` 是主页头像；
`backgroundImage` 是所有页面共用的背景；`cursor` 是网页光标。以 `/` 开头的路径都相对于
`public/`，例如 `/images/a.jpg` 对应 `public/images/a.jpg`。

页面会以 `no-store` 方式重新读取这份配置。直接修改发布后的 `dist/config.json` 并刷新即可生效；
下一次构建会用 `public/config.json` 覆盖它，因此长期配置应同时写回源文件。

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
  "/images/kiana.jpg",
  "https://image.kielasovo.com/example.jpg"
]
```

这里既可以填写完整的远程 URL，也可以填写本地公开路径。本地图片放在 `public/images/` 后，填写
`/images/文件名.jpg`；不要把 `public` 写进 URL。

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
