import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const audit = readFileSync(path.join(ROOT, 'v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md'), 'utf8');
const index = readFileSync(path.join(ROOT, 'v6/docs/INDEX.md'), 'utf8');

[
  'v6/src/shell/workstation-shell.js',
  'v6/src/styles/app.css',
  'v6/src/chart-engine/lightweight-chart-adapter.js',
  'v6/src/chart-engine/chart-host-manager.js',
  'v6/src/chart-engine/workstation-chart-surface.js',
  'v6/src/chart-engine/chart-data-surface-bridge.js',
  'v6/src/chart-engine/chart-viewport-surface-bridge.js',
  '[data-v6-chart-engine-host]',
  'data-v6-pane-id="main"',
  '[data-v6-chart-fallback]',
  '.static-chart-visual',
  '.price-scale-placeholder',
  '.time-scale-placeholder',
  'workstation-chart-host-browser-smoke.js',
  'chart-engine-browser-smoke.js',
  'multi-pane-chart-host-browser-smoke.js',
  'default-wall-replay-browser-smoke.js',
  'manual-wall-replay-browser-smoke.js',
  'visible-latency-cache-hit-browser-smoke.js',
  'workstation-chart-adapter-browser-smoke.js',
  'workstation-chart-data-bridge-browser-smoke.js',
  'workstation-chart-viewport-bridge-browser-smoke.js',
  'workstation-default-wall-flow-browser-smoke.js',
  'workstation-manual-wall-flow-browser-smoke.js',
  'The next executable step should capture FXReplay UI reference guardrails',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be listed in chart presentation audit`);
});

assert.equal(index.includes('V6_CHART_PRESENTATION_SURFACE_AUDIT.md'), true);

console.log('v6 chart presentation audit smoke passed');
