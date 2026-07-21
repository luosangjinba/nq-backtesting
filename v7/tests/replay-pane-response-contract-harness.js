import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createPaneWorkspace, readPaneWorkspace } from '../src/pane-workspace-domain/public.js';
import {
  createReplayPaneAction,
  planReplayPaneResponse,
  REPLAY_GOTO_ANCHORS,
  REPLAY_PANE_ACTION_KINDS,
} from '../src/replay-pane-response-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createInitialViewportIntent } from '../src/viewport-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/replay-pane-response-contract/negative/cases.json',
), 'utf8'));

const sessionId = createSessionId('session-replay-pane');
const activationGeneration = createActivationGeneration(1);
const NQ = 'instrument.cme.nq';
const ES = 'instrument.cme.es';
const RANGE = Object.freeze({ endEpochMs: 10_000, startEpochMs: 1_000 });
const HOURS = Object.freeze({ calendarRevision: 'cme-2026.1', mode: 'rth', revision: 4 });

function viewport(paneId, cursorEpochMs = 5_000) {
  return createInitialViewportIntent({
    activationGeneration,
    cursorEpochMs,
    latestOffsetBars: 12,
    paneId,
    sessionId,
  });
}

function workspace(cursorEpochMs = 5_000, panes = null) {
  return createPaneWorkspace({
    activationGeneration,
    activePaneId: 'pane-es',
    allowedInstrumentIds: [NQ, ES],
    instrumentSync: 'pane',
    panes: panes ?? [
      {
        instrumentId: NQ,
        paneId: 'pane-nq',
        timeframeId: 'timeframe.fixed.1-minute',
        viewportIntent: viewport('pane-nq', cursorEpochMs),
      },
      {
        instrumentId: ES,
        paneId: 'pane-es',
        timeframeId: 'timeframe.fixed.4-hour',
        viewportIntent: viewport('pane-es', cursorEpochMs),
      },
    ],
    primaryInstrumentId: NQ,
    sessionId,
  });
}

function plan(action, overrides = {}) {
  return planReplayPaneResponse({
    action,
    paneWorkspace: workspace(),
    replayRange: RANGE,
    sessionHours: HOURS,
    ...overrides,
  });
}

const expectedActions = [
  'manual-next',
  'manual-previous',
  'autoplay-next',
  'restart-back-to',
  'goto-anchor',
  'goto-exact',
];
assert.deepEqual(REPLAY_PANE_ACTION_KINDS, expectedActions);
assert.deepEqual(REPLAY_GOTO_ANCHORS, [
  'next-day-open',
  'next-session',
  'asian-session',
  'london-session',
  'new-york-session',
]);

const stepCases = [
  ['manual-next', 'forward', 'next-eligible-source-step', 'next-eligible-primary-source'],
  ['autoplay-next', 'forward', 'next-eligible-source-step', 'next-eligible-primary-source'],
  ['manual-previous', 'backward', 'replace-through-resolved-target', 'previous-eligible-primary-source'],
];
for (const [kind, direction, coverage, resolution] of stepCases) {
  const result = plan(createReplayPaneAction({ kind }));
  assert.equal(result.actionKind, kind);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.target.direction, direction);
  assert.equal(result.target.coverage, coverage);
  assert.equal(result.target.resolution, resolution);
  assert.deepEqual(result.affectedPaneIds, ['pane-nq', 'pane-es']);
  assert.equal(result.activePaneId, 'pane-es', 'active focus does not narrow Replay scope');
  assert.equal(result.cursorAuthorityInstrumentId, NQ, 'Session primary instrument is clock authority');
  assert.equal(result.sessionHours.scope, 'session');
  assert.equal(result.sessionHours.mode, 'rth');
  assert.deepEqual(result.replayRange, RANGE);
  assert.equal(result.atomicity.commit, 'replay-and-complete-pane-set-after-exact-visible-completion');
  assert.equal(result.atomicity.failure, 'preserve-last-accepted-workspace-and-pause');
  assert.equal(result.atomicity.overlap, 'single-in-flight-no-autoplay-backlog');
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.paneResponses), true);
  assert.equal(Object.isFrozen(result.target), true);
}

const multiPane = workspace();
const multiValue = readPaneWorkspace(multiPane);
const response = plan(createReplayPaneAction({ kind: 'manual-next' }), { paneWorkspace: multiPane });
assert.deepEqual(response.paneResponses.map((pane) => [
  pane.instrumentId,
  pane.timeframeId,
]), [
  [NQ, 'timeframe.fixed.1-minute'],
  [ES, 'timeframe.fixed.4-hour'],
]);
for (let index = 0; index < response.paneResponses.length; index += 1) {
  assert.equal(response.paneResponses[index].projection, 'reproject-at-shared-cursor');
  assert.equal(response.paneResponses[index].missingBars, 'allow-earlier-or-empty-visible-through');
  assert.equal(response.paneResponses[index].viewport, 'preserve-pane-local-intent');
  assert.equal(response.paneResponses[index].viewportIntent, multiValue.panes[index].viewportIntent);
}

