#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NOTION_API_VERSION = '2026-03-11';
const MARKDOWN_IMPORTER = path.resolve(process.cwd(), 'tools', 'markdown-importer', 'index.mjs');
const MEDIA_UPLOADER = path.resolve(process.cwd(), 'tools', 'media-uploader', 'upload.py');
const PICGO_CONFIG = path.join(os.homedir(), 'AppData', 'Roaming', 'picgo', 'data.json');
const DEFAULT_TOKEN_ENV = 'NOTION_API_KEY';
const REQUIRED_IMPORTER_FIELDS = ['title', 'description', 'category', 'published_at', 'file_name'];
const FETCH_ATTEMPTS = 4;
const FETCH_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

const MEDIA_HOSTS = {
  image: 'image.kielasovo.com',
  sound: 'sound.kielasovo.com',
  video: 'video.kielasovo.com',
};

const MIME_EXTENSIONS = {
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
  'image/webp': '.webp',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'audio/m4a': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/x-m4a': '.m4a',
  'video/mp4': '.mp4',
  'video/mpeg': '.mpeg',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

const ALLOWED_EXTENSIONS = {
  image: new Set(['.avif', '.bmp', '.gif', '.heic', '.heif', '.jpeg', '.jpg', '.png', '.svg', '.tif', '.tiff', '.webp']),
  sound: new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav']),
  video: new Set(['.m4v', '.mkv', '.mov', '.mp4', '.mpeg', '.mpg', '.ogv', '.webm']),
};

const help = `
Notion Importer

通过 Notion Enhanced Markdown API 读取页面，转存临时媒体，并沿用 markdown-importer
写入 src/content/blogs。

准备：
  $env:NOTION_API_KEY = "ntn_xxx"

用法：
  npm run import:notion -- --page "Notion 页面 URL 或 ID" \\
    --title "被牵着走" --description "端午回家、陪母亲骑行，以及在成长中愈发强烈的念家。" \\
    --category dairy --published-at 2026-06-20 --file-name being-led \\
    --draft false --tags "忆" --type article

Notion 参数：
  --page                Notion 页面 URL 或 32 位页面 ID（必填）
  --page-id             --page 的别名
  --token-env           Token 所在的环境变量名，默认 NOTION_API_KEY
  --proxy               Notion/媒体下载使用的 HTTP(S) 代理
  --no-proxy            禁止自动读取环境变量或 PicGo 的代理
  --include-transcript  包含 Notion meeting notes transcript
  --allow-incomplete    页面被截断或有权限缺失时仍然继续导入

沿用 markdown-importer 的参数：
  --title               文档标题（必填）
  --description         文档卡片摘要（必填）
  --category            分类目录（必填；不存在时自动创建）
  --published-at        发布日期 YYYY-MM-DD（必填）
  --file-name           Markdown 文件名（必填；可省略 .md）
  --draft               true 或 false，默认 false
  --tags                逗号分隔的标签，默认空数组
  --type                article、series、project 或 note，默认 article
  --updated-at          更新日期 YYYY-MM-DD
  --series              系列名称
  --order               系列顺序
  --keep-source-header  保留来源正文开头的标题/元数据
  --skip-images         不转存图片；Notion 临时图片链接以后可能失效
  --force               允许覆盖已经存在的目标文件
  --help                显示帮助

说明：
  --source 和 --content 由 --page 取代，其他文章参数会原样交给 markdown-importer。
  Token 不接受命令行明文参数，避免出现在 shell 历史和进程列表中。
`;

function normalizeKey(rawKey) {
  return rawKey
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replaceAll('-', '_')
    .toLowerCase();
}

function splitOption(token) {
  const equalsIndex = token.indexOf('=');
  if (equalsIndex === -1) return { rawKey: token.slice(2), inlineValue: undefined };
  return {
    rawKey: token.slice(2, equalsIndex),
    inlineValue: token.slice(equalsIndex + 1),
  };
}

function parseBoolean(value, field) {
  if (value === undefined || value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${field} 必须是 true 或 false`);
}

function parseArguments(argv) {
  const notion = {
    tokenEnv: DEFAULT_TOKEN_ENV,
    includeTranscript: false,
    allowIncomplete: false,
    proxy: undefined,
    noProxy: false,
    help: false,
  };
  const forwarded = [];
  const notionValueOptions = new Set(['page', 'page_id', 'page_url', 'token_env', 'proxy']);
  const notionBooleanOptions = new Set(['include_transcript', 'allow_incomplete', 'no_proxy', 'help']);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const { rawKey, inlineValue } = splitOption(token);
    const key = normalizeKey(rawKey);

    if (notionValueOptions.has(key)) {
      const value = inlineValue ?? argv[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${rawKey} 缺少值`);
      if (key === 'page' || key === 'page_id' || key === 'page_url') notion.page = value;
      if (key === 'token_env') notion.tokenEnv = value;
      if (key === 'proxy') notion.proxy = value;
      continue;
    }

    if (notionBooleanOptions.has(key)) {
      const value = parseBoolean(inlineValue, rawKey);
      if (key === 'include_transcript') notion.includeTranscript = value;
      if (key === 'allow_incomplete') notion.allowIncomplete = value;
      if (key === 'no_proxy') notion.noProxy = value;
      if (key === 'help') notion.help = value;
      continue;
    }

    forwarded.push(token);
    if (inlineValue === undefined && argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) {
      forwarded.push(argv[++index]);
    }
  }

  return { notion, forwarded };
}

function collectForwardedOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const { rawKey, inlineValue } = splitOption(token);
    const key = normalizeKey(rawKey);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
    } else if (argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) {
      options.set(key, argv[++index]);
    } else {
      options.set(key, true);
    }
  }
  return options;
}

function formatPageId(compactId) {
  return `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20)}`;
}

function extractPageId(input) {
  const value = String(input).trim();
  const direct = value.replace(/[{}-]/g, '');
  if (/^[a-f\d]{32}$/i.test(direct)) return formatPageId(direct.toLowerCase());

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the original URL when it contains a literal percent sign.
  }

  const dashedMatches = [...decoded.matchAll(/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/gi)];
  if (dashedMatches.length) return dashedMatches.at(-1)[0].toLowerCase();

  const compactMatches = [...decoded.matchAll(/(?:^|[^a-f\d])([a-f\d]{32})(?=$|[^a-f\d])/gi)];
  if (compactMatches.length) return formatPageId(compactMatches.at(-1)[1].toLowerCase());
  throw new Error('无法从 --page 提取 Notion 页面 ID，请传入完整页面 URL 或 32 位页面 ID');
}

function friendlyApiError(status, payload) {
  const message = payload?.message || payload?.code || 'Notion API 没有返回错误详情';
  if (status === 401) return `Notion Token 无效或已过期：${message}`;
  if (status === 403) return `Notion Integration 缺少 read_content 权限：${message}`;
  if (status === 404) return `Notion 页面不存在，或尚未共享给当前 Integration：${message}`;
  if (status === 429) return `Notion API 请求过于频繁，请稍后重试：${message}`;
  return `Notion API 请求失败（HTTP ${status}）：${message}`;
}

function describeNetworkError(error) {
  const details = [];
  const seen = new Set();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const code = typeof current.code === 'string' ? current.code : undefined;
    const message = typeof current.message === 'string' ? current.message : undefined;
    const description = [code, message].filter(Boolean).join(': ');
    if (description && !details.includes(description)) details.push(description);
    current = current.cause;
  }
  return details.join(' → ') || String(error);
}

function retryAfterMilliseconds(response, fallback) {
  const value = response.headers.get('retry-after');
  if (!value) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, fallback), 30_000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return fallback;
  return Math.min(Math.max(date - Date.now(), fallback), 30_000);
}

function isRetryableHttpStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeProxy(value) {
  if (!value || typeof value !== 'string') return undefined;
  const proxy = value.trim();
  if (!proxy) return undefined;
  try {
    const parsed = new URL(proxy);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

async function resolveProxy(notion) {
  if (notion.noProxy) return undefined;
  if (notion.proxy) {
    const proxy = normalizeProxy(notion.proxy);
    if (!proxy) throw new Error('--proxy 必须是有效的 http:// 或 https:// URL');
    return proxy;
  }

  const environmentProxy = process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy;
  if (environmentProxy) return normalizeProxy(environmentProxy);

  try {
    const config = JSON.parse(await readFile(PICGO_CONFIG, 'utf8'));
    const configList = config?.uploader?.['aws-s3']?.configList;
    const imageConfig = Array.isArray(configList)
      ? configList.find((item) => item?._configName === 'kielas-nas-picture')
      : undefined;
    return normalizeProxy(imageConfig?.proxy);
  } catch {
    return undefined;
  }
}

function displayProxy(proxy) {
  try {
    const parsed = new URL(proxy);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '(已配置)';
  }
}

function relaunchWithProxy(proxy) {
  const scriptPath = fileURLToPath(import.meta.url);
  const result = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: '1',
      HTTP_PROXY: proxy,
      HTTPS_PROXY: proxy,
      NOTION_IMPORTER_PROXY_BOOTSTRAPPED: '1',
    },
  });
  if (result.error) throw new Error(`无法使用代理重新启动 notion-importer：${result.error.message}`);
  process.exitCode = result.status ?? 1;
}

async function fetchWithRetry(url, options, label, timeoutMilliseconds) {
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMilliseconds),
      });
      if (!isRetryableHttpStatus(response.status) || attempt === FETCH_ATTEMPTS) return response;

      const delay = retryAfterMilliseconds(response, FETCH_RETRY_DELAYS_MS[attempt - 1]);
      await response.body?.cancel();
      console.warn(`${label}暂时失败（HTTP ${response.status}），${delay / 1_000} 秒后重试（${attempt + 1}/${FETCH_ATTEMPTS}）…`);
      await wait(delay);
    } catch (error) {
      const details = describeNetworkError(error);
      if (attempt === FETCH_ATTEMPTS) throw new Error(`${label}失败：${details}`, { cause: error });
      const delay = FETCH_RETRY_DELAYS_MS[attempt - 1];
      console.warn(`${label}连接失败（${details}），${delay / 1_000} 秒后重试（${attempt + 1}/${FETCH_ATTEMPTS}）…`);
      await wait(delay);
    }
  }
  throw new Error(`${label}重试意外结束`);
}

async function retrieveMarkdown(pageId, token, includeTranscript) {
  const endpoint = new URL(`https://api.notion.com/v1/pages/${pageId}/markdown`);
  if (includeTranscript) endpoint.searchParams.set('include_transcript', 'true');

  const response = await fetchWithRetry(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Notion-Version': NOTION_API_VERSION,
    },
  }, 'Notion API 请求', 60_000);

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    if (!response.ok) throw new Error(`Notion API 请求失败（HTTP ${response.status}）：${responseText.slice(0, 300)}`);
    throw new Error('Notion API 返回了无法解析的响应');
  }

  if (!response.ok) throw new Error(friendlyApiError(response.status, payload));
  if (typeof payload.markdown !== 'string') throw new Error('Notion API 响应中缺少 markdown 字段');
  return payload;
}

