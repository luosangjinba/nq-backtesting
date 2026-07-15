import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_AUTO_PLAY_HTF_PROJECTION_AUDIT_STEP199.md', 'utf8');
const autoPlay = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const preparationRuntime = await readFile('v6/src/chart-entry/chart-entry-projection-preparation-runtime.js', 'utf8');
const projectionRuntime = await readFile('v6/src/chart-data-projection/chart-data-projection-runtime.js', 'utf8');

assert.match(doc, /Auto-play is a scheduler/);
assert.match(doc, /Do not import or dispatch `CHART_DATA_PROJECTION_COMMANDS` from auto-play/);
assert.match(doc, /manual-next/);

assert.equal(autoPlay.includes('CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT'), true);
assert.equal(autoPlay.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(autoPlay.includes('CHART_DATA_COMMANDS'), false);
assert.equal(autoPlay.includes('BAR_DATA_COMMANDS'), false);

assert.equal(manualNext.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(preparationRuntime.includes('CHART_DATA_PROJECTION_COMMANDS.PROJECT'), true);
assert.equal(preparationRuntime.includes('projectionSource'), true);
assert.equal(projectionRuntime.includes('projectSourceBarsToChartData'), true);

console.log('v6 auto-play HTF projection audit step 199 smoke passed');
