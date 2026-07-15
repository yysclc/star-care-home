import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const children = [];
let stopping = false;

function start(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`${label} stopped unexpectedly (${reason}).`);
    stop(code || 1);
  });
  return child;
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 150).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

start('Parent AI service', ['./parent-ai-sandbox/server.mjs']);
start('Game dev server', ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);

