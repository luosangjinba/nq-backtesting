import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../../contracts/chart-presentation-contracts.js';

export function createChartSettingsScalesBindings({
  root,
  getDraft,
}) {
  const presentationDateFormatControls = Array.from(root.querySelectorAll('[data-presentation-date-format]'));
  const presentationRightOffsetControls = Array.from(root.querySelectorAll('[data-presentation-right-offset]'));
  const scaleStyleToggleControls = Array.from(root.querySelectorAll('[data-scale-style-toggle]'));
  const scaleStyleSideControls = Array.from(root.querySelectorAll('[data-scale-style-side]'));
  const crosshairStyleToggleControls = Array.from(root.querySelectorAll('[data-crosshair-style-toggle]'));
  const crosshairStyleColorControls = Array.from(root.querySelectorAll('[data-crosshair-style-color]'));

  function render(draft) {
    presentationDateFormatControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.dateFormat;
      }
    });
    presentationRightOffsetControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = String(draft.rightOffsetBars || 10);
      }
    });
    scaleStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.scaleStyle?.[control.dataset.scaleStyleToggle]);
    });
    scaleStyleSideControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.scaleStyle?.priceScaleSide
          || DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle.priceScaleSide;
      }
    });
    crosshairStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.crosshairStyle?.[control.dataset.crosshairStyleToggle]);
    });
    crosshairStyleColorControls.forEach((control) => {
      control.value = draft.crosshairStyle?.[control.dataset.crosshairStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle[control.dataset.crosshairStyleColor]
        || '#000000';
    });
  }

  function bindDraftEvents() {
    presentationDateFormatControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.dateFormat = control.value;
      });
    });
    presentationRightOffsetControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.rightOffsetBars = Number(control.value);
      });
    });
    scaleStyleToggleControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft) return;
        draft.scaleStyle[control.dataset.scaleStyleToggle] = control.checked;
      });
    });
    scaleStyleSideControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.scaleStyle.priceScaleSide = control.value;
      });
    });
    crosshairStyleToggleControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft) return;
        draft.crosshairStyle[control.dataset.crosshairStyleToggle] = control.checked;
      });
    });
    crosshairStyleColorControls.forEach((control) => {
      const updateCrosshairStyleColor = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.crosshairStyle[control.dataset.crosshairStyleColor] = control.value;
      };
      control.addEventListener('input', updateCrosshairStyleColor);
      control.addEventListener('change', updateCrosshairStyleColor);
    });
  }

  return {
    bindDraftEvents,
    render,
  };
}
