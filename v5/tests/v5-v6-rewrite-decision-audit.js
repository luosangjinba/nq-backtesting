import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function lineMatches(relativePath, pattern) {
  return read(relativePath)
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, lineNumber }) => ({
      file: relativePath,
      line: lineNumber,
      text: line.trim(),
    }));
}

function countMatches(relativePath, pattern) {
  return lineMatches(relativePath, pattern).length;
}

const blockers = [];
const cleanup = [];
const accepted = [];

function addFindings(bucket, severity, label, findings) {
  if (!findings.length) return;
  bucket.push({
    severity,
    label,
    findings,
  });
}

const coreDisplayFiles = [
  'v5/src/runtime/chart-runtime.js',
  'v5/src/runtime/chart-runtime-pane-state.js',
  'v5/src/runtime/replay-chart-sync.js',
  'v5/src/runtime/replay-display-window-controller.js',
  'v5/src/runtime/replay-pane-display-window-state.js',
  'v5/src/runtime/replay-navigation-controller.js',
  'v5/src/features/chart-replay/chart-replay-pane-display-coordinator.js',
  'v5/src/features/chart-replay/chart-replay-pane-projection.js',
];

const forbiddenCorePatterns = [
  {
    label: 'old split chart display state',
    pattern: /paneDisplayStateByPaneId|primaryState|statefulLoad|primaryFullDisplayBars/,
  },
  {
    label: 'primary-special fanout/display branch',
    pattern: /paneId\s*={2,3}\s*['"]primary['"]|targetPaneId\s*={2,3}\s*['"]primary['"]/,
  },
  {
    label: 'non-primary-only display path',
    pattern: /ensureNonPrimaryPaneDisplays|non-primary|NonPrimary/,
  },
];

for (const { label, pattern } of forbiddenCorePatterns) {
  const findings = coreDisplayFiles.flatMap((file) => lineMatches(file, pattern));
  addFindings(blockers, 'blocker', label, findings);
}

const directOwnershipPatterns = [
  {
    label: 'feature or route direct chart engine creation',
    files: ['v5/src/features/chart-replay/chart-replay-route.js'],
    pattern: /createChartEngineAdapter|createChart\(|addCandlestickSeries|series\.setData|series\.update/,
  },
  {
    label: 'feature or route direct bars API request',
    files: [
      'v5/src/features/chart-replay/chart-replay-route.js',
      'v5/src/features/chart-replay/chart-replay-pane-orchestrator.js',
      'v5/src/features/chart-replay/chart-replay-pane-display-coordinator.js',
    ],
    pattern: /\/v4\/bars|fetch\(/,
  },
];

for (const { label, files, pattern } of directOwnershipPatterns) {
  const findings = files.flatMap((file) => lineMatches(file, pattern));
  addFindings(blockers, 'blocker', label, findings);
}

const cleanupPatterns = [
  {
    label: 'bootstrap/prefix still target default pane explicitly',
    files: [
      'v5/src/runtime/replay-bootstrap-controller.js',
      'v5/src/runtime/replay-prefix-controller.js',
    ],
    pattern: /paneId:\s*['"]primary['"]/,
  },
  {
    label: 'route/orchestrator still mirrors default-pane replay display timeframe',
    files: [
      'v5/src/features/chart-replay/chart-replay-route.js',
      'v5/src/features/chart-replay/chart-replay-pane-orchestrator.js',
    ],
    pattern: /replayDisplayTimeframe|setReplayDisplayTimeframe|getReplayDisplayTimeframe/,
  },
  {
    label: 'tests still encode old primary display ownership wording',
    files: [
      'v5/tests/chart-replay-pane-display-coordinator-smoke.js',
    ],
    pattern: /primary display setup is owned by the main replay path|primary pane must not enqueue pane-local display setup|non-primary panes should default/,
  },
];

for (const { label, files, pattern } of cleanupPatterns) {
  const findings = files.flatMap((file) => lineMatches(file, pattern));
  addFindings(cleanup, 'cleanup', label, findings);
}

const acceptedPatterns = [
  {
    label: 'default pane id contract',
    file: 'v5/src/contracts/layout-contracts.js',
    pattern: /DEFAULT_ACTIVE_PANE_ID|primary/,
  },
  {
    label: 'layout DOM compatibility names',
    file: 'v5/src/features/chart-replay/chart-replay-pane-dom.js',
    pattern: /primary/,
  },
  {
    label: 'pane shell default-pane DOM compatibility',
    file: 'v5/src/features/chart-replay/chart-replay-pane-shell.js',
    pattern: /primary|DEFAULT_ACTIVE_PANE_ID/,
  },
  {
    label: 'split resize ratio key compatibility',
    file: 'v5/src/features/chart-replay/chart-replay-split-resize-controller.js',
    pattern: /primary/,
  },
];

for (const { label, file, pattern } of acceptedPatterns) {
  accepted.push({
    severity: 'accepted',
    label,
    count: countMatches(file, pattern),
    file,
  });
}

const recommendation = blockers.length
  ? 'open-v6'
  : cleanup.length
    ? 'continue-v5-with-cleanup'
    : 'continue-v5';

const report = {
  recommendation,
  blockers,
  cleanup,
  accepted,
};

assert.equal(
  blockers.length,
  0,
  `V6 rewrite blockers found: ${JSON.stringify(report, null, 2)}`
);

console.log(JSON.stringify(report, null, 2));
console.log('v5 v6 rewrite decision audit passed');
