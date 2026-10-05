import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

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
async function main() {
  const { values } = parseArgs({
    options: {
      bucket: { type: 'string', default: 'kielas-blog-assets' },
      prefix: { type: 'string', default: '' },
      delete: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log('用法：npm run cleanup:r2-test -- [--bucket NAME] [--prefix PATH] [--delete]\n默认仅列出名称以 kielasovo-r2-smoke 开头的测试对象；--delete 才执行删除。');
    return;
  }
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('R2_ENDPOINT、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 必须同时设置');
  const requireFromPicgo = createRequire(resolvePackage());
  const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = requireFromPicgo('@aws-sdk/client-s3');
  const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
  try {
    let token;
    let count = 0;
    do {
      const response = await client.send(new ListObjectsV2Command({ Bucket: values.bucket, Prefix: values.prefix, ContinuationToken: token }));
      const keys = (response.Contents ?? []).map((item) => item.Key).filter((key) => key?.split('/').at(-1).startsWith('kielasovo-r2-smoke'));
      if (keys.length && values.delete) {
        const result = await client.send(new DeleteObjectsCommand({ Bucket: values.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
        if (result.Errors?.length) throw new Error(`部分对象删除失败：${result.Errors.map((item) => `${item.Key}: ${item.Code}`).join(', ')}`);
      }
      for (const key of keys) console.log(`${values.delete ? '已删除' : '待删除'}：${key}`);
      count += keys.length;
      token = response.IsTruncated ? response.NextContinuationToken : undefined;
      if (response.IsTruncated && !token) throw new Error('R2 返回截断列表但缺少分页令牌');
    } while (token);
    console.log(count ? `${values.delete ? '已删除' : '找到'} ${count} 个测试对象${values.delete ? '' : '（仅预览，添加 --delete 执行）'}` : '没有找到需要删除的 R2 测试对象');
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error(`清理失败：${error.message}`);
  process.exitCode = 1;
});
