import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTOPLAY_SPEED_OPTIONS,
  createReplayWorkspaceComposition,
  supportsFoundationWorkspace,
  WORKSPACE_PANE_IDS,
} from '../src/replay-workspace-composition/public.js';
import { createPaneProjectionMemo } from '../src/replay-workspace-composition/pane-projection-memo.js';
import { createWorkspaceReplayCommands } from '../src/replay-workspace-composition/workspace-replay-commands.js';
import { brandProjectedPaneSnapshot } from '../src/projection-domain/projected-pane-snapshot.js';
import { validateReplayWorkspaceBoundary } from './support/replay-workspace-boundary-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const compositionDirectory = path.resolve(TEST_DIR, '../src/replay-workspace-composition');
const compositionSources = fs.readdirSync(compositionDirectory)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(compositionDirectory, file), 'utf8'));
const uiDirectory = path.resolve(TEST_DIR, '../src/replay-workspace-ui');
const uiSources = fs.readdirSync(uiDirectory)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(uiDirectory, file), 'utf8'));
const production = Object.freeze({
  commandSource: compositionSources.filter((source) => /export function create\w+Commands|createReplayWorkspaceCommandPort/.test(source)).join('\n'),
  compositionSource: compositionSources.join('\n'),
  uiSource: uiSources.join('\n'),
});

assert.equal(typeof createReplayWorkspaceComposition, 'function');
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.cme.nq'] },
}), true);
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.unsupported'] },
}), false);
assert.deepEqual(WORKSPACE_PANE_IDS, [
  'pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary',
]);
assert.equal(AUTOPLAY_SPEED_OPTIONS.length, 4);
assert.deepEqual(validateReplayWorkspaceBoundary(production), []);

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

const nextCalls = [];
const nextCommands = createWorkspaceReplayCommands({
  execution: {
    action: () => {
      const gate = deferred();
      nextCalls.push(gate);
      return gate.promise;
    },
    whenIdle: () => Promise.resolve(),
  },
  isDisposed: () => false,
  replay: { snapshot: () => ({ complete: false }) },
});
const rapidNext = [nextCommands.next(), nextCommands.next(), nextCommands.next()];
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 1, 'rapid Manual Next intents must start one Replay transaction at a time');
nextCalls[0].resolve('first');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 2, 'the second Manual Next intent must wait instead of being dropped');
nextCalls[1].resolve('second');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 3, 'the third Manual Next intent must preserve click order');
nextCalls[2].resolve('third');
assert.deepEqual(await Promise.all(rapidNext), ['first', 'second', 'third']);
let afterCompleteCalls = 0;
const completeNextCommands = createWorkspaceReplayCommands({
  execution: {
    action: () => { afterCompleteCalls += 1; },
    whenIdle: () => Promise.resolve(),
  },
  isDisposed: () => false,
  replay: { snapshot: () => ({ complete: true }) },
});
assert.equal(await completeNextCommands.next(), null);
assert.equal(afterCompleteCalls, 0,
  'queued Manual Next intents must drain harmlessly after Replay reaches Session End');

const memo = createPaneProjectionMemo();
const transactionIdentity = Object.freeze({ transactionId: 'transaction.multi-pane-replay' });
const selection = Object.freeze({ id: 'selection.nq-1m-eth' });
const acceptedBars = Object.freeze([]);
const projectedBars = Object.freeze([Object.freeze({ startEpochMs: 1_000 })]);
let projectionCalls = 0;
const compute = () => {
  projectionCalls += 1;
  return brandProjectedPaneSnapshot(Object.freeze({
    bars: projectedBars,
    paneId: 'pane-main',
    provenance: Object.freeze({}),
    schemaVersion: 1,
  }));
};
const firstProjection = memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-main',
  requestKeys: Object.freeze(['request.same']),
  selection,
});
const sharedProjection = memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-secondary',
  requestKeys: Object.freeze(['request.same']),
  selection,
});
assert.equal(projectionCalls, 1,
  'exact same-transaction Pane inputs must execute deterministic Projection once');
assert.equal(sharedProjection.paneId, 'pane-secondary');
assert.equal(sharedProjection.bars, firstProjection.bars,
  'reused Pane projection must retain the exact immutable bars identity');
memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-tertiary',
  requestKeys: Object.freeze(['request.different']),
  selection,
});
assert.equal(projectionCalls, 2, 'different source identity must not reuse Pane projection');

const negativeCases = Object.freeze([
  {
    code: 'ui-constructs-runtime-owner',
    value: { ...production, uiSource: `${production.uiSource}\ncreateReplayRuntime({});` },
  },
  {
    code: 'ui-missing-public-composition-port',
    value: { ...production, uiSource: production.uiSource.replace(
      'createReplayWorkspaceComposition({', 'missingComposition({',
    ) },
  },
  {
    code: 'ui-missing-presentation-subscription',
    value: { ...production, uiSource: production.uiSource.replace(
      'createWorkspacePresentationPort(view)', 'view',
    ) },
  },
  {
    code: 'composition-touches-dom',
    value: { ...production, compositionSource: `${production.compositionSource}\ndocument.querySelector('#app');` },
  },
  {
    code: 'composition-missing-runtime-owner',
    value: { ...production, compositionSource: production.compositionSource.replace(
      'createBarDataRuntime({', 'missingBarDataRuntime({',
    ) },
  },
  {
    code: 'command-port-constructs-owner',
    value: { ...production, commandSource: `${production.commandSource}\ncreateWorkspaceStateRuntime({});` },
  },
]);

for (const entry of negativeCases) {
  assert.ok(validateReplayWorkspaceBoundary(entry.value).some(({ code }) => code === entry.code),
    `negative control must report ${entry.code}`);
}

console.log('v7 Replay Workspace composition harness passed', {
  scope: 'public boot, UI command/presentation boundary, owner composition, DOM isolation',
  negativeControls: negativeCases.length,
});
