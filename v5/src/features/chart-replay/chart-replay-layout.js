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
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function renderState(layoutState = {}) {
    if (disposed) return;
    const mode = layoutState.mode || 'single';
    const variant = layoutState.variant || `${mode}.default`;
    openButton.dataset.layoutMode = mode;
    openButton.dataset.layoutVariant = variant;
    openButton.dataset.layoutState = 'ready';
    modeButtons.forEach((button) => {
      const buttonVariant = button.dataset.layoutVariantOption || button.dataset.layoutModeOption;
      button.setAttribute('aria-pressed', buttonVariant === variant ? 'true' : 'false');
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
    if (disposed) return;
    popover.hidden = false;
    openButton.setAttribute('aria-expanded', 'true');
    closeButton.focus();
  }

  function close() {
    if (disposed) return;
    popover.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    openButton.focus();
  }

  function handleOpenClick() {
    if (popover.hidden) {
      open();
    } else {
      close();
    }
  }

  function handlePopoverClick(event) {
    if (event.target === popover) {
      close();
    }
  }

  addListener(openButton, 'click', handleOpenClick);
  addListener(closeButton, 'click', close);
  addListener(popover, 'click', handlePopoverClick);
  modeButtons.forEach((button) => {
    const handleModeClick = async () => {
      if (disposed) return;
      try {
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, {
          mode: button.dataset.layoutModeOption,
          variant: button.dataset.layoutVariantOption,
        });
        if (disposed) return;
        onLayoutState(layoutState);
        renderState(layoutState);
      } catch (error) {
        if (disposed) return;
        setStatusText(error?.message || String(error));
      }
    };
    addListener(button, 'click', handleModeClick);
  });
  syncInputs.forEach((input) => {
    const handleSyncChange = async () => {
      if (disposed) return;
      const key = input.dataset.layoutSync;
      if (!SYNC_KEYS.includes(key)) return;
      try {
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, {
          key,
          value: input.checked,
        });
        if (disposed) return;
        onLayoutState(layoutState);
        renderState(layoutState);
      } catch (error) {
        if (disposed) return;
        input.checked = !input.checked;
        setStatusText(error?.message || String(error));
      }
    };
    addListener(input, 'change', handleSyncChange);
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
  }

  return {
    close,
    dispose,
    open,
    renderState,
  };
}
