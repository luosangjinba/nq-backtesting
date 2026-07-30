import assert from 'node:assert/strict';
import { createSourceBatchLedger } from '../src/replay-workspace-ui/source-batch-ledger.js';

const SOURCE_SCOPE = Object.freeze({
  datasetRevision: 'dataset.1',
  instrumentId: 'instrument.nq',
  providerId: 'provider.v4',
  schemaVersion: 1,
  sourceResolutionId: 'timeframe.source.1-minute',
});

function sourceWindow(windowStartEpochMs, windowEndEpochMs, requestKey, overrides = {}) {
  return Object.freeze({
    request: Object.freeze({
      ...SOURCE_SCOPE,
      windowEndEpochMs,
      windowStartEpochMs,
      ...overrides,
    }),
    requestKey,
  });
}

const coveringLedger = createSourceBatchLedger();
const wideRthReplacement = sourceWindow(0, 500, 'wide-rth-replacement');
coveringLedger.stage(wideRthReplacement, 'pane-source-replacement');
coveringLedger.accept();
const containedNavigation = sourceWindow(300, 500, 'contained-navigation');
assert.deepEqual(coveringLedger.stage(containedNavigation, 'navigation'), [wideRthReplacement],
  'navigation fully covered by accepted Pane source must retain the wider accepted history');
coveringLedger.reject();
assert.deepEqual(coveringLedger.stage(containedNavigation, 'pane-source-replacement'), [
  containedNavigation,
], 'an explicit source replacement must never retain the covering accepted wall');
coveringLedger.reject();

const segmentedLedger = createSourceBatchLedger();
const recentWindow = sourceWindow(200, 500, 'recent-window');
const earlierWindow = sourceWindow(0, 200, 'earlier-window');
segmentedLedger.stage(recentWindow, 'pane-source-replacement');
segmentedLedger.accept();
segmentedLedger.stage(earlierWindow, 'history-extension');
segmentedLedger.accept();
const crossingNavigation = sourceWindow(100, 400, 'crossing-navigation');
assert.deepEqual(segmentedLedger.stage(crossingNavigation, 'navigation'), [
  earlierWindow, recentWindow,
], 'contiguous accepted batches may jointly cover one smaller navigation window');
segmentedLedger.reject();

const gappedLedger = createSourceBatchLedger();
const gappedEarlierWindow = sourceWindow(0, 150, 'gapped-earlier-window');
gappedLedger.stage(recentWindow, 'pane-source-replacement');
gappedLedger.accept();
gappedLedger.stage(gappedEarlierWindow, 'history-extension');
gappedLedger.accept();
assert.deepEqual(gappedLedger.stage(crossingNavigation, 'navigation'), [crossingNavigation],
  'accepted batches with an internal gap must not satisfy a navigation window');
gappedLedger.reject();

const foreignScopes = Object.freeze([
  ['schemaVersion', 2],
  ['providerId', 'provider.other'],
  ['instrumentId', 'instrument.es'],
  ['sourceResolutionId', 'timeframe.source.other'],
  ['datasetRevision', 'dataset.2'],
]);
for (const [field, value] of foreignScopes) {
  const foreignNavigation = sourceWindow(300, 500, `foreign-${field}`, { [field]: value });
  assert.deepEqual(coveringLedger.stage(foreignNavigation, 'navigation'), [foreignNavigation],
    `accepted coverage with another ${field} must not satisfy navigation`);
  coveringLedger.reject();
}

console.log('v7 source batch ledger harness passed', {
  scope: 'contained coverage, segmented coverage, gaps, replacements, raw-source identity',
});
