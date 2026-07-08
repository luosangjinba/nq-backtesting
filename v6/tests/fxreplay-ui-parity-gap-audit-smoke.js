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
  'Updated Priority Order',
  'Ownership Constraints',
  'Stop Conditions',
  'shell-only UI complete for current slice',
  'Grouped floating interval dropdown',
  'future developer diagnostics affordance remains deferred',
  'Step 130 should select the next bounded workstation/chart slice',
  'Prefer selecting one explicit owner contract family',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be listed in UI parity gap audit`);
});

[
  'primary/non-primary',
  'Trading/account UI appears interactive without an explicit owner',
  'Settings becomes a dashboard page',
  'Chart Settings distinct from Session settings',
  'without implementing those workflows',
  'Order or Calendar appears as a visible dashboard row action',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be a guarded stop/direction condition`);
});

[
  'Step 50 should reserve',
  'Step 51 should reserve',
  'Session settings panel reservation: make',
  'Left drawing rail reservation: add',
  'Bottom chrome audit: align',
  'Diagnostics visibility cleanup: move',
].forEach((staleNeedle) => {
  assert.equal(audit.includes(staleNeedle), false, `${staleNeedle} should not remain as active stale direction`);
});

assert.equal(index.includes('V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md'), true);

console.log('v6 fxreplay ui parity gap audit smoke passed');
