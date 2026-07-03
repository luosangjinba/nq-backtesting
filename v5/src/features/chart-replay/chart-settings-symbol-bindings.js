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
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

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
      const handleChange = () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.displayTimezone = control.value;
      };
      addListener(control, 'change', handleChange);
    });
    presentationTimeFormatControls.forEach((control) => {
      const handleChange = () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.timeFormat = control.value;
      };
      addListener(control, 'change', handleChange);
    });
    candleStyleControls.forEach((control) => {
      const updateCandleStyle = () => {
        const draft = getDraft();
        if (!draft) return;
        setCandleStyleValue(draft.candleStyle, control.dataset.candleStyle, control.value);
      };
      addListener(control, 'input', updateCandleStyle);
      addListener(control, 'change', updateCandleStyle);
    });
  }

  function dispose() {
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
  }

  return {
    bindDraftEvents,
    dispose,
    render,
  };
}
