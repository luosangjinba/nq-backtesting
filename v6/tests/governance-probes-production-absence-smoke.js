import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const moved = [
  ['v6/src/chart-history/high-timeframe-target-history-runtime-optimization-probe.js', 'v6/tests/governance/helpers/chart-history/high-timeframe-target-history-runtime-optimization-probe.js'],
  ['v6/src/replay/display-timeframe-target-materialization-readiness-audit.js', 'v6/tests/governance/helpers/replay/display-timeframe-target-materialization-readiness-audit.js'],
  ['v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js', 'v6/tests/governance/helpers/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js'],
];

for (const [productionPath, governancePath] of moved) {
  await assert.rejects(access(productionPath));
  await access(governancePath);
}

const app = await readFile('v6/src/app.js', 'utf8');
const manifest = await readFile('v6/src/runtime/core-runtime-manifest.js', 'utf8');
for (const [, governancePath] of moved) {
  const name = governancePath.split('/').at(-1).replace('.js', '');
  assert.doesNotMatch(app, new RegExp(name));
  assert.doesNotMatch(manifest, new RegExp(name));
}

console.log('v6 governance probes production absence smoke passed');
