export function createChartSettingsModalController({
  root,
  onOpen,
  onClose,
}) {
  const popover = root.querySelector('[data-chart-settings-popover]');
  const openButton = root.querySelector('[data-chart-settings-open]');
  const cancelButtons = Array.from(root.querySelectorAll('[data-chart-settings-cancel]'));
  const tabButtons = Array.from(root.querySelectorAll('[data-chart-settings-tab]'));
  const sections = Array.from(root.querySelectorAll('[data-chart-settings-section]'));
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function showSection(sectionId) {
    if (disposed) return;
    tabButtons.forEach((button) => {
      button.setAttribute('aria-current', button.dataset.chartSettingsTab === sectionId ? 'true' : 'false');
    });
    sections.forEach((section) => {
      section.hidden = section.dataset.chartSettingsSection !== sectionId;
    });
  }

  function show() {
    if (disposed) return;
    showSection('symbol');
    popover.hidden = false;
    cancelButtons[0]?.focus();
  }

  function hide() {
    if (disposed) return;
    popover.hidden = true;
    openButton.focus();
  }

  function open() {
    if (disposed) return;
    onOpen?.();
    show();
  }

  function close() {
    if (disposed) return;
    hide();
    onClose?.();
  }

  addListener(openButton, 'click', open);
  cancelButtons.forEach((button) => {
    addListener(button, 'click', close);
  });
  function handlePopoverClick(event) {
    if (event.target === popover) {
      close();
    }
  }
  addListener(popover, 'click', handlePopoverClick);
  tabButtons.forEach((button) => {
    const handleTabClick = () => {
      showSection(button.dataset.chartSettingsTab || 'symbol');
    };
    addListener(button, 'click', handleTabClick);
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
    popover.hidden = true;
  }

  return {
    close,
    dispose,
    hide,
    open,
  };
}
