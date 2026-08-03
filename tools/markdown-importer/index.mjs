#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const BLOGS_ROOT = path.resolve(process.cwd(), 'src', 'content', 'blogs');
const MEDIA_UPLOADER = path.resolve(process.cwd(), 'tools', 'media-uploader', 'upload.py');
const VALID_TYPES = new Set(['article', 'series', 'project', 'note']);

const help = `
Markdown Importer

用法：
  npm run import:markdown -- --title "一张纸" --description "摘要" \\
    --category dairy --published-at 2026-06-18 --file-name a-sheet \\
    --tags "忆,家庭" --type article --source ./article.md

必填参数：
  --title           文档标题
  --description     文档卡片摘要
  --category        分类目录；不存在时自动创建
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
  --force           允许覆盖已经存在的目标文件
  --help            显示帮助
`;

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replaceAll('-', '_').toLowerCase();
    if (key === 'help' || key === 'force' || key === 'skip_images' || key === 'keep_source_header') {
      result[key] = inlineValue === undefined ? true : parseBoolean(inlineValue, key);
      continue;
    }
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${rawKey} 缺少值`);
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
  if (!value || value === '.' || value === '..' || /[\\/:*?"<>|]/.test(value)) {
    throw new Error(`${field} 不能包含路径分隔符或 Windows 非法文件名字符`);
  }
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function parseTags(value) {
  if (!value) return [];
  const unwrapped = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  return unwrapped.split(',').map((tag) => tag.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean);
}

function stripFrontmatter(content) {
  return content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n)?/, '');
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
  return lines.slice(cursor).join('\n').replace(/^\s+/, '');
}

function isRemoteImage(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

function resolveImagePath(reference, sourceDirectory) {
  let localReference = reference.trim();
  if (localReference.startsWith('<') && localReference.endsWith('>')) {
    localReference = localReference.slice(1, -1);
  }
  try {
    localReference = decodeURIComponent(localReference);
  } catch {
    // Keep the original path when it contains a literal percent sign.
  }
  localReference = localReference.replace(/\\([ ()])/g, '$1');

  if (path.isAbsolute(localReference)) {
    if (/^[\\/]/.test(localReference) && !/^[a-z]:/i.test(localReference)) {
      return path.resolve(process.cwd(), 'public', localReference.replace(/^[\\/]+/, ''));
    }
    return path.resolve(localReference);
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
  const urls = result.stdout.match(/https?:\/\/image\.kielasovo\.com\/[^\s]+/g);
  if (!urls?.length) throw new Error(`图片上传工具没有返回有效 URL：${imagePath}`);
  return urls.at(-1).trim();
}

async function replaceLocalImages(markdown, sourceDirectory) {
  const replacements = new Map();
  const uploadedPaths = new Map();
  const references = [];

  const inlinePattern = /(!\[[^\]]*\]\(\s*)(<[^>]+>|[^\s)]+)(?=\s*(?:["'(]|\)))/g;
  for (const match of markdown.matchAll(inlinePattern)) references.push(match[2]);

  const htmlPattern = /<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  for (const match of markdown.matchAll(htmlPattern)) references.push(match[2]);

  const referenceIds = new Set();
  for (const match of markdown.matchAll(/!\[[^\]]*\]\[([^\]]+)\]/g)) referenceIds.add(match[1].trim().toLowerCase());
  const definitionPattern = /^([ \t]{0,3})\[([^\]]+)\]:\s*(<[^>]+>|\S+)(.*)$/gm;
  for (const match of markdown.matchAll(definitionPattern)) {
    if (referenceIds.has(match[2].trim().toLowerCase())) references.push(match[3]);
  }

  const localImages = [];
  for (const reference of [...new Set(references)]) {
    const cleanReference = reference.startsWith('<') && reference.endsWith('>')
      ? reference.slice(1, -1)
      : reference;
    if (isRemoteImage(cleanReference)) continue;
    const imagePath = resolveImagePath(reference, sourceDirectory);
    if (!await exists(imagePath)) throw new Error(`Markdown 引用的本地图片不存在：${imagePath}`);
    localImages.push({ reference, imagePath });
  }

  for (const { reference, imagePath } of localImages) {
    const pathKey = imagePath.toLowerCase();
    if (uploadedPaths.has(pathKey)) {
      replacements.set(reference, uploadedPaths.get(pathKey));
      continue;
    }
    console.log(`正在上传图片：${imagePath}`);
    const url = uploadImage(imagePath);
    uploadedPaths.set(pathKey, url);
    replacements.set(reference, url);
  }

  if (replacements.size === 0) return markdown;
  return markdown
    .replace(inlinePattern, (_match, prefix, reference) => `${prefix}${replacements.get(reference) ?? reference}`)
    .replace(htmlPattern, (match, quote, reference) => match.replace(`${quote}${reference}${quote}`, `${quote}${replacements.get(reference) ?? reference}${quote}`))
    .replace(definitionPattern, (match, indent, id, reference, suffix) => {
      const replacement = replacements.get(reference);
      return replacement ? `${indent}[${id}]: ${replacement}${suffix}` : match;
    });
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help.trim());
    return;
  }

  const required = ['title', 'description', 'category', 'published_at', 'file_name'];
  const missing = required.filter((field) => !args[field]);
  if (missing.length) throw new Error(`缺少必填参数：${missing.map((field) => `--${field.replaceAll('_', '-')}`).join(', ')}`);

  validateSegment(args.category, 'category');
  let fileName = args.file_name.endsWith('.md') ? args.file_name.slice(0, -3) : args.file_name;
  validateSegment(fileName, 'file_name');
  validateDate(args.published_at, 'publishedAt');
  if (args.updated_at) validateDate(args.updated_at, 'updatedAt');

  const type = args.type ?? 'article';
  if (!VALID_TYPES.has(type)) throw new Error(`type 必须是：${[...VALID_TYPES].join(', ')}`);
  const draft = parseBoolean(args.draft ?? false, 'draft');
  const tags = parseTags(args.tags);

  if (args.order !== undefined && (!/^\d+$/.test(args.order) || Number(args.order) < 1)) {
    throw new Error('order 必须是大于 0 的整数');
  }
  if (args.source && args.content !== undefined) throw new Error('--source 和 --content 只能使用其中一个');

  const categoryDirectory = path.join(BLOGS_ROOT, args.category);
  const destination = path.join(categoryDirectory, `${fileName}.md`);
  if (!args.force && await exists(destination)) {
    throw new Error(`目标文件已经存在：${path.relative(process.cwd(), destination)}（如需覆盖请添加 --force）`);
  }

  let body = args.content ?? '';
  const sourcePath = args.source ? path.resolve(args.source) : undefined;
  if (sourcePath) {
    body = stripFrontmatter(await readFile(sourcePath, 'utf8'));
    if (!args.keep_source_header) body = stripNotionHeader(body);
  }
  body = body.trim();
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
  if (args.updated_at) fields.push(`updatedAt: ${args.updated_at}`);
  fields.push(`draft: ${draft}`);
  fields.push(`tags: [${tags.map(yamlString).join(', ')}]`);
  fields.push(`type: ${type}`);
  if (args.series) fields.push(`series: ${yamlString(args.series)}`);
  if (args.order !== undefined) fields.push(`order: ${Number(args.order)}`);

  await mkdir(categoryDirectory, { recursive: true });
  const markdown = `---\n${fields.join('\n')}\n---\n${body ? `\n${body}\n` : '\n'}`;
  await writeFile(destination, markdown, 'utf8');
  console.log(`已创建：${path.relative(process.cwd(), destination)}`);
  console.log(`页面路径：/blogs/${args.category}/${fileName}`);
}

main().catch((error) => {
  console.error(`导入失败：${error.message}`);
  process.exitCode = 1;
});