function findRemoteMedia(markdown, skipImages) {
  const media = new Map();
  const add = (reference, type) => {
    const url = reference.startsWith('<') && reference.endsWith('>')
      ? reference.slice(1, -1)
      : reference;
    if (!/^https?:\/\//i.test(url)) return;
    if (type === 'image' && skipImages) return;
    if (Object.values(MEDIA_HOSTS).some((host) => {
      try {
        return new URL(url.replaceAll('&amp;', '&')).hostname === host;
      } catch {
        return false;
      }
    })) return;
    if (!media.has(url)) media.set(url, type);
  };

  const markdownImagePattern = /!\[[^\]]*\]\(\s*(<https?:\/\/[^>]+>|https?:\/\/[^\s)]+)(?=\s*(?:["'(]|\)))/gi;
  for (const match of markdown.matchAll(markdownImagePattern)) add(match[1], 'image');

  const htmlImagePattern = /<img\b[^>]*?\bsrc\s*=\s*(["'])(https?:\/\/.*?)\1[^>]*>/gi;
  for (const match of markdown.matchAll(htmlImagePattern)) add(match[2], 'image');

  const taggedMediaPattern = /<(audio|video)\b[^>]*?\bsrc\s*=\s*(["'])(https?:\/\/.*?)\2[^>]*>/gi;
  for (const match of markdown.matchAll(taggedMediaPattern)) add(match[3], match[1].toLowerCase() === 'audio' ? 'sound' : 'video');
  return media;
}

function chooseExtension(url, contentType, mediaType) {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    if (ALLOWED_EXTENSIONS[mediaType].has(extension)) return extension;
  } catch {
    // Fall back to Content-Type.
  }
  const normalizedType = String(contentType || '').split(';', 1)[0].trim().toLowerCase();
  return MIME_EXTENSIONS[normalizedType] ?? (mediaType === 'image' ? '.jpg' : mediaType === 'sound' ? '.mp3' : '.mp4');
}

async function downloadMedia(url, mediaType, mediaDirectory, index) {
  const fetchUrl = url.replaceAll('&amp;', '&');
  const response = await fetchWithRetry(fetchUrl, {
    headers: { 'User-Agent': 'kielasWEB-notion-importer/1.0' },
    redirect: 'follow',
  }, `下载 Notion ${mediaType}`, 120_000);
  if (!response.ok) throw new Error(`下载 Notion 媒体失败（HTTP ${response.status}）：${url}`);

  const extension = chooseExtension(url, response.headers.get('content-type'), mediaType);
  const contents = Buffer.from(await response.arrayBuffer());
  if (contents.length === 0) throw new Error(`下载到的 Notion 媒体为空：${url}`);
  const digest = createHash('sha256').update(contents).digest('hex').slice(0, 16);
  const destination = path.join(mediaDirectory, `notion-${digest}-${String(index).padStart(3, '0')}-${mediaType}${extension}`);
  await writeFile(destination, contents);
  return destination;
}

function uploadMedia(source, mediaType) {
  const python = process.env.PYTHON || 'python';
  const result = spawnSync(python, [MEDIA_UPLOADER, '--type', mediaType, '--source', source], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw new Error(`无法启动 media-uploader：${result.error.message}`);
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`media-uploader 上传失败：${source}${details ? `\n${details}` : ''}`);
  }
  const expectedHost = MEDIA_HOSTS[mediaType];
  const urls = result.stdout.match(/https?:\/\/[^\s\]\["'<>]+/g) ?? [];
  const url = urls.map((item) => item.replace(/[.,;)]$/, '')).filter((item) => item.includes(expectedHost)).at(-1);
  if (!url) throw new Error(`media-uploader 没有返回 ${expectedHost} URL：${source}`);
  return url;
}

async function mirrorRemoteMedia(markdown, mediaDirectory, skipImages) {
  const media = findRemoteMedia(markdown, skipImages);
  if (media.size === 0) return markdown;

  let result = markdown;
  let index = 0;
  for (const [reference, mediaType] of media) {
    index += 1;
    console.log(`正在下载 Notion ${mediaType}（${index}/${media.size}）…`);
    const localPath = await downloadMedia(reference, mediaType, mediaDirectory, index);
    console.log(`正在上传到 ${MEDIA_HOSTS[mediaType]}：${path.basename(localPath)}`);
    const permanentUrl = uploadMedia(localPath, mediaType);
    result = result.replaceAll(reference, permanentUrl);
  }
  return result;
}

function runMarkdownImporter(forwarded, sourcePath) {
  const result = spawnSync(process.execPath, [MARKDOWN_IMPORTER, ...forwarded, '--source', sourcePath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw new Error(`无法启动 markdown-importer：${result.error.message}`);
  if (result.status !== 0) throw new Error(`markdown-importer 执行失败（退出码 ${result.status ?? 'unknown'}）`);
}

async function main() {
  const { notion, forwarded } = parseArguments(process.argv.slice(2));
  if (notion.help) {
    console.log(help.trim());
    return;
  }

  if (!notion.page) throw new Error('缺少必填参数：--page');
  if (!/^[A-Za-z_][A-Za-z\d_]*$/.test(notion.tokenEnv)) throw new Error('--token-env 不是有效的环境变量名');

  const importerOptions = collectForwardedOptions(forwarded);
  if (importerOptions.has('source') || importerOptions.has('content')) {
    throw new Error('notion-importer 使用 --page 作为正文来源，不能同时使用 --source 或 --content');
  }
  const missing = REQUIRED_IMPORTER_FIELDS.filter((field) => !importerOptions.get(field));
  if (missing.length) {
    throw new Error(`缺少必填参数：${missing.map((field) => `--${field.replaceAll('_', '-')}`).join(', ')}`);
  }

  const token = process.env[notion.tokenEnv];
  if (!token) {
    throw new Error(`环境变量 ${notion.tokenEnv} 未设置。PowerShell 示例：$env:${notion.tokenEnv} = "ntn_xxx"`);
  }

  const proxy = await resolveProxy(notion);
  const proxyReady = process.env.NODE_USE_ENV_PROXY === '1'
    && Boolean(process.env.HTTPS_PROXY || process.env.https_proxy);
  if (proxy && !proxyReady && process.env.NOTION_IMPORTER_PROXY_BOOTSTRAPPED !== '1') {
    console.log(`正在通过代理连接 Notion：${displayProxy(proxy)}`);
    relaunchWithProxy(proxy);
    return;
  }

  const pageId = extractPageId(notion.page);
  console.log(`正在读取 Notion 页面：${pageId}`);
  const response = await retrieveMarkdown(pageId, token, notion.includeTranscript);
  const unknownBlockIds = Array.isArray(response.unknown_block_ids) ? response.unknown_block_ids : [];
  if (response.truncated && !notion.allowIncomplete) {
    throw new Error(`Notion 页面内容不完整（${unknownBlockIds.length} 个未知或无权限区块）；确认页面权限后重试，或使用 --allow-incomplete 强制导入`);
  }
  if (response.truncated) {
    console.warn(`警告：继续导入不完整页面，未知或无权限区块：${unknownBlockIds.length} 个`);
  } else if (/<unknown\b/i.test(response.markdown)) {
    console.warn('警告：页面包含 Notion Markdown API 尚不支持的 <unknown> 区块。');
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'kielas-notion-importer-'));
  try {
    const mediaDirectory = path.join(temporaryDirectory, 'media');
    await mkdir(mediaDirectory, { recursive: true });
    const skipImages = parseBoolean(importerOptions.get('skip_images') ?? false, 'skip-images');
    const markdown = await mirrorRemoteMedia(response.markdown, mediaDirectory, skipImages);

    if (/<(?:file|pdf)\b[^>]*?\bsrc\s*=\s*["']https?:\/\//i.test(markdown)) {
      console.warn('警告：页面包含 file/PDF；media-uploader 没有对应类型，其 Notion 临时 URL 可能会失效。');
    }

    const sourcePath = path.join(temporaryDirectory, 'notion-page.md');
    await writeFile(sourcePath, markdown, 'utf8');
    runMarkdownImporter(forwarded, sourcePath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Notion 导入失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
