#!/usr/bin/env node

import { link, lstat, mkdir, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const BLOGS_ROOT = path.resolve(process.cwd(), 'src', 'content', 'blogs');
const MEDIA_UPLOADER = fileURLToPath(new URL('../media-uploader/upload.py', import.meta.url));
// Resolve parsers through their declared owners, including non-hoisted installs.
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const { load: loadYaml, FAILSAFE_SCHEMA } = astroRequire('js-yaml');
const VALID_CATEGORIES = new Set(['journal', 'notes']);
const VALID_TYPES = new Set(['article', 'series', 'project', 'note']);

const help = `
Markdown Importer

用法：
  npm run import:markdown -- --title "一张纸" --description "摘要" \\
    --category journal --published-at 2026-06-18 --file-name a-sheet \\
    --tags "忆,家庭" --type article --source ./article.md

必填参数：
  --title           文档标题
  --description     文档卡片摘要
  --category        journal（日志）或 notes（技术与实用笔记）
  --published-at    发布日期，格式 YYYY-MM-DD
  --file-name       Markdown 文件名，可省略 .md

可选参数：
  --draft           true 或 false，默认 false
  --tags            逗号分隔的标签，默认空数组
  --type            article、series、project 或 note，默认 article
  --updated-at      更新日期，格式 YYYY-MM-DD
  --series          系列名称
  --order           系列顺序，整数
  --source          正文来源文件；会移除来源文件已有的 frontmatter
  --content         直接传入 Markdown 正文
  --keep-source-header  保留 Notion 导出的标题、DATE 和 TAG 头部
  --skip-images     不上传和替换正文中的本地图片
  --force           允许覆盖已经存在的目标文件，并保留已有 slug
  --help            显示帮助

说明：
  新文章写入 src/content/blogs/<category>/<file-name>.md。
  目录与分类对齐；已有文章通过 frontmatter slug 保留发布地址，移动文件时保持 slug 不变。
`;

function parseArgs(argv) {
  const result = Object.create(null);
  const flags = new Set(['help', 'force', 'skip_images', 'keep_source_header']);
  const values = new Set([
    'title', 'description', 'category', 'published_at', 'file_name',
    'draft', 'tags', 'type', 'updated_at', 'series', 'order', 'source', 'content',
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const separator = token.indexOf('=');
    const rawKey = token.slice(2, separator === -1 ? undefined : separator);
    const inlineValue = separator === -1 ? undefined : token.slice(separator + 1);
    const key = rawKey.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replaceAll('-', '_').toLowerCase();
    if (!flags.has(key) && !values.has(key)) throw new Error(`未知参数：--${rawKey}`);
    if (Object.hasOwn(result, key)) throw new Error(`参数不能重复：--${rawKey}`);
    if (flags.has(key)) {
      const next = argv[index + 1];
      const value = inlineValue ?? (next === 'true' || next === 'false' ? argv[++index] : true);
      result[key] = parseBoolean(value, key);
      continue;
    }
    const value = inlineValue ?? argv[++index];
    if (value === undefined || (inlineValue === undefined && value.startsWith('--'))) {
      throw new Error(`参数 --${rawKey} 缺少值（以 -- 开头的值请使用 --${rawKey}=值）`);
    }
    result[key] = value;
  }
  return result;
}

function parseBoolean(value, field) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${field} 必须是 true 或 false`);
}

function validateDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} 必须使用 YYYY-MM-DD 格式`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} 不是有效日期`);
  }
}

function validateSegment(value, field) {
  if (!value || value === '.' || value === '..' || /[\\/:*?"<>|\u0000-\u001f\u007f]/.test(value)
    || /[ .]$/.test(value) || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(value)) {
    throw new Error(`${field} 必须是合法的单个文件名，不能使用路径、控制字符、尾部空格/点或 Windows 保留名称`);
  }
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function parseTags(value) {
  if (!value) return [];
  if (value.trim().startsWith('[')) {
    const tags = loadYaml(value, { schema: FAILSAFE_SCHEMA });
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
      throw new Error('tags 数组只能包含字符串');
    }
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }
  return value.split(',').map((tag) => tag.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean);
}

function extractFrontmatter(content) {
  const normalized = content.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m);
  // Only byte-zero delimiters denote a header, not a later thematic break.
  if (!match || match.index !== 0) return { content: normalized };
  return { header: match[1], content: normalized.slice(match[0].length) };
}

function stripNotionHeader(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  let headingIndex = 0;
  while (headingIndex < lines.length && lines[headingIndex].trim() === '') headingIndex += 1;
  if (!/^#\s+\S/.test(lines[headingIndex] ?? '')) return content;

  const metadataPattern = /^(?:DATE|TAG|日期|标签)\s*[:：]\s*.+$/i;
  let cursor = headingIndex + 1;
  let metadataCount = 0;
  while (cursor < lines.length) {
    const line = lines[cursor].trim();
    if (line === '') {
      cursor += 1;
      continue;
    }
    if (metadataPattern.test(line)) {
      metadataCount += 1;
      cursor += 1;
      continue;
    }
    break;
  }

  // A standalone H1 is normal Markdown. Only remove it when Notion-style
  // metadata is also present immediately below it.
  if (metadataCount === 0) return content;
  return lines.slice(cursor).join('\n').replace(/^(?:[ \t]*\n)+/, '');
}

function isRemoteImage(reference) {
  if (/^[a-z]:[\\/]/i.test(reference)) return false;
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

function resolveImagePath(reference, sourceDirectory) {
  // URL query/fragment suffixes are not part of a filesystem name. Encoded
  // question marks and hashes remain part of the name after decoding.
  let localReference = reference.split(/[?#]/, 1)[0];
  try {
    localReference = decodeURIComponent(localReference);
  } catch {
    // Literal percent signs in exported filenames are valid.
  }
  if (/^[\\/](?![\\/])/.test(localReference)) {
    const publicRoot = path.resolve(process.cwd(), 'public');
    const resolved = path.resolve(publicRoot, localReference.slice(1));
    const relative = path.relative(publicRoot, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`站点图片路径不能越出 public 目录：${reference}`);
    }
    return resolved;
  }
  return path.resolve(sourceDirectory, localReference);
}

function uploadImage(imagePath) {
  const python = process.env.PYTHON || 'python';
  const result = spawnSync(python, [MEDIA_UPLOADER, '--type', 'image', '--source', imagePath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw new Error(`无法启动图片上传工具：${result.error.message}`);
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`图片上传失败：${imagePath}${details ? `\n${details}` : ''}`);
  }
  const candidates = result.stdout.match(/https?:\/\/[^\s\]\["'<>]+/g) ?? [];
  const url = candidates.map((item) => item.replace(/[.,;)]$/, '')).filter((item) => {
    try {
      return new URL(item).hostname === 'image.kielasovo.com';
    } catch {
      return false;
    }
  }).at(-1);
  if (!url) throw new Error(`图片上传工具没有返回有效 URL：${imagePath}`);
  return url;
}

function destinationSpan(raw, definition = false) {
  let cursor = definition ? raw.indexOf('[') + 1 : 2;
  let depth = 1;
  for (; cursor < raw.length && depth > 0; cursor += 1) {
    if (raw[cursor] === '\\') cursor += 1;
    else if (raw[cursor] === '[') depth += 1;
    else if (raw[cursor] === ']') depth -= 1;
  }
  while (/\s/.test(raw[cursor] ?? '') && cursor < raw.length) cursor += 1;
  if (raw[cursor] !== (definition ? ':' : '(')) throw new Error('无法定位 Markdown 图片路径');
  cursor += 1;
  while (/\s/.test(raw[cursor] ?? '') && cursor < raw.length) cursor += 1;
  const start = cursor;
  const angle = raw[cursor] === '<';
  if (angle) cursor += 1;
  depth = 0;
  for (; cursor < raw.length; cursor += 1) {
    const char = raw[cursor];
    if (char === '\\') {
      cursor += 1;
      continue;
    }
    if (angle) {
      if (char === '>') return { start, end: cursor + 1 };
    } else if (char === '(') depth += 1;
    else if (char === ')' && depth > 0) depth -= 1;
    else if (char === ')' || /\s/.test(char)) break;
  }
  if (angle) throw new Error('无法定位 Markdown 图片路径');
  return { start, end: cursor };
}

async function replaceLocalImages(markdown, sourceDirectory) {
  const markdownRequire = createRequire(astroRequire.resolve('@astrojs/markdown-satteri'));
  const htmlRequire = createRequire(markdownRequire.resolve('hast-util-from-html'));
  const [{ markdownToMdast }, { parseFragment }] = await Promise.all([
    import(pathToFileURL(markdownRequire.resolve('satteri')).href),
    import(pathToFileURL(htmlRequire.resolve('parse5')).href),
  ]);
  const tree = markdownToMdast(markdown, { features: { frontmatter: false } });
  const references = [];
  const definitions = new Map();
  const imageIds = new Set();
  const normalizeId = (id) => id.trim().replace(/\s+/g, ' ').toUpperCase();

  // Native source positions count Unicode scalars (some backends use UTF-8
  // bytes); replacements and parse5 positions use JavaScript UTF-16 units.
  const offsets = new Map();
  if (tree.position?.end.offset !== markdown.length) {
    const byteOffsets = tree.position?.end.offset === Buffer.byteLength(markdown);
    let nativeOffset = 0;
    let units = 0;
    for (const char of markdown) {
      offsets.set(nativeOffset, units);
      nativeOffset += byteOffsets ? Buffer.byteLength(char) : 1;
      units += char.length;
    }
    offsets.set(nativeOffset, units);
  }
  const offset = (point) => offsets.size ? offsets.get(point.offset) : point.offset;
  function addMarkdownReference(node) {
    if (!node.url || isRemoteImage(node.url)) return;
    const base = offset(node.position.start);
    const raw = markdown.slice(base, offset(node.position.end));
    const span = destinationSpan(raw, node.type === 'definition');
    references.push({ reference: node.url, start: base + span.start, end: base + span.end });
  }
  function visitHtml(node) {
    const base = offset(node.position.start);
    let end = offset(node.position.end);
    if (/^<img\b/i.test(markdown.slice(base, base + 5))) {
      // Native inline-HTML spans may stop at a '>' inside a quoted attribute.
      // Recover the actual tag boundary before delegating attribute parsing.
      let quote;
      for (let cursor = base + 4; cursor < markdown.length; cursor += 1) {
        const char = markdown[cursor];
        if (quote) {
          if (char === quote) quote = undefined;
        } else if (char === '"' || char === "'") quote = char;
        else if (char === '>') {
          end = Math.max(end, cursor + 1);
          break;
        }
      }
    }
    const raw = markdown.slice(base, end);
    const fragment = parseFragment(raw, { sourceCodeLocationInfo: true });
    function visit(element) {
      if (element.tagName === 'img') {
        const src = element.attrs.find((attribute) => attribute.name === 'src');
        const location = element.sourceCodeLocation?.attrs?.src;
        if (src?.value && location && !isRemoteImage(src.value)) {
          references.push({
            reference: src.value, start: base + location.startOffset,
            end: base + location.endOffset, html: true,
          });
        }
      }
      for (const child of element.childNodes ?? []) visit(child);
    }
    visit(fragment);
  }
  function visit(node) {
    if (node.type === 'image') addMarkdownReference(node);
    else if (node.type === 'imageReference') imageIds.add(normalizeId(node.identifier));
    else if (node.type === 'definition') {
      const id = normalizeId(node.identifier);
      if (!definitions.has(id)) definitions.set(id, node);
    } else if (node.type === 'html') visitHtml(node);
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  for (const id of imageIds) {
    const definition = definitions.get(id);
    if (definition) addMarkdownReference(definition);
  }

  // Validate every file before the first upload, including directory references.
  for (const reference of references) {
    const imagePath = resolveImagePath(reference.reference, sourceDirectory);
    let info;
    try {
      info = await stat(imagePath);
    } catch (error) {
      throw new Error(`无法读取 Markdown 本地图片：${imagePath}（${error.code ?? error.message}）`);
    }
    if (!info.isFile()) throw new Error(`Markdown 本地图片不是文件：${imagePath}`);
    reference.imagePath = await realpath(imagePath);
  }

  const uploadedPaths = new Map();
  for (const reference of references) {
    const key = process.platform === 'win32' ? reference.imagePath.toLowerCase() : reference.imagePath;
    let url = uploadedPaths.get(key);
    if (!url) {
      console.log(`正在上传图片：${reference.imagePath}`);
      url = uploadImage(reference.imagePath);
      uploadedPaths.set(key, url);
    }
    reference.replacement = reference.html
      ? `src="${url.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`
      : url;
  }
  for (const reference of references.sort((left, right) => right.start - left.start)) {
    markdown = markdown.slice(0, reference.start) + reference.replacement + markdown.slice(reference.end);
  }
  return markdown;
}

