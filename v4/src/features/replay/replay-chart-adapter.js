import * as chart from '../../chart/chart-manager.js';
import {
  appendPrimaryChartBar,
  clearPrimaryChartData,
  projectPrimaryChartBars,
  replacePrimaryChartData,
  replacePrimaryChartSlice,
} from '../../runtime/primary-chart-runtime.js';

export {
  appendPrimaryChartBar,
  clearPrimaryChartData,
  projectPrimaryChartBars,
  replacePrimaryChartData,
  replacePrimaryChartSlice,
};

export function clearReplayChartCursors() {
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
}

export function hideReplayCursor() {
  chart.hideReplayCursor();
}

export function hidePickPreviewCursor() {
  chart.hidePickPreviewCursor();
}

export function hasPickPreviewCursor() {
  return chart.hasPickPreviewCursor();
}

export function showPickPreviewCursor(time) {
  chart.showPickPreviewCursor(time);
}

export function showReplayCursor(time) {
  chart.showReplayCursor(time);
}

export function getVisibleLogicalRange() {
  return chart.getVisibleLogicalRange();
}

export function setVisibleLogicalRange(from, to) {
  chart.setVisibleLogicalRange(from, to);
}

export function onReplayChartClick(handler) {
  chart.onClick(handler);
}

export function onReplayCrosshairMove(handler) {
  chart.onCrosshairMove(handler);
}
