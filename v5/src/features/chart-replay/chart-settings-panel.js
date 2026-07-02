import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../../contracts/chart-presentation-contracts.js';

export function renderChartSettingsPopover() {
  return `
        <div class="chart-settings-popover" data-chart-settings-popover hidden>
          <div class="chart-settings-panel" role="dialog" aria-modal="true" aria-label="Chart settings">
            <div class="chart-settings-header">
              <strong>Settings</strong>
              <button type="button" data-chart-settings-cancel aria-label="Close settings">&times;</button>
            </div>
            <div class="chart-settings-body">
              <nav class="chart-settings-tabs" aria-label="Chart settings sections">
                <button type="button" data-chart-settings-tab="symbol" aria-current="true">Symbol</button>
                <button type="button" data-chart-settings-tab="status">Status line</button>
                <button type="button" data-chart-settings-tab="scales">Scales and lines</button>
                <button type="button" data-chart-settings-tab="canvas">Canvas</button>
              </nav>
              <div class="chart-settings-sections">
                <section data-chart-settings-section="symbol">
                  <h3>Candles</h3>
                  <label class="chart-settings-color-row">
                    <span>Body</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-candle-style="body.up" aria-label="Up body color">
                      <input type="color" data-candle-style="body.down" aria-label="Down body color">
                    </span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Borders</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-candle-style="border.up" aria-label="Up border color">
                      <input type="color" data-candle-style="border.down" aria-label="Down border color">
                    </span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Wick</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-candle-style="wick.up" aria-label="Up wick color">
                      <input type="color" data-candle-style="wick.down" aria-label="Down wick color">
                    </span>
                  </label>
                  <h3>Data modification</h3>
                  <label class="chart-settings-row">
                    <span>Timezone</span>
                    <select data-display-timezone>
                      <option value="Exchange">Exchange</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </label>
                  <label class="chart-settings-row">
                    <span>Time hours format</span>
                    <select data-presentation-time-format>
                      <option value="24h">24-hours</option>
                      <option value="12h">12-hours</option>
                    </select>
                  </label>
                </section>
                <section data-chart-settings-section="status" hidden>
                  <h3>Status line</h3>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showStatusTitle">
                    <span>Title</span>
                  </label>
                  <label class="chart-settings-row">
                    <span>Title mode</span>
                    <select data-presentation-status-title-mode>
                      <option value="symbol-timeframe">Symbol and timeframe</option>
                      <option value="symbol">Symbol only</option>
                      <option value="timeframe">Timeframe only</option>
                    </select>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showOpenMarketStatus">
                    <span>Open market status</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showStatusOhlc">
                    <span>Chart values</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showStatusChange">
                    <span>Bar change values</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showCrosshairReadout">
                    <span>Crosshair readout</span>
                  </label>
                </section>
                <section data-chart-settings-section="scales" hidden>
                  <h3>Time scale</h3>
                  <label class="chart-settings-row">
                    <span>Right offset</span>
                    <select data-presentation-right-offset>
                      <option value="10">10 bars</option>
                      <option value="16">16 bars</option>
                    </select>
                  </label>
                  <label class="chart-settings-row">
                    <span>Date format</span>
                    <select data-presentation-date-format>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="MMM DD 'YY">Mon 29 Sep '97</option>
                      <option value="DD MMM 'YY">29 Sep '97</option>
                    </select>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showDayOfWeekLabels">
                    <span>Day of week on labels</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-scale-style-toggle="timeScaleVisible">
                    <span>Time scale</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-scale-style-toggle="priceScaleVisible">
                    <span>Price scale</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-scale-style-toggle="scaleBordersVisible">
                    <span>Scale borders</span>
                  </label>
                  <h3>Crosshair</h3>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-crosshair-style-toggle="verticalVisible">
                    <span>Vertical line</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-crosshair-style-toggle="horizontalVisible">
                    <span>Horizontal line</span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Line colors</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-crosshair-style-color="verticalColor" aria-label="Vertical crosshair color">
                      <input type="color" data-crosshair-style-color="horizontalColor" aria-label="Horizontal crosshair color">
                    </span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Label background</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-crosshair-style-color="labelBackgroundColor" aria-label="Crosshair label background color">
                    </span>
                  </label>
                </section>
                <section data-chart-settings-section="canvas" hidden>
                  <h3>Margins</h3>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-margin="compact">
                    <span>Compact chart margins</span>
                  </label>
                  <label class="chart-settings-number-row">
                    <span>Top</span>
                    <span class="chart-settings-number-input">
                      <input type="number" min="0" max="40" step="1" data-presentation-margin-value="topPercent">
                      <span>%</span>
                    </span>
                  </label>
                  <label class="chart-settings-number-row">
                    <span>Bottom</span>
                    <span class="chart-settings-number-input">
                      <input type="number" min="0" max="40" step="1" data-presentation-margin-value="bottomPercent">
                      <span>%</span>
                    </span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Background</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-background-style-color="color" aria-label="Chart background color">
                    </span>
                  </label>
                  <h3>Watermark</h3>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-watermark-style-toggle="visible">
                    <span>Watermark</span>
                  </label>
                  <label class="chart-settings-row">
                    <span>Text</span>
                    <input type="text" maxlength="80" data-watermark-style-text="text" aria-label="Watermark text">
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Style</span>
                    <span class="chart-settings-color-pair chart-settings-scale-pair">
                      <input type="color" data-watermark-style-color="color" aria-label="Watermark color">
                      <select data-watermark-style-font-size aria-label="Watermark text size">
                        <option value="32">32</option>
                        <option value="48">48</option>
                        <option value="64">64</option>
                        <option value="80">80</option>
                      </select>
                    </span>
                  </label>
                  <h3>Grid</h3>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-grid-style-toggle="verticalVisible">
                    <span>Vertical grid lines</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-grid-style-toggle="horizontalVisible">
                    <span>Horizontal grid lines</span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Grid colors</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-grid-style-color="verticalColor" aria-label="Vertical grid color">
                      <input type="color" data-grid-style-color="horizontalColor" aria-label="Horizontal grid color">
                    </span>
                  </label>
                  <h3>Scales</h3>
                  <label class="chart-settings-color-row">
                    <span>Text</span>
                    <span class="chart-settings-color-pair chart-settings-scale-pair">
                      <input type="color" data-scale-style-color="textColor" aria-label="Scale text color">
                      <select data-scale-style-font-size aria-label="Scale text size">
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                      </select>
                    </span>
                  </label>
                  <label class="chart-settings-color-row">
                    <span>Lines</span>
                    <span class="chart-settings-color-pair">
                      <input type="color" data-scale-style-color="lineColor" aria-label="Scale line color">
                    </span>
                  </label>
                </section>
              </div>
            </div>
            <div class="chart-settings-footer">
              <button type="button" data-chart-settings-cancel>Cancel</button>
              <button type="button" data-chart-settings-apply>Ok</button>
            </div>
          </div>
        </div>
  `;
}

