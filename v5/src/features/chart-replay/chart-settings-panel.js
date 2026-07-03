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
  let disposed = false;
  const cleanupCallbacks = [];
  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }
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
  async function handleApplyClick() {
    if (disposed) return;
    const applied = await settingsLifecycle.apply();
    if (disposed) return;
    if (!applied) return;
    settingsModal.hide();
    settingsLifecycle.renderCurrent();
  }
  addListener(chartSettingsApplyButton, 'click', handleApplyClick);

  settingsLifecycle.renderCurrent();

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
    settingsBindings.dispose?.();
    settingsModal.dispose?.();
  }

  return {
    dispose,
    renderCurrent: settingsLifecycle.renderCurrent,
    close: settingsModal.close,
  };
}
