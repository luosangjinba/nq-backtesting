import { spawn } from 'node:child_process';

const commands = [
  ['node', ['v5/tests/runtime-smoke.js']],
  ['node', ['v5/tests/session-model-smoke.js']],
  ['node', ['v5/tests/default-workspace-smoke.js']],
  ['node', ['v5/tests/session-repository-smoke.js']],
  ['node', ['v5/tests/session-runtime-smoke.js']],
  ['node', ['v5/tests/session-persistence-smoke.js']],
  ['node', ['v5/tests/session-setup-model-smoke.js']],
  ['node', ['v5/tests/boundary-smoke.js']],
  ['node', ['v5/tests/app-shell-browser-smoke.js']],
  ['node', ['v5/tests/session-setup-browser-smoke.js']],
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code || 0));
  });
}

let failures = 0;
for (const [command, args] of commands) {
  const code = await run(command, args);
  if (code !== 0) {
    failures += 1;
  }
}

if (failures) {
  console.error(`v5 smoke failed: ${failures} command(s) failed`);
  process.exit(1);
}

console.log('v5 smoke passed');
