import {
  cloneSettingsDraftForApply,
  createSettingsDraft as createSettingsDraftFromState,
} from './chart-settings-draft.js';

export function createChartSettingsLifecycle({
  getDisplayTimezone,
  getPresentationSettings,
  onApply,
  onCancel,
  renderDraft,
}) {
  let settingsDraft = null;

  function createSettingsDraft() {
    return createSettingsDraftFromState({
      displayTimezone: getDisplayTimezone(),
      presentationSettings: getPresentationSettings(),
    });
  }

  function getDraft() {
    return settingsDraft;
  }

  function renderCurrent() {
    renderDraft(settingsDraft || createSettingsDraft());
  }

  function prepareOpen() {
    settingsDraft = createSettingsDraft();
    renderCurrent();
  }

  function discard() {
    settingsDraft = null;
    renderCurrent();
    onCancel?.();
  }

  async function apply() {
    if (!settingsDraft) return false;
    const applied = await onApply?.(cloneSettingsDraftForApply(settingsDraft));
    if (applied === false) return false;
    settingsDraft = null;
    return true;
  }

  return {
    apply,
    discard,
    getDraft,
    prepareOpen,
    renderCurrent,
  };
}
