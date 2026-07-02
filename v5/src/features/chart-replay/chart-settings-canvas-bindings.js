import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../../contracts/chart-presentation-contracts.js';

export function createChartSettingsCanvasBindings({
  root,
  getDraft,
}) {
  const presentationMarginControls = Array.from(root.querySelectorAll('[data-presentation-margin]'));
  const presentationMarginValueControls = Array.from(root.querySelectorAll('[data-presentation-margin-value]'));
  const backgroundStyleColorControls = Array.from(root.querySelectorAll('[data-background-style-color]'));
  const gridStyleToggleControls = Array.from(root.querySelectorAll('[data-grid-style-toggle]'));
  const gridStyleColorControls = Array.from(root.querySelectorAll('[data-grid-style-color]'));
  const scaleStyleColorControls = Array.from(root.querySelectorAll('[data-scale-style-color]'));
  const scaleStyleFontSizeControls = Array.from(root.querySelectorAll('[data-scale-style-font-size]'));
  const watermarkStyleToggleControls = Array.from(root.querySelectorAll('[data-watermark-style-toggle]'));
  const watermarkStyleTextControls = Array.from(root.querySelectorAll('[data-watermark-style-text]'));
  const watermarkStyleColorControls = Array.from(root.querySelectorAll('[data-watermark-style-color]'));
  const watermarkStyleFontSizeControls = Array.from(root.querySelectorAll('[data-watermark-style-font-size]'));

  function render(draft) {
    presentationMarginControls.forEach((control) => {
      if (control.type === 'checkbox') {
        control.checked = Boolean(draft.compactMargins);
      }
    });
    presentationMarginValueControls.forEach((control) => {
      if (control.type === 'number') {
        control.value = String(draft.margins?.[control.dataset.presentationMarginValue] ?? '');
      }
    });
    backgroundStyleColorControls.forEach((control) => {
      control.value = draft.backgroundStyle?.[control.dataset.backgroundStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle[control.dataset.backgroundStyleColor]
        || '#000000';
    });
    gridStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.gridStyle?.[control.dataset.gridStyleToggle]);
    });
    gridStyleColorControls.forEach((control) => {
      control.value = draft.gridStyle?.[control.dataset.gridStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle[control.dataset.gridStyleColor]
        || '#000000';
    });
    scaleStyleColorControls.forEach((control) => {
      control.value = draft.scaleStyle?.[control.dataset.scaleStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle[control.dataset.scaleStyleColor]
        || '#000000';
    });
    scaleStyleFontSizeControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = String(draft.scaleStyle?.fontSize || DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle.fontSize);
      }
    });
    watermarkStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.watermarkStyle?.[control.dataset.watermarkStyleToggle]);
    });
    watermarkStyleTextControls.forEach((control) => {
      control.value = draft.watermarkStyle?.[control.dataset.watermarkStyleText]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle[control.dataset.watermarkStyleText]
        || '';
    });
    watermarkStyleColorControls.forEach((control) => {
      control.value = draft.watermarkStyle?.[control.dataset.watermarkStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle[control.dataset.watermarkStyleColor]
        || '#000000';
    });
    watermarkStyleFontSizeControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = String(
          draft.watermarkStyle?.fontSize || DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle.fontSize
        );
      }
    });
  }

  function bindDraftEvents({ renderSettingsDraft }) {
    presentationMarginControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.type !== 'checkbox') return;
        draft.compactMargins = control.checked;
        draft.margins = control.checked
          ? { topPercent: 6, bottomPercent: 6 }
          : { topPercent: 10, bottomPercent: 8 };
        renderSettingsDraft();
      });
    });
    presentationMarginValueControls.forEach((control) => {
      control.addEventListener('input', () => {
        const draft = getDraft();
        if (!draft || control.type !== 'number') return;
        const key = control.dataset.presentationMarginValue;
        draft.margins[key] = Number(control.value);
        draft.compactMargins = draft.margins.topPercent === 6
          && draft.margins.bottomPercent === 6;
        renderSettingsDraft();
      });
    });
    backgroundStyleColorControls.forEach((control) => {
      const updateBackgroundStyleColor = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.backgroundStyle[control.dataset.backgroundStyleColor] = control.value;
      };
      control.addEventListener('input', updateBackgroundStyleColor);
      control.addEventListener('change', updateBackgroundStyleColor);
    });
    gridStyleToggleControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft) return;
        draft.gridStyle[control.dataset.gridStyleToggle] = control.checked;
      });
    });
    gridStyleColorControls.forEach((control) => {
      const updateGridStyleColor = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.gridStyle[control.dataset.gridStyleColor] = control.value;
      };
      control.addEventListener('input', updateGridStyleColor);
      control.addEventListener('change', updateGridStyleColor);
    });
    scaleStyleColorControls.forEach((control) => {
      const updateScaleStyleColor = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.scaleStyle[control.dataset.scaleStyleColor] = control.value;
      };
      control.addEventListener('input', updateScaleStyleColor);
      control.addEventListener('change', updateScaleStyleColor);
    });
    scaleStyleFontSizeControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.scaleStyle.fontSize = Number(control.value);
      });
    });
    watermarkStyleToggleControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft) return;
        draft.watermarkStyle[control.dataset.watermarkStyleToggle] = control.checked;
      });
    });
    watermarkStyleTextControls.forEach((control) => {
      const updateWatermarkText = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.watermarkStyle[control.dataset.watermarkStyleText] = control.value;
      };
      control.addEventListener('input', updateWatermarkText);
      control.addEventListener('change', updateWatermarkText);
    });
    watermarkStyleColorControls.forEach((control) => {
      const updateWatermarkColor = () => {
        const draft = getDraft();
        if (!draft) return;
        draft.watermarkStyle[control.dataset.watermarkStyleColor] = control.value;
      };
      control.addEventListener('input', updateWatermarkColor);
      control.addEventListener('change', updateWatermarkColor);
    });
    watermarkStyleFontSizeControls.forEach((control) => {
      control.addEventListener('change', () => {
        const draft = getDraft();
        if (!draft || control.tagName !== 'SELECT') return;
        draft.watermarkStyle.fontSize = Number(control.value);
      });
    });
  }

  return {
    bindDraftEvents,
    render,
  };
}
