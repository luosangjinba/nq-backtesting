import {
  createWorkstationSettings,
  hexColorOpacityPercent,
  hexColorWithOpacity,
  readWorkstationSettings,
} from '../workstation-settings/public.js';

export function populateSettingsDraft(controls, settings) {
  const value = readWorkstationSettings(settings);
  controls.candles.body.visible.checked = value.candles.bodyVisible;
  controls.candles.body.up.value = value.candles.upBodyColor;
  controls.candles.body.down.value = value.candles.downBodyColor;
  controls.candles.borders.visible.checked = value.candles.bordersVisible;
  controls.candles.borders.up.value = value.candles.upBorderColor;
  controls.candles.borders.down.value = value.candles.downBorderColor;
  controls.candles.wicks.visible.checked = value.candles.wicksVisible;
  controls.candles.wicks.up.value = value.candles.upWickColor;
  controls.candles.wicks.down.value = value.candles.downWickColor;
  controls.precision.value = String(value.candles.pricePrecision);
  controls.canvasPickers.background.value = value.canvas.backgroundColor;
  controls.canvasPickers.crosshair.value = hexColorWithOpacity(
    value.canvas.crosshairColor,
    value.canvas.crosshairOpacityPercent,
  );
  controls.canvasPickers.scaleText.value = value.canvas.scaleTextColor;
  controls.crosshairStyle.select.value = value.canvas.crosshairStyle;
  controls.crosshairWidth.select.value = String(value.canvas.crosshairWidth);
  controls.grid.checked = value.canvas.gridVisible;
  controls.margins.bottom.input.value = String(value.canvas.bottomMarginPercent);
  controls.margins.right.input.value = String(value.canvas.rightMarginBars);
  controls.margins.top.input.value = String(value.canvas.topMarginPercent);
  controls.paneControls.select.value = value.interface.paneControlDockVisibility;
  controls.scaleFontSize.select.value = String(value.canvas.scaleFontSize);
  controls.currentPrice.line.input.checked = value.currentPrice.lineVisible;
  controls.currentPrice.name.input.checked = value.currentPrice.nameVisible;
  controls.currentPrice.value.input.checked = value.currentPrice.valueVisible;
  controls.readout.change.input.checked = value.paneReadout.changeVisible;
  controls.readout.ohlc.input.checked = value.paneReadout.ohlcVisible;
  controls.readout.volume.input.checked = value.paneReadout.volumeVisible;
  controls.time.dateFormat.select.value = value.time.dateFormat;
  controls.time.dayOfWeek.input.checked = value.time.dayOfWeekVisible;
  controls.time.hourFormat.select.value = value.time.hourFormat;
  controls.time.timezone.select.value = value.time.displayTimezone;
}

export function readSettingsDraft(controls) {
  return createWorkstationSettings({
    candles: {
      bodyVisible: controls.candles.body.visible.checked,
      bordersVisible: controls.candles.borders.visible.checked,
      downBodyColor: controls.candles.body.down.value,
      downBorderColor: controls.candles.borders.down.value,
      downWickColor: controls.candles.wicks.down.value,
      pricePrecision: controls.precision.value === 'auto' ? 'auto' : Number(controls.precision.value),
      upBodyColor: controls.candles.body.up.value,
      upBorderColor: controls.candles.borders.up.value,
      upWickColor: controls.candles.wicks.up.value,
      wicksVisible: controls.candles.wicks.visible.checked,
    },
    canvas: {
      backgroundColor: controls.canvasPickers.background.value,
      bottomMarginPercent: Number(controls.margins.bottom.input.value),
      crosshairColor: hexColorWithOpacity(controls.canvasPickers.crosshair.value, 100),
      crosshairOpacityPercent: hexColorOpacityPercent(controls.canvasPickers.crosshair.value),
      crosshairStyle: controls.crosshairStyle.select.value,
      crosshairWidth: Number(controls.crosshairWidth.select.value),
      gridVisible: controls.grid.checked,
      rightMarginBars: Number(controls.margins.right.input.value),
      scaleFontSize: Number(controls.scaleFontSize.select.value),
      scaleTextColor: controls.canvasPickers.scaleText.value,
      topMarginPercent: Number(controls.margins.top.input.value),
    },
    currentPrice: {
      lineVisible: controls.currentPrice.line.input.checked,
      nameVisible: controls.currentPrice.name.input.checked,
      valueVisible: controls.currentPrice.value.input.checked,
    },
    interface: { paneControlDockVisibility: controls.paneControls.select.value },
    paneReadout: {
      changeVisible: controls.readout.change.input.checked,
      ohlcVisible: controls.readout.ohlc.input.checked,
      volumeVisible: controls.readout.volume.input.checked,
    },
    time: {
      dateFormat: controls.time.dateFormat.select.value,
      dayOfWeekVisible: controls.time.dayOfWeek.input.checked,
      displayTimezone: controls.time.timezone.select.value,
      hourFormat: controls.time.hourFormat.select.value,
    },
  });
}
