import { CHART_HISTORY_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

export function connectLeftwardHistoryInputBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribeVisibleRangeChange !== 'function') {
    throw new Error('Leftward history input bridge requires a chart surface with visible range events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Leftward history input bridge requires dispatchCommand.');
  }

  let active = true;
  const unsubscribe = chartSurface.subscribeVisibleRangeChange((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    const from = Number(event.from);
    const to = Number(event.to);
    if (!paneId || !Number.isFinite(from) || !Number.isFinite(to) || from >= 0) {
      return;
    }
    void Promise.resolve(dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
      paneId,
      visibleRange: { from, to },
    }));
  });

  return {
    destroy() {
      active = false;
      unsubscribe();
    },
  };
}
