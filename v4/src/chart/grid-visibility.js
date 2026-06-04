import { CHART_THEME } from '../config.js';

let gridVisible = false;

const HIDDEN_GRID = {
  vertLines: { color: 'rgba(0, 0, 0, 0)' },
  horzLines: { color: 'rgba(0, 0, 0, 0)' },
};

export function isGridVisible() {
  return gridVisible;
}

export function setGridVisible(visible) {
  gridVisible = visible !== false;
  return gridVisible;
}

export function getGridOptions() {
  return gridVisible ? CHART_THEME.grid : HIDDEN_GRID;
}
