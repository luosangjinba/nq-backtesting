import {
  createRawContextIntent,
  failValidation,
  strictPortableValue,
} from '../validation-study-domain/public.js';
import { executeValidationCampaignCommand, exactCase } from './command-controller.js';
import {
  consumePreview,
  disposePreviews,
  prepareCaseObservation,
} from './observation-controller.js';
import {
  campaignDocument,
  createValidationCampaignRuntimeState,
  hydrateValidationCampaignRuntime,
  normalizeRuntimeError,
  publishValidationCampaignState,
  requireRuntimeReady,
  snapshotValidationCampaignState,
} from './runtime-state.js';

function requireReadable(state) {
  if (state.disposed) {
    failValidation('VALIDATION_CAMPAIGN_DISPOSED', 'Validation Campaign runtime is disposed.', {
      operation: 'read',
    });
  }
}
/** Construct and hydrate the sole Campaign writer for one application generation. */
export async function createValidationCampaignRuntime(options = {}) {
  const state = createValidationCampaignRuntimeState(options);
  await hydrateValidationCampaignRuntime(state);

  async function execute(rawCommand, signal = new AbortController().signal) {
    const command = strictPortableValue(rawCommand, '$command');
    const operation = command.kind ?? 'execute';
    requireRuntimeReady(state, operation);
    if (signal.aborted) {
      failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Campaign command was cancelled.', {
        operation,
      });
    }
    state.busy = true;
    publishValidationCampaignState(state);
    try {
      return await executeValidationCampaignCommand(state, command, signal);
    } catch (error) {
      throw normalizeRuntimeError(error, operation);
    } finally {
      state.busy = false;
      if (!state.disposed) publishValidationCampaignState(state);
    }
  }

  return Object.freeze({
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      state.status = 'disposed';
      disposePreviews(state);
      state.listeners.clear();
    },
    execute,
    getCampaign(campaignId) {
      requireReadable(state);
      return campaignDocument(state, campaignId);
    },
    listCampaigns() {
      requireReadable(state);
      return snapshotValidationCampaignState(state).campaigns;
    },
    async prepareAuditExport(campaignId, signal = new AbortController().signal) {
      requireRuntimeReady(state, 'prepare-audit-export');
      if (signal.aborted) {
        failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Audit export was cancelled.', {
          operation: 'prepare-audit-export',
        });
      }
      return state.auditExporter.prepare({ campaignDocument: campaignDocument(state, campaignId) });
    },
    async prepareCaseObservation(request, signal = new AbortController().signal) {
      requireRuntimeReady(state, 'prepare-case-observation');
      try { return await prepareCaseObservation(state, strictPortableValue(request), signal); } catch (error) {
        throw normalizeRuntimeError(error, 'prepare-case-observation');
      }
    },
    prepareRawContextIntent({ campaignId, caseId, caseRevision, contextRole = 'observation' }) {
      requireReadable(state);
      const document = campaignDocument(state, campaignId);
      const record = exactCase(document, caseId, caseRevision);
      return createRawContextIntent({
        campaignId,
        caseRecord: record,
        contextRole,
        crypto: state.crypto,
      });
    },
    readAnalysisDrilldown(campaignId, analysisRunId, metricId) {
      requireReadable(state);
      const document = campaignDocument(state, campaignId);
      const analysis = document.analysisRuns.find((entry) => entry.analysisRunId === analysisRunId);
      if (!analysis) throw new TypeError('Analysis Run was not found.');
      const entry = analysis.drilldownIndex.find((candidate) => candidate.metricId === metricId);
      if (!entry) throw new TypeError('Analysis metric drill-down was not found.');
      return Object.freeze({
        analysisRunId,
        campaignId,
        caseRefs: entry.caseRefs,
        metricId,
      });
    },
    readCase(campaignId, caseId, caseRevision = null) {
      requireReadable(state);
      const document = campaignDocument(state, campaignId);
      if (caseRevision !== null) return exactCase(document, caseId, caseRevision);
      const revisions = document.caseRevisions
        .filter((entry) => entry.caseId === caseId)
        .sort((left, right) => right.caseRevision - left.caseRevision);
      if (revisions.length === 0) throw new TypeError('Study Case was not found.');
      return revisions[0];
    },
    snapshot: () => snapshotValidationCampaignState(state),
    subscribe(listener) {
      requireReadable(state);
      if (typeof listener !== 'function') throw new TypeError('Campaign subscriber must be a function.');
      state.listeners.add(listener);
      listener(snapshotValidationCampaignState(state));
      return Object.freeze({ unsubscribe: () => state.listeners.delete(listener) });
    },
  });
}
