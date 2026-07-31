# 名言、短链与 Tools 配置

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

## 新增 Tools

当前 Tools 页面位于：

```text
src/pages/tools/index.astro
```

页面中的 `tools` 数组用于展示工具入口：

```ts
const tools = [
  {
    name: 'IP INSPECTOR',
    note: '检查访问 IP 的网络属性与纯净度',
    icon: '◎',
    status: 'planning',
  },
];
```

真正实现工具时，建议每个工具使用独立路由：

```text
src/pages/tools/ip.astro
src/pages/tools/speed.astro
```

涉及第三方 API、访问者 IP 或测速节点时，不要把私钥写入客户端代码或提交到仓库。纯静态站点
不能安全保存 API 密钥，需要额外的后端、Cloudflare Worker 或受保护的 API 服务。

