import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createChartAdapterVisibleReceipt,
  createPaneSetChartSnapshotApplication,
} from '../src/chart-snapshot-application/public.js';
import { createPaneWorkspace } from '../src/pane-workspace-domain/public.js';
import {
  createEmptyPaneProjection,
  createPaneSetMaterializationPorts,
  createPaneSetTransactionInput,
} from '../src/pane-set-materialization/public.js';
import { createReplayStep, readReplayCursorProposal } from '../src/replay-contract/public.js';
import {
  createReplayNavigationExecutor,
  createReplayNavigationReplayPort,
  createReplayNavigationSchedule,
  createReplayNavigationTargetResolver,
  DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  GOTO_TARGET_UNAVAILABLE_IN_RANGE,
  readReplayNavigationResult,
  requireReplayNavigationSchedule,
} from '../src/replay-navigation-runtime/public.js';
import {
  createReplayPaneAction,
  planReplayPaneResponse,
} from '../src/replay-pane-response-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createInitialViewportIntent } from '../src/viewport-runtime/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import { createWorkspaceTransactionRuntime } from '../src/workspace-transaction-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/replay-navigation-runtime/negative/cases.json',
), 'utf8'));
const MINUTE = 60_000;
const epoch = (value) => Date.parse(value);
const RANGE = Object.freeze({
  startEpochMs: epoch('2026-05-01T12:00:00.000Z'),
  endEpochMs: epoch('2026-05-06T22:00:00.000Z'),
});
const HOURS = Object.freeze({ calendarRevision: 'cme-2026.1', mode: 'eth', revision: 3 });
const REPLAY_STEP = createReplayStep({
  durationMs: MINUTE, id: 'replay-step.one-minute', offsetMs: 0, sourceDurationMs: MINUTE,
});
const FIVE_MINUTE_STEP = createReplayStep({
  durationMs: 5 * MINUTE, id: 'replay-step.five-minute', offsetMs: 0, sourceDurationMs: MINUTE,
});
const NQ = 'instrument.cme.nq';
const ES = 'instrument.cme.es';
const sessionId = createSessionId('session-navigation');
const activationGeneration = createActivationGeneration(1);
let sequence = 0;

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

function identity(label) {
  return createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`navigation-${label}-${++sequence}`),
  });
}

function viewport(paneId, cursorEpochMs) {
  return createInitialViewportIntent({
    activationGeneration, cursorEpochMs, latestOffsetBars: 12, paneId, sessionId,
  });
}

