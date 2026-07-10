import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const domain = await readFile('v6/src/session-calendar/session-calendar-domain.js', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const domainSmoke = await readFile('v6/tests/session-calendar-domain-step267-smoke.js', 'utf8');

assert.match(domain, /export function getTradingDayKey/);
assert.match(domain, /export function resolveTradingDayBucket/);
assert.match(domain, /export function resolveTradingWeekBucket/);
assert.match(domain, /export function resolveTradingMonthBucket/);
assert.match(domain, /SUPPORTED_FUTURES/);
assert.match(domainSmoke, /2026-05-31T18:00:00Z/);
assert.match(domainSmoke, /2026-06-01T17:59:00Z/);
assert.match(domainSmoke, /2026-06-01T18:00:00Z/);

for (const forbidden of [
  '../runtime/',
  '../shell/',
  '../chart-data-projection/',
  'dispatchCommand',
  'registerCommand',
  'document.querySelector',
]) {
  assert.equal(domain.includes(forbidden), false, `session-calendar domain must not depend on ${forbidden}`);
}

for (const id of ['1D', '1W', '1M']) {
  assert.match(
    capabilities,
    new RegExp(`id: '${id}'[\\s\\S]*?sourceRequirement: 'session-calendar'[\\s\\S]*?status: 'planned'`),
  );
}

assert.equal(projectionDomain.includes('session-calendar'), false);
assert.equal(displayRuntime.includes('session-calendar'), false);
assert.equal(shell.includes('resolveTradingDayBucket'), false);

console.log('v6 session calendar owner step267 smoke passed');
