import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const guardrails = readFileSync(path.join(ROOT, 'v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md'), 'utf8');
const index = readFileSync(path.join(ROOT, 'v6/docs/INDEX.md'), 'utf8');

[
  'chart is the primary surface',
  'top toolbar',
  'Indicators',
  'undo',
  'redo',
  'left toolbar',
  'right toolbar',
  'bottom transport',
  'Trading/account chrome',
  'Multi-pane layouts',
  'Timeframe Menu',
  'Add custom interval',
  'Settings Kernel',
  'Symbol',
  'Status line',
  'Scales and lines',
  'Canvas',
  'Template on the left and Cancel/Ok on the right',
  'Engineering diagnostics',
  'Only chart-engine writes adapter series data and logical ranges',
  'Only chart-data owns pane-local bars and revisions',
  'Only chart-viewport owns viewport intent and projection',
  'Do not copy FXReplay pixels',
].forEach((needle) => {
  assert.equal(guardrails.includes(needle), true, `${needle} should be listed in UI guardrails`);
});

[
  '2026-07-05_104015.png',
  '2026-07-05_104517.png',
  '2026-07-05_104602.png',
  '2026-07-05_104731.png',
  '2026-07-05_104815.png',
].forEach((needle) => {
  assert.equal(guardrails.includes(needle), true, `${needle} should be referenced in UI guardrails`);
});

assert.equal(index.includes('V6_FXREPLAY_UI_GUARDRAILS.md'), true);

console.log('v6 fxreplay ui guardrails smoke passed');
