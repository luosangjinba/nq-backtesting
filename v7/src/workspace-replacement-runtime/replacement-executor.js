import { describeWorkspaceTransactionEnvelope } from '../workspace-transaction-contract/public.js';
import { failReplacement } from './replacement-error.js';
import { createWorkspaceReplacementInput, requireReplacementExecution } from './replacement-input.js';

const OPERATIONS = new Set(['session-hours-replacement', 'timeframe-replacement']);

/** Route one registered replacement through the existing atomic transaction runtime. */
export function createWorkspaceReplacementExecutor({ catalog, transactionRuntime }) {
  if (!transactionRuntime || typeof transactionRuntime.execute !== 'function') {
    failReplacement('WORKSPACE_REPLACEMENT_TRANSACTION_PORT_INVALID', 'Transaction runtime execute() is required.');
  }
  return Object.freeze({
    execute(value) {
      const execution = requireReplacementExecution(value);
      const intent = describeWorkspaceTransactionEnvelope(execution.intent);
      if (intent.phase !== 'intent' || !OPERATIONS.has(intent.operation)) {
        failReplacement('WORKSPACE_REPLACEMENT_OPERATION_INVALID', 'Replacement intent operation is invalid.');
      }
      const input = createWorkspaceReplacementInput({
        catalog,
        request: execution.request,
        target: execution.target,
      });
      return transactionRuntime.execute({
        input,
        intent: execution.intent,
        semanticCandidate: execution.semanticCandidate,
      });
    },
  });
}
