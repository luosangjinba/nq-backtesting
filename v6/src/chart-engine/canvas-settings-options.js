const HIDDEN_GRID_COLOR = 'rgba(0, 0, 0, 0)';

function resolveColor(value, fallback) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function resolveFontSize(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

export function createCanvasSettingsChartOptions(settings = {}, defaults = {}) {
  const backgroundColor = resolveColor(
    settings.chartBackgroundColor,
    defaults.layout?.background?.color,
  );
  const gridColor = resolveColor(settings.chartGridColor, defaults.grid?.horzLines?.color);
  const crosshairColor = resolveColor(
    settings.chartCrosshairColor,
    defaults.crosshair?.horzLine?.color,
  );
  const scaleTextColor = resolveColor(settings.chartScaleTextColor, defaults.layout?.textColor);
  const scaleFontSize = resolveFontSize(settings.chartScaleFontSize, defaults.layout?.fontSize);
  const axisBorderColor = resolveColor(
    settings.chartAxisBorderColor,
    defaults.rightPriceScale?.borderColor,
  );
  const chartGrid = settings.chartGrid !== false;

  return Object.freeze({
    state: Object.freeze({
      chartAxisBorderColor: axisBorderColor,
      chartBackgroundColor: backgroundColor,
      chartCrosshairColor: crosshairColor,
      chartGrid,
      chartGridColor: gridColor,
      chartScaleFontSize: scaleFontSize,
      chartScaleTextColor: scaleTextColor,
    }),
    options: Object.freeze({
      crosshair: {
        horzLine: { color: crosshairColor },
        vertLine: { color: crosshairColor },
      },
      grid: {
        horzLines: { color: chartGrid ? gridColor : HIDDEN_GRID_COLOR },
        vertLines: { color: chartGrid ? gridColor : HIDDEN_GRID_COLOR },
      },
      layout: {
        background: { color: backgroundColor, type: 'solid' },
        fontSize: scaleFontSize,
        textColor: scaleTextColor,
      },
      rightPriceScale: { borderColor: axisBorderColor },
      timeScale: { borderColor: axisBorderColor },
    }),
  });
}
