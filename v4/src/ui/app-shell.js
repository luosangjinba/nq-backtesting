import * as bus from '../event-bus.js';

const STORAGE_KEY = 'v4:active-workspace';
const VALID_WORKSPACES = new Set(['backtesting', 'journal']);

let activeWorkspace = 'backtesting';

function normalizeWorkspace(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_WORKSPACES.has(normalized) ? normalized : 'backtesting';
}

function readInitialWorkspace() {
  try {
    return normalizeWorkspace(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'backtesting';
  }
}

function persistWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, workspace);
  } catch {
    // Runtime state is still valid if localStorage is unavailable.
  }
}

function updateWorkspaceDom(workspace) {
  document.body.dataset.workspace = workspace;

  document.querySelectorAll('[data-workspace-target]').forEach((target) => {
    const isActive = target.dataset.workspaceTarget === workspace;
    target.hidden = !isActive;
  });

  document.querySelectorAll('[data-workspace-switch]').forEach((button) => {
    const isActive = button.dataset.workspaceSwitch === workspace;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

export function getActiveWorkspace() {
  return activeWorkspace;
}

export function setActiveWorkspace(workspace, options = {}) {
  const nextWorkspace = normalizeWorkspace(workspace);
  if (nextWorkspace === activeWorkspace && !options.force) return activeWorkspace;
  const previousWorkspace = activeWorkspace;
  activeWorkspace = nextWorkspace;
  updateWorkspaceDom(activeWorkspace);
  persistWorkspace(activeWorkspace);
  bus.emit('workspace:changed', {
    workspace: activeWorkspace,
    previousWorkspace,
  });
  return activeWorkspace;
}

export function initAppShell() {
  activeWorkspace = readInitialWorkspace();
  document.querySelectorAll('[data-workspace-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveWorkspace(button.dataset.workspaceSwitch);
    });
  });
  setActiveWorkspace(activeWorkspace, { force: true });
}
