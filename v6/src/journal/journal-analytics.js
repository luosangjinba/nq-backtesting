import { createJournalEntry } from './journal-entry.js';

function signedPnl(entry) {
  if (entry.exitPrice == null) return 0;
  const direction = entry.side === 'buy' ? 1 : -1;
  return (entry.exitPrice - entry.entryPrice) * entry.quantity * direction;
}

function createEmptySummary() {
  return {
    entryCount: 0,
    closedCount: 0,
    openCount: 0,
    winningCount: 0,
    losingCount: 0,
    scratchCount: 0,
    grossProfit: 0,
    grossLoss: 0,
    netPnl: 0,
    winRate: 0,
    averageClosedPnl: 0,
    bySymbol: {},
  };
}

function roundMetric(value) {
  return Number(value.toFixed(8));
}

function ensureSymbolBucket(summary, symbol) {
  if (!summary.bySymbol[symbol]) {
    summary.bySymbol[symbol] = {
      entryCount: 0,
      closedCount: 0,
      netPnl: 0,
    };
  }
  return summary.bySymbol[symbol];
}

export function summarizeJournalEntries(records = []) {
  if (!Array.isArray(records)) {
    throw new Error('Journal analytics records must be an array.');
  }

  const summary = createEmptySummary();
  for (const record of records) {
    const entry = createJournalEntry(record);
    const pnl = signedPnl(entry);
    const symbolBucket = ensureSymbolBucket(summary, entry.symbol);
    summary.entryCount += 1;
    symbolBucket.entryCount += 1;

    if (entry.exitPrice == null) {
      summary.openCount += 1;
      continue;
    }

    summary.closedCount += 1;
    symbolBucket.closedCount += 1;
    summary.netPnl += pnl;
    symbolBucket.netPnl += pnl;
    if (pnl > 0) {
      summary.winningCount += 1;
      summary.grossProfit += pnl;
    } else if (pnl < 0) {
      summary.losingCount += 1;
      summary.grossLoss += pnl;
    } else {
      summary.scratchCount += 1;
    }
  }

  summary.netPnl = roundMetric(summary.netPnl);
  summary.grossProfit = roundMetric(summary.grossProfit);
  summary.grossLoss = roundMetric(summary.grossLoss);
  summary.winRate = summary.closedCount ? roundMetric(summary.winningCount / summary.closedCount) : 0;
  summary.averageClosedPnl = summary.closedCount ? roundMetric(summary.netPnl / summary.closedCount) : 0;
  Object.values(summary.bySymbol).forEach((bucket) => {
    bucket.netPnl = roundMetric(bucket.netPnl);
  });
  return summary;
}
