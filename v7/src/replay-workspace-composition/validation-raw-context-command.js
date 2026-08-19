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

/** Apply an output intent only through existing public Replay Workspace commands. */
export async function applyValidationRawContextIntent(commands, rawIntent) {
  const intent = requireIntent(rawIntent);
  commands.changeTimeframeSync(false);
  await commands.changePaneLayout(LAYOUT_BY_COUNT[intent.paneIntents.length]);
  await commands.replaceSessionHours(sessionHoursMode(intent.sessionHoursId));
  for (const pane of intent.paneIntents) {
    commands.focusPane(pane.paneId);
    await commands.replaceInstrument(intent.instrumentId);
    await commands.replaceTimeframe(pane.timeframeId);
  }
  await commands.gotoExact(intent.exclusiveReplayCutoffEpochMs);
  const fvg = intent.sourceSelectionIntents.find(({ evidenceRole }) => (
    evidenceRole === 'execution-fvg'
  ));
  if (fvg) await commands.selectAnnotationEvidenceSource?.(fvg.sourceRecordId);
  return Object.freeze({
    campaignId: intent.campaignId,
    caseRef: intent.caseRef,
    status: 'applied-through-workspace-commands',
  });
}
