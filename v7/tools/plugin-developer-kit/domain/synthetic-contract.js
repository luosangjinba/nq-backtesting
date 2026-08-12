import { canonicalClone, canonicalJson } from './canonical-json.js';
import { fail } from './diagnostic.js';

function exact(value, fields, label, logicalPath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', `${label} fields are invalid.`, { logicalPath });
  }
}

function text(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function safeEpoch(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function requirePortable(value, logicalPath) {
  try { canonicalJson(value); } catch {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Fixture data must be finite portable JSON.', {
      logicalPath,
    });
  }
}

export function readSyntheticInput(value, logicalPath) {
  exact(value, ['evidence', 'pane', 'replay', 'schemaVersion', 'session', 'settings', 'workspace'], 'Synthetic input', logicalPath);
  exact(value.session, ['id'], 'Synthetic Session', logicalPath);
  exact(value.workspace, ['revision'], 'Synthetic Workspace', logicalPath);
  exact(
    value.pane,
    ['datasetRevision', 'displayTimeframeId', 'id', 'instrumentId', 'sourceResolution'],
    'Synthetic Pane',
    logicalPath,
  );
  exact(value.replay, ['cutoffEpochMs'], 'Synthetic Replay', logicalPath);
  exact(value.evidence, ['bars', 'selectedBarStartEpochMs'], 'Synthetic evidence', logicalPath);
  if (value.schemaVersion !== 1 || !text(value.session.id)
    || !Number.isSafeInteger(value.workspace.revision) || value.workspace.revision < 0
    || !Object.values(value.pane).every(text) || !safeEpoch(value.replay.cutoffEpochMs)
    || !Array.isArray(value.evidence.bars) || value.evidence.bars.length !== 3
    || !safeEpoch(value.evidence.selectedBarStartEpochMs)
    || !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Synthetic fixture context is invalid.', {
      logicalPath,
    });
  }
  let previousEnd = null;
  for (const [index, bar] of value.evidence.bars.entries()) {
    exact(bar, ['close', 'endEpochMs', 'high', 'low', 'open', 'startEpochMs', 'volume'], `Synthetic Bar ${index}`, logicalPath);
    if (!safeEpoch(bar.startEpochMs) || !safeEpoch(bar.endEpochMs) || bar.startEpochMs >= bar.endEpochMs
      || previousEnd !== null && previousEnd !== bar.startEpochMs
      || !['open', 'high', 'low', 'close'].every((field) => finite(bar[field]))
      || !(bar.volume === null || finite(bar.volume))
      || bar.low > Math.min(bar.open, bar.close, bar.high)
      || bar.high < Math.max(bar.open, bar.close, bar.low)) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Synthetic Bars must be finite, ordered, adjacent OHLC values.', {
        logicalPath,
        related: [{ barIndex: index }],
      });
    }
    if (bar.endEpochMs > value.replay.cutoffEpochMs) {
      fail('candidate', 'V7DK_REPLAY_FUTURE_READ', 'fixture', 'Fixture evidence extends beyond the Replay cutoff.', {
        logicalPath,
        related: [{ barIndex: index }],
      });
    }
    previousEnd = bar.endEpochMs;
  }
  if (value.evidence.selectedBarStartEpochMs !== value.evidence.bars[1].startEpochMs) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Selected Bar must be the middle of exact three-Bar evidence.', {
      logicalPath,
    });
  }
  requirePortable(value.settings, logicalPath);
  return Object.freeze(canonicalClone(value));
}

