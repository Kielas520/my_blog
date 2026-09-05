import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function resolvePackage() {
  const home = homedir();
  const roots = process.platform === 'win32'
    ? [join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'picgo')]
    : process.platform === 'darwin'
      ? [join(home, 'Library/Application Support/picgo'), join(home, '.config/picgo'), join(home, '.picgo')]
      : [join(home, '.config/picgo'), join(home, '.picgo')];
  for (const root of roots) {
    const packageJson = join(root, 'node_modules/@aws-sdk/client-s3/package.json');
    if (existsSync(packageJson)) return packageJson;
  }
  throw new Error('找不到 @aws-sdk/client-s3，请先运行 npm run setup:picgo');

}
const requireFromPicgo = createRequire(resolvePackage());
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = requireFromPicgo('@aws-sdk/client-s3');
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('R2_ENDPOINT、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 必须同时设置');
const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
const bucket = 'kielas-blog-assets';
const response = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: '2026/09/' }));
const keys = (response.Contents ?? []).map((item) => item.Key).filter((key) => key && (key.includes('kielasovo-r2-smoke') || key.endsWith('/kiana.jpg')));
if (keys.length) await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
console.log(keys.length ? `已删除 R2 测试对象：${keys.join(', ')}` : '没有找到需要删除的 R2 测试对象');
