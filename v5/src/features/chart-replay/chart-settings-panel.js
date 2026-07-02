import {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneWatermarkStyle,
} from './chart-settings-draft.js';
import { createChartSettingsBindings } from './chart-settings-bindings.js';
import { createChartSettingsLifecycle } from './chart-settings-lifecycle.js';
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
  let settingsLifecycle = null;
  const settingsBindings = createChartSettingsBindings({
    root,
    getDraft: () => settingsLifecycle?.getDraft(),
  });
  settingsLifecycle = createChartSettingsLifecycle({
    getDisplayTimezone,
    getPresentationSettings,
    onApply,
    onCancel,
    renderDraft: (draft) => settingsBindings.render(draft),
  });

  const settingsModal = createChartSettingsModalController({
    root,
    onOpen: settingsLifecycle.prepareOpen,
    onClose: settingsLifecycle.discard,
  });
  settingsBindings.bindDraftEvents({ renderSettingsDraft: settingsLifecycle.renderCurrent });
  chartSettingsApplyButton.addEventListener('click', async () => {
    const applied = await settingsLifecycle.apply();
    if (!applied) return;
    settingsModal.hide();
    settingsLifecycle.renderCurrent();
  });

  settingsLifecycle.renderCurrent();

  return {
    renderCurrent: settingsLifecycle.renderCurrent,
    close: settingsModal.close,
  };
}
