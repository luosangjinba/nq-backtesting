import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPaneTimeLocationCommand,
  createPaneTimeLocationSelection,
  PaneTimeLocationDomainError,
  planPaneTimeLocation,
  readPaneTimeLocationCommand,
  readPaneTimeLocationSelection,
} from '../src/pane-time-location-domain/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const selection = createPaneTimeLocationSelection({ marketEpochMs: 2_500, sourcePaneId: 'pane-main' });
assert.deepEqual(readPaneTimeLocationSelection(selection), {
  marketEpochMs: 2_500,
  sourcePaneId: 'pane-main',
});
const command = createPaneTimeLocationCommand({
  selection,
  targetPaneIds: ['pane-secondary', 'pane-tertiary'],
});
assert.deepEqual(readPaneTimeLocationCommand(command), {
  selection: { marketEpochMs: 2_500, sourcePaneId: 'pane-main' },
  targetPaneIds: ['pane-secondary', 'pane-tertiary'],
});

const targetTimeline = [
  { displayEpochMs: 10_000, startEpochMs: 1_000 },
  { displayEpochMs: 20_000, startEpochMs: 2_000 },
  { displayEpochMs: 30_000, startEpochMs: 3_000 },
];
assert.deepEqual(planPaneTimeLocation({
  marketEpochMs: 2_500,
  targetTimeline,
  targetVisibleRange: { from: -1, to: 5 },
  timeframeDurationMs: 1_000,
}), {
  displayEpochMs: 20_000,
  from: -2,
  logical: 1,
  marketEpochMs: 2_500,
  positionRatio: 0.5,
  spanBars: 6,
  status: 'located',
  to: 4,
});
assert.deepEqual(planPaneTimeLocation({
  marketEpochMs: 500,
  targetTimeline,
  targetVisibleRange: { from: -1, to: 5 },
  timeframeDurationMs: 1_000,
}), { marketEpochMs: 500, status: 'history-required' });
assert.deepEqual(planPaneTimeLocation({
  marketEpochMs: 4_500,
  targetTimeline,
  targetVisibleRange: { from: -1, to: 5 },
  timeframeDurationMs: 1_000,
}), { marketEpochMs: 4_500, reason: 'no-containing-bar', status: 'unavailable' });
assert.equal(planPaneTimeLocation({
  marketEpochMs: 2_999,
  targetTimeline,
  targetVisibleRange: { from: -1, to: 5 },
  timeframeDurationMs: 1_000,
}).logical, 1, 'a higher-TF target candle contains an exact lower-TF market time');

const basePlan = {
  marketEpochMs: 2_500,
  targetTimeline,
  targetVisibleRange: { from: -1, to: 5 },
  timeframeDurationMs: 1_000,
};
const operations = {
  commandDuplicate: () => createPaneTimeLocationCommand({
    selection, targetPaneIds: ['pane-secondary', 'pane-secondary'],
  }),
  commandEmpty: () => createPaneTimeLocationCommand({ selection, targetPaneIds: [] }),
  commandLookalike: () => readPaneTimeLocationCommand({}),
  commandSource: () => createPaneTimeLocationCommand({ selection, targetPaneIds: ['pane-main'] }),
  duration: () => planPaneTimeLocation({ ...basePlan, timeframeDurationMs: 0 }),
  range: () => planPaneTimeLocation({ ...basePlan, targetVisibleRange: { from: 2, to: 2 } }),
  selectionEpoch: () => createPaneTimeLocationSelection({ marketEpochMs: -1, sourcePaneId: 'pane-main' }),
  selectionLookalike: () => readPaneTimeLocationSelection({}),
  selectionPane: () => createPaneTimeLocationSelection({ marketEpochMs: 1, sourcePaneId: '' }),
  timeline: () => planPaneTimeLocation({
    ...basePlan,
    targetTimeline: [targetTimeline[1], targetTimeline[0]],
  }),
};
const cases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/pane-time-location-domain/negative/cases.json'),
  'utf8',
));
for (const fixture of cases) {
  assert.throws(operations[fixture.operation], (error) => {
    assert.ok(error instanceof PaneTimeLocationDomainError, fixture.name);
    assert.equal(error.code, fixture.expectedCode, fixture.name);
    return true;
  });
}

console.log(`v7 Pane Time Location Domain harness passed (${cases.length} negative controls)`);
