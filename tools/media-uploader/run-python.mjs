import { spawnSync } from 'node:child_process';

const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
const script = process.argv[2];
const args = process.argv.slice(3);

for (const executable of candidates) {
  const result = spawnSync(executable, [script, ...args], { stdio: 'inherit' });
  if (!result.error) process.exit(result.status ?? 1);
  if (result.error.code !== 'ENOENT') {
    console.error(`无法运行 ${executable}: ${result.error.message}`);
    process.exit(1);
  }
}

console.error('找不到 Python。macOS/Linux 请安装 python3，Windows 请安装 Python 并启用 PATH。');
process.exit(1);
