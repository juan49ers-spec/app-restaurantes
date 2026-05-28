import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextDevDir = resolve(rootDir, '.next', 'dev');
const minProcessMaxListeners = 50;
const listenerLimitScript = resolve(rootDir, 'scripts', 'set-process-listener-limit.cjs');
const nextBin = resolve(
  rootDir,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
);

if (process.getMaxListeners() < minProcessMaxListeners) {
  process.setMaxListeners(minProcessMaxListeners);
}

rmSync(nextDevDir, { force: true, recursive: true });

const child = spawn(process.execPath, ['--require', listenerLimitScript, nextBin, 'build'], {
  cwd: rootDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
