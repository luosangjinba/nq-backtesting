import { SESSION_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function formatSessionMeta(session = {}) {
  const start = session.startTime ? String(session.startTime).slice(0, 10) : 'Start pending';
  const end = session.endTime ? String(session.endTime).slice(0, 10) : 'End pending';
  return `${start} / ${end}`;
}

function sessionLabel(session = {}) {
  return `${session.symbol || 'NQ'} ${session.timeframe || '1m'}`;
}

function renderSessions(root, sessions = []) {
  const list = root.querySelector('[data-v6-dashboard-session-list]');
  const empty = root.querySelector('[data-v6-dashboard-empty]');
  if (!list) return;
  list.innerHTML = sessions.map((session) => `
    <li data-v6-dashboard-session-row="${session.id}">
      <button type="button" data-v6-dashboard-open-session="${session.id}" aria-label="Open ${sessionLabel(session)}">${sessionLabel(session)}</button>
      <strong>${session.id}</strong>
      <span>${formatSessionMeta(session)}</span>
    </li>
  `).join('');
  if (empty) {
    empty.hidden = sessions.length > 0;
  }
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
  const openChartButton = root.querySelector('[data-v6-dashboard-open-chart]');
  const createButton = root.querySelector('[data-v6-dashboard-create-session]');
  const refreshButton = root.querySelector('[data-v6-dashboard-refresh]');
  if (!dashboard || !toggle || !openChartButton) {
    throw new Error('Session dashboard controls are required.');
  }

  const unsubscriptions = [];
  let open = false;
  let sessions = [];

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    dashboard.hidden = !open;
    root.dataset.v6Surface = open ? 'dashboard' : 'workstation';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-pressed', String(open));
    setWorkstationHidden(root, open);
    if (open) {
      void refresh();
    }
    return getState();
  }

  async function refresh() {
    sessions = await dispatchCommand(SESSION_COMMANDS.LIST);
    renderSessions(root, sessions);
    return getState();
  }

  async function createSession() {
    await dispatchCommand(SESSION_COMMANDS.CREATE);
    await refresh();
    return getState();
  }

  const toggleListener = () => setOpen(true);
  toggle.addEventListener('click', toggleListener);
  unsubscriptions.push(() => toggle.removeEventListener('click', toggleListener));

  const openChartListener = () => setOpen(false);
  openChartButton.addEventListener('click', openChartListener);
  unsubscriptions.push(() => openChartButton.removeEventListener('click', openChartListener));

  if (createButton) {
    const listener = () => createSession();
    createButton.addEventListener('click', listener);
    unsubscriptions.push(() => createButton.removeEventListener('click', listener));
  }
  if (refreshButton) {
    const listener = () => refresh();
    refreshButton.addEventListener('click', listener);
    unsubscriptions.push(() => refreshButton.removeEventListener('click', listener));
  }

  const list = root.querySelector('[data-v6-dashboard-session-list]');
  if (list) {
    const listener = (event) => {
      const openSessionButton = event.target.closest?.('[data-v6-dashboard-open-session]');
      if (openSessionButton && list.contains(openSessionButton)) {
        setOpen(false);
      }
    };
    list.addEventListener('click', listener);
    unsubscriptions.push(() => list.removeEventListener('click', listener));
  }

  function getState() {
    return {
      open,
      sessionCount: sessions.length,
      sessions: sessions.map((session) => ({ ...session })),
    };
  }

  void refresh();

  return {
    createSession,
    getState,
    refresh,
    setOpen,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  };
}
