import { activationGenerationsEqual, requireActivationGeneration } from '../activation-generation/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { serializeTransactionId } from '../transaction-identity/public.js';
import {
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { failChartApplication } from './application-error.js';

function keyOf(identity) {
  return serializeTransactionId(readWorkspaceTransactionIdentity(identity).transactionId).value;
}

export function createChartApplicationState({ activationGeneration, sessionId }) {
  const scope = Object.freeze({
    activationGeneration: requireActivationGeneration(activationGeneration),
    sessionId: requireSessionId(sessionId),
  });
  const seen = new Set();
  let accepted = null;
  let current = null;
  let disposed = false;
  let revision = 0;

  function begin(identity) {
    if (disposed) failChartApplication('CHART_APPLICATION_DISPOSED', 'Chart application is disposed.');
    const parts = readWorkspaceTransactionIdentity(identity);
    if (!sessionIdsEqual(parts.sessionId, scope.sessionId)) {
      failChartApplication('CHART_APPLICATION_SESSION_MISMATCH', 'Transaction belongs to another Session.');
    }
    if (!activationGenerationsEqual(parts.activationGeneration, scope.activationGeneration)) {
      failChartApplication('CHART_APPLICATION_ACTIVATION_MISMATCH', 'Transaction belongs to another activation.');
    }
    const key = keyOf(identity);
    if (seen.has(key)) failChartApplication('CHART_APPLICATION_DUPLICATE', 'Transaction may be presented once.');
    seen.add(key);
    current = identity;
  }

  const isCurrent = (identity) => !disposed && current !== null
    && workspaceTransactionIdentitiesEqual(identity, current);

  return Object.freeze({
    begin,
    dispose: () => { disposed = true; },
    isCurrent,
    publish(identity, workspaceSnapshot, adapterRevision, expectedRevision) {
      if (!isCurrent(identity)) failChartApplication('CHART_APPLICATION_STALE', 'Transaction is stale.');
      if (revision + 1 !== expectedRevision || adapterRevision !== expectedRevision) {
        failChartApplication(
          'CHART_APPLICATION_REVISION_INVALID',
          'Chart application must publish its exact prepared target revision.',
        );
      }
      revision = expectedRevision;
      accepted = Object.freeze({ adapterRevision, identity, revision, workspaceSnapshot });
    },
    requirePublishable(identity, baseRevision) {
      if (!isCurrent(identity)) failChartApplication('CHART_APPLICATION_STALE', 'Transaction is stale.');
      if (revision !== baseRevision) {
        failChartApplication(
          'CHART_APPLICATION_BASE_REVISION_STALE',
          'Chart preparation no longer matches the accepted base revision.',
        );
      }
    },
    snapshot() {
      if (disposed) failChartApplication('CHART_APPLICATION_DISPOSED', 'Chart application is disposed.');
      return Object.freeze({ acceptedSnapshot: accepted, currentIdentity: current, revision });
    },
  });
}
