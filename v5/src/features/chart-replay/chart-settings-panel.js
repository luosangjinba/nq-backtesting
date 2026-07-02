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
import { createChartSettingsModalController } from './chart-settings-modal.js';

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
  const chartSettingsApplyButton = root.querySelector('[data-chart-settings-apply]');
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

  function prepareOpen() {
    settingsDraft = createSettingsDraft();
    renderSettingsDraft();
  }

  function discardDraft() {
    settingsDraft = null;
    renderSettingsDraft();
    onCancel?.();
  }

  const settingsModal = createChartSettingsModalController({
    root,
    onOpen: prepareOpen,
    onClose: discardDraft,
  });
  settingsBindings.bindDraftEvents({ renderSettingsDraft });
  chartSettingsApplyButton.addEventListener('click', async () => {
    if (!settingsDraft) return;
    const draft = settingsDraft;
    const applied = await onApply?.(cloneSettingsDraftForApply(draft));
    if (applied === false) return;
    settingsModal.hide();
    settingsDraft = null;
    renderSettingsDraft();
  });

  renderSettingsDraft();

  return {
    renderCurrent: renderSettingsDraft,
    close: settingsModal.close,
  };
}
