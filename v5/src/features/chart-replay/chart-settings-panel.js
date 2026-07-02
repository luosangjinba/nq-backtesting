import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../../contracts/chart-presentation-contracts.js';
import {
  candleStyleValue,
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneSettingsDraftForApply,
  cloneWatermarkStyle,
  createSettingsDraft as createSettingsDraftFromState,
  setCandleStyleValue,
} from './chart-settings-draft.js';

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
  const chartSettingsPopover = root.querySelector('[data-chart-settings-popover]');
  const chartSettingsOpenButton = root.querySelector('[data-chart-settings-open]');
  const chartSettingsCancelButtons = Array.from(root.querySelectorAll('[data-chart-settings-cancel]'));
  const chartSettingsApplyButton = root.querySelector('[data-chart-settings-apply]');
  const chartSettingsTabButtons = Array.from(root.querySelectorAll('[data-chart-settings-tab]'));
  const chartSettingsSections = Array.from(root.querySelectorAll('[data-chart-settings-section]'));
  const displayTimezoneControls = Array.from(root.querySelectorAll('[data-display-timezone]'));
  const presentationTimeFormatControls = Array.from(root.querySelectorAll('[data-presentation-time-format]'));
  const presentationDateFormatControls = Array.from(root.querySelectorAll('[data-presentation-date-format]'));
  const presentationStatusTitleModeControls = Array.from(root.querySelectorAll('[data-presentation-status-title-mode]'));
  const presentationToggleControls = Array.from(root.querySelectorAll('[data-presentation-toggle]'));
  const presentationMarginControls = Array.from(root.querySelectorAll('[data-presentation-margin]'));
  const presentationMarginValueControls = Array.from(root.querySelectorAll('[data-presentation-margin-value]'));
  const presentationRightOffsetControls = Array.from(root.querySelectorAll('[data-presentation-right-offset]'));
  const candleStyleControls = Array.from(root.querySelectorAll('[data-candle-style]'));
  const gridStyleToggleControls = Array.from(root.querySelectorAll('[data-grid-style-toggle]'));
  const gridStyleColorControls = Array.from(root.querySelectorAll('[data-grid-style-color]'));
  const crosshairStyleToggleControls = Array.from(root.querySelectorAll('[data-crosshair-style-toggle]'));
  const crosshairStyleColorControls = Array.from(root.querySelectorAll('[data-crosshair-style-color]'));
  const backgroundStyleColorControls = Array.from(root.querySelectorAll('[data-background-style-color]'));
  const scaleStyleToggleControls = Array.from(root.querySelectorAll('[data-scale-style-toggle]'));
  const scaleStyleSideControls = Array.from(root.querySelectorAll('[data-scale-style-side]'));
  const scaleStyleColorControls = Array.from(root.querySelectorAll('[data-scale-style-color]'));
  const scaleStyleFontSizeControls = Array.from(root.querySelectorAll('[data-scale-style-font-size]'));
  const watermarkStyleToggleControls = Array.from(root.querySelectorAll('[data-watermark-style-toggle]'));
  const watermarkStyleTextControls = Array.from(root.querySelectorAll('[data-watermark-style-text]'));
  const watermarkStyleColorControls = Array.from(root.querySelectorAll('[data-watermark-style-color]'));
  const watermarkStyleFontSizeControls = Array.from(root.querySelectorAll('[data-watermark-style-font-size]'));
  let settingsDraft = null;

  function createSettingsDraft() {
    return createSettingsDraftFromState({
      displayTimezone: getDisplayTimezone(),
      presentationSettings: getPresentationSettings(),
    });
  }

  function renderSettingsDraft() {
    const draft = settingsDraft || createSettingsDraft();
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
    presentationDateFormatControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.dateFormat;
      }
    });
    presentationStatusTitleModeControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = draft.statusTitleMode;
      }
    });
    presentationToggleControls.forEach((control) => {
      const key = control.dataset.presentationToggle;
      if (control.type === 'checkbox') {
        control.checked = Boolean(draft[key]);
      }
    });
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
    presentationRightOffsetControls.forEach((control) => {
      if (control.tagName === 'SELECT') {
        control.value = String(draft.rightOffsetBars || 10);
      }
    });
    candleStyleControls.forEach((control) => {
      control.value = candleStyleValue(draft.candleStyle, control.dataset.candleStyle);
    });
    gridStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.gridStyle?.[control.dataset.gridStyleToggle]);
    });
    gridStyleColorControls.forEach((control) => {
      control.value = draft.gridStyle?.[control.dataset.gridStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle[control.dataset.gridStyleColor]
        || '#000000';
    });
    crosshairStyleToggleControls.forEach((control) => {
      control.checked = Boolean(draft.crosshairStyle?.[control.dataset.crosshairStyleToggle]);
    });
    crosshairStyleColorControls.forEach((control) => {
      control.value = draft.crosshairStyle?.[control.dataset.crosshairStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle[control.dataset.crosshairStyleColor]
        || '#000000';
    });
    backgroundStyleColorControls.forEach((control) => {
      control.value = draft.backgroundStyle?.[control.dataset.backgroundStyleColor]
        || DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle[control.dataset.backgroundStyleColor]
        || '#000000';
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

  function showSettingsSection(sectionId) {
    chartSettingsTabButtons.forEach((button) => {
      button.setAttribute('aria-current', button.dataset.chartSettingsTab === sectionId ? 'true' : 'false');
    });
    chartSettingsSections.forEach((settingsSection) => {
      settingsSection.hidden = settingsSection.dataset.chartSettingsSection !== sectionId;
    });
  }

  function open() {
    settingsDraft = createSettingsDraft();
    showSettingsSection('symbol');
    renderSettingsDraft();
    chartSettingsPopover.hidden = false;
    chartSettingsCancelButtons[0]?.focus();
  }

  function close() {
    chartSettingsPopover.hidden = true;
    settingsDraft = null;
    renderSettingsDraft();
    onCancel?.();
    chartSettingsOpenButton.focus();
  }

  chartSettingsOpenButton.addEventListener('click', open);
  chartSettingsCancelButtons.forEach((button) => {
    button.addEventListener('click', close);
  });
  chartSettingsPopover.addEventListener('click', (event) => {
    if (event.target === chartSettingsPopover) {
      close();
    }
  });
  chartSettingsTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showSettingsSection(button.dataset.chartSettingsTab || 'symbol');
    });
  });
  displayTimezoneControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.displayTimezone = control.value;
    });
  });
  presentationTimeFormatControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.timeFormat = control.value;
    });
  });
  presentationDateFormatControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.dateFormat = control.value;
    });
  });
  presentationStatusTitleModeControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.statusTitleMode = control.value;
    });
  });
  presentationToggleControls.forEach((control) => {
    control.addEventListener('change', () => {
      const key = control.dataset.presentationToggle;
      if (!settingsDraft || !key || control.type !== 'checkbox') return;
      settingsDraft[key] = control.checked;
    });
  });
  presentationMarginControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.type !== 'checkbox') return;
      settingsDraft.compactMargins = control.checked;
      settingsDraft.margins = control.checked
        ? { topPercent: 6, bottomPercent: 6 }
        : { topPercent: 10, bottomPercent: 8 };
      renderSettingsDraft();
    });
  });
  presentationMarginValueControls.forEach((control) => {
    control.addEventListener('input', () => {
      if (!settingsDraft || control.type !== 'number') return;
      const key = control.dataset.presentationMarginValue;
      settingsDraft.margins[key] = Number(control.value);
      settingsDraft.compactMargins = settingsDraft.margins.topPercent === 6
        && settingsDraft.margins.bottomPercent === 6;
      renderSettingsDraft();
    });
  });
  presentationRightOffsetControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.rightOffsetBars = Number(control.value);
    });
  });
  candleStyleControls.forEach((control) => {
    const updateCandleStyle = () => {
      if (!settingsDraft) return;
      setCandleStyleValue(settingsDraft.candleStyle, control.dataset.candleStyle, control.value);
    };
    control.addEventListener('input', updateCandleStyle);
    control.addEventListener('change', updateCandleStyle);
  });
  gridStyleToggleControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft) return;
      settingsDraft.gridStyle[control.dataset.gridStyleToggle] = control.checked;
    });
  });
  gridStyleColorControls.forEach((control) => {
    const updateGridStyleColor = () => {
      if (!settingsDraft) return;
      settingsDraft.gridStyle[control.dataset.gridStyleColor] = control.value;
    };
    control.addEventListener('input', updateGridStyleColor);
    control.addEventListener('change', updateGridStyleColor);
  });
  crosshairStyleToggleControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft) return;
      settingsDraft.crosshairStyle[control.dataset.crosshairStyleToggle] = control.checked;
    });
  });
  crosshairStyleColorControls.forEach((control) => {
    const updateCrosshairStyleColor = () => {
      if (!settingsDraft) return;
      settingsDraft.crosshairStyle[control.dataset.crosshairStyleColor] = control.value;
    };
    control.addEventListener('input', updateCrosshairStyleColor);
    control.addEventListener('change', updateCrosshairStyleColor);
  });
  backgroundStyleColorControls.forEach((control) => {
    const updateBackgroundStyleColor = () => {
      if (!settingsDraft) return;
      settingsDraft.backgroundStyle[control.dataset.backgroundStyleColor] = control.value;
    };
    control.addEventListener('input', updateBackgroundStyleColor);
    control.addEventListener('change', updateBackgroundStyleColor);
  });
  scaleStyleToggleControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft) return;
      settingsDraft.scaleStyle[control.dataset.scaleStyleToggle] = control.checked;
    });
  });
  scaleStyleSideControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.scaleStyle.priceScaleSide = control.value;
    });
  });
  scaleStyleColorControls.forEach((control) => {
    const updateScaleStyleColor = () => {
      if (!settingsDraft) return;
      settingsDraft.scaleStyle[control.dataset.scaleStyleColor] = control.value;
    };
    control.addEventListener('input', updateScaleStyleColor);
    control.addEventListener('change', updateScaleStyleColor);
  });
  scaleStyleFontSizeControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.scaleStyle.fontSize = Number(control.value);
    });
  });
  watermarkStyleToggleControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft) return;
      settingsDraft.watermarkStyle[control.dataset.watermarkStyleToggle] = control.checked;
    });
  });
  watermarkStyleTextControls.forEach((control) => {
    const updateWatermarkText = () => {
      if (!settingsDraft) return;
      settingsDraft.watermarkStyle[control.dataset.watermarkStyleText] = control.value;
    };
    control.addEventListener('input', updateWatermarkText);
    control.addEventListener('change', updateWatermarkText);
  });
  watermarkStyleColorControls.forEach((control) => {
    const updateWatermarkColor = () => {
      if (!settingsDraft) return;
      settingsDraft.watermarkStyle[control.dataset.watermarkStyleColor] = control.value;
    };
    control.addEventListener('input', updateWatermarkColor);
    control.addEventListener('change', updateWatermarkColor);
  });
  watermarkStyleFontSizeControls.forEach((control) => {
    control.addEventListener('change', () => {
      if (!settingsDraft || control.tagName !== 'SELECT') return;
      settingsDraft.watermarkStyle.fontSize = Number(control.value);
    });
  });
  chartSettingsApplyButton.addEventListener('click', async () => {
    if (!settingsDraft) return;
    const draft = settingsDraft;
    const applied = await onApply?.(cloneSettingsDraftForApply(draft));
    if (applied === false) return;
    chartSettingsPopover.hidden = true;
    settingsDraft = null;
    renderSettingsDraft();
    chartSettingsOpenButton.focus();
  });

  renderSettingsDraft();

  return {
    renderCurrent: renderSettingsDraft,
    close,
  };
}
