import {
  candleStyleValue,
  setCandleStyleValue,
} from './chart-settings-draft.js';

export function createChartSettingsSymbolBindings({
  root,
  getDraft,
}) {
  const displayTimezoneControls = Array.from(root.querySelectorAll('[data-display-timezone]'));
  const presentationTimeFormatControls = Array.from(root.querySelectorAll('[data-presentation-time-format]'));
  const candleStyleControls = Array.from(root.querySelectorAll('[data-candle-style]'));

  function render(draft) {
    displayTimezoneControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.displayTimezone;
      }
    });
    presentationTimeFormatControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.timeFormat;
      }
    });
    candleStyleControls.forEach((control) => {
      control.value = candleStyleValue(draft.candleStyle, control.dataset.candleStyle);
    });
  }

  function bindDraftEvents() {
    displayTimezoneControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.displayTimezone = control.value;
      });
    });
    presentationTimeFormatControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.timeFormat = control.value;
      });
    });
    candleStyleControls.forEach((control) => {
      const updateCandleStyle = () => {
        const draft = getDraft();
        if (!draft) return;
        setCandleStyleValue(draft.candleStyle, control.dataset.candleStyle, control.value);
      };
      control.addEventListener('input', updateCandleStyle);
      control.addEventListener('change', updateCandleStyle);
    });
  }

  return {
    bindDraftEvents,
    render,
  };
}
