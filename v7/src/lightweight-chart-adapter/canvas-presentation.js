import {
  ColorType,
  LineStyle,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { hexColorWithOpacity, readWorkstationSettings } from '../workstation-settings/public.js';

const LINE_STYLES = Object.freeze({
  dashed: LineStyle.Dashed,
  dotted: LineStyle.Dotted,
  solid: LineStyle.Solid,
});

/** Map one global Canvas value to native options without touching series data or Viewport intent. */
export function createCanvasPresentation(settings) {
  const { canvas } = readWorkstationSettings(settings);
  const crosshairColor = hexColorWithOpacity(
    canvas.crosshairColor,
    canvas.crosshairOpacityPercent,
  );
  const crosshairLine = Object.freeze({
    color: crosshairColor,
    style: LINE_STYLES[canvas.crosshairStyle],
    width: canvas.crosshairWidth,
  });
  return Object.freeze({
    chartOptions: Object.freeze({
      grid: Object.freeze({
        horzLines: Object.freeze({ visible: canvas.gridVisible }),
        vertLines: Object.freeze({ visible: canvas.gridVisible }),
      }),
      layout: Object.freeze({
        background: Object.freeze({ color: canvas.backgroundColor, type: ColorType.Solid }),
        fontSize: canvas.scaleFontSize,
        textColor: canvas.scaleTextColor,
      }),
    }),
    crosshairOptions: Object.freeze({
      horzLine: crosshairLine,
      vertLine: crosshairLine,
    }),
    priceScaleOptions: Object.freeze({
      scaleMargins: Object.freeze({
        bottom: canvas.bottomMarginPercent / 100,
        top: canvas.topMarginPercent / 100,
      }),
    }),
  });
}
