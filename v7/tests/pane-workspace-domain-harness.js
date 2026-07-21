import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  changePaneInstrument,
  createPaneWorkspace,
  focusPane,
  readPaneWorkspace,
} from '../src/pane-workspace-domain/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createInitialViewportIntent, readViewportIntent } from '../src/viewport-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/pane-workspace-domain/negative/cases.json',
), 'utf8'));

const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);
const NQ = 'instrument.cme.nq';
const ES = 'instrument.cme.es';
const YM = 'instrument.cme.ym';
const ONE_MINUTE = 'timeframe.fixed.1-minute';
const FIVE_MINUTE = 'timeframe.fixed.5-minute';

function viewport(paneId, overrides = {}) {
  return createInitialViewportIntent({
    activationGeneration: generationOne,
    cursorEpochMs: 2_000,
    latestOffsetBars: 8,
    paneId,
    sessionId: sessionA,
    ...overrides,
  });
}

function pane(paneId, instrumentId, timeframeId = ONE_MINUTE, overrides = {}) {
  return {
    instrumentId,
    paneId,
    timeframeId,
    viewportIntent: viewport(paneId),
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    activationGeneration: generationOne,
    activePaneId: 'pane-a',
    allowedInstrumentIds: [NQ, ES],
    instrumentSync: 'pane',
    panes: [pane('pane-a', NQ), pane('pane-b', ES, FIVE_MINUTE)],
    primaryInstrumentId: NQ,
    sessionId: sessionA,
    ...overrides,
  };
}

const onePane = createPaneWorkspace(input({ panes: [pane('pane-a', NQ)] }));
const one = readPaneWorkspace(onePane);
assert.equal(one.schemaVersion, 1);
assert.equal(one.panes.length, 1);
assert.equal(one.panes[0].paneId, 'pane-a');
assert.deepEqual(Object.keys(one.panes[0]).sort(), [
  'instrumentId', 'paneId', 'timeframeId', 'viewportIntent',
]);
assert.equal(Object.isFrozen(one), true);
assert.equal(Object.isFrozen(one.scope), true);
assert.equal(Object.isFrozen(one.allowedInstrumentIds), true);
assert.equal(Object.isFrozen(one.panes), true);
assert.equal(Object.isFrozen(one.panes[0]), true);

const workspace = createPaneWorkspace(input());
const original = readPaneWorkspace(workspace);
assert.deepEqual(original.panes.map(({ paneId }) => paneId), ['pane-a', 'pane-b']);
assert.deepEqual(original.panes.map(({ instrumentId }) => instrumentId), [NQ, ES]);
assert.deepEqual(
  original.panes.map(({ viewportIntent }) => readViewportIntent(viewportIntent).cursorEpochMs),
  [2_000, 2_000],
  'all pane viewport intents observe one shared Replay cursor',
);

const focused = focusPane({ paneId: 'pane-b', workspace });
const focusedValue = readPaneWorkspace(focused);
assert.equal(focusedValue.activePaneId, 'pane-b');
assert.equal(focusedValue.panes, original.panes, 'focus is read-target state and issues no pane command');
assert.equal(focusPane({ paneId: 'pane-a', workspace }), workspace, 'already-focused transition is a no-op');

const paneLocal = changePaneInstrument({ instrumentId: NQ, paneId: 'pane-b', workspace });
const paneLocalValue = readPaneWorkspace(paneLocal);
assert.equal(paneLocalValue.panes[0], original.panes[0], 'unaffected pane record retains identity');
assert.notEqual(paneLocalValue.panes[1], original.panes[1]);
assert.equal(paneLocalValue.panes[1].instrumentId, NQ);
assert.equal(
  paneLocalValue.panes[1].viewportIntent,
  original.panes[1].viewportIntent,
  'instrument changes preserve pane-local viewport intent',
);
assert.equal(paneLocalValue.activePaneId, original.activePaneId);
assert.equal(
  changePaneInstrument({ instrumentId: ES, paneId: 'pane-b', workspace }),
  workspace,
  'an unchanged instrument intent returns the accepted value',
);

