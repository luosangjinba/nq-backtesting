import { formatTradovatePnl } from './tradovate-performance-importer.js';

function formatOk(value) {
  return value ? 'ok' : 'warning';
}

function formatWarnings(warnings = []) {
  return warnings.map((warning) => `  - ${warning}`);
}

function formatFileAlignmentPreview(report = {}) {
  if (!report) return [];
  const lines = [
    `File alignment: ${formatOk(report.ok)} · performance=${report.performanceRows || 0} orders=${report.ordersRows || 0} fills=${report.fillsRows || 0} position=${report.positionRows || 0} cash=${report.cashRows || 0} balance=${report.balanceRows || 0}`,
  ];
  if (report.missingPerformanceFillIds?.length) {
    lines.push(`  - Missing Performance fill IDs in Fills CSV: ${report.missingPerformanceFillIds.slice(0, 8).join(', ')}${report.missingPerformanceFillIds.length > 8 ? '...' : ''}`);
  }
  if (report.fillsWithoutOrders?.length) {
    lines.push(`  - Fills referencing missing Orders: ${report.fillsWithoutOrders.slice(0, 8).map((item) => `${item.fillId}->${item.orderId}`).join(', ')}${report.fillsWithoutOrders.length > 8 ? '...' : ''}`);
  }
  lines.push(...formatWarnings(report.warnings || []));
  return lines;
}

function formatReconciliationPreview(reconciliation = {}) {
  const lines = [];
  const position = reconciliation.position || {};
  if (position.provided) {
    lines.push(`Position reconcile: ${formatOk(position.ok)} · performance=${position.performancePairs || 0} position=${position.positionPairs || 0} missing=${position.missingPairs?.length || 0} extra=${position.extraPairs?.length || 0} mismatched=${position.mismatchedPairs?.length || 0}`);
    lines.push(...formatWarnings(position.warnings));
  }
  const cash = reconciliation.cash || {};
  if (cash.provided) {
    lines.push(`Cash reconcile: ${formatOk(cash.ok)} · commission cash=${cash.commissionTotal ?? 0} fills=${cash.fillsCommissionTotal ?? 0} diff=${cash.commissionDifference ?? 0} · tradePaired=${cash.tradePairedTotal ?? 0} performance=${cash.performancePnlTotal ?? 0} diff=${cash.tradePairedDifference ?? 0}`);
    lines.push(...formatWarnings(cash.warnings));
  }
  const balance = reconciliation.balance || {};
  if (balance.provided) {
    if (balance.skipped) {
      lines.push(`Balance reconcile: skipped · ${balance.skippedReason || 'not applicable'}`);
      return lines;
    }
    const mismatches = Array.isArray(balance.dailyRows)
      ? balance.dailyRows.filter((row) => !row.ok).length
      : 0;
    lines.push(`Balance reconcile: ${formatOk(balance.ok)} · days=${balance.dailyRows?.length || 0} mismatched=${mismatches}`);
    lines.push(...formatWarnings(balance.warnings));
  }
  return lines;
}

function formatSinglePreview(result) {
  return [
    `Instrument: ${result.payload.instrument}`,
    `Timestamp timezone: ${result.payload.source.timezone}`,
    `Source rows: ${result.sourceRows}`,
    `Orders rows: ${result.ordersRows || 0}`,
    `Fills rows: ${result.fillsRows || 0}`,
    `Live Records: ${result.liveRecords}`,
    `Skipped rows: ${result.skippedRows}`,
    `Wins / Losses / Breakeven: ${result.wins} / ${result.losses} / ${result.breakeven}`,
    `Total P/L: ${formatTradovatePnl(result.totalPnl)}`,
    ...formatFileAlignmentPreview(result.fileAlignment),
    ...formatReconciliationPreview(result.reconciliation),
  ].join('\n');
}

export function formatTradovateImportPreview(results, input) {
  const resultList = Array.isArray(results) ? results : [results];
  const lines = [
    '> tradovate_live_record_preview',
    '',
    'Summary',
    '-------',
    `Source: ${input.sourceFileName}`,
  ];
  if (input.zipFileName) {
    lines.push(`ZIP package: ${input.zipFileName}`);
    lines.push(...(input.zipMatches.length ? input.zipMatches : ['No CSV files auto-matched from ZIP.']).map((line) => `  - ${line}`));
  }
  resultList.forEach((result, index) => {
    if (index > 0) lines.push('');
    lines.push(formatSinglePreview(result));
  });
  lines.push(
    '',
    'Import behavior',
    '---------------',
    'Status: closed',
    'Performance CSV is the trade-pair source; one Performance row becomes one Live Record.',
    'Orders CSV enriches stop/limit target state, including cancelled bracket orders.',
    'Fills CSV enriches fill/order IDs and commission. Setup links and reasons stay manual.',
    'Position/Cash/Account Balance CSV files are reconcile-only checks and do not change Live Records.'
  );
  if (resultList.length > 1) {
    lines.push('Mixed CSV detected: Auto creates one Review JSON per instrument. Import each JSON while the V4 Main instrument matches that file.');
  }
  return lines.join('\n');
}
