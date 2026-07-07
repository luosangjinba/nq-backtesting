import { SESSION_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createRecentSessionsView } from './session-dashboard-model.js';
import { readSessionSetupForm } from './session-setup-model.js';

function formatSessionMeta(session = {}) {
  const start = session.startTime ? String(session.startTime).slice(0, 10) : 'Start pending';
  const end = session.endTime ? String(session.endTime).slice(0, 10) : 'End pending';
  return `${start} / ${end}`;
}

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

function renderSessions(root, view) {
  const list = root.querySelector('[data-v6-dashboard-session-list]');
  const empty = root.querySelector('[data-v6-dashboard-empty]');
  if (!list) return;
  const rows = view?.rows || [];
  list.innerHTML = rows.map((session) => `
    <li data-v6-dashboard-session-row="${session.id}">
      <button class="session-open-button" type="button" data-v6-dashboard-open-session="${session.id}" aria-label="Open ${sessionLabel(session)}">&#9658;</button>
      <div class="session-row-main">
        <strong>${sessionLabel(session)}</strong>
        <span>${formatSessionMeta(session)} &middot; ${formatSessionMoney(session.accountBalance)}</span>
        <div class="session-asset-chips">${sessionSymbols(session).map((symbol) => `<em>${symbol}</em>`).join('')}</div>
      </div>
      <span class="session-progress">Remaining days: --</span>
      <div class="session-row-actions" aria-label="Session row actions">
        <button type="button" disabled title="Summary placeholder">Summary</button>
        <button type="button" disabled title="Analytics placeholder">Stats</button>
        <button type="button" disabled title="Copy placeholder">Copy</button>
      </div>
      <button class="session-dashboard-delete" type="button" data-v6-dashboard-delete-session="${session.id}" aria-label="Delete ${sessionLabel(session)} session">&times;</button>
    </li>
  `).join('');
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
  let recentSessionsControls = {
    page: 1,
    pageSize: Number(pageSizeSelect?.value || 5),
    query: '',
    sort: 'newest',
  };
  let selectedSymbols = ['NQ'];

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
    renderSessions(root, view);
    renderPager(root, view);
    return view;
  }

  function renderSelectedAssets() {
    if (selectedAssetChips) {
      selectedAssetChips.innerHTML = selectedSymbols.map((symbol) => `
        <span class="asset-chip">${symbol}<button type="button" data-v6-remove-asset="${symbol}" aria-label="Remove ${symbol}">&times;</button></span>
      `).join('');
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
    const layoutName = `${name}-${String(session.id || '').slice(-6) || symbol}`;
    const sessionName = root.querySelector('[data-v6-session-name]');
    const topSymbol = root.querySelector('[data-v6-top-symbol]');
    const layout = root.querySelector('[data-v6-top-layout-name]');
    if (sessionName) sessionName.textContent = name;
    if (topSymbol) topSymbol.textContent = symbol;
    if (layout) layout.textContent = layoutName;
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
    await refresh();
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
      if (!selectedSymbols.length) {
        selectedSymbols = [symbol];
      }
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
      if (!selectedSymbols.length) selectedSymbols = ['NQ'];
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

  const list = root.querySelector('[data-v6-dashboard-session-list]');
  if (list) {
    const listener = (event) => {
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
    };
  }

  enterSessionSurface();
  renderSelectedAssets();
  updateComputedEnd();

  return {
    createSession,
    deleteSession,
    enterSessionSurface,
    enterWorkstation,
    getState,
    openSession,
    refresh,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  };
}
