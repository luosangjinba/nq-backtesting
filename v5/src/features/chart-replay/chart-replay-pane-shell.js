import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';

const PANE_TITLES = Object.freeze({
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
});

function paneTitle(pane = {}) {
  return PANE_TITLES[pane.id] || pane.id || 'Pane';
}

function createChartPane(pane) {
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
    </div>
  `;
  updatePaneElement(element, pane, false);
  return element;
}

function updatePaneElement(element, pane, active) {
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

export function createChartReplayPaneShellController({
  root,
  dispatchCommand,
  onLayoutState,
  setStatusText = () => {},
}) {
  const shell = root.querySelector('[data-layout-pane-shell]');
  const primaryPane = root.querySelector('[data-layout-pane][data-pane-id="primary"]');
  const chartViewport = root.querySelector('.chart-viewport');
  const chartHost = root.querySelector('[data-chart-host]');
  let currentActivePaneId = DEFAULT_ACTIVE_PANE_ID;

  function renderState(layoutState = DEFAULT_LAYOUT_STATE) {
    const panes = Array.isArray(layoutState.panes) && layoutState.panes.length
      ? layoutState.panes
      : DEFAULT_LAYOUT_STATE.panes;
    const activePaneId = layoutState.activePaneId || DEFAULT_ACTIVE_PANE_ID;
    currentActivePaneId = activePaneId;
    shell.dataset.layoutMode = layoutState.mode || DEFAULT_LAYOUT_STATE.mode;
    shell.dataset.layoutVariant = layoutState.variant || DEFAULT_LAYOUT_STATE.variant;
    shell.dataset.activePaneId = activePaneId;
    shell.dataset.paneCount = String(panes.length);

    const activeIds = new Set(panes.map((pane) => pane.id));
    Array.from(shell.querySelectorAll('[data-layout-pane]')).forEach((paneElement) => {
      if (paneElement !== primaryPane && !activeIds.has(paneElement.dataset.paneId)) {
        paneElement.remove();
      }
    });

    panes.forEach((pane, index) => {
      const id = pane.id || DEFAULT_ACTIVE_PANE_ID;
      const active = id === activePaneId;
      let paneElement = shell.querySelector(`[data-layout-pane][data-pane-id="${id}"]`);
      if (!paneElement) {
        paneElement = createChartPane(pane);
        shell.append(paneElement);
      }
      updatePaneElement(paneElement, pane, active);
      paneElement.style.order = String(index);
    });

    const primaryActive = activePaneId === DEFAULT_ACTIVE_PANE_ID;
    chartViewport.dataset.activePane = primaryActive ? 'true' : 'false';
    chartHost.dataset.activePane = primaryActive ? 'true' : 'false';
  }

  async function selectPane(paneId) {
    if (!paneId || paneId === currentActivePaneId) return;
    try {
      const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, { paneId });
      onLayoutState(layoutState);
      renderState(layoutState);
    } catch (error) {
      setStatusText(error?.message || String(error));
    }
  }

  shell.addEventListener('click', (event) => {
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    selectPane(paneElement.dataset.paneId);
  });
  shell.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    event.preventDefault();
    selectPane(paneElement.dataset.paneId);
  });

  return {
    renderState,
  };
}