const synchronizedSource = createPaneWorkspace(input({ instrumentSync: 'all' }));
const synchronized = changePaneInstrument({
  instrumentId: ES,
  paneId: 'pane-a',
  workspace: synchronizedSource,
});
const synchronizedValue = readPaneWorkspace(synchronized);
assert.deepEqual(synchronizedValue.panes.map(({ instrumentId }) => instrumentId), [ES, ES]);
assert.deepEqual(
  synchronizedValue.panes.map(({ viewportIntent }) => readViewportIntent(viewportIntent).cursorEpochMs),
  [2_000, 2_000],
  'sync fan-out cannot fork or advance Replay',
);

const negative = {
  'workspace-extra-field': () => createPaneWorkspace({ ...input(), replay: {} }),
  'empty-assets': () => createPaneWorkspace(input({ allowedInstrumentIds: [] })),
  'duplicate-assets': () => createPaneWorkspace(input({ allowedInstrumentIds: [NQ, NQ] })),
  'primary-outside-session': () => createPaneWorkspace(input({ primaryInstrumentId: YM })),
  'empty-panes': () => createPaneWorkspace(input({ panes: [] })),
  'duplicate-pane': () => createPaneWorkspace(input({ panes: [pane('pane-a', NQ), pane('pane-a', ES)] })),
  'active-pane-missing': () => createPaneWorkspace(input({ activePaneId: 'pane-c' })),
  'pane-replay-field': () => createPaneWorkspace(input({
    panes: [{ ...pane('pane-a', NQ), replayCursorEpochMs: 2_000 }],
  })),
  'instrument-outside-session': () => createPaneWorkspace(input({ panes: [pane('pane-a', YM)] })),
  'invalid-timeframe': () => createPaneWorkspace(input({
    panes: [pane('pane-a', NQ, '1m')],
  })),
  'invalid-sync': () => createPaneWorkspace(input({ instrumentSync: true })),
  'viewport-pane-mismatch': () => createPaneWorkspace(input({
    panes: [pane('pane-a', NQ, ONE_MINUTE, { viewportIntent: viewport('pane-b') })],
  })),
  'viewport-session-mismatch': () => createPaneWorkspace(input({
    panes: [pane('pane-a', NQ, ONE_MINUTE, {
      viewportIntent: viewport('pane-a', { sessionId: sessionB }),
    })],
  })),
  'viewport-activation-mismatch': () => createPaneWorkspace(input({
    panes: [pane('pane-a', NQ, ONE_MINUTE, {
      viewportIntent: viewport('pane-a', { activationGeneration: generationTwo }),
    })],
  })),
  'mixed-cursor': () => createPaneWorkspace(input({
    panes: [
      pane('pane-a', NQ),
      pane('pane-b', ES, FIVE_MINUTE, { viewportIntent: viewport('pane-b', { cursorEpochMs: 3_000 }) }),
    ],
  })),
  'focus-target-missing': () => focusPane({ paneId: 'pane-c', workspace }),
  'change-target-missing': () => changePaneInstrument({ instrumentId: NQ, paneId: 'pane-c', workspace }),
  'change-instrument-outside-session': () => changePaneInstrument({
    instrumentId: YM,
    paneId: 'pane-a',
    workspace,
  }),
  'transition-extra-field': () => focusPane({ paneId: 'pane-a', replay: {}, workspace }),
  'workspace-lookalike': () => readPaneWorkspace(Object.freeze(original)),
};

assert.equal(negativeCases.length, 20);
assert.equal(new Set(negativeCases.map(({ case: name }) => name)).size, negativeCases.length);
for (const fixture of negativeCases) {
  assert.equal(typeof negative[fixture.case], 'function', `missing negative control ${fixture.case}`);
  assert.throws(
    negative[fixture.case],
    (error) => error?.code === fixture.expectedCode,
    `${fixture.case} must fail with ${fixture.expectedCode}`,
  );
}

console.log(`v7 Pane Workspace Domain harness passed (${negativeCases.length} negative controls)`);
