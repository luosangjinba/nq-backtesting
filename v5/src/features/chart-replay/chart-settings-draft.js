import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../../contracts/chart-presentation-contracts.js';

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

export function compactMarginsEnabled(settings) {
  return settings?.margins?.topPercent === 6 && settings?.margins?.bottomPercent === 6;
}

export function candleStyleValue(style, path) {
  const [group, direction] = String(path || '').split('.');
  return style?.[group]?.[direction] || DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle[group]?.[direction] || '#000000';
}

export function setCandleStyleValue(style, path, value) {
  const [group, direction] = String(path || '').split('.');
  if (!style[group]) style[group] = {};
  style[group][direction] = value;
}

export function createSettingsDraft({
  displayTimezone,
  presentationSettings,
}) {
  return {
    displayTimezone,
    timeFormat: presentationSettings.timeFormat,
    dateFormat: presentationSettings.dateFormat,
    statusTitleMode: presentationSettings.statusTitleMode,
    showStatusTitle: Boolean(presentationSettings.showStatusTitle),
    showOpenMarketStatus: Boolean(presentationSettings.showOpenMarketStatus),
    showDayOfWeekLabels: Boolean(presentationSettings.showDayOfWeekLabels),
    showStatusOhlc: Boolean(presentationSettings.showStatusOhlc),
    showStatusChange: Boolean(presentationSettings.showStatusChange),
    showCrosshairReadout: Boolean(presentationSettings.showCrosshairReadout),
    showBarCountdown: Boolean(presentationSettings.showBarCountdown),
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

export function cloneSettingsDraftForApply(draft) {
  return {
    ...draft,
    margins: { ...draft.margins },
    candleStyle: cloneCandleStyle(draft.candleStyle),
    gridStyle: cloneGridStyle(draft.gridStyle),
    crosshairStyle: cloneCrosshairStyle(draft.crosshairStyle),
    backgroundStyle: cloneBackgroundStyle(draft.backgroundStyle),
    scaleStyle: cloneScaleStyle(draft.scaleStyle),
    watermarkStyle: cloneWatermarkStyle(draft.watermarkStyle),
  };
}
