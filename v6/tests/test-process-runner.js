import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

export function runTestScript(entry, { stdio = 'inherit' } = {}) {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry.script], {
      cwd: process.cwd(),
      env: process.env,
      stdio,
    });
    child.on('close', (code, signal) => resolve({
      ...entry,
      code,
      durationMs: Math.round(performance.now() - startedAt),
      signal,
    }));
    child.on('error', (error) => resolve({
      ...entry,
      code: 1,
      durationMs: Math.round(performance.now() - startedAt),
      error: error.message,
      signal: null,
    }));
  });
}
