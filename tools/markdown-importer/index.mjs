#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BLOGS_ROOT = path.resolve(process.cwd(), 'src', 'content', 'blogs');
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
    if (key === 'help' || key === 'force') {
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

  let body = args.content ?? '';
  if (args.source) body = stripFrontmatter(await readFile(path.resolve(args.source), 'utf8'));
  body = body.trim();

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

  const categoryDirectory = path.join(BLOGS_ROOT, args.category);
  const destination = path.join(categoryDirectory, `${fileName}.md`);
  if (!args.force && await exists(destination)) {
    throw new Error(`目标文件已经存在：${path.relative(process.cwd(), destination)}（如需覆盖请添加 --force）`);
  }

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
