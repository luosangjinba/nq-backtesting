import { failBarPicker } from './bar-picker-error.js';

export function requireBarPickerInteractionPort(candidate) {
  if (typeof candidate?.acquireBarPicker !== 'function') {
    failBarPicker(
      'ANNOTATION_BAR_PICKER_PORT_INVALID',
      'Bar Picker interaction port requires acquireBarPicker().',
    );
  }
  return candidate;
}

export function requireBarPickerCallback(candidate, code, label) {
  if (typeof candidate !== 'function') failBarPicker(code, `${label} must be a function.`);
  return candidate;
}
