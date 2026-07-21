import { readReplayCursorProposal } from '../replay-contract/public.js';
import { requireReplayPaneResponsePlan } from '../replay-pane-response-contract/public.js';
import { workspaceTransactionIdentitiesEqual } from '../workspace-transaction-contract/public.js';
import { failChartApplication } from './application-error.js';
import { requireProjectedPaneSnapshot } from './snapshot-contract.js';

const SNAPSHOT_FIELDS = Object.freeze(['cursorProposal', 'panes', 'responsePlan', 'schemaVersion']);
const RESULT_FIELDS = Object.freeze(['paneId', 'reason', 'snapshot', 'status']);
const EMPTY_REASONS = new Set(['no-source-data', 'no-eligible-source']);

function exactFrozenRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.isFrozen(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failChartApplication(code, `${label} must be an exact frozen record.`);
  }
}

/** Validate one complete Pane-set snapshot at the sole chart-writer boundary. */
export function requireProjectedPaneSetSnapshot(candidate, identity) {
  exactFrozenRecord(candidate, SNAPSHOT_FIELDS, 'CHART_PANE_SET_INVALID', 'Projected Pane set');
  if (candidate.schemaVersion !== 2 || !Array.isArray(candidate.panes)
    || !Object.isFrozen(candidate.panes) || candidate.panes.length === 0) {
    failChartApplication('CHART_PANE_SET_SCHEMA', 'Projected Pane set schema is invalid.');
  }
  const proposal = readReplayCursorProposal(candidate.cursorProposal);
  if (!workspaceTransactionIdentitiesEqual(proposal.identity, identity)) {
    failChartApplication('CHART_PANE_SET_IDENTITY', 'Pane-set proposal belongs to another transaction.');
  }
  const responsePlan = requireReplayPaneResponsePlan(candidate.responsePlan);
  if (proposal.cursorEpochMs !== responsePlan.fromCursorEpochMs) {
    failChartApplication('CHART_PANE_SET_CURSOR_MISMATCH', 'Replay proposal does not start at the planned cursor.');
  }
  if (candidate.panes.length !== responsePlan.affectedPaneIds.length) {
    failChartApplication('CHART_PANE_SET_COVERAGE', 'Pane-set result count is incomplete.');
  }
  const seen = new Set();
  for (let index = 0; index < candidate.panes.length; index += 1) {
    const result = candidate.panes[index];
    exactFrozenRecord(result, RESULT_FIELDS, 'CHART_PANE_SET_RESULT_INVALID', 'Pane-set result');
    const expected = responsePlan.paneResponses[index];
    if (result.paneId !== expected.paneId || seen.has(result.paneId)) {
      failChartApplication('CHART_PANE_SET_ORDER', 'Pane results must exactly match planned stable order.');
    }
    seen.add(result.paneId);
    if (result.status === 'empty') {
      if (result.snapshot !== null || !EMPTY_REASONS.has(result.reason)) {
        failChartApplication('CHART_PANE_SET_EMPTY_INVALID', 'Empty Pane result is invalid.');
      }
      continue;
    }
    if (result.status !== 'ready' || result.reason !== null) {
      failChartApplication('CHART_PANE_SET_RESULT_STATUS', 'Pane result status is invalid.');
    }
    const snapshot = requireProjectedPaneSnapshot(result.snapshot, identity);
    if (snapshot.paneId !== result.paneId || snapshot.provenance.cursorProposal !== candidate.cursorProposal
      || snapshot.provenance.instrumentId !== expected.instrumentId
      || snapshot.provenance.displayTimeframeId !== expected.timeframeId
      || snapshot.provenance.sessionHoursMode !== responsePlan.sessionHours.mode
      || snapshot.provenance.calendarRevision !== responsePlan.sessionHours.calendarRevision) {
      failChartApplication(
        'CHART_PANE_SET_PROVENANCE_MISMATCH',
        'Pane snapshot provenance does not match the complete response plan.',
      );
    }
  }
  if (responsePlan.target.requestedTargetEpochMs !== null
    && proposal.targetEpochMs !== responsePlan.target.requestedTargetEpochMs) {
    failChartApplication('CHART_PANE_SET_TARGET_MISMATCH', 'Resolved Replay target differs from exact intent.');
  }
  const direction = proposal.targetEpochMs > proposal.cursorEpochMs
    ? 'forward'
    : proposal.targetEpochMs < proposal.cursorEpochMs ? 'backward' : 'retain';
  if (direction !== responsePlan.target.direction) {
    failChartApplication('CHART_PANE_SET_DIRECTION_MISMATCH', 'Resolved Replay direction differs from the plan.');
  }
  return candidate;
}
