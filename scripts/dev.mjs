import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function startProcess(name, color, cwd, args) {
  const child = spawn(npmCmd, args, {
    cwd,
    shell: isWin,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  child.stdout.on('data', (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    }
  });
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stderr.write(`${prefix}${line}\n`);
    }
  });

  child.on('error', (err) => {
    process.stderr.write(`${prefix}Failed to start process: ${err.message}\n`);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`${prefix}Exited with code ${code}\n`);
      process.exitCode = code;
    }
  });

  return child;
}

const serverProc = startProcess('server', '36', path.join(rootDir, 'server'), ['run', 'dev']);
const clientProc = startProcess('client', '32', path.join(rootDir, 'client'), ['run', 'dev']);

function shutdown() {
  serverProc.kill('SIGTERM');
  clientProc.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
