import { resolveTargetDisplayMaterialization } from '../materialization/target-display-materialization.js';
import {
  createNarrowReplayMaterializationRuntimeHandoffPlan,
  validateNarrowReplayMaterializationRuntimeHandoffPlan,
} from './narrow-replay-materialization-runtime-handoff-plan.js';

const EXECUTOR_ID = 'narrow-replay-materialization-runtime-handoff-pure-executor';

function freezeArray(items) {
  return Object.freeze([...items]);
}

function normalizeText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10000000000 ? Math.floor(numeric / 1000) : numeric;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}

function cloneBar(bar = {}) {
  return { ...bar };
}

function resolveFallback(plan, fallbackGateId, extra = {}) {
  const fallbackGate = (plan.fallbackGates || []).find((gate) => gate.id === fallbackGateId) || null;
  return Object.freeze({
    action: 'fallback',
    commandIntents: freezeArray([]),
    evaluatedPlanId: plan.id,
    fallbackGate,
    fallbackGateId,
    id: EXECUTOR_ID,
    ownerBoundary: plan.ownerBoundary,
    replaceIntent: null,
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    status: 'fallback',
    targetBarsDisplayMaterializationInputOnly: true,
    ...extra,
  });
}

function resolvePaneContext(commandResults = {}) {
  return commandResults.paneContext ?? commandResults.pane ?? commandResults.resolvePaneContext ?? null;
}

function resolveReplayCursor(commandResults = {}, event = {}) {
  const replayState = commandResults.replayState ?? commandResults.replay ?? commandResults.readReplayCursor ?? {};
  return normalizeTimestamp(
    replayState.cursorTimestamp
      ?? replayState.cursorTime
      ?? replayState.timestamp
      ?? event.replayCursorTimestamp
      ?? event.cursorTimestamp,
  );
}

function resolveSourceBars(commandResults = {}) {
  const sourceBars = commandResults.sourceBars ?? commandResults.readSourceBars ?? [];
  return Array.isArray(sourceBars) ? sourceBars : [];
}

function resolveTargetWindowPlan(commandResults = {}) {
  return commandResults.targetWindowPlan ?? commandResults.planTargetWindow ?? null;
}

function resolveLoadedTargetBars(commandResults = {}) {
  const targetWindowLoad = commandResults.targetWindowLoad ?? commandResults.loadTargetWindow ?? {};
  const targetBars = targetWindowLoad.bars ?? targetWindowLoad.targetBars ?? commandResults.targetBars ?? [];
  return Array.isArray(targetBars) ? targetBars : [];
}

function buildCommandIntents(plan, {
  paneContext,
  replayCursorTimestamp,
  sourceBars,
  targetBars,
  targetWindowPlan,
  visibleTargetBars,
} = {}) {
  return freezeArray((plan.commandSequence || []).map((step) => Object.freeze({
    commandSurface: step.commandSurface,
    id: step.id,
    injectedResult: (() => {
      if (step.id === 'resolve-pane-context') {
        return paneContext ? 'available' : 'missing';
      }
      if (step.id === 'read-replay-cursor') {
        return replayCursorTimestamp === null ? 'missing' : 'available';
      }
      if (step.id === 'read-source-bars') {
        return sourceBars.length ? 'available' : 'missing';
      }
      if (step.id === 'plan-target-window') {
        return targetWindowPlan ? 'available' : 'missing';
      }
      if (step.id === 'load-target-window') {
        return targetBars.length ? 'available' : 'missing';
      }
      if (step.id === 'replace-display-bars') {
        return visibleTargetBars.length ? 'ready' : 'skipped';
      }
      return 'unknown';
    })(),
  })));
}

