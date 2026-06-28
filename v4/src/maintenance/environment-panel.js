import { value } from './output-panel.js';

export function environmentPayload(action) {
  return {
    action,
    key: value('envKey'),
    value: value('envValue'),
  };
}

export function initEnvironmentPanel({ run }) {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => run({ action: button.dataset.action }));
  });
  document.getElementById('envStatus').addEventListener('click', () => run({ action: 'environment_status' }));
  document.getElementById('envSave').addEventListener('click', () => run(environmentPayload('environment_write')));
  document.getElementById('envDelete').addEventListener('click', () => run(environmentPayload('environment_delete')));
  document.getElementById('apiRestart').addEventListener('click', () => {
    if (!window.confirm('Restart the V4 API now? The page may be unavailable for a few seconds.')) return;
    run({ action: 'api_restart', confirmText: 'RESTART API' });
  });
}