function workspace(cursorEpochMs) {
  return createPaneWorkspace({
    activationGeneration,
    activePaneId: 'pane-es',
    allowedInstrumentIds: [NQ, ES],
    instrumentSync: 'pane',
    panes: [
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

const schedule = createReplayNavigationSchedule();
const customSchedule = createReplayNavigationSchedule({
  anchors: Object.freeze({
    asianSession: '20:00', dayOpen: '17:45', londonSession: '03:00', newYorkSession: '10:15',
    silverBulletLondon: '04:00', silverBulletNewYorkAm: '11:00', silverBulletNewYorkPm: '15:00',
  }),
});
assert.deepEqual(DEFAULT_REPLAY_NAVIGATION_ANCHORS, {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
  silverBulletLondon: '03:00',
  silverBulletNewYorkAm: '10:00',
  silverBulletNewYorkPm: '14:00',
});
assert.equal(customSchedule.candidates({
  anchor: 'next-day-open',
  cursorEpochMs: epoch('2026-05-04T12:00:00.000Z'),
  endEpochMs: epoch('2026-05-05T12:00:00.000Z'),
})[0].localTime, '17:45');
assert.equal(customSchedule.candidates({
  anchor: 'silver-bullet-new-york-pm',
  cursorEpochMs: epoch('2026-05-04T12:00:00.000Z'),
  endEpochMs: epoch('2026-05-05T22:00:00.000Z'),
})[0].localTime, '15:00');
assert.deepEqual(
  [
    'silver-bullet-london',
    'silver-bullet-new-york-am',
    'silver-bullet-new-york-pm',
  ].map((anchor) => new Date(schedule.candidates({
    anchor,
    cursorEpochMs: epoch('2026-05-04T04:00:00.000Z'),
    endEpochMs: epoch('2026-05-05T04:00:00.000Z'),
  })[0].targetEpochMs).toISOString()),
  [
    '2026-05-04T07:00:00.000Z',
    '2026-05-04T14:00:00.000Z',
    '2026-05-04T18:00:00.000Z',
  ],
  'Silver Bullet defaults resolve from New York wall time to DST-aware instants',
);
assert.equal(
  new Date(schedule.candidates({
    anchor: 'new-york-session',
    cursorEpochMs: epoch('2026-03-06T12:00:00.000Z'),
    endEpochMs: epoch('2026-03-07T20:00:00.000Z'),
  })[0].targetEpochMs).toISOString(),
  '2026-03-06T14:30:00.000Z',
);
assert.equal(
  new Date(schedule.candidates({
    anchor: 'new-york-session',
    cursorEpochMs: epoch('2026-03-09T12:00:00.000Z'),
    endEpochMs: epoch('2026-03-10T20:00:00.000Z'),
  })[0].targetEpochMs).toISOString(),
  '2026-03-09T13:30:00.000Z',
  'New York anchors follow DST instead of a fixed UTC offset',
);
assert.deepEqual(
  schedule.candidates({
    anchor: 'next-session',
    cursorEpochMs: epoch('2026-05-04T09:00:00.000Z'),
    endEpochMs: epoch('2026-05-05T12:00:00.000Z'),
  }).slice(0, 3).map(({ anchor }) => anchor),
  ['new-york-session', 'asian-session', 'london-session'],
  'Next Session includes only the three primary Session anchors',
);
for (const anchor of [
  'next-day-open',
  'next-session',
  'asian-session',
  'london-session',
  'new-york-session',
  'silver-bullet-london',
  'silver-bullet-new-york-am',
  'silver-bullet-new-york-pm',
]) {
  const candidates = schedule.candidates({
    anchor,
    cursorEpochMs: epoch('2026-05-04T12:00:00.000Z'),
    endEpochMs: epoch('2026-05-06T22:00:00.000Z'),
  });
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(({ targetEpochMs }) => targetEpochMs > epoch('2026-05-04T12:00:00.000Z')));
}
assert.equal(
  new Date(schedule.candidates({
    anchor: 'new-york-session',
    cursorEpochMs: epoch('2026-05-04T13:30:00.000Z'),
    endEpochMs: epoch('2026-05-06T22:00:00.000Z'),
  })[0].targetEpochMs).toISOString(),
  '2026-05-05T13:30:00.000Z',
  'a quick anchor is strictly forward when Replay is already at that wall time',
);

let traversalUnavailable = false;
let traversalWrongDirection = false;
let traversalGate = null;
const anchorAttempts = [];
const sourceTraversalPort = Object.freeze({
  async eligibleAtOrAfter(context) {
    anchorAttempts.push(context.anchorEpochMs);
    if (traversalUnavailable) return null;
    const day = new Date(context.anchorEpochMs).getUTCDay();
    if (day === 0 || day === 6) return null;
    return Object.freeze({
      sourceEpochMs: context.anchorEpochMs,
      targetEpochMs: context.anchorEpochMs + MINUTE,
    });
  },
  async nextEligible(context) {
    const gate = traversalGate;
    if (gate) await gate.promise;
    if (traversalUnavailable) return null;
    assert.equal(context.replayStep.id, 'replay-step.one-minute');
    const targetEpochMs = traversalWrongDirection
      ? context.cursorEpochMs - MINUTE : context.cursorEpochMs + context.replayStep.durationMs;
    return Object.freeze({ sourceEpochMs: targetEpochMs - MINUTE, targetEpochMs });
  },
  async previousEligible(context) {
    if (traversalUnavailable) return null;
    assert.equal(context.replayStep.id, 'replay-step.one-minute');
    const targetEpochMs = context.cursorEpochMs - context.replayStep.durationMs;
    return Object.freeze({ sourceEpochMs: targetEpochMs - MINUTE, targetEpochMs });
  },
});
const targetResolver = createReplayNavigationTargetResolver({ schedule, sourceTraversalPort });
const replay = createReplayRuntime({
  activationGeneration,
  initialCursorEpochMs: epoch('2026-05-01T12:41:00.000Z'),
  initialReplayStep: REPLAY_STEP,
  range: RANGE,
  sessionId,
});

let acquireGate = null;
let projectionFailure = false;
let comparisonEmpty = false;
const proposalWindows = [];
const requestCoverage = [];
const materialization = createPaneSetMaterializationPorts({
  acquisitionPort: Object.freeze({
    async acquirePane(context) {
      if (acquireGate) await acquireGate.promise;
      proposalWindows.push(readReplayCursorProposal(context.proposal).revealWindow);
      requestCoverage.push(context.paneRequest.request.coverage);
      return Object.freeze({ paneResponse: context.paneResponse });
    },
  }),
  projectionPort: Object.freeze({
    async projectPane(context) {
      if (projectionFailure) throw new Error('projection failed');
      if (comparisonEmpty && context.paneResponse.instrumentId === ES) {
        return createEmptyPaneProjection({ reason: 'no-source-data' });
      }
      const proposal = readReplayCursorProposal(context.proposal);
      const visibleThroughEpochMs = proposal.targetEpochMs - MINUTE;
      return Object.freeze({
        bars: Object.freeze([Object.freeze({
          close: 101, displayEpochMs: visibleThroughEpochMs, high: 102, low: 99,
          open: 100, startEpochMs: visibleThroughEpochMs, volume: 10,
        })]),
        paneId: context.paneResponse.paneId,
        provenance: Object.freeze({
          calendarRevision: HOURS.calendarRevision,
          cursorProposal: context.proposal,
          displayTimeframeId: context.paneResponse.timeframeId,
          instrumentId: context.paneResponse.instrumentId,
          sessionHoursMode: HOURS.mode,
          visibleThroughEpochMs: context.paneResponse.instrumentId === NQ
            ? visibleThroughEpochMs : visibleThroughEpochMs - MINUTE,
        }),
        schemaVersion: 1,
      });
    },
  }),
});

let adapterRevision = 0;
let applyCount = 0;
let applyFailure = false;
let visibleSnapshot = null;
const application = createPaneSetChartSnapshotApplication({
  activationGeneration,
  adapter: Object.freeze({
    async applyVisible(context) {
      if (applyFailure) throw new Error('visible application failed');
      if (!context.isCurrent()) throw new Error('stale application');
      applyCount += 1;
      adapterRevision += 1;
      visibleSnapshot = context.workspaceSnapshot;
      return createChartAdapterVisibleReceipt({
        adapterRevision, identity: context.identity, workspaceSnapshot: context.workspaceSnapshot,
      });
    },
    async discard() {},
    async stage(context) { return Object.freeze({ snapshot: context.workspaceSnapshot }); },
  }),
  sessionId,
});
const replayPort = createReplayNavigationReplayPort({ replayRuntime: replay, targetResolver });
const transactionRuntime = createWorkspaceTransactionRuntime({
  activationGeneration,
  acquisitionPort: materialization.acquisitionPort,
  projectionPort: materialization.projectionPort,
  replayPort,
  sessionId,
  visibleCompletionPort: application,
});
let paneRequestCount = 0;
let mutablePaneRequest = false;
const executor = createReplayNavigationExecutor({
  paneRequestPort: Object.freeze({
    createRequest({ paneResponse, responsePlan }) {
      paneRequestCount += 1;
      const value = { coverage: responsePlan.target.coverage, paneId: paneResponse.paneId };
      return mutablePaneRequest ? value : Object.freeze(value);
    },
  }),
  replayRuntime: replay,
  transactionRuntime,
});

async function navigate(kind, options = {}) {
  const action = createReplayPaneAction({ kind, ...options });
  return readReplayNavigationResult(await executor.execute({
    action,
    intent: createWorkspaceTransactionIntent({ identity: identity(kind), operation: kind }),
    paneWorkspace: workspace(replay.snapshot().cursorEpochMs),
    replayRange: RANGE,
    sessionHours: HOURS,
  }));
}

let result = await navigate('manual-next');
assert.equal(result.status, 'committed');
assert.equal(replay.snapshot().cursorEpochMs, epoch('2026-05-01T12:42:00.000Z'));
assert.equal(replay.snapshot().playback, 'paused');
assert.equal(applyCount, 1);
assert.deepEqual(visibleSnapshot.panes.map(({ paneId }) => paneId), ['pane-nq', 'pane-es']);
assert.equal(replay.snapshot().visibleThroughEpochMs, epoch('2026-05-01T12:41:00.000Z'));

result = await navigate('autoplay-next');
assert.equal(result.status, 'committed');
assert.equal(replay.snapshot().playback, 'playing');
assert.equal(replay.snapshot().cursorEpochMs, epoch('2026-05-01T12:43:00.000Z'));

acquireGate = deferred();
const slowAuto = navigate('autoplay-next');
const overlap = await navigate('autoplay-next');
assert.equal(overlap.status, 'rejected');
assert.equal(overlap.code, 'navigation-in-flight');
acquireGate.resolve();
assert.equal((await slowAuto).status, 'committed');
acquireGate = null;

const beforeFailure = transactionRuntime.snapshot().acceptedSnapshot;
projectionFailure = true;
result = await navigate('autoplay-next');
projectionFailure = false;
assert.equal(result.status, 'failed');
assert.equal(replay.snapshot().playback, 'paused', 'Autoplay failure pauses without moving Replay');
assert.equal(transactionRuntime.snapshot().acceptedSnapshot, beforeFailure);

result = await navigate('manual-previous');
assert.equal(result.status, 'committed');
assert.equal(requestCoverage.at(-1), 'replace-through-resolved-target');
assert.equal(replay.snapshot().playback, 'paused');

const restartTarget = replay.snapshot().cursorEpochMs - (2 * MINUTE);
result = await navigate('restart-back-to', { targetEpochMs: restartTarget });
assert.equal(result.status, 'committed');
assert.equal(replay.snapshot().cursorEpochMs, restartTarget);

const exactForward = epoch('2026-05-01T15:00:00.000Z');
result = await navigate('goto-exact', { targetEpochMs: exactForward });
assert.equal(result.status, 'committed');
assert.equal(requestCoverage.at(-1), 'complete-forward-range');
assert.deepEqual(proposalWindows.at(-1), { startEpochMs: restartTarget, endEpochMs: exactForward });

const exactBackward = exactForward - (30 * MINUTE);
result = await navigate('goto-exact', { targetEpochMs: exactBackward });
assert.equal(result.status, 'committed');
assert.equal(requestCoverage.at(-1), 'replace-through-target');

const applyBeforeNoop = applyCount;
const requestBeforeNoop = paneRequestCount;
result = await navigate('goto-exact', { targetEpochMs: exactBackward });
assert.equal(result.status, 'noop');
assert.equal(result.code, 'already-at-target');
assert.equal(applyCount, applyBeforeNoop);
assert.equal(paneRequestCount, requestBeforeNoop, 'retain GoTo creates no materialization transaction');

await navigate('goto-exact', { targetEpochMs: epoch('2026-05-01T20:00:00.000Z') });
anchorAttempts.length = 0;
result = await navigate('goto-anchor', { anchor: 'new-york-session' });
assert.equal(result.status, 'committed');
assert.equal(new Date(replay.snapshot().cursorEpochMs).toISOString(), '2026-05-04T13:30:00.000Z');
assert.equal(anchorAttempts.length, 3, 'weekend anchors are skipped through bounded source lookup');

traversalUnavailable = true;
const cursorBeforeRangeEnd = replay.snapshot().cursorEpochMs;
const applyBeforeRangeEnd = applyCount;
const acquireBeforeRangeEnd = proposalWindows.length;
result = await navigate('goto-anchor', { anchor: 'silver-bullet-london' });
traversalUnavailable = false;
assert.equal(result.status, 'rejected');
assert.equal(result.code, GOTO_TARGET_UNAVAILABLE_IN_RANGE);
assert.equal(result.terminal, null, 'expected range exhaustion is not exposed as a failed transaction');
assert.equal(replay.snapshot().cursorEpochMs, cursorBeforeRangeEnd);
assert.equal(replay.snapshot().playback, 'paused');
assert.equal(proposalWindows.length, acquireBeforeRangeEnd, 'range exhaustion performs no Pane acquisition');
assert.equal(applyCount, applyBeforeRangeEnd, 'range exhaustion performs no visible Pane application');

comparisonEmpty = true;
result = await navigate('manual-next');
comparisonEmpty = false;
assert.equal(result.status, 'committed');
assert.deepEqual(visibleSnapshot.panes.map(({ status }) => status), ['ready', 'empty']);

const beforeApplyFailure = transactionRuntime.snapshot().acceptedSnapshot;
const chartBeforeApplyFailure = visibleSnapshot;
applyFailure = true;
result = await navigate('autoplay-next');
applyFailure = false;
assert.equal(result.status, 'failed');
assert.equal(replay.snapshot().playback, 'paused');
assert.equal(transactionRuntime.snapshot().acceptedSnapshot, beforeApplyFailure);
assert.equal(visibleSnapshot, chartBeforeApplyFailure);

traversalUnavailable = true;
const cursorBeforeUnavailable = replay.snapshot().cursorEpochMs;
result = await navigate('manual-next');
traversalUnavailable = false;
assert.equal(result.status, 'failed');
assert.equal(replay.snapshot().cursorEpochMs, cursorBeforeUnavailable);
assert.equal(replay.snapshot().playback, 'paused');

const stalePlan = planReplayPaneResponse({
  action: createReplayPaneAction({ kind: 'manual-next' }),
  paneWorkspace: workspace(replay.snapshot().cursorEpochMs),
  replayRange: RANGE,
  replayStep: REPLAY_STEP,
  sessionHours: HOURS,
});
const staleInput = createPaneSetTransactionInput({
  paneRequests: Object.freeze(stalePlan.paneResponses.map(({ paneId }) => Object.freeze({
    paneId, request: Object.freeze({ coverage: stalePlan.target.coverage, paneId }),
  }))),
  responsePlan: stalePlan,
});
traversalGate = deferred();
const slowResolution = transactionRuntime.execute({
  input: staleInput,
  intent: createWorkspaceTransactionIntent({ identity: identity('slow-resolution'), operation: 'manual-next' }),
});
await Promise.resolve();
const slowGate = traversalGate;
traversalGate = null;
const fastResolution = describeWorkspaceTransactionEnvelope(await transactionRuntime.execute({
  input: staleInput,
  intent: createWorkspaceTransactionIntent({ identity: identity('fast-resolution'), operation: 'manual-next' }),
}));
assert.equal(fastResolution.status, 'committed');
slowGate.resolve();
assert.equal(describeWorkspaceTransactionEnvelope(await slowResolution).status, 'stale');
assert.equal(replay.snapshot().playback, 'paused');

function planFor(
  action,
  cursorEpochMs = replay.snapshot().cursorEpochMs,
  range = RANGE,
  replayStep = REPLAY_STEP,
) {
  return planReplayPaneResponse({
    action,
    paneWorkspace: workspace(cursorEpochMs),
    replayRange: range,
    replayStep,
    sessionHours: HOURS,
  });
}

function inputFor(plan) {
  return createPaneSetTransactionInput({
    paneRequests: Object.freeze(plan.paneResponses.map(({ paneId }) => Object.freeze({
      paneId, request: Object.freeze({ paneId }),
    }))),
    responsePlan: plan,
  });
}

const nextAction = createReplayPaneAction({ kind: 'manual-next' });
const nextPlan = planFor(nextAction);
const signal = new AbortController().signal;
const traversal = (overrides = {}) => Object.freeze({
  eligibleAtOrAfter: async () => null,
  nextEligible: async ({ cursorEpochMs, replayStep }) => Object.freeze({
    sourceEpochMs: cursorEpochMs,
    targetEpochMs: cursorEpochMs + replayStep.durationMs,
  }),
  previousEligible: async ({ cursorEpochMs, replayStep }) => Object.freeze({
    sourceEpochMs: cursorEpochMs - replayStep.durationMs - MINUTE,
    targetEpochMs: cursorEpochMs - replayStep.durationMs,
  }),
  ...overrides,
});
const resolver = (port = traversal()) => createReplayNavigationTargetResolver({
  schedule,
  sourceTraversalPort: port,
});
let activeSchedule = schedule;
const dynamicResolver = createReplayNavigationTargetResolver({
  resolveSchedule: () => activeSchedule,
  sourceTraversalPort: traversal({
    eligibleAtOrAfter: async ({ anchorEpochMs }) => Object.freeze({
      sourceEpochMs: anchorEpochMs,
      targetEpochMs: anchorEpochMs + MINUTE,
    }),
  }),
});
const dynamicPlan = planFor(createReplayPaneAction({
  anchor: 'silver-bullet-new-york-pm', kind: 'goto-anchor',
}));
const defaultDynamicTarget = await dynamicResolver.resolve({
  range: RANGE, responsePlan: dynamicPlan, signal,
});
activeSchedule = customSchedule;
const customDynamicTarget = await dynamicResolver.resolve({
  range: RANGE, responsePlan: dynamicPlan, signal,
});
assert.equal(customDynamicTarget.targetEpochMs - defaultDynamicTarget.targetEpochMs, 60 * MINUTE,
  'a saved settings replacement must affect the next resolution without rebuilding Replay');
for (const anchor of [
  'next-day-open',
  'next-session',
  'asian-session',
  'london-session',
  'new-york-session',
  'silver-bullet-london',
  'silver-bullet-new-york-am',
  'silver-bullet-new-york-pm',
]) {
  const cursorEpochMs = epoch('2026-05-04T04:00:00.000Z');
  const anchorPlan = planFor(createReplayPaneAction({ anchor, kind: 'goto-anchor' }), cursorEpochMs);
  const expectedCutoff = schedule.candidates({
    anchor, cursorEpochMs, endEpochMs: RANGE.endEpochMs,
  })[0].targetEpochMs;
  const resolvedTarget = await resolver(traversal({
    eligibleAtOrAfter: async ({ anchorEpochMs }) => Object.freeze({
      sourceEpochMs: anchorEpochMs,
      targetEpochMs: anchorEpochMs + MINUTE,
    }),
  })).resolve({ range: RANGE, responsePlan: anchorPlan, signal });
  assert.equal(resolvedTarget.targetEpochMs, expectedCutoff,
    `${anchor} must stop at the exclusive wall-time cutoff instead of revealing its anchor bar`);
  assert.equal(resolvedTarget.sourceEpochMs, null,
    `${anchor} eligibility witness must not be exposed as a visible source completion`);
}
const directReplayPort = createReplayNavigationReplayPort({ replayRuntime: replay, targetResolver: resolver() });

const negative = {
  'anchors-missing-field': () => createReplayNavigationSchedule({ anchors: { dayOpen: '18:00' } }),
  'anchor-time-invalid': () => createReplayNavigationSchedule({
    anchors: {
      asianSession: '19:00', dayOpen: '18:00', londonSession: '2:00', newYorkSession: '09:30',
      silverBulletLondon: '03:00', silverBulletNewYorkAm: '10:00', silverBulletNewYorkPm: '14:00',
    },
  }),
  'schedule-bounds': () => createReplayNavigationSchedule({ maxCandidates: 0 }),
  'schedule-lookalike': () => requireReplayNavigationSchedule(Object.freeze({ candidates() {} })),
  'schedule-port-both': () => createReplayNavigationTargetResolver({
    resolveSchedule: () => schedule, schedule, sourceTraversalPort: traversal(),
  }),
  'schedule-port-invalid': () => createReplayNavigationTargetResolver({
    resolveSchedule: true, sourceTraversalPort: traversal(),
  }),
  'schedule-anchor': () => schedule.candidates({
    anchor: 'market-open', cursorEpochMs: RANGE.startEpochMs, endEpochMs: RANGE.endEpochMs,
  }),
  'traversal-port-missing': () => createReplayNavigationTargetResolver({
    schedule, sourceTraversalPort: Object.freeze({}),
  }),
  'target-signal-missing': () => resolver().resolve({ responsePlan: nextPlan, range: RANGE }),
  'target-result-mutable': () => resolver(traversal({
    nextEligible: async ({ cursorEpochMs }) => ({ sourceEpochMs: cursorEpochMs, targetEpochMs: cursorEpochMs + MINUTE }),
  })).resolve({ responsePlan: nextPlan, range: RANGE, signal }),
  'target-source-invalid': () => resolver(traversal({
    nextEligible: async ({ cursorEpochMs }) => Object.freeze({ sourceEpochMs: cursorEpochMs + MINUTE, targetEpochMs: cursorEpochMs + MINUTE }),
  })).resolve({ responsePlan: nextPlan, range: RANGE, signal }),
  'target-direction': () => resolver(traversal({
    nextEligible: async ({ cursorEpochMs }) => Object.freeze({ sourceEpochMs: cursorEpochMs - (2 * MINUTE), targetEpochMs: cursorEpochMs - MINUTE }),
  })).resolve({ responsePlan: nextPlan, range: RANGE, signal }),
  'anchor-distance': () => {
    const anchorPlan = planFor(createReplayPaneAction({ anchor: 'new-york-session', kind: 'goto-anchor' }));
    return resolver(traversal({
      eligibleAtOrAfter: async ({ anchorEpochMs }) => Object.freeze({
        sourceEpochMs: anchorEpochMs + (16 * MINUTE), targetEpochMs: anchorEpochMs + (17 * MINUTE),
      }),
    })).resolve({ responsePlan: anchorPlan, range: RANGE, signal });
  },
  'replay-port-missing': () => createReplayNavigationReplayPort({ replayRuntime: {}, targetResolver: resolver() }),
  'replay-signal-missing': () => directReplayPort.propose({
    identity: identity('signal-missing'), input: inputFor(nextPlan), operation: 'manual-next',
  }),
  'operation-mismatch': () => directReplayPort.propose({
    identity: identity('operation-mismatch'), input: inputFor(nextPlan), operation: 'manual-previous', signal,
  }),
  'cursor-stale': () => {
    const stalePlan = planFor(nextAction, replay.snapshot().cursorEpochMs - MINUTE);
    return directReplayPort.propose({
      identity: identity('cursor-stale'), input: inputFor(stalePlan), operation: 'manual-next', signal,
    });
  },
  'step-stale': () => {
    const stalePlan = planFor(nextAction, replay.snapshot().cursorEpochMs, RANGE, FIVE_MINUTE_STEP);
    return directReplayPort.propose({
      identity: identity('step-stale'), input: inputFor(stalePlan), operation: 'manual-next', signal,
    });
  },
  'execution-extra-field': () => executor.execute({
    action: nextAction,
    intent: createWorkspaceTransactionIntent({ identity: identity('extra'), operation: 'manual-next' }),
    paneWorkspace: workspace(replay.snapshot().cursorEpochMs),
    replayRange: RANGE,
    sessionHours: HOURS,
    paneId: 'pane-nq',
  }),
  'executor-operation': () => executor.execute({
    action: nextAction,
    intent: createWorkspaceTransactionIntent({ identity: identity('wrong-operation'), operation: 'manual-previous' }),
    paneWorkspace: workspace(replay.snapshot().cursorEpochMs),
    replayRange: RANGE,
    sessionHours: HOURS,
  }),
  'executor-range-stale': () => {
    const cursorEpochMs = replay.snapshot().cursorEpochMs;
    const staleRange = Object.freeze({ ...RANGE, startEpochMs: RANGE.startEpochMs + 1 });
    return executor.execute({
      action: createReplayPaneAction({ kind: 'goto-exact', targetEpochMs: cursorEpochMs }),
      intent: createWorkspaceTransactionIntent({ identity: identity('range-stale'), operation: 'goto-exact' }),
      paneWorkspace: workspace(cursorEpochMs),
      replayRange: staleRange,
      sessionHours: HOURS,
    });
  },
  'pane-request-mutable': async () => {
    mutablePaneRequest = true;
    try { return await navigate('manual-next'); } finally { mutablePaneRequest = false; }
  },
  'result-lookalike': () => readReplayNavigationResult(Object.freeze({ status: 'committed' })),
};

assert.equal(negativeCases.length, 23);
for (const fixture of negativeCases) {
  assert.equal(typeof negative[fixture.case], 'function', `missing negative control ${fixture.case}`);
  await assert.rejects(
    Promise.resolve().then(negative[fixture.case]),
    (error) => error?.code === fixture.expectedCode,
    `${fixture.case} must fail with ${fixture.expectedCode}`,
  );
}

console.log(`v7 Replay Navigation Runtime harness passed (${negativeCases.length} negative/race controls)`);
