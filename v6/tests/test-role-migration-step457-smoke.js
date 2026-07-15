import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  STEP457_HISTORICAL_LEDGER_DISPOSITION,
  STEP457_HISTORICAL_LEDGER_SNAPSHOTS,
  findStep457HistoricalLedgerDisposition,
} from './test-role-migration-step457.js';

assert.equal(STEP457_HISTORICAL_LEDGER_SNAPSHOTS.length, 154);
assert.equal(new Set(STEP457_HISTORICAL_LEDGER_SNAPSHOTS).size, 154);
assert.equal(
  STEP457_HISTORICAL_LEDGER_DISPOSITION.successor,
  'v6/tests/current-ledger-routing-smoke.js',
);

await access(STEP457_HISTORICAL_LEDGER_DISPOSITION.successor);
for (const path of STEP457_HISTORICAL_LEDGER_SNAPSHOTS) {
  await access(path);
  const source = await readFile(path, 'utf8');
  assert.match(source, /['"]v6\/(?:TODO|docs\/INDEX)\.md['"]/, path);
  assert.equal(findStep457HistoricalLedgerDisposition(path)?.path, path);
}

assert.equal(
  findStep457HistoricalLedgerDisposition('v6/tests/current-ledger-routing-smoke.js'),
  null,
);
assert.equal(
  findStep457HistoricalLedgerDisposition(
    STEP457_HISTORICAL_LEDGER_SNAPSHOTS[0].replaceAll('/', '\\'),
  )?.path,
  STEP457_HISTORICAL_LEDGER_SNAPSHOTS[0],
);
assert.equal(findStep457HistoricalLedgerDisposition('v6/tests/ordinary-smoke.js'), null);

console.log('v6 historical ledger role migration Step 457 smoke passed');
