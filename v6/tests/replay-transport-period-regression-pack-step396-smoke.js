import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/playback-period-browser-smoke.js',
  'v6/tests/replay-transport-regression-pack-step395-smoke.js',
]);

function runTest(script) {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve({
      code,
      durationMs: Math.round(performance.now() - startedAt),
      script,
    }));
  });
}

const startedAt = performance.now();
for (const script of TESTS) {
  console.log(`[replay-transport-period-pack] start ${script}`);
  const result = await runTest(script);
  if (result.code !== 0) process.exit(result.code || 1);
  console.log(`[replay-transport-period-pack] pass ${script} ${result.durationMs}ms`);
}
console.log(`[replay-transport-period-pack] passed ${TESTS.length}/${TESTS.length} in ${Math.round(performance.now() - startedAt)}ms`);
