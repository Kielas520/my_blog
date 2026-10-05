#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NOTION_API_VERSION = '2026-03-11';
const MARKDOWN_IMPORTER = fileURLToPath(new URL('../markdown-importer/index.mjs', import.meta.url));
const MEDIA_UPLOADER = fileURLToPath(new URL('../media-uploader/upload.py', import.meta.url));
const PICGO_CONFIG = path.join(
  process.platform === 'win32' ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support')
      : (process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')),
  'picgo', 'data.json',
);
const DEFAULT_TOKEN_ENV = 'NOTION_API_KEY';
const REQUIRED_IMPORTER_FIELDS = ['title', 'description', 'category', 'published_at', 'file_name'];
const VALID_CATEGORIES = new Set(['journal', 'notes']);
const FETCH_ATTEMPTS = 4;
const IMPORTER_VALUE_OPTIONS = new Set([...REQUIRED_IMPORTER_FIELDS, 'draft', 'tags', 'type', 'updated_at', 'series', 'order']);
const IMPORTER_BOOLEAN_OPTIONS = new Set(['keep_source_header', 'skip_images', 'force']);
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
  'audio/opus': '.opus',
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
    --category journal --published-at 2026-06-20 --file-name being-led \\
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
  --category            journal（日志）或 notes（技术与实用笔记），必填
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
  --force               允许覆盖已经存在的目标文件，并保留已有 slug
  --help                显示帮助

说明：
  --source 和 --content 由 --page 取代，其他文章参数会原样交给 markdown-importer。
  Token 不接受命令行明文参数，避免出现在 shell 历史和进程列表中。
  新文章写入 journal/ 或 notes/；已有文章通过 frontmatter slug 保留发布地址。
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
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const { rawKey, inlineValue } = splitOption(token);
    const key = normalizeKey(rawKey);
    const canonicalKey = key === 'page_id' || key === 'page_url' ? 'page' : key;
    if (seen.has(canonicalKey)) throw new Error(`参数 --${rawKey} 重复`);
    seen.add(canonicalKey);

    if (notionValueOptions.has(key)) {
      const value = inlineValue ?? argv[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${rawKey} 缺少值`);
      if (key === 'page' || key === 'page_id' || key === 'page_url') notion.page = value;
      if (key === 'token_env') notion.tokenEnv = value;
      if (key === 'proxy') notion.proxy = value;
      continue;
    }

    if (notionBooleanOptions.has(key) || IMPORTER_BOOLEAN_OPTIONS.has(key)) {
      const nextValue = argv[index + 1];
      const value = parseBoolean(inlineValue ?? (nextValue === 'true' || nextValue === 'false' ? argv[++index] : undefined), rawKey);
      if (key === 'include_transcript') notion.includeTranscript = value;
      if (key === 'allow_incomplete') notion.allowIncomplete = value;
      if (key === 'no_proxy') notion.noProxy = value;
      if (key === 'help') notion.help = value;
      if (IMPORTER_BOOLEAN_OPTIONS.has(key)) forwarded.push(`--${key.replaceAll('_', '-')}=${value}`);
      continue;
    }

    if (!IMPORTER_VALUE_OPTIONS.has(key)) throw new Error(`无法识别的参数：--${rawKey}`);
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${rawKey} 缺少值`);
    forwarded.push(`--${key.replaceAll('_', '-')}`, value);
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

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('无法从 --page 提取 Notion 页面 ID，请传入完整页面 URL 或 32 位页面 ID');
  }
  // Query parameters often contain a view ID, and fragments can contain block IDs.
  // Only the path identifies the requested page.
  const decoded = decodeURIComponent(url.pathname);
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
  if (notion.proxy !== undefined) {
    const proxy = normalizeProxy(notion.proxy);
    if (!proxy) throw new Error('--proxy 必须是有效的 http:// 或 https:// URL');
    return proxy;
  }

  const environmentProxy = process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy;
  if (environmentProxy) {
    const proxy = normalizeProxy(environmentProxy);
    if (!proxy) throw new Error('代理环境变量必须是有效的 http:// 或 https:// URL（可使用 --no-proxy 忽略）');
    return proxy;
  }

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
  const environment = { ...process.env };
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) delete environment[key];
  const scriptPath = fileURLToPath(import.meta.url);
  const result = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...environment,
      NODE_USE_ENV_PROXY: proxy ? '1' : '0',
      ...(proxy ? { HTTP_PROXY: proxy, HTTPS_PROXY: proxy } : {}),
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

  if (!response.ok) {
    const error = new Error(friendlyApiError(response.status, payload));
    error.status = response.status;
    throw error;
  }
  if (!payload || typeof payload.markdown !== 'string' || typeof payload.truncated !== 'boolean'
    || !Array.isArray(payload.unknown_block_ids)) throw new Error('Notion API 响应缺少有效的 markdown、truncated 或 unknown_block_ids 字段');
  return payload;
}

