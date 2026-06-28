import { setPrimaryInstrument } from '../../data/primary-instrument-store.js';
import {
  setComparisonWindowEnabled,
  updateComparisonViewDescriptor,
} from '../../comparison/comparison-window-store.js';

export function setReplayToolbarRange(start, end, timeframe) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
  if (tfSelect && timeframe) tfSelect.value = String(timeframe);
}

export function setReplayToolbarPrimaryInstrument(instrument) {
  const normalizedInstrument = setPrimaryInstrument(instrument);
  const primaryInstrumentSelect = document.getElementById('primaryInstrumentSelect');
  if (primaryInstrumentSelect) primaryInstrumentSelect.value = normalizedInstrument;
  return normalizedInstrument;
}

export function applyReplayComparisonState(comparison) {
  if (!comparison) {
    setComparisonWindowEnabled(false);
    return;
  }
  const descriptorPatch = Object.fromEntries(
    Object.entries({
      viewId: comparison.viewId,
      instrument: comparison.instrument,
      timeframe: comparison.timeframe,
      syncMode: comparison.syncMode,
      layoutMode: comparison.layoutMode,
    }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  if (!comparison?.enabled) {
    if (Object.keys(descriptorPatch).length) updateComparisonViewDescriptor(descriptorPatch);
    setComparisonWindowEnabled(false);
    return;
  }

  updateComparisonViewDescriptor(descriptorPatch);
  setComparisonWindowEnabled(true);
}
