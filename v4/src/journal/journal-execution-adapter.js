function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function firstLinkedOrderSetupId(liveTrade = {}) {
  return Array.isArray(liveTrade.linkedOrderSetupIds)
    ? normalizeText(liveTrade.linkedOrderSetupIds[0])
    : '';
}

export function getJournalExecutionOrderReviewId(liveTrade = {}) {
  const trade = liveTrade || {};
  return normalizeText(trade.orderReviewId) || firstLinkedOrderSetupId(trade);
}

export function toJournalExecution(liveTrade = {}) {
  const trade = liveTrade || {};
  const orderReviewId = getJournalExecutionOrderReviewId(trade);
  return {
    id: trade.id,
    accountId: trade.accountId,
    date: trade.date,
    orderReviewId,
    isLinkedToOrderSetup: Boolean(orderReviewId),
    tradeType: trade.tradeType,
    executionStatus: trade.executionStatus || 'taken',
    fills: Array.isArray(trade.fills) ? clone(trade.fills) : [],
    positionSize: trade.positionSize,
    plannedRisk: trade.plannedRisk,
    riskPerContract: trade.riskPerContract,
    grossPnl: trade.grossPnl,
    netPnl: trade.netPnl,
    commissions: trade.commissions,
    rMultipleManual: trade.rMultipleManual,
    timingAssessment: trade.timingAssessment,
    followedPlan: trade.followedPlan,
    ruleBreaks: trade.ruleBreaks,
    beforeEntryThoughts: trade.beforeEntryThoughts,
    managementNotes: trade.managementNotes,
    exitReason: trade.exitReason,
    reflection: trade.reflection,
    whatWasRight: trade.whatWasRight,
    whatWasWrong: trade.whatWasWrong,
    linkedChartNoteIds: Array.isArray(trade.linkedChartNoteIds) ? [...trade.linkedChartNoteIds] : [],
    legacyLinkedOrderSetupIds: Array.isArray(trade.linkedOrderSetupIds) ? [...trade.linkedOrderSetupIds] : [],
    unlinkedSnapshot: {
      instrument: trade.instrument,
      direction: trade.direction,
      result: trade.result,
      stopLoss: trade.stopLoss,
      target: trade.target,
      entryReason: trade.entryReason,
    },
  };
}

export function getJournalExecutions(journalDay = {}) {
  return Array.isArray(journalDay.liveTrades)
    ? journalDay.liveTrades.map(toJournalExecution)
    : [];
}