async function fileInfo(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function ensureDestinationDirectory(category) {
  let directory = process.cwd();
  for (const segment of ['src', 'content', 'blogs', category]) {
    directory = path.join(directory, segment);
    try {
      await mkdir(directory);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`目标目录不能是符号链接或非目录：${directory}`);
  }
}

async function writeMarkdown(destination, markdown, force, existingInfo) {
  const temporary = path.join(path.dirname(destination), `.markdown-import-${randomUUID()}.tmp`);
  let file;
  try {
    file = await open(temporary, 'wx', existingInfo ? existingInfo.mode & 0o777 : 0o666);
    await file.writeFile(markdown, 'utf8');
    await file.sync();
    await file.close();
    file = undefined;
    const current = await fileInfo(destination);
    if (current && (current.isSymbolicLink() || !current.isFile())) {
      throw new Error(`目标文件不能是符号链接或非普通文件：${destination}`);
    }
    if (force) await rename(temporary, destination);
    else await link(temporary, destination); // Atomic create: never overwrite a concurrent import.
  } finally {
    if (file) await file.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help.trim());
    return;
  }

  const required = ['title', 'description', 'category', 'published_at', 'file_name'];
  const missing = required.filter((field) => !args[field]?.trim());
  if (missing.length) throw new Error(`缺少必填参数：${missing.map((field) => `--${field.replaceAll('_', '-')}`).join(', ')}`);

  if (!VALID_CATEGORIES.has(args.category)) {
    throw new Error(`category 必须是：${[...VALID_CATEGORIES].join(', ')}`);
  }
  const fileName = /\.md$/i.test(args.file_name) ? args.file_name.slice(0, -3) : args.file_name;
  validateSegment(fileName, 'file_name');
  validateDate(args.published_at, 'publishedAt');
  if (args.updated_at !== undefined) validateDate(args.updated_at, 'updatedAt');

  const type = args.type ?? 'article';
  if (!VALID_TYPES.has(type)) throw new Error(`type 必须是：${[...VALID_TYPES].join(', ')}`);
  const draft = parseBoolean(args.draft ?? false, 'draft');
  const tags = parseTags(args.tags);

  if (args.order !== undefined && (!/^\d+$/.test(args.order) || !Number.isSafeInteger(Number(args.order)) || Number(args.order) < 1)) {
    throw new Error('order 必须是大于 0 的安全整数');
  }
  if (args.source !== undefined && args.content !== undefined) throw new Error('--source 和 --content 只能使用其中一个');
  if (args.source !== undefined && !args.source.trim()) throw new Error('--source 不能为空');

  const categoryDirectory = path.join(BLOGS_ROOT, args.category);
  const destination = path.join(categoryDirectory, `${fileName}.md`);
  await ensureDestinationDirectory(args.category);
  const existingInfo = await fileInfo(destination);
  if (existingInfo && (existingInfo.isSymbolicLink() || !existingInfo.isFile())) {
    throw new Error(`目标文件不能是符号链接或非普通文件：${destination}`);
  }
  if (!args.force && existingInfo) {
    throw new Error(`目标文件已经存在：${path.relative(process.cwd(), destination)}（如需覆盖请添加 --force）`);
  }
  let existingSlug;
  if (existingInfo) {
    const { header } = extractFrontmatter(await readFile(destination, 'utf8'));
    if (header !== undefined) {
      const data = loadYaml(header);
      if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
        throw new Error('已有 frontmatter 必须是 YAML 对象');
      }
      existingSlug = data?.slug;
      if (existingSlug !== undefined && typeof existingSlug !== 'string') throw new Error('已有 slug 必须是字符串');
    }
  }

  let body = args.content ?? '';
  const sourcePath = args.source ? path.resolve(args.source) : undefined;
  if (sourcePath) {
    body = extractFrontmatter(await readFile(sourcePath, 'utf8')).content;
    if (!args.keep_source_header) body = stripNotionHeader(body);
  }
  // Do not trim indentation: four leading spaces are meaningful Markdown code.
  body = body.replace(/^\uFEFF/, '').replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, '');
  if (!args.skip_images && body) {
    const sourceDirectory = sourcePath ? path.dirname(sourcePath) : process.cwd();
    body = await replaceLocalImages(body, sourceDirectory);
  }

  const fields = [
    `title: ${yamlString(args.title)}`,
    `description: ${yamlString(args.description)}`,
    `category: ${yamlString(args.category)}`,
    `publishedAt: ${args.published_at}`,
  ];
  if (existingSlug !== undefined) fields.push(`slug: ${yamlString(existingSlug)}`);
  if (args.updated_at) fields.push(`updatedAt: ${args.updated_at}`);
  fields.push(`draft: ${draft}`);
  fields.push(`tags: [${tags.map(yamlString).join(', ')}]`);
  fields.push(`type: ${type}`);
  if (args.series) fields.push(`series: ${yamlString(args.series)}`);
  if (args.order !== undefined) fields.push(`order: ${Number(args.order)}`);

  const markdown = `---\n${fields.join('\n')}\n---\n${body ? `\n${body}\n` : '\n'}`;
  await ensureDestinationDirectory(args.category);
  await writeMarkdown(destination, markdown, args.force, existingInfo);
  console.log(`已创建：${path.relative(process.cwd(), destination)}`);
  console.log(existingSlug !== undefined
    ? `永久页面 slug：${existingSlug}`
    : `永久页面路径：/blogs/${args.category}/${fileName}`);
}

main().catch((error) => {
  console.error(`导入失败：${error.message}`);
  process.exitCode = 1;
});
