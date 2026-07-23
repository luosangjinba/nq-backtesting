import { readReplayStep, requireCursorInRange } from '../replay-contract/public.js';
import { requireReplayPaneResponsePlan } from '../replay-pane-response-contract/public.js';
import { failReplayNavigation } from './navigation-error.js';
import { GOTO_TARGET_UNAVAILABLE_IN_RANGE } from './navigation-result.js';
import { requireReplayNavigationSchedule } from './navigation-schedule.js';

const RESULT_FIELDS = Object.freeze(['sourceEpochMs', 'targetEpochMs']);

function requireMethod(port, name) {
  if (!port || typeof port[name] !== 'function') {
    failReplayNavigation('REPLAY_NAVIGATION_TRAVERSAL_PORT_INVALID', `Source traversal port requires ${name}().`);
  }
  return port[name].bind(port);
}

function requireSignal(signal) {
  if (!signal || typeof signal.aborted !== 'boolean') {
    failReplayNavigation('REPLAY_NAVIGATION_SIGNAL_REQUIRED', 'Navigation target resolution requires an AbortSignal.');
  }
  if (signal.aborted) {
    failReplayNavigation('REPLAY_NAVIGATION_STALE', 'Navigation target resolution is stale.');
  }
  return signal;
}

function result(value, range) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.isFrozen(value)
    || Object.keys(value).sort().join(',') !== [...RESULT_FIELDS].sort().join(',')) {
    failReplayNavigation('REPLAY_NAVIGATION_TARGET_RESULT_INVALID', 'Traversal must return one exact frozen target result.');
  }
  const targetEpochMs = requireCursorInRange(value.targetEpochMs, range);
  const sourceEpochMs = value.sourceEpochMs;
  if (sourceEpochMs !== null && (!Number.isSafeInteger(sourceEpochMs)
    || sourceEpochMs < range.startEpochMs || sourceEpochMs >= targetEpochMs)) {
    failReplayNavigation('REPLAY_NAVIGATION_SOURCE_EPOCH_INVALID', 'Resolved source epoch must precede its target cutoff.');
  }
  return Object.freeze({ sourceEpochMs, targetEpochMs });
}

function context(plan, range, signal, extra = {}) {
  return Object.freeze({
    cursorEpochMs: plan.fromCursorEpochMs,
    instrumentId: plan.cursorAuthorityInstrumentId,
    range,
    replayStep: readReplayStep(plan.replayStep),
    sessionHours: plan.sessionHours,
    signal,
    ...extra,
  });
}

function requireDirection(targetEpochMs, plan) {
  const actual = targetEpochMs > plan.fromCursorEpochMs
    ? 'forward' : targetEpochMs < plan.fromCursorEpochMs ? 'backward' : 'retain';
  if (actual !== plan.target.direction) {
    failReplayNavigation('REPLAY_NAVIGATION_TARGET_DIRECTION', 'Resolved target direction does not match the response plan.');
  }
}

/**
 * Owner: Replay navigation runtime boundary.
 * Purpose: resolve primary-source Next/Previous, quick New York anchors, and
 * hidden clock-authority evidence through an injected source traversal owner
 * without requesting bars directly.
 * Inputs: branded schedule and source traversal port.
 * Outputs: frozen async resolve() port returning an exact source/target pair.
 * Side effects: only delegated traversal; owns no cache, cursor, or chart state.
 * Errors: stable validation/unavailable/stale failures or delegated failures.
 */