export function readSyntheticOutput(value, input, logicalPath = 'candidate-output.json') {
  requirePortable(value, logicalPath);
  exact(value, ['artifact', 'projections', 'schemaVersion'], 'Synthetic output', logicalPath);
  exact(
    value.artifact,
    [
      'definitionId', 'direction', 'lowerPrice', 'midpointPrice', 'observedAtReplayCutoffEpochMs',
      'source', 'typeId', 'upperPrice',
    ],
    'Synthetic Artifact',
    logicalPath,
  );
  exact(
    value.artifact.source,
    [
      'barStartsEpochMs', 'datasetRevision', 'displayTimeframeId', 'instrumentId', 'paneId',
      'selectedBarStartEpochMs', 'sessionId', 'sourceResolution', 'workspaceRevision',
    ],
    'Synthetic Artifact source',
    logicalPath,
  );
  const artifact = value.artifact;
  const source = artifact.source;
  const expectedStarts = input.evidence.bars.map(({ startEpochMs }) => startEpochMs);
  if (value.schemaVersion !== 1 || artifact.typeId !== 'imbalance.fvg'
    || artifact.definitionId !== 'imbalance.fvg.strict-three-bar-wick-gap'
    || !['bullish', 'bearish'].includes(artifact.direction)
    || !finite(artifact.lowerPrice) || !finite(artifact.upperPrice) || !finite(artifact.midpointPrice)
    || !(artifact.lowerPrice < artifact.upperPrice)
    || artifact.midpointPrice !== artifact.lowerPrice + ((artifact.upperPrice - artifact.lowerPrice) / 2)
    || artifact.observedAtReplayCutoffEpochMs !== input.replay.cutoffEpochMs
    || source.sessionId !== input.session.id || source.workspaceRevision !== input.workspace.revision
    || source.paneId !== input.pane.id || source.instrumentId !== input.pane.instrumentId
    || source.displayTimeframeId !== input.pane.displayTimeframeId
    || source.sourceResolution !== input.pane.sourceResolution
    || source.datasetRevision !== input.pane.datasetRevision
    || source.selectedBarStartEpochMs !== input.evidence.selectedBarStartEpochMs
    || JSON.stringify(source.barStartsEpochMs) !== JSON.stringify(expectedStarts)) {
    fail('candidate', 'V7DK_ARTIFACT_INVALID', 'synthetic-host', 'Candidate Artifact output violates the FVG fixture ABI.', {
      logicalPath,
    });
  }
  if (!Array.isArray(value.projections) || value.projections.length !== 2) {
    fail('candidate', 'V7DK_ARTIFACT_INVALID', 'synthetic-host', 'FVG output requires one rectangle and one midpoint segment.', {
      logicalPath,
    });
  }
  const [zone, midpoint] = value.projections;
  exact(zone, ['fromEpochMs', 'kind', 'label', 'lowerPrice', 'toEpochMs', 'upperPrice'], 'FVG rectangle', logicalPath);
  exact(midpoint, ['fromEpochMs', 'kind', 'price', 'toEpochMs'], 'FVG midpoint segment', logicalPath);
  const first = expectedStarts[0];
  const last = expectedStarts[2];
  if (zone.kind !== 'rectangle' || midpoint.kind !== 'segment'
    || zone.fromEpochMs !== first || zone.toEpochMs !== last
    || zone.lowerPrice !== artifact.lowerPrice || zone.upperPrice !== artifact.upperPrice
    || zone.label !== (artifact.direction === 'bullish' ? 'Bullish FVG' : 'Bearish FVG')
    || midpoint.fromEpochMs !== first || midpoint.toEpochMs !== last
    || midpoint.price !== artifact.midpointPrice) {
    fail('candidate', 'V7DK_ARTIFACT_INVALID', 'synthetic-host', 'Candidate projections do not match the semantic Artifact.', {
      logicalPath,
    });
  }
  return Object.freeze(canonicalClone(value));
}

export function readFixtureSuite(value, logicalPath) {
  exact(value, ['cases', 'entrypointId', 'id', 'schemaVersion'], 'Fixture suite', logicalPath);
  if (value.schemaVersion !== 1 || !text(value.id) || !text(value.entrypointId)
    || !Array.isArray(value.cases) || value.cases.length < 1 || value.cases.length > 64) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Fixture suite identity is invalid.', { logicalPath });
  }
  const ids = new Set();
  const cases = value.cases.map((entry) => {
    exact(entry, ['id', 'input'], 'Fixture case', logicalPath);
    if (!text(entry.id) || ids.has(entry.id)) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Fixture case ids must be unique.', { logicalPath });
    }
    ids.add(entry.id);
    return Object.freeze({ id: entry.id, input: readSyntheticInput(entry.input, logicalPath) });
  });
  return Object.freeze({ cases: Object.freeze(cases), entrypointId: value.entrypointId, id: value.id, schemaVersion: 1 });
}

export function readExpectedSuite(value, fixture, logicalPath) {
  exact(value, ['cases', 'fixtureSuiteId', 'schemaVersion'], 'Expected-output suite', logicalPath);
  if (value.schemaVersion !== 1 || value.fixtureSuiteId !== fixture.id
    || !Array.isArray(value.cases) || value.cases.length !== fixture.cases.length) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Expected-output suite identity is invalid.', { logicalPath });
  }
  const expectedById = new Map();
  for (const entry of value.cases) {
    exact(entry, ['id', 'output'], 'Expected-output case', logicalPath);
    const fixtureCase = fixture.cases.find(({ id }) => id === entry.id);
    if (!fixtureCase || expectedById.has(entry.id)) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Expected-output case ids do not match fixtures.', { logicalPath });
    }
    expectedById.set(entry.id, readSyntheticOutput(entry.output, fixtureCase.input, logicalPath));
  }
  return Object.freeze({
    cases: Object.freeze(fixture.cases.map(({ id }) => Object.freeze({ id, output: expectedById.get(id) }))),
    fixtureSuiteId: fixture.id,
    schemaVersion: 1,
  });
}
