import { serializeSessionId } from '../session-identity/public.js';

function requireConfiguration(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.bridge?.bind !== 'function'
    || typeof value.outcomeApi?.createValidationOutcomeWindowAdapter !== 'function'
    || typeof value.ui?.attachReplayWorkspace !== 'function'
    || (value.takeRawContextIntent !== undefined
      && typeof value.takeRawContextIntent !== 'function')) {
    throw new TypeError('Replay Workspace received an invalid Validation Campaign configuration.');
  }
  return value;
}

function captureContext({ annotationWorkflow, calculatedSeriesWorkflow, record, session, snapshot }) {
  const composition = snapshot();
  const calculated = calculatedSeriesWorkflow?.snapshot().runtime ?? null;
  const paneWorkspace = session.workspaceState.read(composition.paneWorkspace);
  return Object.freeze({
    annotationSources: annotationWorkflow?.listEvidenceSources() ?? Object.freeze([]),
    calculatedPanes: calculated?.panes ?? Object.freeze([]),
    campaignInstrumentIds: record.configuration.instrumentIds,
    exclusiveReplayCutoffEpochMs: composition.replay.cursorEpochMs,
    paneWorkspace,
    sessionId: composition.replay.sessionId,
    sessionRevision: record.revision,
    workspaceRevision: composition.workspace.acceptedSnapshot?.revision ?? 0,
  });
}

/** Bind one mounted Replay's read-only evidence and Outcome adapters to the app-scoped Campaign. */
export function createWorkspaceValidationCampaign({
  annotationWorkflow,
  calculatedSeriesWorkflow,
  configuration: rawConfiguration,
  data,
  paneAddonPort,
  record,
  session,
  snapshotComposition,
}) {
  const configuration = requireConfiguration(rawConfiguration);
  if (configuration === null) return null;
  let binding = null;
  let pendingRawContextIntent = null;
  let uiAttachment = null;
  let started = false;

  function readCaptureContext() {
    return captureContext({
      annotationWorkflow, calculatedSeriesWorkflow, record, session, snapshot: snapshotComposition,
    });
  }

  function start() {
    if (started) return readCaptureContext();
    started = true;
    const outcome = configuration.outcomeApi.createValidationOutcomeWindowAdapter({
      barData: data.barData,
      crypto: configuration.crypto,
      market: session.market,
      readReplaySnapshot: session.replay.snapshot,
      readWorkspaceSnapshot: () => snapshotComposition().workspace.acceptedSnapshot,
      sessionRange: session.range,
    });
    binding = configuration.bridge.bind(Object.freeze({
      observeOutcome: outcome.observeOutcome,
      readCaptureContext,
      readFvg(input) {
        if (!annotationWorkflow) throw new TypeError('Manual FVG workflow is unavailable.');
        return annotationWorkflow.readEvidenceObservation(input);
      },
      readSma(input) {
        if (!calculatedSeriesWorkflow) throw new TypeError('SMA workflow is unavailable.');
        return calculatedSeriesWorkflow.readEvidenceObservation(input);
      },
    }));
    uiAttachment = configuration.ui.attachReplayWorkspace({
      paneAddonPort,
      readCaptureContext,
    });
    pendingRawContextIntent = configuration.takeRawContextIntent?.(
      serializeSessionId(record.sessionId).value,
    ) ?? null;
    return readCaptureContext();
  }

  return Object.freeze({
    dispose() {
      uiAttachment?.dispose();
      uiAttachment = null;
      binding?.unbind();
      binding = null;
      pendingRawContextIntent = null;
      started = false;
    },
    snapshot: () => Object.freeze({ started }),
    start,
    takeRawContextIntent() {
      const intent = pendingRawContextIntent;
      pendingRawContextIntent = null;
      return intent;
    },
  });
}