export function executeNarrowReplayMaterializationRuntimeHandoffPlan({
  commandResults = {},
  event = {},
  plan = createNarrowReplayMaterializationRuntimeHandoffPlan(),
} = {}) {
  const validation = validateNarrowReplayMaterializationRuntimeHandoffPlan(plan);
  if (!validation.valid) {
    return resolveFallback(plan, 'invalid-plan', {
      validation,
    });
  }

  const paneContext = resolvePaneContext(commandResults);
  const displayTimeframe = normalizeText(
    paneContext?.displayTimeframe ?? paneContext?.timeframe ?? event.displayTimeframe,
  );
  if (displayTimeframe === '1m') {
    return resolveFallback(plan, 'ignore-source-timeframe-display', {
      displayTimeframe,
      validation,
    });
  }
  if (!paneContext || !displayTimeframe) {
    return resolveFallback(plan, 'missing-pane-context', {
      displayTimeframe,
      validation,
    });
  }

  const replayCursorTimestamp = resolveReplayCursor(commandResults, event);
  if (replayCursorTimestamp === null) {
    return resolveFallback(plan, 'missing-replay-cursor', {
      displayTimeframe,
      paneId: paneContext.id ?? event.paneId ?? null,
      validation,
    });
  }

  const sourceBars = resolveSourceBars(commandResults);
  if (!sourceBars.length) {
    return resolveFallback(plan, 'missing-source-bars', {
      displayTimeframe,
      paneId: paneContext.id ?? event.paneId ?? null,
      replayCursorTimestamp,
      validation,
    });
  }

  const targetWindowPlan = resolveTargetWindowPlan(commandResults);
  if (!targetWindowPlan) {
    return resolveFallback(plan, 'target-window-plan-unavailable', {
      displayTimeframe,
      paneId: paneContext.id ?? event.paneId ?? null,
      replayCursorTimestamp,
      validation,
    });
  }

  const targetBars = resolveLoadedTargetBars(commandResults);
  if (!targetBars.length) {
    return resolveFallback(plan, 'target-window-load-unavailable', {
      displayTimeframe,
      paneId: paneContext.id ?? event.paneId ?? null,
      replayCursorTimestamp,
      validation,
    });
  }

  const replayState = commandResults.replayState ?? commandResults.replay ?? {};
  const materialization = resolveTargetDisplayMaterialization({
    sourceCursorTimestamp: replayCursorTimestamp,
    sourceTimeframe: replayState.timeframe ?? 1,
    targetBars,
    targetTimeframe: displayTimeframe,
  });
  const revealStates = materialization.revealStates;
  const visibleTargetBars = materialization.bars.map(cloneBar);

  if (!visibleTargetBars.length) {
    return resolveFallback(plan, 'target-bars-all-future', {
      displayTimeframe,
      materializationFallbackReason: materialization.fallbackReason,
      paneId: paneContext.id ?? event.paneId ?? null,
      replayCursorTimestamp,
      revealStates: freezeArray(revealStates),
      validation,
    });
  }

  const paneId = paneContext.id ?? paneContext.paneId ?? event.paneId ?? null;
  const commandIntents = buildCommandIntents(plan, {
    paneContext,
    replayCursorTimestamp,
    sourceBars,
    targetBars,
    targetWindowPlan,
    visibleTargetBars,
  });

  return Object.freeze({
    action: 'replace-display-bars',
    commandIntents,
    displayTimeframe,
    evaluatedPlanId: plan.id,
    fallbackGate: null,
    fallbackGateId: null,
    id: EXECUTOR_ID,
    ownerBoundary: plan.ownerBoundary,
    paneId,
    replaceIntent: Object.freeze({
      bars: freezeArray(visibleTargetBars),
      commandSurface: 'chartData.replaceBars',
      displayTimeframe,
      paneId,
      preserveSource: true,
      replayCursorTimestamp,
      revealPolicy: 'source-cursor-no-future-target-bars',
      targetBarsDisplayMaterializationInputOnly: true,
    }),
    replayCursorTimestamp,
    revealStates: freezeArray(revealStates),
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    sourceReplayCursorAuthority: '1m',
    status: 'ready',
    targetBarsDisplayMaterializationInputOnly: true,
    validation,
  });
}
