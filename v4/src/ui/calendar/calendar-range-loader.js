import * as bus from '../../event-bus.js';
import { getPrimaryInstrument } from '../../data/primary-instrument-store.js';
import { resolveChartLoadRange } from '../../data/load-range-policy.js';
import { loadPrimaryRangeCommand, setPrimaryTimeframeCommand } from '../../runtime/commands.js';
import { recordRangeHistory } from './calendar-date-range-history.js';

export async function loadCalendarRange({
  start,
  end,
  timeframe,
  successText = '',
  onLoaded = () => {},
  closePopover = () => {},
  recordHistory = true,
}) {
  const loadRange = resolveChartLoadRange(start, end, timeframe);
  if (!loadRange.ok) {
    throw new Error(loadRange.message);
  }
  bus.emit('status:update', { text: 'Loading...', isError: false });
  const result = await loadPrimaryRangeCommand({
    start: loadRange.start,
    end: loadRange.end,
    timeframe,
    instrument: getPrimaryInstrument(),
    outerRange: loadRange.outerRange,
  });
  onLoaded(loadRange);
  setPrimaryTimeframeCommand({ timeframe });
  if (recordHistory) recordRangeHistory(start, end, timeframe);
  bus.emit('status:update', {
    text: loadRange.windowed ? loadRange.message : successText || `Loaded ${result.bars.length} bars`,
    isError: false,
  });
  closePopover();
}

export async function loadResolvedCalendarWindow({
  loadRange,
  timeframe,
  successText = '',
  onLoaded = () => {},
  closePopover = () => {},
}) {
  bus.emit('status:update', { text: 'Loading...', isError: false });
  const result = await loadPrimaryRangeCommand({
    start: loadRange.start,
    end: loadRange.end,
    timeframe,
    instrument: getPrimaryInstrument(),
    outerRange: loadRange.outerRange,
  });
  onLoaded(loadRange);
  setPrimaryTimeframeCommand({ timeframe });
  bus.emit('status:update', {
    text: successText || loadRange.message || `Loaded ${result.bars.length} bars`,
    isError: false,
  });
  closePopover();
}
