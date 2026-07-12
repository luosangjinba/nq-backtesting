import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile(
  'v6/docs/V6_CHART_FOUNDATION_REGRESSION_REFRESH_STEP381.md',
  'utf8',
);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /No runtime behavior changed in this step/);

for (const command of [
  'node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js',
  'node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
  'node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js',
  'node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js',
  'node v6/tests/boundary-smoke.js',
  'git diff --check',
]) {
  assert.match(doc, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const member of [
  'display-timeframe-browser-smoke.js',
  'timeframe-menu-parity-browser-smoke.js',
  'display-timeframe-leftward-auto-chain-browser-smoke.js',
  'session-aware-leftward-auto-chain-browser-smoke.js',
  'daily-projection-browser-step268-smoke.js',
  'weekly-projection-browser-step269-smoke.js',
  'monthly-projection-browser-step270-smoke.js',
  'replay-gap-browser-regression-pack-step274-smoke.js',
  'high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
]) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(doc, /passed `8\/8` in `105292ms`/);
assert.match(doc, /`replay-gap-browser-regression-pack-step274-smoke\.js` \| pass \| `90350ms`/);
assert.match(doc, /`manual-next-session-gap-browser-step258-smoke\.js` \| pass \| `27270ms`/);
assert.match(doc, /`htf-manual-next-replay-gap-browser-step273-smoke\.js` \| pass \| `50161ms`/);
assert.match(doc, /`4h` \| `114\.3ms`/);
assert.match(doc, /`8h` \| `128\.8ms`/);
assert.match(doc, /`1D` \| `132\.3ms`/);
assert.match(doc, /`1W` \| `132\.5ms`/);
assert.match(doc, /Chart foundation behavior covered by this refresh is green/);
assert.match(doc, /weakest current signal is not HTF leftward-extension latency/);
assert.match(doc, /Replay Gap Regression Pack Cost Audit/);
assert.match(doc, /Step 276 foundation pack usable as the broad confirmation command/);
assert.match(doc, /Display-Timeframe Runtime remains the TF-switch owner/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Target bars remain display materialization inputs only/);
assert.match(doc, /Step 293 target-history diagnostics default pack remains eight tests/);

console.log('v6 chart foundation regression refresh step381 static smoke passed');
