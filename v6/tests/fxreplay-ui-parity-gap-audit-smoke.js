import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const audit = readFileSync(path.join(ROOT, 'v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md'), 'utf8');
const index = readFileSync(path.join(ROOT, 'v6/docs/INDEX.md'), 'utf8');

[
  'V6_FXREPLAY_UI_GUARDRAILS.md',
  'Top toolbar',
  'Timeframe menu',
  'Indicators / undo / redo',
  'Left toolbar',
  'Right toolbar',
  'Bottom transport',
  'Trading/account chrome',
  'Settings',
  'Chart status/OHLC',
  'Multi-pane chrome',
  'Diagnostics',
  'shell-only UI',
  'runtime-owned',
  'deferred',
  'Priority Order',
  'Ownership Constraints',
  'Stop Conditions',
  'shell-only UI complete for first slice',
  'Step 49 should implement the shell-only timeframe menu parity slice',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be listed in UI parity gap audit`);
});

[
  'primary/non-primary',
  'Trading/account UI appears interactive without an explicit owner',
  'Settings becomes a dashboard page',
  'display-timeframe',
  'runtime ownership must remain intact',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be a guarded stop/direction condition`);
});

assert.equal(index.includes('V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md'), true);

console.log('v6 fxreplay ui parity gap audit smoke passed');
