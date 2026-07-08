import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_READINESS_AUDIT_STEP192.md', 'utf8');

assert.match(doc, /Step 192 is an audit and contract step only/);
assert.match(doc, /runtime\.chart-data-projection/);
assert.match(doc, /Bar-data runtime remains the owner of source bar requests and cache windows/);
assert.match(doc, /Replay runtime remains the owner of cursor\/reveal state only/);
assert.match(doc, /Chart engine adapter remains a renderer/);
assert.match(doc, /bucket completeness metadata/);
assert.match(doc, /manual next and auto-play/);
assert.match(doc, /leftward history/);
assert.match(doc, /reset view/);
assert.match(doc, /manual-next-htf-visible-latency-browser-step197-smoke\.js/);
assert.match(doc, /Do not change replay `Next` or auto-play behavior/);
assert.match(doc, /Lightweight Charts/);
assert.match(doc, /awesome-tradingview/);

console.log('v6 display timeframe readiness audit step 192 smoke passed');
