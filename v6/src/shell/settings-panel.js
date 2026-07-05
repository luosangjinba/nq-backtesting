import { SETTINGS_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand } from '../runtime/commands.js';

function readFieldValue(field) {
  if (field.type === 'checkbox') {
    return field.checked;
  }
  return field.value;
}

function applySettingsToFields(root, settings = {}) {
  root.querySelectorAll('[data-v6-settings-field]').forEach((field) => {
    const key = field.dataset.v6SettingsField;
    if (!Object.hasOwn(settings, key)) return;
    if (field.type === 'checkbox') {
      field.checked = Boolean(settings[key]);
      return;
    }
    field.value = String(settings[key]);
  });
}

export function mountSettingsPanel(root) {
  if (!root) {
    throw new Error('Settings panel root is required.');
  }
  const toggle = root.querySelector('[data-v6-settings-toggle]');
  const panel = root.querySelector('[data-v6-settings-panel]');
  if (!toggle || !panel) {
    throw new Error('Settings panel controls are required.');
  }

  const fieldListeners = [];
  let open = false;

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    return getState();
  }

  function getState() {
    return {
      open,
      settings: Object.fromEntries([...panel.querySelectorAll('[data-v6-settings-field]')]
        .map((field) => [field.dataset.v6SettingsField, readFieldValue(field)])),
    };
  }

  const toggleListener = () => setOpen(!open);
  toggle.addEventListener('click', toggleListener);

  panel.querySelectorAll('[data-v6-settings-field]').forEach((field) => {
    const listener = async () => {
      const key = field.dataset.v6SettingsField;
      const settings = await dispatchCommand(SETTINGS_COMMANDS.UPDATE, {
        [key]: readFieldValue(field),
      });
      applySettingsToFields(panel, settings);
    };
    field.addEventListener('change', listener);
    fieldListeners.push([field, listener]);
  });

  dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT)
    .then((settings) => applySettingsToFields(panel, settings));

  return {
    getState,
    setOpen,
    unmount() {
      toggle.removeEventListener('click', toggleListener);
      fieldListeners.forEach(([field, listener]) => {
        field.removeEventListener('change', listener);
      });
    },
  };
}
