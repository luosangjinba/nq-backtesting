import * as bus from '../../event-bus.js';
import { DEFAULT_TIMEFRAME } from '../../config.js';
import { getPrimaryInstrument } from '../../data/primary-instrument-store.js';
import { resolveChartLoadRange } from '../../data/load-range-policy.js';
import { loadPrimaryRangeCommand, setPrimaryInstrumentCommand, setPrimaryTimeframeCommand } from '../../runtime/commands.js';
import { CHART_PANE_IDS, getPaneById } from '../../chart-panes/chart-pane-store.js';
import { formatTimeInput } from '../../utils.js';

export async function handleToolbarRangeLoad() {
  const startEl = document.getElementById('startInput');
  const endEl = document.getElementById('endInput');
  startEl.value = formatTimeInput(startEl.value.trim());
  endEl.value = formatTimeInput(endEl.value.trim());
  const start = startEl.value;
  const end = endEl.value;
  const primaryPane = getPaneById(CHART_PANE_IDS.PRIMARY);
  const tf = Number(primaryPane?.timeframe) || DEFAULT_TIMEFRAME;
  const instrument = getPrimaryInstrument();
  setPrimaryInstrumentCommand({ instrument });
  setPrimaryTimeframeCommand({ timeframe: tf });

  if (!start || !end) {
    bus.emit('status:update', { text: 'Choose a date range first', isError: true });
    return;
  }

  const loadRange = resolveChartLoadRange(start, end, tf);
  if (!loadRange.ok) {
    bus.emit('status:update', { text: loadRange.message, isError: true });
    return;
  }

  bus.emit('status:update', { text: 'Loading...', isError: false });

  try {
    const result = await loadPrimaryRangeCommand({
      start: loadRange.start,
      end: loadRange.end,
      timeframe: tf,
      instrument,
      outerRange: loadRange.outerRange,
    });
    if (loadRange.windowed) {
      startEl.value = loadRange.start;
      endEl.value = loadRange.end;
    }
    bus.emit('status:update', {
      text: loadRange.windowed ? loadRange.message : `Loaded ${result.bars.length} bars`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}
