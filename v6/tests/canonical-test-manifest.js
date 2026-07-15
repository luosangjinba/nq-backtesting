export const TEST_ENVIRONMENTS = Object.freeze([
  'node',
  'browser-local',
  'browser-service',
]);

export const TEST_ROLES = Object.freeze([
  'gate',
  'quarantine',
]);

export const CANONICAL_TEST_MANIFEST = Object.freeze({
  coverage: 'foundation-selection',
  schemaVersion: 1,
  suites: Object.freeze([
    Object.freeze({
      environment: 'node',
      id: 'architecture-boundary',
      role: 'gate',
      scripts: Object.freeze([
        'v6/tests/boundary-smoke.js',
        'v6/tests/static-architecture-audit-step394.js',
      ]),
    }),
    Object.freeze({
      environment: 'node',
      id: 'chart-engine-core',
      role: 'gate',
      scripts: Object.freeze([
        'v6/tests/chart-engine-adapter-smoke.js',
        'v6/tests/time-axis-scaffold-smoke.js',
        'v6/tests/time-axis-scaffold-series-contract-smoke.js',
        'v6/tests/time-axis-scaffold-incremental-performance-smoke.js',
      ]),
    }),
    Object.freeze({
      environment: 'browser-local',
      id: 'chart-engine-browser',
      role: 'gate',
      scripts: Object.freeze([
        'v6/tests/time-axis-scaffold-browser-smoke.js',
        'v6/tests/chart-drag-release-lifecycle-browser-smoke.js',
        'v6/tests/multi-pane-replay-append-browser-step156-smoke.js',
        'v6/tests/visible-latency-cache-hit-browser-smoke.js',
        'v6/tests/mixed-timeframe-visible-latency-browser-smoke.js',
        'v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js',
        'v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js',
      ]),
    }),
    Object.freeze({
      environment: 'browser-local',
      id: 'historical-assertion-review',
      reason: 'Couples Manual Next latency to a non-deterministic older-window append.',
      role: 'quarantine',
      scripts: Object.freeze([
        'v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js',
      ]),
    }),
  ]),
});
