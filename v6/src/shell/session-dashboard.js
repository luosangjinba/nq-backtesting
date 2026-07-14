import {
  CHART_BOUNDARY_METADATA_COMMANDS,
  CHART_BOUNDARY_METADATA_EVENTS,
  SESSION_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { createRecentSessionsView, createSessionDateBoundaryView } from './session-dashboard-model.js';
import { getVisibleRecentSessionRowActions } from './session-row-action-boundaries.js';
import { mountSessionAnalyticsSurface } from './session-analytics-surface.js';
import { mountSessionSummarySurface } from './session-summary-surface.js';
import { readSessionSetupForm } from './session-setup-model.js';

function formatSessionMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { maximumFractionDigits: 0, style: 'currency', currency: 'USD' })
    : '$0';
}

function sessionLabel(session = {}) {
  return session.name || `${session.symbol || 'NQ'} ${session.timeframe || '1m'}`;
}

function sessionSymbols(session = {}) {
  return Array.isArray(session.symbols) && session.symbols.length ? session.symbols : [session.symbol || 'NQ'];
}

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

function addDaysToLocalDateTime(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  date.setDate(date.getDate() + days);
  return formatLocalDateTime(date);
}

function isElementVisible(element) {
  return element && !element.hidden;
}

function renderSessionRowActions() {
  return getVisibleRecentSessionRowActions().map((action) => `
    <button
      type="button"
      data-v6-row-action="${action.id}"
      data-v6-row-action-owner="${action.owner}"
      aria-disabled="${String(!action.enabled)}"
      ${action.enabled ? '' : 'disabled'}
      title="${action.reason}"
    >${action.label}</button>
  `).join('');
}

function renderSessions(root, view, { chartBoundaryMetadata = null } = {}) {
  const list = root.querySelector('[data-v6-dashboard-session-list]');
  const empty = root.querySelector('[data-v6-dashboard-empty]');
  if (!list) return;
  const rows = view?.rows || [];
  list.innerHTML = rows.map((session) => {
    const boundaryView = createSessionDateBoundaryView(session, { chartBoundaryMetadata });
    const boundaryLabel = boundaryView.chartDataBoundaryLabel
      ? `<small data-v6-session-chart-boundary="${session.id}">${boundaryView.chartDataBoundaryLabel}</small>`
      : '';
    return `
    <li data-v6-dashboard-session-row="${session.id}">
      <button class="session-open-button" type="button" data-v6-dashboard-open-session="${session.id}" aria-label="Open ${sessionLabel(session)}">&#9658;</button>
      <div class="session-row-main">
        <strong>${sessionLabel(session)}</strong>
        <span>${boundaryView.tradingDateRangeLabel} &middot; ${formatSessionMoney(session.accountBalance)}</span>
        ${boundaryLabel}
        <div class="session-asset-chips">${sessionSymbols(session).map((symbol) => `<em>${symbol}</em>`).join('')}</div>
      </div>
      <span class="session-progress">Remaining days: --</span>
      <div class="session-row-actions" aria-label="Session row actions">
        ${renderSessionRowActions()}
      </div>
      <button class="session-dashboard-delete" type="button" data-v6-dashboard-delete-session="${session.id}" aria-label="Delete ${sessionLabel(session)} session">&times;</button>
    </li>
  `;
  }).join('');
  if (empty) {
    empty.hidden = rows.length > 0;
    empty.textContent = view?.totalCount && !rows.length ? 'No matching sessions' : 'No replay sessions yet';
  }
}

function renderPager(root, view) {
  const pageReadout = root.querySelector('[data-v6-dashboard-page-readout]');
  const pageSize = root.querySelector('[data-v6-dashboard-page-size]');
  const previous = root.querySelector('[data-v6-dashboard-page-prev]');
  const next = root.querySelector('[data-v6-dashboard-page-next]');
  const sortLabel = root.querySelector('[data-v6-dashboard-sort-label]');
  if (pageReadout) pageReadout.textContent = `${view.page} of ${view.pageCount}`;
  if (pageSize) pageSize.value = String(view.pageSize);
  if (previous) previous.disabled = view.page <= 1;
  if (next) next.disabled = view.page >= view.pageCount;
  if (sortLabel) sortLabel.textContent = view.sort === 'oldest' ? 'Oldest to newest' : 'Newest to oldest';
}