export function cloneCandleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle) {
  return {
    body: { ...style.body },
    border: { ...style.border },
    wick: { ...style.wick },
  };
}

export function cloneGridStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle) {
  return { ...style };
}

export function cloneCrosshairStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle) {
  return { ...style };
}

export function cloneBackgroundStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle) {
  return { ...style };
}

export function cloneScaleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle) {
  return { ...style };
}

export function cloneWatermarkStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle) {
  return { ...style };
}

function compactMarginsEnabled(settings) {
  return settings?.margins?.topPercent === 6 && settings?.margins?.bottomPercent === 6;
}

function candleStyleValue(style, path) {
  const [group, direction] = String(path || '').split('.');
  return style?.[group]?.[direction] || DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle[group]?.[direction] || '#000000';
}

function setCandleStyleValue(style, path, value) {
  const [group, direction] = String(path || '').split('.');
  if (!style[group]) style[group] = {};
  style[group][direction] = value;
}

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
  const scaleStyleColorControls = Array.from(root.querySelectorAll('[data-scale-style-color]'));
  const scaleStyleFontSizeControls = Array.from(root.querySelectorAll('[data-scale-style-font-size]'));
  const watermarkStyleToggleControls = Array.from(root.querySelectorAll('[data-watermark-style-toggle]'));
  const watermarkStyleTextControls = Array.from(root.querySelectorAll('[data-watermark-style-text]'));
  const watermarkStyleColorControls = Array.from(root.querySelectorAll('[data-watermark-style-color]'));
  const watermarkStyleFontSizeControls = Array.from(root.querySelectorAll('[data-watermark-style-font-size]'));
  let settingsDraft = null;

  function createSettingsDraft() {
    const presentationSettings = getPresentationSettings();
    return {
      displayTimezone: getDisplayTimezone(),
      timeFormat: presentationSettings.timeFormat,
      dateFormat: presentationSettings.dateFormat,
      statusTitleMode: presentationSettings.statusTitleMode,
      showStatusTitle: Boolean(presentationSettings.showStatusTitle),
      showOpenMarketStatus: Boolean(presentationSettings.showOpenMarketStatus),
      showDayOfWeekLabels: Boolean(presentationSettings.showDayOfWeekLabels),
      showStatusOhlc: Boolean(presentationSettings.showStatusOhlc),
      showStatusChange: Boolean(presentationSettings.showStatusChange),
      showCrosshairReadout: Boolean(presentationSettings.showCrosshairReadout),
      compactMargins: compactMarginsEnabled(presentationSettings),
      margins: { ...presentationSettings.margins },
      rightOffsetBars: Number(presentationSettings.rightOffsetBars || 10),
      candleStyle: cloneCandleStyle(presentationSettings.candleStyle),
      gridStyle: cloneGridStyle(presentationSettings.gridStyle),
      crosshairStyle: cloneCrosshairStyle(presentationSettings.crosshairStyle),
      backgroundStyle: cloneBackgroundStyle(presentationSettings.backgroundStyle),
      scaleStyle: cloneScaleStyle(presentationSettings.scaleStyle),
      watermarkStyle: cloneWatermarkStyle(presentationSettings.watermarkStyle),
    };
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
    const applied = await onApply?.({
      ...draft,
      margins: { ...draft.margins },
      candleStyle: cloneCandleStyle(draft.candleStyle),
      gridStyle: cloneGridStyle(draft.gridStyle),
      crosshairStyle: cloneCrosshairStyle(draft.crosshairStyle),
      backgroundStyle: cloneBackgroundStyle(draft.backgroundStyle),
      scaleStyle: cloneScaleStyle(draft.scaleStyle),
      watermarkStyle: cloneWatermarkStyle(draft.watermarkStyle),
    });
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