export function createReplayNavigationTargetResolver({ resolveSchedule = null, schedule = null, sourceTraversalPort }) {
  if (resolveSchedule !== null && (typeof resolveSchedule !== 'function' || schedule !== null)) {
    failReplayNavigation(
      'REPLAY_NAVIGATION_SCHEDULE_PORT_INVALID',
      'Target resolver requires either one static schedule or one resolveSchedule function.',
    );
  }
  const staticSchedule = schedule === null ? null : requireReplayNavigationSchedule(schedule);
  if (staticSchedule === null && resolveSchedule === null) {
    failReplayNavigation(
      'REPLAY_NAVIGATION_SCHEDULE_PORT_INVALID',
      'Target resolver requires either one static schedule or one resolveSchedule function.',
    );
  }
  const currentSchedule = () => requireReplayNavigationSchedule(
    staticSchedule ?? resolveSchedule(),
  );
  const nextEligible = requireMethod(sourceTraversalPort, 'nextEligible');
  const previousEligible = requireMethod(sourceTraversalPort, 'previousEligible');
  const eligibleAtOrAfter = requireMethod(sourceTraversalPort, 'eligibleAtOrAfter');
  const visibleBefore = requireMethod(sourceTraversalPort, 'visibleBefore');

  async function resolve({ requireSourceEvidence = false, responsePlan, range, signal }) {
    const plan = requireReplayPaneResponsePlan(responsePlan);
    if (typeof requireSourceEvidence !== 'boolean') {
      failReplayNavigation(
        'REPLAY_NAVIGATION_SOURCE_EVIDENCE_INVALID',
        'Source evidence requirement must be a boolean.',
      );
    }
    requireSignal(signal);
    let resolved = null;
    if (plan.actionKind === 'manual-next' || plan.actionKind === 'autoplay-next') {
      resolved = await nextEligible(context(plan, range, signal));
    } else if (plan.actionKind === 'manual-previous') {
      resolved = await previousEligible(context(plan, range, signal));
    } else if (plan.actionKind === 'goto-anchor') {
      const acceptedSchedule = currentSchedule();
      for (const candidate of acceptedSchedule.candidates({
        anchor: plan.anchor,
        cursorEpochMs: plan.fromCursorEpochMs,
        endEpochMs: range.endEpochMs,
      })) {
        requireSignal(signal);
        const windowEndEpochMs = Math.min(
          range.endEpochMs,
          candidate.targetEpochMs + acceptedSchedule.maxAnchorDistanceMs + 1,
        );
        const candidateResult = await eligibleAtOrAfter(context(plan, range, signal, {
          anchorEpochMs: candidate.targetEpochMs,
          windowEndEpochMs,
        }));
        requireSignal(signal);
        if (candidateResult === null) continue;
        const accepted = result(candidateResult, range);
        if (accepted.sourceEpochMs === null || accepted.sourceEpochMs < candidate.targetEpochMs
          || accepted.sourceEpochMs > candidate.targetEpochMs + acceptedSchedule.maxAnchorDistanceMs) {
          failReplayNavigation('REPLAY_NAVIGATION_ANCHOR_DISTANCE', 'Resolved source is outside the anchor window.');
        }
        // The eligible source is only an anchor-validity witness. Replay uses
        // an exclusive cutoff at the configured wall time, so that anchor bar
        // and every later bar remain hidden until a subsequent Replay step.
        resolved = requireSourceEvidence
          ? await visibleBefore(context(plan, range, signal, { targetEpochMs: candidate.targetEpochMs }))
          : Object.freeze({ sourceEpochMs: null, targetEpochMs: candidate.targetEpochMs });
        break;
      }
    } else if ((plan.actionKind === 'goto-exact' || plan.actionKind === 'restart-back-to')
      && requireSourceEvidence) {
      resolved = await visibleBefore(context(plan, range, signal, {
        targetEpochMs: plan.target.requestedTargetEpochMs,
      }));
    } else {
      failReplayNavigation('REPLAY_NAVIGATION_RESOLUTION_NOT_REQUIRED', 'Exact targets do not use traversal resolution.');
    }
    requireSignal(signal);
    if (resolved === null) {
      if (plan.actionKind === 'goto-anchor') {
        failReplayNavigation(
          GOTO_TARGET_UNAVAILABLE_IN_RANGE,
          'No later eligible GoTo target exists inside the active Replay Session range.',
        );
      }
      failReplayNavigation('REPLAY_NAVIGATION_TARGET_UNAVAILABLE', 'No eligible primary-source target was found.');
    }
    const accepted = result(resolved, range);
    requireDirection(accepted.targetEpochMs, plan);
    return accepted;
  }

  return Object.freeze({ resolve });
}