function setWorkstationHidden(root, hidden) {
  [
    '[data-v6-workstation-header]',
    '[data-v6-workstation-main]',
    '[data-v6-transport]',
    '[data-v6-status-bar]',
  ].forEach((selector) => {
    const element = root.querySelector(selector);
    if (element) {
      element.hidden = hidden;
    }
  });
  if (hidden) {
    [
      '[data-v6-journal-panel]',
      '[data-v6-replay-workflow-panel]',
      '[data-v6-sessions-panel]',
      '[data-v6-settings-panel]',
    ].forEach((selector) => {
      const element = root.querySelector(selector);
      if (element) {
        element.hidden = true;
      }
    });
  }
}

export function mountSessionDashboard(root, {
  dispatchCommand = dispatchRuntimeCommand,
  journalRowAction = null,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Session dashboard root is required.');
  }
  const dashboard = root.querySelector('[data-v6-session-dashboard]');
  const toggle = root.querySelector('[data-v6-dashboard-toggle]');
  const quickSessionOpen = root.querySelector('[data-v6-quick-session-open]');
  const quickSessionModal = root.querySelector('[data-v6-quick-session-modal]');
  const quickSessionClose = root.querySelector('[data-v6-quick-session-close]');
  const quickSessionCancel = root.querySelector('[data-v6-quick-session-cancel]');
  const createButton = root.querySelector('[data-v6-dashboard-create-session]');
  const setupForm = root.querySelector('[data-v6-session-setup-form]');
  const setupStatus = root.querySelector('[data-v6-session-setup-status]');
  const refreshButton = root.querySelector('[data-v6-dashboard-refresh]');
  const searchInput = root.querySelector('[data-v6-dashboard-search]');
  const sortButton = root.querySelector('[data-v6-dashboard-sort]');
  const pageSizeSelect = root.querySelector('[data-v6-dashboard-page-size]');
  const previousPageButton = root.querySelector('[data-v6-dashboard-page-prev]');
  const nextPageButton = root.querySelector('[data-v6-dashboard-page-next]');
  const assetPickerToggle = root.querySelector('[data-v6-asset-picker-toggle]');
  const assetPickerMenu = root.querySelector('[data-v6-asset-picker-menu]');
  const selectedAssetChips = root.querySelector('[data-v6-selected-asset-chips]');
  const selectedAssetInputs = root.querySelector('[data-v6-selected-asset-inputs]');
  const startInput = root.querySelector('[data-v6-session-setup-start]');
  const endInput = root.querySelector('[data-v6-session-setup-end]');
  const computedEndInput = root.querySelector('[data-v6-session-setup-computed-end]');
  const autoEndInput = root.querySelector('[data-v6-session-auto-end]');
  if (!dashboard || !toggle) {
    throw new Error('Session dashboard controls are required.');
  }

  const unsubscriptions = [];
  let surface = 'session';
  let sessions = [];
  const analyticsSurface = mountSessionAnalyticsSurface(root);
  const summarySurface = mountSessionSummarySurface(root);
  let recentSessionsControls = {
    page: 1,
    pageSize: Number(pageSizeSelect?.value || 5),
    query: '',
    sort: 'newest',
  };
  let selectedSymbols = [];
  let chartBoundaryMetadata = null;

  function getRecentSessionsView() {
    return createRecentSessionsView(sessions, recentSessionsControls);
  }

  function renderRecentSessions() {
    const view = getRecentSessionsView();
    recentSessionsControls = {
      ...recentSessionsControls,
      page: view.page,
      pageSize: view.pageSize,
      sort: view.sort,
    };
    renderSessions(root, view, { chartBoundaryMetadata });
    renderPager(root, view);
    return view;
  }

  async function refreshChartBoundaryMetadata() {
    try {
      const boundaryState = await dispatchCommand(CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE);
      chartBoundaryMetadata = boundaryState?.metadata || null;
    } catch {
      chartBoundaryMetadata = null;
    }
    return chartBoundaryMetadata;
  }

  function renderSelectedAssets() {
    if (selectedAssetChips) {
      selectedAssetChips.innerHTML = selectedSymbols.length
        ? selectedSymbols.map((symbol) => `
          <span class="asset-chip">${symbol}<button type="button" data-v6-remove-asset="${symbol}" aria-label="Remove ${symbol}">${symbol} remove</button></span>
        `).join('')
        : '<span class="asset-placeholder">Select NQ or ES</span>';
    }
    if (selectedAssetInputs) {
      selectedAssetInputs.innerHTML = selectedSymbols
        .map((symbol) => `<input type="hidden" name="symbols" value="${symbol}">`)
        .join('');
    }
    root.querySelectorAll('[data-v6-asset-option]').forEach((option) => {
      option.classList.toggle('is-selected', selectedSymbols.includes(option.dataset.v6AssetOption));
    });
  }

  function updateComputedEnd() {
    if (!startInput || !endInput || !computedEndInput) return;
    if (autoEndInput?.checked) {
      computedEndInput.value = addDaysToLocalDateTime(startInput.value, 4);
      endInput.value = computedEndInput.value;
      endInput.disabled = true;
    } else {
      computedEndInput.value = endInput.value;
      endInput.disabled = false;
    }
  }

  function openQuickSession() {
    if (!quickSessionModal) return;
    const nameInput = root.querySelector('[data-v6-session-setup-name]');
    if (nameInput?.value === 'test') {
      nameInput.value = '';
    }
    updateComputedEnd();
    renderSelectedAssets();
    quickSessionModal.hidden = false;
    root.querySelector('[data-v6-session-setup-name]')?.focus();
  }

  function closeQuickSession() {
    if (quickSessionModal) {
      quickSessionModal.hidden = true;
    }
    if (assetPickerMenu) {
      assetPickerMenu.hidden = true;
    }
    assetPickerToggle?.setAttribute('aria-expanded', 'false');
  }

  function updateSessionChrome(session = {}) {
    const name = session.name || 'test';
    const symbol = session.symbol || 'NQ';
    const sessionName = root.querySelector('[data-v6-session-name]');
    const topSymbol = root.querySelector('[data-v6-top-symbol]');
    if (sessionName) sessionName.textContent = name;
    if (topSymbol) topSymbol.textContent = symbol;
  }

  function setSurface(nextSurface) {
    surface = nextSurface === 'workstation' ? 'workstation' : 'session';
    const sessionActive = surface === 'session';
    dashboard.hidden = !sessionActive;
    root.dataset.v6Surface = surface;
    toggle.setAttribute('aria-expanded', String(sessionActive));
    toggle.setAttribute('aria-pressed', String(sessionActive));
    setWorkstationHidden(root, sessionActive);
    if (sessionActive) {
      void refresh();
    }
    return getState();
  }

  function enterSessionSurface() {
    return setSurface('session');
  }

  function enterWorkstation() {
    return setSurface('workstation');
  }

  async function refresh() {
    await refreshChartBoundaryMetadata();
    sessions = await dispatchCommand(SESSION_COMMANDS.LIST);
    renderRecentSessions();
    return getState();
  }

  function setSetupStatus(message) {
    if (setupStatus) {
      setupStatus.textContent = message;
    }
  }

  async function createSession(input = {}) {
    const session = await dispatchCommand(SESSION_COMMANDS.CREATE, input);
    await refresh();
    updateSessionChrome(session);
    closeQuickSession();
    enterWorkstation();
    setSetupStatus(`Created ${session.name || session.id}`);
    return getState();
  }

  async function openSession(id) {
    const session = await dispatchCommand(SESSION_COMMANDS.OPEN, id);
    updateSessionChrome(session);
    enterWorkstation();
    return getState();
  }

  async function deleteSession(id) {
    await dispatchCommand(SESSION_COMMANDS.DELETE, id);
    analyticsSurface.close();
    summarySurface.close();
    await refresh();
    return getState();
  }

  async function copySession(id) {
    if (!id) return getState();
    analyticsSurface.close();
    summarySurface.close();
    await dispatchCommand(SESSION_COMMANDS.COPY, { id });
    await refresh();
    return getState();
  }

  function openSessionAnalytics(id) {
    const session = sessions.find((item) => item.id === id);
    if (!session) return getState();
    summarySurface.close();
    return analyticsSurface.open(session);
  }

  function openSessionSummary(id) {
    const session = sessions.find((item) => item.id === id);
    if (!session) return getState();
    analyticsSurface.close();
    return summarySurface.open(session);
  }

  async function openSessionJournal(id) {
    const session = sessions.find((item) => item.id === id);
    if (!session || !journalRowAction || typeof journalRowAction.open !== 'function') {
      return getState();
    }
    analyticsSurface.close();
    summarySurface.close();
    await journalRowAction.open(session);
    return getState();
  }

  const toggleListener = () => enterSessionSurface();
  toggle.addEventListener('click', toggleListener);
  unsubscriptions.push(() => toggle.removeEventListener('click', toggleListener));

  if (quickSessionOpen) {
    const listener = () => openQuickSession();
    quickSessionOpen.addEventListener('click', listener);
    unsubscriptions.push(() => quickSessionOpen.removeEventListener('click', listener));
  }
  [quickSessionClose, quickSessionCancel].filter(Boolean).forEach((button) => {
    const listener = () => closeQuickSession();
    button.addEventListener('click', listener);
    unsubscriptions.push(() => button.removeEventListener('click', listener));
  });
  if (quickSessionModal) {
    const listener = (event) => {
      if (event.target === quickSessionModal) {
        closeQuickSession();
      }
    };
    quickSessionModal.addEventListener('click', listener);
    unsubscriptions.push(() => quickSessionModal.removeEventListener('click', listener));
  }

  if (assetPickerToggle && assetPickerMenu) {
    const listener = () => {
      assetPickerMenu.hidden = !assetPickerMenu.hidden;
      assetPickerToggle.setAttribute('aria-expanded', String(isElementVisible(assetPickerMenu)));
    };
    assetPickerToggle.addEventListener('click', listener);
    unsubscriptions.push(() => assetPickerToggle.removeEventListener('click', listener));
  }
  root.querySelectorAll('[data-v6-asset-option]').forEach((option) => {
    const listener = () => {
      const symbol = option.dataset.v6AssetOption;
      selectedSymbols = selectedSymbols.includes(symbol)
        ? selectedSymbols.filter((item) => item !== symbol)
        : [...selectedSymbols, symbol];
      renderSelectedAssets();
    };
    option.addEventListener('click', listener);
    unsubscriptions.push(() => option.removeEventListener('click', listener));
  });
  if (selectedAssetChips) {
    const listener = (event) => {
      const removeButton = event.target.closest?.('[data-v6-remove-asset]');
      if (!removeButton) return;
      selectedSymbols = selectedSymbols.filter((symbol) => symbol !== removeButton.dataset.v6RemoveAsset);
      renderSelectedAssets();
    };
    selectedAssetChips.addEventListener('click', listener);
    unsubscriptions.push(() => selectedAssetChips.removeEventListener('click', listener));
  }

  [startInput, endInput, autoEndInput].filter(Boolean).forEach((input) => {
    const listener = () => updateComputedEnd();
    input.addEventListener('change', listener);
    input.addEventListener('input', listener);
    unsubscriptions.push(() => {
      input.removeEventListener('change', listener);
      input.removeEventListener('input', listener);
    });
  });
  root.querySelectorAll('[data-v6-date-offset-days]').forEach((button) => {
    const listener = () => {
      if (!startInput || !endInput) return;
      endInput.value = addDaysToLocalDateTime(startInput.value, Number(button.dataset.v6DateOffsetDays || 0));
      updateComputedEnd();
    };
    button.addEventListener('click', listener);
    unsubscriptions.push(() => button.removeEventListener('click', listener));
  });

  if (setupForm) {
    const listener = (event) => {
      event.preventDefault();
      try {
        if (quickSessionModal?.hidden && !selectedSymbols.length) {
          selectedSymbols = ['NQ'];
          renderSelectedAssets();
        }
        setSetupStatus('Creating session...');
        void createSession(readSessionSetupForm(setupForm)).catch((error) => {
          setSetupStatus(error?.message || String(error));
        });
      } catch (error) {
        setSetupStatus(error?.message || String(error));
      }
    };
    setupForm.addEventListener('submit', listener);
    unsubscriptions.push(() => setupForm.removeEventListener('submit', listener));
  } else if (createButton) {
    const listener = () => void createSession();
    createButton.addEventListener('click', listener);
    unsubscriptions.push(() => createButton.removeEventListener('click', listener));
  }
  if (refreshButton) {
    const listener = () => refresh();
    refreshButton.addEventListener('click', listener);
    unsubscriptions.push(() => refreshButton.removeEventListener('click', listener));
  }

  if (searchInput) {
    const listener = () => {
      recentSessionsControls = {
        ...recentSessionsControls,
        page: 1,
        query: searchInput.value,
      };
      renderRecentSessions();
    };
    searchInput.addEventListener('input', listener);
    unsubscriptions.push(() => searchInput.removeEventListener('input', listener));
  }

  if (sortButton) {
    const listener = () => {
      recentSessionsControls = {
        ...recentSessionsControls,
        page: 1,
        sort: recentSessionsControls.sort === 'newest' ? 'oldest' : 'newest',
      };
      renderRecentSessions();
    };
    sortButton.addEventListener('click', listener);
    unsubscriptions.push(() => sortButton.removeEventListener('click', listener));
  }

  if (pageSizeSelect) {
    const listener = () => {
      recentSessionsControls = {
        ...recentSessionsControls,
        page: 1,
        pageSize: Number(pageSizeSelect.value || 5),
      };
      renderRecentSessions();
    };
    pageSizeSelect.addEventListener('change', listener);
    unsubscriptions.push(() => pageSizeSelect.removeEventListener('change', listener));
  }

  if (previousPageButton) {
    const listener = () => {
      recentSessionsControls = {
        ...recentSessionsControls,
        page: recentSessionsControls.page - 1,
      };
      renderRecentSessions();
    };
    previousPageButton.addEventListener('click', listener);
    unsubscriptions.push(() => previousPageButton.removeEventListener('click', listener));
  }

  if (nextPageButton) {
    const listener = () => {
      recentSessionsControls = {
        ...recentSessionsControls,
        page: recentSessionsControls.page + 1,
      };
      renderRecentSessions();
    };
    nextPageButton.addEventListener('click', listener);
    unsubscriptions.push(() => nextPageButton.removeEventListener('click', listener));
  }

  if (typeof subscribeEvent === 'function') {
    unsubscriptions.push(subscribeEvent(CHART_BOUNDARY_METADATA_EVENTS.UPDATED, (payload = {}) => {
      chartBoundaryMetadata = payload.metadata || null;
      renderRecentSessions();
    }));
  }

  const list = root.querySelector('[data-v6-dashboard-session-list]');
  if (list) {
    const listener = (event) => {
      const rowActionButton = event.target.closest?.('[data-v6-row-action]');
      if (rowActionButton && list.contains(rowActionButton)) {
        if (rowActionButton.disabled) return;
        const row = rowActionButton.closest('[data-v6-dashboard-session-row]');
        if (rowActionButton.dataset.v6RowAction === 'summary') {
          openSessionSummary(row?.dataset.v6DashboardSessionRow);
        } else if (rowActionButton.dataset.v6RowAction === 'analytics') {
          openSessionAnalytics(row?.dataset.v6DashboardSessionRow);
        } else if (rowActionButton.dataset.v6RowAction === 'copy') {
          void copySession(row?.dataset.v6DashboardSessionRow);
        } else if (rowActionButton.dataset.v6RowAction === 'journal') {
          void openSessionJournal(row?.dataset.v6DashboardSessionRow);
        }
        return;
      }
      const deleteSessionButton = event.target.closest?.('[data-v6-dashboard-delete-session]');
      if (deleteSessionButton && list.contains(deleteSessionButton)) {
        void deleteSession(deleteSessionButton.dataset.v6DashboardDeleteSession);
        return;
      }
      const openSessionButton = event.target.closest?.('[data-v6-dashboard-open-session]');
      if (openSessionButton && list.contains(openSessionButton)) {
        void openSession(openSessionButton.dataset.v6DashboardOpenSession);
      }
    };
    list.addEventListener('click', listener);
    unsubscriptions.push(() => list.removeEventListener('click', listener));
  }

  function getState() {
    const recentSessionsView = getRecentSessionsView();
    return {
      open: surface === 'session',
      surface,
      sessionCount: sessions.length,
      sessions: sessions.map((session) => ({ ...session })),
      recentSessions: {
        page: recentSessionsView.page,
        pageCount: recentSessionsView.pageCount,
        pageSize: recentSessionsView.pageSize,
        query: recentSessionsView.query,
        sort: recentSessionsView.sort,
        visibleCount: recentSessionsView.visibleCount,
      },
      chartBoundaryMetadata,
      analytics: analyticsSurface.getState(),
      summary: summarySurface.getState(),
    };
  }

  enterSessionSurface();
  renderSelectedAssets();
  updateComputedEnd();

  return {
    createSession,
    copySession,
    deleteSession,
    enterSessionSurface,
    enterWorkstation,
    getState,
    openSessionJournal,
    openSession,
    refresh,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
      analyticsSurface.unmount();
      summarySurface.unmount();
    },
  };
}