const onePane = workspace(5_000, [{
  instrumentId: NQ,
  paneId: 'pane-es',
  timeframeId: 'timeframe.fixed.1-minute',
  viewportIntent: viewport('pane-es'),
}]);
assert.deepEqual(
  plan(createReplayPaneAction({ kind: 'manual-next' }), { paneWorkspace: onePane }).affectedPaneIds,
  ['pane-es'],
  'single-pane is the size-one form of the same response plan',
);

const restarted = plan(createReplayPaneAction({ kind: 'restart-back-to', targetEpochMs: 3_000 }));
assert.deepEqual(restarted.target, {
  coverage: 'replace-through-target',
  direction: 'backward',
  requestedTargetEpochMs: 3_000,
  resolution: 'selected-source-exclusive-cutoff',
});

for (const anchor of REPLAY_GOTO_ANCHORS) {
  const quick = plan(createReplayPaneAction({ anchor, kind: 'goto-anchor' }));
  assert.equal(quick.anchor, anchor);
  assert.equal(quick.target.direction, 'forward');
  assert.equal(quick.target.coverage, 'complete-forward-range');
  assert.equal(quick.target.resolution, 'next-real-source-after-new-york-anchor');
}

for (const [targetEpochMs, direction, coverage] of [
  [8_000, 'forward', 'complete-forward-range'],
  [3_000, 'backward', 'replace-through-target'],
  [5_000, 'retain', 'none'],
]) {
  const exact = plan(createReplayPaneAction({ kind: 'goto-exact', targetEpochMs }));
  assert.equal(exact.target.requestedTargetEpochMs, targetEpochMs);
  assert.equal(exact.target.direction, direction);
  assert.equal(exact.target.coverage, coverage);
  assert.equal(exact.target.resolution, 'exact-session-cutoff');
}

const baseAction = createReplayPaneAction({ kind: 'manual-next' });
const negative = {
  'unknown-action': () => createReplayPaneAction({ kind: 'jump' }),
  'step-extra-field': () => createReplayPaneAction({ kind: 'manual-next', targetEpochMs: 2_000 }),
  'anchor-missing': () => createReplayPaneAction({ kind: 'goto-anchor' }),
  'anchor-unknown': () => createReplayPaneAction({ anchor: 'market-open', kind: 'goto-anchor' }),
  'target-missing': () => createReplayPaneAction({ kind: 'goto-exact' }),
  'target-invalid': () => createReplayPaneAction({ kind: 'goto-exact', targetEpochMs: 1.5 }),
  'action-lookalike': () => plan(Object.freeze({ kind: 'manual-next' })),
  'plan-extra-field': () => plan(baseAction, { paneId: 'pane-es' }),
  'workspace-lookalike': () => plan(baseAction, { paneWorkspace: Object.freeze(readPaneWorkspace(workspace())) }),
  'range-order': () => plan(baseAction, { replayRange: { endEpochMs: 1_000, startEpochMs: 1_000 } }),
  'workspace-cursor-outside-range': () => plan(baseAction, { paneWorkspace: workspace(500) }),
  'session-hours-extra-field': () => plan(baseAction, { sessionHours: { ...HOURS, paneId: 'pane-es' } }),
  'session-hours-per-pane': () => plan(baseAction, { sessionHours: { ...HOURS, panes: {} } }),
  'session-hours-mode': () => plan(baseAction, { sessionHours: { ...HOURS, mode: 'all' } }),
  'session-hours-revision': () => plan(baseAction, { sessionHours: { ...HOURS, revision: -1 } }),
  'calendar-revision': () => plan(baseAction, { sessionHours: { ...HOURS, calendarRevision: ' ' } }),
  'back-to-forward': () => plan(createReplayPaneAction({ kind: 'restart-back-to', targetEpochMs: 8_000 })),
  'exact-target-outside-range': () => plan(createReplayPaneAction({ kind: 'goto-exact', targetEpochMs: 11_000 })),
};

assert.equal(negativeCases.length, 18);
assert.equal(new Set(negativeCases.map(({ case: name }) => name)).size, negativeCases.length);
for (const fixture of negativeCases) {
  assert.equal(typeof negative[fixture.case], 'function', `missing negative control ${fixture.case}`);
  assert.throws(
    negative[fixture.case],
    (error) => error?.code === fixture.expectedCode,
    `${fixture.case} must fail with ${fixture.expectedCode}`,
  );
}

console.log(`v7 Replay Pane Response Contract harness passed (${negativeCases.length} negative controls)`);
