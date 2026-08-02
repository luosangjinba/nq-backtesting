import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const LATENCY_HARNESS = path.join(TEST_DIR, 'replay-four-hour-latency-browser-harness.js');
const SAMPLE_COUNT = 64;

function runProfile(paneCount) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [LATENCY_HARNESS], {
      cwd: REPOSITORY_ROOT,
      env: {
        ...process.env,
        V7_REPLAY_PANE_COUNT: String(paneCount),
        V7_REPLAY_SAMPLE_COUNT: String(SAMPLE_COUNT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Pane ${paneCount} latency profile failed (${code}): ${stderr || stdout}`));
        return;
      }
      const line = stdout.trim().split('\n').at(-1);
      try {
        const report = JSON.parse(line);
        assert.equal(report.result.paneCount, paneCount);
        resolve(report.result);
      } catch (error) {
        reject(new Error(`Pane ${paneCount} latency profile returned invalid evidence: ${error.message}`));
      }
    });
  });
}

function profileViolations(profiles) {
  const violations = [];
  for (const paneCount of [1, 2, 4]) {
    const profile = profiles[paneCount];
    if (profile.cacheHitVisible.samples < 60) violations.push('insufficient-warm-samples');
    if (profile.mutationModes.length !== 1 || profile.mutationModes[0] !== 'append-replace') {
      violations.push('mutation-mode');
    }
    if (new Set(profile.finalBarCounts).size !== 1
      || profile.finalBarCounts.length !== paneCount) violations.push('pane-bar-count-divergence');
  }
  if (profiles[2].cacheHitVisible.p50Ms >= profiles[1].cacheHitVisible.p50Ms + 30) {
    violations.push('two-pane-median-growth');
  }
  if (profiles[4].cacheHitVisible.p50Ms >= profiles[1].cacheHitVisible.p50Ms + 55) {
    violations.push('four-pane-median-growth');
  }
  if (profiles[4].cacheHitVisible.p50Ms >= 100
    || profiles[4].cacheHitVisible.p95Ms >= 175) violations.push('four-pane-sustained-budget');
  if (profiles[4].cacheHitActivePaneVisible.p50Ms >= 95
    || profiles[4].cacheHitActivePaneVisible.p95Ms >= 165) {
    violations.push('active-pane-visible-budget');
  }
  if (profiles[4].adapterApply.p50Ms >= 70
    || profiles[4].adapterApply.p95Ms >= 115) violations.push('four-pane-chart-budget');
  return violations;
}

const profiles = {};
for (const paneCount of [1, 2, 4]) profiles[paneCount] = await runProfile(paneCount);
assert.deepEqual(profileViolations(profiles), [],
  `Multi-pane latency profile violated its binding budget: ${JSON.stringify(profiles)}`);

const negativeFixture = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/replay-multi-pane-latency/negative/serial-pane-growth.json',
), 'utf8'));
const negativeProfiles = structuredClone(profiles);
if (negativeFixture.operation === 'set-four-pane-added-median') {
  negativeProfiles[4].cacheHitVisible.p50Ms = profiles[1].cacheHitVisible.p50Ms
    + negativeFixture.addedMs;
} else {
  assert.fail(`Unknown Multi-pane latency negative operation: ${negativeFixture.operation}`);
}
assert.ok(profileViolations(negativeProfiles).includes(negativeFixture.expectedFailureCode),
  `${negativeFixture.name} must fail with ${negativeFixture.expectedFailureCode}`);

console.log(JSON.stringify({
  profiles,
  status: 'passed',
  suite: 'v7 Replay multi-Pane 4h latency browser',
}));
