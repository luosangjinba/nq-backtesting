function formatEntryLabel(entry) {
  return `${entry.symbol} ${entry.side} ${entry.quantity}@${entry.entryPrice}`;
}

export function createJournalSurfaceState({
  analytics = null,
  entries = [],
  lastSnapshot = null,
} = {}) {
  const normalizedEntries = entries.map((entry) => ({ ...entry }));
  return {
    analytics: analytics ? { ...analytics } : null,
    count: normalizedEntries.length,
    entries: normalizedEntries,
    entryLabels: normalizedEntries.map(formatEntryLabel),
    lastSnapshot: lastSnapshot ? { ...lastSnapshot } : null,
    pnlLabel: analytics ? `Net P/L ${analytics.netPnl}` : 'Net P/L pending',
    snapshotLabel: lastSnapshot?.key ? `Saved ${lastSnapshot.key}` : 'No saved journal',
  };
}
