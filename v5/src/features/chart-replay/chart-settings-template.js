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
                  <label class="chart-settings-check">
                    <input type="checkbox" data-presentation-toggle="showBarCountdown">
                    <span>Bar countdown</span>
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
                  <label class="chart-settings-row">
                    <span>Price scale side</span>
                    <select data-scale-style-side>
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </select>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-scale-style-toggle="scaleBordersVisible">
                    <span>Scale borders</span>
                  </label>
                  <label class="chart-settings-check">
                    <input type="checkbox" data-scale-style-toggle="lockPriceToBarRatio">
                    <span>Lock price-to-bar ratio</span>
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
