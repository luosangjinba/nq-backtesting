import {
  isComparisonWindowEnabled,
  setComparisonWindowEnabled,
} from '../../comparison/comparison-window-store.js';
import {
  CHART_PANE_IDS,
  CHART_PANE_LAYOUTS,
  getChartPaneState,
  setActivePane,
  setChartPaneLayout,
} from '../../chart-panes/chart-pane-store.js';

function applyChartLayout(layout) {
  if (layout === CHART_PANE_LAYOUTS.TWO_COLUMN) {
    setComparisonWindowEnabled(true);
    setChartPaneLayout(CHART_PANE_LAYOUTS.TWO_COLUMN);
    return;
  }
  setComparisonWindowEnabled(true);
  setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
  setActivePane(CHART_PANE_IDS.COMPARISON);
}

export function syncLayoutControls() {
  const layout = getChartPaneState().layout;
  const chartLayoutBtn = document.getElementById('chartLayoutBtn');
  const chartLayoutPopover = document.getElementById('chartLayoutPopover');
  const isTwoColumn = isComparisonWindowEnabled() && layout === CHART_PANE_LAYOUTS.TWO_COLUMN;
  chartLayoutBtn
    ?.querySelector('.toolbar-layout-icon')
    ?.classList.toggle('toolbar-layout-icon-two-column', isTwoColumn);
  chartLayoutBtn
    ?.querySelector('.toolbar-layout-icon')
    ?.classList.toggle('toolbar-layout-icon-single-right', !isTwoColumn);
  chartLayoutPopover?.querySelectorAll('[data-layout-action]').forEach((button) => {
    button.classList.toggle('active', button.dataset.layoutAction === layout);
  });
}

function positionLayoutPopover() {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(108, window.innerWidth - 16);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))}px`;
  popover.style.top = `${rect.bottom + 8}px`;
}

function openLayoutPopover() {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');
  if (!button || !popover) return;
  syncLayoutControls();
  popover.hidden = false;
  button.classList.add('active');
  button.setAttribute('aria-expanded', 'true');
  positionLayoutPopover();
}

export function initToolbarLayoutController({ closePeers = () => {} } = {}) {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');

  function close() {
    if (!button || !popover) return;
    popover.hidden = true;
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (!popover) return;
    if (popover.hidden) {
      closePeers();
      openLayoutPopover();
    } else {
      close();
    }
  }

  function handleLayoutClick(event) {
    const action = event.target.closest('[data-layout-action]')?.dataset.layoutAction;
    if (!action) return;
    applyChartLayout(action === 'two-column' ? CHART_PANE_LAYOUTS.TWO_COLUMN : CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
    close();
  }

  button?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  popover?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLayoutClick(e);
  });

  return { close, toggle, sync: syncLayoutControls };
}
