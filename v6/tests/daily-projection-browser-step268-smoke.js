import {
  runSessionAwareProjectionBrowserSmoke,
  ts,
} from './helpers/session-aware-projection-browser-fixture.js';

await runSessionAwareProjectionBrowserSmoke({
  bars: [
    { open: 100, high: 105, low: 99, close: 104, timestamp: ts('2026-05-31T18:00:00Z') },
    { open: 104, high: 110, low: 103, close: 108, timestamp: ts('2026-06-01T17:59:00Z') },
    { open: 200, high: 205, low: 198, close: 204, timestamp: ts('2026-06-01T18:00:00Z') },
    { open: 204, high: 210, low: 203, close: 208, timestamp: ts('2026-06-02T17:59:00Z') },
  ],
  expectedBars: [
    { close: 108, high: 110, low: 99, open: 100, timestamp: ts('2026-05-31T18:00:00Z') },
    { close: 208, high: 210, low: 198, open: 200, timestamp: ts('2026-06-01T18:00:00Z') },
  ],
  expectedBucketKeys: ['2026-06-01', '2026-06-02'],
  targetTimeframe: '1D',
});

console.log('v6 daily projection browser step268 smoke passed');
