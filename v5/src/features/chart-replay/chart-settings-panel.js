import {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneSettingsDraftForApply,
  cloneWatermarkStyle,
  createSettingsDraft as createSettingsDraftFromState,
} from './chart-settings-draft.js';
import { createChartSettingsBindings } from './chart-settings-bindings.js';

export {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneWatermarkStyle,
} from './chart-settings-draft.js';

export function createChartSettingsController({
  root,
  getDisplayTimezone,
  getPresentationSettings,
  onApply,
  onCancel,
}) {
  const chartSettingsPopover = root.querySelector('[data-chart-settings-popover]');
  const chartSettingsOpenButton = root.querySelector('[data-chart-settings-open]');
  const chartSettingsCancelButtons = Array.from(root.querySelectorAll('[data-chart-settings-cancel]'));
  const chartSettingsApplyButton = root.querySelector('[data-chart-settings-apply]');
  const chartSettingsTabButtons = Array.from(root.querySelectorAll('[data-chart-settings-tab]'));
  const chartSettingsSections = Array.from(root.querySelectorAll('[data-chart-settings-section]'));
  let settingsDraft = null;
  const settingsBindings = createChartSettingsBindings({
    root,
    getDraft: () => settingsDraft,
  });

  function createSettingsDraft() {
    return createSettingsDraftFromState({
      displayTimezone: getDisplayTimezone(),
      presentationSettings: getPresentationSettings(),
    });
  }

  function renderSettingsDraft() {
    const draft = settingsDraft || createSettingsDraft();
    settingsBindings.render(draft);
  }

  function showSettingsSection(sectionId) {
    chartSettingsTabButtons.forEach((button) => {
      button.setAttribute('aria-current', button.dataset.chartSettingsTab === sectionId ? 'true' : 'false');
    });
    chartSettingsSections.forEach((settingsSection) => {
      settingsSection.hidden = settingsSection.dataset.chartSettingsSection !== sectionId;
    });
  }

  function open() {
    settingsDraft = createSettingsDraft();
    showSettingsSection('symbol');
    renderSettingsDraft();
    chartSettingsPopover.hidden = false;
    chartSettingsCancelButtons[0]?.focus();
  }

  function close() {
    chartSettingsPopover.hidden = true;
    settingsDraft = null;
    renderSettingsDraft();
    onCancel?.();
    chartSettingsOpenButton.focus();
  }

  chartSettingsOpenButton.addEventListener('click', open);
  chartSettingsCancelButtons.forEach((button) => {
    button.addEventListener('click', close);
  });
  chartSettingsPopover.addEventListener('click', (event) => {
    if (event.target === chartSettingsPopover) {
      close();
    }
  });
  chartSettingsTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showSettingsSection(button.dataset.chartSettingsTab || 'symbol');
    });
  });
  settingsBindings.bindDraftEvents({ renderSettingsDraft });
  chartSettingsApplyButton.addEventListener('click', async () => {
    if (!settingsDraft) return;
    const draft = settingsDraft;
    const applied = await onApply?.(cloneSettingsDraftForApply(draft));
    if (applied === false) return;
    chartSettingsPopover.hidden = true;
    settingsDraft = null;
    renderSettingsDraft();
    chartSettingsOpenButton.focus();
  });

  renderSettingsDraft();

  return {
    renderCurrent: renderSettingsDraft,
    close,
  };
}
