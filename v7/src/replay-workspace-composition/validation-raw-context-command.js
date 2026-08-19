const LAYOUT_BY_COUNT = Object.freeze({
  1: 'layout.single',
  2: 'layout.two-columns',
  3: 'layout.three-columns',
  4: 'layout.four-grid',
});

function requireIntent(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.paneIntents)
    || value.paneIntents.length < 1 || value.paneIntents.length > 4
    || !Array.isArray(value.sourceSelectionIntents)
    || !Number.isSafeInteger(value.exclusiveReplayCutoffEpochMs)
    || typeof value.instrumentId !== 'string' || typeof value.sessionHoursId !== 'string') {
    throw new TypeError('Raw-context application intent is invalid.');
  }
  return value;
}

function sessionHoursMode(policyId) {
  if (policyId === 'session-hours.cme-eth') return 'eth';
  if (policyId === 'session-hours.cme-rth') return 'rth';
  throw new TypeError('Raw-context Session Hours policy is unsupported.');
}

function unavailable(message, cause = undefined) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.code = 'VALIDATION_RAW_CONTEXT_UNAVAILABLE';
  return error;
}

async function preflight(options, intent) {
  if (typeof options?.readActiveContext !== 'function') {
    throw new TypeError('Raw-context application requires an active-context reader.');
  }
  const active = await options.readActiveContext(intent);
  if (active?.sessionId !== intent.sessionId
    || active?.sessionRevision !== intent.sessionRevision
    || active?.datasetRevision !== intent.datasetRevision) {
    throw unavailable('The active Session or dataset no longer matches this frozen Case.');
  }
  return active;
}

/** Apply an output intent only through existing public Replay Workspace commands. */
export async function applyValidationRawContextIntent(commands, rawIntent, options = {}) {
  const intent = requireIntent(rawIntent);
  await preflight(options, intent);
  try {
    commands.changeTimeframeSync(false);
    await commands.changePaneLayout(LAYOUT_BY_COUNT[intent.paneIntents.length]);
    await commands.replaceSessionHours(sessionHoursMode(intent.sessionHoursId));
    for (const pane of intent.paneIntents) {
      commands.focusPane(pane.paneId);
      await commands.replaceInstrument(intent.instrumentId);
      await commands.replaceTimeframe(pane.timeframeId);
    }
    await commands.gotoExact(intent.exclusiveReplayCutoffEpochMs);
  } catch (cause) {
    throw unavailable('The frozen raw chart context could not be applied.', cause);
  }
  const fvg = intent.sourceSelectionIntents.find(({ evidenceRole }) => (
    evidenceRole === 'execution-fvg'
  ));
  let sourceStatus = fvg ? 'source-unavailable' : 'not-requested';
  if (fvg && commands.selectAnnotationEvidenceSource) {
    try {
      await commands.selectAnnotationEvidenceSource(fvg.sourceRecordId);
      sourceStatus = 'selected';
    } catch {
      sourceStatus = 'source-unavailable';
    }
  }
  return Object.freeze({
    campaignId: intent.campaignId,
    caseRef: intent.caseRef,
    sourceStatus,
    status: sourceStatus === 'source-unavailable'
      ? 'applied-with-source-unavailable' : 'applied-through-workspace-commands',
  });
}