// Keep examples literal: discovery, conversion and URL replacement must not touch code.
function maskCode(markdown) {
  let fence;
  const masked = markdown.split('\n').map((line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return line.replace(/[^\r]/g, ' ');
    }
    if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) {
      fence = marker[1];
      return line.replace(/[^\r]/g, ' ');
    }
    return line;
  }).join('\n');
  return masked.replace(/(`+)([\s\S]*?)\1(?!`)|<(pre|code)\b[^>]*>[\s\S]*?<\/\3>/gi,
    (match) => match.replace(/[^\r\n]/g, ' '));
}

async function retrieveCompleteMarkdown(pageId, token, includeTranscript) {
  const active = new Set();
  const cache = new Map();
  const retrieve = async (id) => {
    if (active.has(id)) return { markdown: '', incomplete: true };
    if (cache.has(id)) return cache.get(id);
    active.add(id);
    try {
      const payload = await retrieveMarkdown(id, token, includeTranscript);
      let markdown = payload.markdown;
      let incomplete = false;
      const remaining = new Set(payload.unknown_block_ids.map(extractPageId));
      const unknownIds = [...remaining];
      const replacements = [];
      for (const match of maskCode(markdown).matchAll(/<unknown\b[^>]*\/>/gi)) {
        const url = match[0].match(/\burl\s*=\s*(["'])(.*?)\1/i)?.[2];
        if (!url) continue;
        const blockId = unknownIds.find((candidate) => url.replaceAll('-', '').toLowerCase().includes(candidate.replaceAll('-', '')));
        if (!blockId) continue;
        try {
          const subtree = await retrieve(blockId);
          if (subtree.incomplete) incomplete = true;
          if (!subtree.markdown && subtree.incomplete) continue;
          const lineStart = markdown.lastIndexOf('\n', match.index - 1) + 1;
          const prefix = markdown.slice(lineStart, match.index);
          const indent = /^[ \t]*$/.test(prefix) ? prefix : '';
          replacements.push({ start: match.index, end: match.index + match[0].length,
            text: subtree.markdown.trimEnd().replace(/\n/g, `\n${indent}`) });
          remaining.delete(blockId);
        } catch (error) {
          if (error.status !== 404 && error.status !== 403) throw error;
          incomplete = true;
        }
      }
      for (const replacement of replacements.reverse()) {
        markdown = markdown.slice(0, replacement.start) + replacement.text + markdown.slice(replacement.end);
      }
      incomplete ||= remaining.size > 0 || (payload.truncated && payload.unknown_block_ids.length === 0);
      const result = { markdown, incomplete };
      cache.set(id, result);
      return result;
    } finally {
      active.delete(id);
    }
  };
  return retrieve(pageId);
}

function findRemoteMedia(markdown, skipImages) {
  const media = new Map();
  const masked = maskCode(markdown);
  const add = (reference, type, start) => {
    const url = reference.startsWith('<') && reference.endsWith('>') ? reference.slice(1, -1) : reference;
    if (!/^https?:\/\//i.test(url) || (type === 'image' && skipImages)) return;
    const parsed = new URL(url.replaceAll('&amp;', '&').replace(/\\([()])/g, '$1'));
    if (parsed.hostname === MEDIA_HOSTS[type]) return;
    const key = `${type}:${parsed.href}`;
    if (!media.has(key)) media.set(key, { url: parsed.href, type, references: [] });
    media.get(key).references.push({ start, end: start + reference.length, angled: reference.startsWith('<') });
  };
  for (const match of masked.matchAll(/!\[(?:\\.|[^\]\\])*\]\(\s*/g)) {
    const start = match.index + match[0].length;
    let end = start;
    if (masked[start] === '<') {
      end = masked.indexOf('>', start) + 1;
      if (end <= start) continue;
    } else {
      let depth = 0;
      for (; end < masked.length; end += 1) {
        const character = masked[end];
        if (character === '\\') { end += 1; continue; }
        if (/\s/.test(character) || (character === ')' && depth === 0)) break;
        if (character === '(') depth += 1;
        if (character === ')') depth -= 1;
      }
      if (depth !== 0) continue;
    }
    add(markdown.slice(start, end), 'image', start);
  }
  const imageIds = new Set();
  for (const match of masked.matchAll(/!\[([^\]]*)\](?:\[([^\]]*)\])?(?!\()/g)) {
    imageIds.add((match[2] || match[1]).trim().replace(/\s+/g, ' ').toLowerCase());
  }
  for (const match of masked.matchAll(/^[ \t]{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm)) {
    if (imageIds.has(match[1].trim().replace(/\s+/g, ' ').toLowerCase())) {
      add(match[2], 'image', match.index + match[0].lastIndexOf(match[2]));
    }
  }
  for (const match of masked.matchAll(/<(img|audio|video)\b[^>]*?\bsrc\s*=\s*(["'])(https?:\/\/.*?)\2[^>]*>/gi)) {
    const type = match[1].toLowerCase() === 'audio' ? 'sound' : match[1].toLowerCase() === 'video' ? 'video' : 'image';
    add(match[3], type, match.index + match[0].indexOf(match[3]));
  }
  return media;
}

function chooseExtension(url, contentType, mediaType) {
  const normalizedType = String(contentType || '').split(';', 1)[0].trim().toLowerCase();
  const mimeExtension = MIME_EXTENSIONS[normalizedType];
  if (mimeExtension && ALLOWED_EXTENSIONS[mediaType].has(mimeExtension)) return mimeExtension;
  if (normalizedType && normalizedType !== 'application/octet-stream' && normalizedType !== 'binary/octet-stream') {
    throw new Error(`Notion ${mediaType} 返回了不支持的 Content-Type：${normalizedType}`);
  }
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  if (ALLOWED_EXTENSIONS[mediaType].has(extension)) return extension;
  throw new Error(`无法确定 Notion ${mediaType} 的文件类型：${url}`);
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
  const url = urls.filter((item) => {
    try { return new URL(item).hostname === expectedHost; } catch { return false; }
  }).at(-1);
  if (!url) throw new Error(`media-uploader 没有返回 ${expectedHost} URL：${source}`);
  return url;
}

async function mirrorRemoteMedia(markdown, mediaDirectory, skipImages) {
  const media = findRemoteMedia(markdown, skipImages);
  if (media.size === 0) return markdown;

  const replacements = [];
  let index = 0;
  for (const { url, type, references } of media.values()) {
    index += 1;
    console.log(`正在下载 Notion ${type}（${index}/${media.size}）…`);
    const localPath = await downloadMedia(url, type, mediaDirectory, index);
    console.log(`正在上传到 ${MEDIA_HOSTS[type]}：${path.basename(localPath)}`);
    const permanentUrl = uploadMedia(localPath, type);
    for (const reference of references) replacements.push({ ...reference, text: reference.angled ? `<${permanentUrl}>` : permanentUrl });
  }
  let result = markdown;
  for (const { start, end, text } of replacements.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return result;
}

function convertEnhancedMarkdown(markdown) {
  const maskedLines = maskCode(markdown).split('\n');
  const wrappers = [];
  let converted = markdown.split('\n').map((line, index) => {
    const visible = maskedLines[index];
    const opening = visible.match(/^[ \t]*<(callout|columns|column|synced_block|synced_block_reference)\b[^>]*>\s*$/i);
    const closing = visible.match(/^[ \t]*<\/(callout|columns|column|synced_block|synced_block_reference)>\s*$/i);
    if (opening) { wrappers.push(opening[1].toLowerCase()); return ''; }
    if (closing && wrappers.at(-1) === closing[1].toLowerCase()) { wrappers.pop(); return ''; }
    // Tabs belonging to removed wrappers must not become indented code blocks.
    return line.replace(new RegExp(`^\\t{0,${wrappers.length}}`), '');
  }).join('\n');
  const visible = maskCode(converted);
  const replacements = [];
  const add = (match, text) => {
    const start = match.index;
    const end = start + match[0].length;
    if (!replacements.some((item) => start < item.end && end > item.start)) replacements.push({ start, end, text });
  };
  for (const match of visible.matchAll(/<(file|pdf|page|database|mention-[\w-]+)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi)) {
    const original = converted.slice(match.index, match.index + match[0].length)
      .match(/^<([\w-]+)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)$/i);
    const attributes = match[2];
    const url = attributes.match(/\b(?:src|url)\s*=\s*(["'])(.*?)\1/i)?.[2];
    const date = attributes.match(/\bstart\s*=\s*(["'])(.*?)\1/i)?.[2];
    const label = original?.[3]?.trim() || date || match[1];
    add(match, url && /^https?:\/\//i.test(url) ? `[${label}](<${url}>)` : label);
  }
  for (const match of visible.matchAll(/<unknown\b([^>]*?)\/>/gi)) {
    const url = match[1].match(/\burl\s*=\s*(["'])(.*?)\1/i)?.[2];
    const label = match[1].match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2] || 'Notion 未导入区块';
    add(match, url && /^https?:\/\//i.test(url) ? `[${label}](<${url}>)` : label);
  }
  for (const match of visible.matchAll(/<(audio|video)\b[^>]*>/gi)) {
    if (!/\bcontrols(?:\s|=|>)/i.test(match[0])) add(match, match[0].replace(/>$/, ' controls>'));
  }
  for (const match of visible.matchAll(/<span\b[^>]*\bunderline\s*=\s*(["'])true\1[^>]*>/gi)) {
    add(match, match[0].replace(/>$/, ' style="text-decoration: underline">'));
  }
  for (const match of visible.matchAll(/<empty-block\s*\/>|<table_of_contents\b[^>]*\/>|[ \t]+\{(?:(?:color|toggle)="[^"]*"\s*)+\}/gi)) add(match, '');
  // Attribute-list colors are not Markdown syntax on the blog; preserve the text.
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    converted = converted.slice(0, replacement.start) + replacement.text + converted.slice(replacement.end);
  }
  return converted;
}

async function validateImporterOptions(options) {
  for (const field of REQUIRED_IMPORTER_FIELDS) {
    if (typeof options.get(field) !== 'string' || !options.get(field).trim()) throw new Error(`--${field.replaceAll('_', '-')} 不能为空`);
  }
  for (const field of ['published_at', 'updated_at']) {
    if (!options.has(field)) continue;
    const value = options.get(field);
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
      throw new Error(`${field} 必须是有效的 YYYY-MM-DD 日期`);
    }
  }
  if (options.has('draft')) parseBoolean(options.get('draft'), 'draft');
  if (!new Set(['article', 'series', 'project', 'note']).has(options.get('type') ?? 'article')) throw new Error('type 必须是 article、series、project 或 note');
  if (options.has('order') && (!/^\d+$/.test(options.get('order')) || !Number.isSafeInteger(Number(options.get('order'))) || Number(options.get('order')) < 1)) {
    throw new Error('order 必须是大于 0 的安全整数');
  }
  const fileName = options.get('file_name').replace(/\.md$/i, '');
  if (!fileName || fileName === '.' || fileName === '..' || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(fileName)
    || /[ .]$/.test(fileName) || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(fileName)) {
    throw new Error('file_name 必须是安全的文件名，不能包含路径、控制字符或 Windows 保留名称');
  }
  let directory = process.cwd();
  for (const segment of ['src', 'content', 'blogs', options.get('category')]) {
    directory = path.join(directory, segment);
    try {
      const info = await lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`目标目录不是普通目录：${directory}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const destination = path.join(directory, `${fileName}.md`);
  try {
    const info = await lstat(destination);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`目标不是普通文件：${destination}`);
    if (!parseBoolean(options.get('force') ?? false, 'force')) throw new Error(`目标文件已经存在：${destination}（如需覆盖请添加 --force）`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
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
  if (notion.proxy !== undefined && notion.noProxy) throw new Error('--proxy 和 --no-proxy 不能同时使用');
  const missing = REQUIRED_IMPORTER_FIELDS.filter((field) => !importerOptions.get(field));
  if (missing.length) {
    throw new Error(`缺少必填参数：${missing.map((field) => `--${field.replaceAll('_', '-')}`).join(', ')}`);
  }
  if (!VALID_CATEGORIES.has(importerOptions.get('category'))) {
    throw new Error(`category 必须是：${[...VALID_CATEGORIES].join(', ')}`);
  }
  await validateImporterOptions(importerOptions);

  const token = process.env[notion.tokenEnv];
  if (!token) {
    throw new Error(`环境变量 ${notion.tokenEnv} 未设置。PowerShell 示例：$env:${notion.tokenEnv} = "ntn_xxx"`);
  }

  const proxy = await resolveProxy(notion);
  if (proxy) {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (!(major >= 24 || (major === 22 && minor >= 21))) throw new Error('代理功能需要 Node.js 24+ 或 22.21+');
  }
  const directNeedsRestart = notion.noProxy && process.env.NODE_USE_ENV_PROXY === '1';
  // Normalize both uppercase and lowercase variables in a fresh fetch runtime.
  if ((proxy || directNeedsRestart) && process.env.NOTION_IMPORTER_PROXY_BOOTSTRAPPED !== '1') {
    if (proxy) {
      console.log(`正在通过代理连接 Notion：${displayProxy(proxy)}`);
    }
    relaunchWithProxy(proxy);
    return;
  }

  const pageId = extractPageId(notion.page);
  console.log(`正在读取 Notion 页面：${pageId}`);
  const response = await retrieveCompleteMarkdown(pageId, token, notion.includeTranscript);
  if (response.incomplete && !notion.allowIncomplete) {
    throw new Error('Notion 页面内容不完整：截断子区块无法恢复或缺少权限；确认页面权限后重试，或使用 --allow-incomplete 强制导入');
  }
  if (response.incomplete) {
    console.warn('警告：继续导入不完整页面，部分子区块无法恢复或没有权限。');
  } else if (/<unknown\b/i.test(maskCode(response.markdown))) {
    console.warn('警告：页面包含 Notion Markdown API 尚不支持的 <unknown> 区块。');
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'kielas-notion-importer-'));
  try {
    const mediaDirectory = path.join(temporaryDirectory, 'media');
    await mkdir(mediaDirectory, { recursive: true });
    const skipImages = parseBoolean(importerOptions.get('skip_images') ?? false, 'skip-images');
    const mirrored = await mirrorRemoteMedia(response.markdown, mediaDirectory, skipImages);

    if (/<(?:file|pdf)\b[^>]*?\bsrc\s*=\s*["']https?:\/\//i.test(maskCode(mirrored))) {
      console.warn('警告：页面包含 file/PDF；media-uploader 没有对应类型，其 Notion 临时 URL 可能会失效。');
    }

    const sourcePath = path.join(temporaryDirectory, 'notion-page.md');
    // Enhanced Markdown is body text, not YAML: a leading divider must never be stripped as frontmatter.
    await writeFile(sourcePath, `\n${convertEnhancedMarkdown(mirrored)}`, 'utf8');
    runMarkdownImporter(forwarded, sourcePath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Notion 导入失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
