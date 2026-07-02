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

  function showSection(sectionId) {
    tabButtons.forEach((button) => {
      button.setAttribute('aria-current', button.dataset.chartSettingsTab === sectionId ? 'true' : 'false');
    });
    sections.forEach((section) => {
      section.hidden = section.dataset.chartSettingsSection !== sectionId;
    });
  }

  function show() {
    showSection('symbol');
    popover.hidden = false;
    cancelButtons[0]?.focus();
  }

  function hide() {
    popover.hidden = true;
    openButton.focus();
  }

  function open() {
    onOpen?.();
    show();
  }

  function close() {
    hide();
    onClose?.();
  }

  openButton.addEventListener('click', open);
  cancelButtons.forEach((button) => {
    button.addEventListener('click', close);
  });
  popover.addEventListener('click', (event) => {
    if (event.target === popover) {
      close();
    }
  });
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showSection(button.dataset.chartSettingsTab || 'symbol');
    });
  });

  return {
    close,
    hide,
    open,
  };
}
