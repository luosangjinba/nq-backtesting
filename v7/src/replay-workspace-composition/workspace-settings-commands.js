import { createReplayNavigationSchedule } from '../replay-navigation-runtime/public.js';
import { readReplayNavigationSettings } from '../replay-navigation-settings/public.js';

/** Coordinate global visual and Replay-navigation preference commands. */
export function createWorkspaceSettingsCommands({
  execution,
  isDisposed,
  persistReplayNavigationSettings,
  presentation,
  setNavigationSchedule,
  workstationSettings,
}) {
  return Object.freeze({
    cancelWorkstationSettingsPreview() {
      if (isDisposed()) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        workstationSettings.cancelPreview();
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'The Settings preview could not be restored on every Pane.',
        });
      }
    },
    previewWorkstationSettings(settings) {
      if (isDisposed()) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        workstationSettings.preview(settings);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'Settings preview could not be applied to every Pane.',
        });
      }
    },
    saveGotoSettings(settings) {
      if (isDisposed() || execution.isPending()) {
        return Object.freeze({ accepted: false, message: 'Wait for the current Replay update to finish.' });
      }
      try {
        readReplayNavigationSettings(settings);
        const schedule = createReplayNavigationSchedule({ settings });
        persistReplayNavigationSettings?.(settings);
        setNavigationSchedule(schedule);
        presentation.setGotoFeedback(null);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({ accepted: false, message: 'Quick GoTo settings could not be saved locally.' });
      }
    },
    saveWorkstationSettings(settings) {
      if (isDisposed()) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        workstationSettings.save(settings);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'Settings could not be applied to every Pane and saved locally.',
        });
      }
    },
  });
}
