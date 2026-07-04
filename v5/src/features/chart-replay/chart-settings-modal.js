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
  const ownerDocument = root.ownerDocument || document;
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function showSection(sectionId) {
    if (disposed) return;
    tabButtons.forEach((button) => {
      const selected = button.dataset.chartSettingsTab === sectionId;
      button.setAttribute('aria-current', selected ? 'true' : 'false');
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
    sections.forEach((section) => {
      section.hidden = section.dataset.chartSettingsSection !== sectionId;
    });
  }

  function activeTabIndex() {
    const index = tabButtons.findIndex((button) => button.getAttribute('aria-selected') === 'true');
    return index >= 0 ? index : 0;
  }

  function focusTabAt(index) {
    const nextIndex = (index + tabButtons.length) % tabButtons.length;
    const button = tabButtons[nextIndex];
    showSection(button.dataset.chartSettingsTab || 'symbol');
    button.focus();
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

  function handleKeydown(event) {
    if (disposed || popover.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    const activeIndex = activeTabIndex();
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusTabAt(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTabAt(activeIndex - 1);
    }
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
  addListener(ownerDocument, 'keydown', handleKeydown);
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
