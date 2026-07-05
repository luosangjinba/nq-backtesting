import { DISPLAY_TIMEFRAME_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function normalizeDisplayTimeframe(value) {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error('Display timeframe control value must be a positive integer.');
  }
  return timeframe;
}

export function mountDisplayTimeframeControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
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
  let currentValue = normalizeDisplayTimeframe(select?.value || options.find((option) => option.getAttribute('aria-checked') === 'true')?.dataset.v6DisplayTimeframeOption || 1);

  function formatTimeframe(value) {
    return `${value}m`;
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
      option.setAttribute('aria-checked', String(normalizeDisplayTimeframe(option.dataset.v6DisplayTimeframeOption) === currentValue));
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
    syncDisplayTimeframe(displayTimeframe);
    root.dataset.displayTimeframe = String(displayTimeframe);
    Promise.resolve(dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
      displayTimeframe,
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

  document.addEventListener('click', (event) => {
    if (!menu || menu.hidden) return;
    if (menu.contains(event.target) || toggle?.contains(event.target)) return;
    closeMenu();
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }, { signal });

  syncDisplayTimeframe(currentValue);

  return Object.freeze({
    destroy() {
      abortController.abort();
    },
    getValue() {
      return currentValue;
    },
  });
}
