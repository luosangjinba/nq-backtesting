import { latestCases } from './campaign-case-model.js';
import { button, element } from './dom.js';

function belongsToMountedSession(record, context) {
  const observed = record.observationContext;
  return observed !== null
    && observed.sessionId === context.sessionId
    && observed.sessionRevision === context.sessionRevision
    && observed.datasetRevision === context.datasetRevision;
}

/** Render Outcome actions only for the exact mounted Session/dataset identity. */
export function createPendingOutcomesView({ context, onError, onRefresh, runtime }) {
  const eligible = runtime.listCampaigns().flatMap((summary) => {
    const documentValue = runtime.getCampaign(summary.campaignId);
    return latestCases(documentValue).filter((record) => (
      record.lifecycleState === 'observation-recorded'
        && belongsToMountedSession(record, context)
    )).map((record) => ({ documentValue, record }));
  });
  if (eligible.length === 0) return element('div', {
    className: 'validation-outcome-list',
  }, [element('p', {
    text: 'No observed Case from this exact Session and dataset is waiting for an Outcome.',
  })]);
  return element('div', { className: 'validation-outcome-list' }, eligible.map(({
    documentValue, record,
  }) => element('article', { className: 'validation-case-row' }, [
    element('div', {}, [
      element('strong', { text: documentValue.campaign.title }),
      element('span', {
        text: `${record.qualificationClass} · Case ${record.caseId.slice(0, 8)} r${record.caseRevision}`,
      }),
      element('small', {
        text: `Session ${record.observationContext.sessionId} r${record.observationContext.sessionRevision}`,
      }),
    ]),
    button('Record Outcome at current cutoff', async () => {
      try {
        await runtime.execute({
          campaignId: documentValue.campaign.campaignId,
          caseId: record.caseId,
          caseRevision: record.caseRevision,
          expectedDocumentRevision: runtime.getCampaign(
            documentValue.campaign.campaignId,
          ).documentRevision,
          kind: 'record-case-outcome',
          outcomeCutoffEpochMs: context.exclusiveReplayCutoffEpochMs,
        });
        onRefresh();
      } catch (cause) { onError(cause); }
    }, 'validation-button validation-button-primary'),
  ])));
}
