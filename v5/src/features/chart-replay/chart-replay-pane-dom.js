import {
  DEFAULT_ACTIVE_PANE_ID,
} from '../../contracts/layout-contracts.js';

const PANE_TITLES = Object.freeze({
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
});

export function paneTitle(pane = {}) {
  return PANE_TITLES[pane.id] || pane.id || 'Pane';
}

export function splitHandleSpecs(variant) {
  if (variant === 'twice.vertical') {
    return [{ id: 'primary-secondary-x', first: 'primary', second: 'secondary', orientation: 'vertical' }];
  }
  if (variant === 'twice.horizontal') {
    return [{ id: 'primary-secondary-y', first: 'primary', second: 'secondary', orientation: 'horizontal' }];
  }
  if (variant === 'triple.vertical') {
    return [
      { id: 'primary-secondary-x', first: 'primary', second: 'secondary', orientation: 'vertical' },
      { id: 'secondary-tertiary-x', first: 'secondary', second: 'tertiary', orientation: 'vertical' },
    ];
  }
  if (variant === 'triple.horizontal') {
    return [
      { id: 'primary-secondary-y', first: 'primary', second: 'secondary', orientation: 'horizontal' },
      { id: 'secondary-tertiary-y', first: 'secondary', second: 'tertiary', orientation: 'horizontal' },
    ];
  }
  if (variant === 'triple.left' || variant === 'triple.right') {
    return [
      { id: 'primary-secondary-x', first: 'primary', second: 'secondary', orientation: 'vertical' },
      { id: 'secondary-tertiary-y', first: 'secondary', second: 'tertiary', orientation: 'horizontal' },
    ];
  }
  if (variant === 'triple.top' || variant === 'triple.bottom') {
    return [
      { id: 'primary-secondary-y', first: 'primary', second: 'secondary', orientation: 'horizontal' },
      { id: 'secondary-tertiary-x', first: 'secondary', second: 'tertiary', orientation: 'vertical' },
    ];
  }
  return [];
}

export function createChartPane(pane) {
  const element = document.createElement('div');
  element.className = 'chart-pane';
  element.dataset.layoutPane = '';
  element.dataset.hasChartHost = 'true';
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  element.innerHTML = `
    <div class="chart-viewport chart-viewport-secondary" data-chart-pane-id="" data-active-pane="false" data-pane-role="secondary-chart" aria-label="Chart pane">
      <div class="chart-host" data-chart-host data-chart-pane-id="" data-active-pane="false">
        <span data-layout-pane-title></span>
      </div>
      <div class="chart-ohlc-overlay" data-chart-ohlc-overlay hidden>
        <span data-chart-market-status aria-label="Open market status"></span>
        <span data-chart-ohlc-symbol>NQ</span>
        <span data-chart-ohlc-timeframe>1m</span>
        <span class="chart-ohlc-legend" data-chart-ohlc-legend aria-label="Current bar OHLC"></span>
      </div>
      <div class="chart-toolbar" data-chart-toolbar aria-label="Chart navigation">
        <button type="button" data-chart-reset-view title="Reset view" aria-label="Reset view" disabled>&#8634;</button>
      </div>
    </div>
  `;
  updatePaneElement(element, pane, false);
  return element;
}

export function createSplitHandle(spec) {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'chart-pane-split-handle';
  handle.dataset.layoutSplitHandle = spec.id;
  handle.dataset.firstPaneId = spec.first;
  handle.dataset.secondPaneId = spec.second;
  handle.setAttribute('aria-orientation', spec.orientation);
  handle.setAttribute('aria-label', `Resize ${paneTitle({ id: spec.first })} and ${paneTitle({ id: spec.second })} panes`);
  handle.title = 'Drag to resize panes';
  return handle;
}

export function updatePaneElement(element, pane, active) {
  const id = pane.id || DEFAULT_ACTIVE_PANE_ID;
  element.dataset.paneId = id;
  element.dataset.paneRole = pane.role || 'secondary';
  element.dataset.activePane = active ? 'true' : 'false';
  element.dataset.displayTimeframe = pane.displayTimeframe == null ? '' : String(pane.displayTimeframe);
  element.dataset.time = pane.time || '';
  element.dataset.dateRangeFrom = pane.dateRange?.from || '';
  element.dataset.dateRangeTo = pane.dateRange?.to || '';
  element.dataset.crosshairActive = pane.crosshair?.active ? 'true' : 'false';
  element.dataset.crosshairTime = pane.crosshair?.time || '';
  element.dataset.crosshairPrice = pane.crosshair?.price == null ? '' : String(pane.crosshair.price);
  element.classList.toggle('is-active', active);
  element.setAttribute('aria-label', `${paneTitle(pane)} chart pane`);
  element.setAttribute('aria-pressed', active ? 'true' : 'false');
  const viewport = element.querySelector('.chart-viewport');
  if (viewport) {
    viewport.dataset.chartPaneId = id;
    viewport.dataset.activePane = active ? 'true' : 'false';
    viewport.dataset.paneRole = `${pane.role || 'secondary'}-chart`;
    viewport.setAttribute('aria-label', `${paneTitle(pane)} chart pane`);
  }
  const host = element.querySelector('[data-chart-host]');
  if (host) {
    host.dataset.chartPaneId = id;
    host.dataset.activePane = active ? 'true' : 'false';
  }
  const title = element.querySelector('[data-layout-pane-title]');
  if (title) {
    title.textContent = `${paneTitle(pane)} pane`;
  }
}
