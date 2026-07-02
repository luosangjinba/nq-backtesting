import { LAYOUT_COMMANDS } from '../../contracts/layout-contracts.js';

const SYNC_KEYS = ['symbol', 'interval', 'crosshair', 'time', 'dateRange'];

export function createChartReplayLayoutController({
  root,
  dispatchCommand,
  onLayoutState,
  setStatusText = () => {},
}) {
  const openButton = root.querySelector('[data-layout-open]');
  const popover = root.querySelector('[data-layout-popover]');
  const closeButton = root.querySelector('[data-layout-close]');
  const modeButtons = Array.from(root.querySelectorAll('[data-layout-mode-option]'));
  const syncInputs = Array.from(root.querySelectorAll('[data-layout-sync]'));

  function renderState(layoutState = {}) {
    const mode = layoutState.mode || 'single';
    openButton.dataset.layoutMode = mode;
    openButton.dataset.layoutState = 'ready';
    modeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.layoutModeOption === mode ? 'true' : 'false');
    });
    syncInputs.forEach((input) => {
      const key = input.dataset.layoutSync;
      input.checked = Boolean(layoutState.sync?.[key]);
      if (key === 'symbol') {
        input.disabled = true;
      }
    });
  }

  function open() {
    popover.hidden = false;
    openButton.setAttribute('aria-expanded', 'true');
    closeButton.focus();
  }

  function close() {
    popover.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    openButton.focus();
  }

  openButton.addEventListener('click', () => {
    if (popover.hidden) {
      open();
    } else {
      close();
    }
  });
  closeButton.addEventListener('click', close);
  popover.addEventListener('click', (event) => {
    if (event.target === popover) {
      close();
    }
  });
  modeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, {
          mode: button.dataset.layoutModeOption,
        });
        onLayoutState(layoutState);
        renderState(layoutState);
      } catch (error) {
        setStatusText(error?.message || String(error));
      }
    });
  });
  syncInputs.forEach((input) => {
    input.addEventListener('change', async () => {
      const key = input.dataset.layoutSync;
      if (!SYNC_KEYS.includes(key)) return;
      try {
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, {
          key,
          value: input.checked,
        });
        onLayoutState(layoutState);
        renderState(layoutState);
      } catch (error) {
        input.checked = !input.checked;
        setStatusText(error?.message || String(error));
      }
    });
  });

  return {
    close,
    open,
    renderState,
  };
}
