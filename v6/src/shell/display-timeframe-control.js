import { DISPLAY_TIMEFRAME_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import {
  formatDisplayTimeframeValue,
  normalizeDisplayTimeframeValue,
} from '../time-domain/htf-display-timeframe-domain.js';

function normalizeDisplayTimeframe(value) {
  try {
    return normalizeDisplayTimeframeValue(value, {
      fieldName: 'Display timeframe control value',
    });
  } catch {
    throw new Error('Display timeframe control value must be a positive integer, 1D, 1W, or 1M.');
  }
}

function normalizePaneId(value, fallback = 'main') {
  const paneId = String(value || fallback || '').trim();
  if (!paneId) {
    throw new Error('Display timeframe control paneId must be a non-empty string.');
  }
  return paneId;
}

export function mountDisplayTimeframeControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
  getTargetPaneId = null,
  targetPaneId = 'main',
} = {}) {
  if (!root) {
    throw new Error('Display timeframe control root is required.');
  }
  const select = root.querySelector('[data-v6-display-timeframe-select]');
  const toggle = root.querySelector('[data-v6-display-timeframe-toggle]');
  const label = root.querySelector('[data-v6-display-timeframe-label]');
  const readout = root.querySelector('[data-v6-display-timeframe-readout]');
  const menu = root.querySelector('[data-v6-display-timeframe-menu]');
  const options = [...root.querySelectorAll('[data-v6-display-timeframe-option]')];
  if (!select && (!toggle || !menu || !options.length)) {
    throw new Error('Display timeframe control requires a select or menu.');
  }
  const abortController = new AbortController();
  const signal = abortController.signal;
  const ownerDocument = root.ownerDocument || (typeof document === 'undefined' ? null : document);
  let currentValue = normalizeDisplayTimeframe(select?.value || options.find((option) => option.getAttribute('aria-checked') === 'true')?.dataset.v6DisplayTimeframeOption || 1);
  let currentTargetPaneId = normalizePaneId(root.dataset.v6DisplayTimeframePaneId || targetPaneId);

  function formatTimeframe(value) {
    return formatDisplayTimeframeValue(value);
  }

  function resolveTargetPaneId() {
    return normalizePaneId(
      typeof getTargetPaneId === 'function' ? getTargetPaneId() : currentTargetPaneId,
      currentTargetPaneId,
    );
  }

  function syncTargetPaneId(paneId) {
    currentTargetPaneId = normalizePaneId(paneId);
    root.dataset.v6DisplayTimeframePaneId = currentTargetPaneId;
    return currentTargetPaneId;
  }

  function syncDisplayTimeframe(value) {
    currentValue = normalizeDisplayTimeframe(value);
    root.dataset.displayTimeframe = String(currentValue);
    if (select) {
      select.value = String(currentValue);
    }
    if (label) {
      label.textContent = formatTimeframe(currentValue);
    }
    if (readout) {
      readout.textContent = formatTimeframe(currentValue);
    }
    options.forEach((option) => {
      option.setAttribute('aria-checked', String(String(normalizeDisplayTimeframe(option.dataset.v6DisplayTimeframeOption)) === String(currentValue)));
    });
  }

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    if (!menu || !toggle) return;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  }

  function applyDisplayTimeframe(value) {
    const displayTimeframe = normalizeDisplayTimeframe(value);
    const paneId = resolveTargetPaneId();
    syncDisplayTimeframe(displayTimeframe);
    root.dataset.displayTimeframe = String(displayTimeframe);
    root.dataset.v6DisplayTimeframePaneId = paneId;
    Promise.resolve(dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
      displayTimeframe,
      paneId,
    })).catch((error) => {
        root.dataset.lastDisplayTimeframeError = error?.message || String(error);
      });
  }

  select?.addEventListener('change', () => {
    applyDisplayTimeframe(select.value);
  }, { signal });

  toggle?.addEventListener('click', () => {
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  }, { signal });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      applyDisplayTimeframe(option.dataset.v6DisplayTimeframeOption);
      closeMenu();
    }, { signal });
  });

  ownerDocument?.addEventListener('click', (event) => {
    if (!menu || menu.hidden) return;
    if (menu.contains(event.target) || toggle?.contains(event.target)) return;
    closeMenu();
  }, { signal });

  ownerDocument?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }, { signal });

  syncDisplayTimeframe(currentValue);
  syncTargetPaneId(currentTargetPaneId);

  return Object.freeze({
    destroy() {
      abortController.abort();
    },
    getTargetPaneId() {
      return currentTargetPaneId;
    },
    getValue() {
      return currentValue;
    },
    setDisplayTimeframe(value) {
      syncDisplayTimeframe(value);
      return currentValue;
    },
    setTargetPaneId(paneId) {
      return syncTargetPaneId(paneId);
    },
  });
}
