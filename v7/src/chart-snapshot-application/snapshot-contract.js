import { createProjectedBar, isProjectedPaneSnapshot } from '../projection-domain/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import { workspaceTransactionIdentitiesEqual } from '../workspace-transaction-contract/public.js';
import { failChartApplication } from './application-error.js';

const SNAPSHOT_FIELDS = Object.freeze(['bars', 'paneId', 'provenance', 'schemaVersion']);
const PANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function requireExactFrozenObject(value, fields, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.isFrozen(value)) {
    failChartApplication(code, 'Projected pane snapshot and nested values must be frozen objects.');
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failChartApplication(code, 'Projected pane snapshot contains unexpected fields.');
  }
}

/** Validate the immutable Projection Domain output accepted by the chart writer. */
export function requireProjectedPaneSnapshot(candidate, identity) {
  requireExactFrozenObject(candidate, SNAPSHOT_FIELDS, 'CHART_SNAPSHOT_INVALID');
  if (candidate.schemaVersion !== 1 || !PANE_ID_PATTERN.test(candidate.paneId)) {
    failChartApplication('CHART_SNAPSHOT_SCHEMA', 'Projected pane snapshot schema is invalid.');
  }
  if (!Array.isArray(candidate.bars) || !Object.isFrozen(candidate.bars) || candidate.bars.length === 0) {
    failChartApplication('CHART_SNAPSHOT_BARS', 'Projected bars must be a non-empty frozen array.');
  }
  if (!isProjectedPaneSnapshot(candidate)) {
    for (const bar of candidate.bars) {
      if (!Object.isFrozen(bar)) failChartApplication('CHART_SNAPSHOT_BAR_MUTABLE', 'Bars must be frozen.');
      if (!Object.hasOwn(bar, 'displayEpochMs')) {
        failChartApplication('CHART_SNAPSHOT_BAR_DISPLAY_TIME', 'Projected bars require canonical display time.');
      }
      createProjectedBar(bar);
    }
  }
  if (!candidate.provenance || !Object.isFrozen(candidate.provenance)) {
    failChartApplication('CHART_SNAPSHOT_PROVENANCE', 'Projection provenance must be frozen.');
  }
  const proposal = readReplayCursorProposal(candidate.provenance.cursorProposal);
  if (!workspaceTransactionIdentitiesEqual(proposal.identity, identity)) {
    failChartApplication('CHART_SNAPSHOT_IDENTITY', 'Projection provenance belongs to another transaction.');
  }
  return candidate;
}
