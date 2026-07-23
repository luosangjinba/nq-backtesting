import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createWorkspaceCheckpoint,
  deserializeWorkspaceCheckpoint,
  readWorkspaceCheckpoint,
  serializeWorkspaceCheckpoint,
  WorkspaceCheckpointDomainError,
} from '../src/workspace-checkpoint-domain/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-checkpoint-domain/negative/cases.json',
), 'utf8'));

const context = Object.freeze({
  historicalRange: Object.freeze({ startEpochMs: 100, endEpochMs: 1_000 }),
  instrumentIds: Object.freeze(['instrument.cme.nq', 'instrument.cme.es']),
});
const value = Object.freeze({
  activePaneId: 'pane-main',
  cursorEpochMs: 700,
  panes: Object.freeze([
    Object.freeze({
      instrumentId: 'instrument.cme.nq',
      paneId: 'pane-main',
      timeframeId: 'timeframe.display-1-minute',
      viewport: Object.freeze({ latestOffsetBars: 12, origin: 'default', spanBars: null }),
    }),
    Object.freeze({
      instrumentId: 'instrument.cme.es',
      paneId: 'pane-secondary',
      timeframeId: 'timeframe.display-4-hour',
      viewport: Object.freeze({ latestOffsetBars: -3.5, origin: 'manual', spanBars: 86.25 }),
    }),
  ]),
  sessionHoursMode: 'rth',
});

const checkpoint = createWorkspaceCheckpoint(value, context);
const read = readWorkspaceCheckpoint(checkpoint);
assert.deepEqual(read, value);
assert.equal(Object.isFrozen(read), true);
assert.equal(Object.isFrozen(read.panes), true);
assert.equal(Object.isFrozen(read.panes[0].viewport), true);

const wire = serializeWorkspaceCheckpoint(checkpoint);
assert.equal(wire.schema, 'v7.workspace-checkpoint');
assert.equal(wire.version, 1);
assert.deepEqual(readWorkspaceCheckpoint(deserializeWorkspaceCheckpoint(wire, context)), value);

function negativeCandidate(kind) {
  if (kind === 'extra-field') return { ...value, extra: true };
  if (kind === 'cursor-before') return { ...value, cursorEpochMs: 99 };
  if (kind === 'cursor-after') return { ...value, cursorEpochMs: 1_001 };
  if (kind === 'active-missing') return { ...value, activePaneId: 'pane-tertiary' };
  if (kind === 'session-hours') return { ...value, sessionHoursMode: 'RTH' };
  if (kind === 'duplicate-pane') return { ...value, panes: [value.panes[0], value.panes[0]] };
  if (kind === 'outside-instrument') {
    return { ...value, panes: [{ ...value.panes[0], instrumentId: 'instrument.cme.ym' }] };
  }
  if (kind === 'default-negative-offset') {
    return {
      ...value,
      panes: [{
        ...value.panes[0],
        viewport: { latestOffsetBars: -1, origin: 'default', spanBars: null },
      }],
    };
  }
  if (kind === 'manual-null-span') {
    return {
      ...value,
      panes: [{
        ...value.panes[0],
        viewport: { latestOffsetBars: 2, origin: 'manual', spanBars: null },
      }],
    };
  }
  throw new TypeError(`Unknown negative checkpoint fixture ${kind}.`);
}

for (const fixture of negativeCases) {
  assert.throws(
    () => createWorkspaceCheckpoint(negativeCandidate(fixture.kind), context),
    (error) => error instanceof WorkspaceCheckpointDomainError
      && error.code === fixture.expectedCode,
    fixture.name,
  );
}

assert.throws(
  () => deserializeWorkspaceCheckpoint({ ...wire, version: 2 }, context),
  (error) => error instanceof WorkspaceCheckpointDomainError
    && error.code === 'WORKSPACE_CHECKPOINT_WIRE_INVALID',
  'unsupported wire version must be rejected',
);

assert.equal(Object.hasOwn(wire.panes[0].viewport, 'from'), false);
assert.equal(Object.hasOwn(wire.panes[0].viewport, 'to'), false);
assert.equal(Object.hasOwn(wire, 'bars'), false);
assert.equal(Object.hasOwn(wire, 'playing'), false);

console.log(`v7 Workspace Checkpoint Domain harness passed (${negativeCases.length + 1} negative controls)`);
