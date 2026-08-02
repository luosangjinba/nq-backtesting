export function createAdapterCrosshairInteraction({
  candleSeriesWriter, chart, host, onCrosshairMove, presentation, series,
}) {
  let pointerWithinHost = false;

  function record(value, origin) {
    host.dataset.crosshairDisplayEpochMs = value.displayEpochMs === null
      ? 'none' : String(value.displayEpochMs);
    host.dataset.crosshairOrigin = origin;
    host.dataset.crosshairState = value.state;
    return value;
  }

  const onChartMove = (event) => {
    if (!pointerWithinHost && !host.matches(':hover')) return;
    const displayEpochMs = typeof event.time === 'number' ? Math.round(event.time * 1_000) : null;
    const value = displayEpochMs !== null && candleSeriesWriter.hasSeriesData(event.seriesData)
      ? presentation.selectedAt(displayEpochMs)
      : presentation.latest();
    onCrosshairMove(record(value, 'native'));
  };
  const onEnter = () => { pointerWithinHost = true; };
  const onLeave = () => {
    pointerWithinHost = false;
    onCrosshairMove(record(presentation.latest(), 'native'));
  };
  chart.subscribeCrosshairMove(onChartMove);
  host.addEventListener('pointerenter', onEnter);
  host.addEventListener('pointerleave', onLeave);

  return Object.freeze({
    clear() {
      chart.clearCrosshairPosition();
      return record(presentation.latest(), 'cleared');
    },
    dispose() {
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      chart.unsubscribeCrosshairMove(onChartMove);
    },
    observe: (displayEpochMs = null) => (displayEpochMs === null
      ? presentation.latest()
      : presentation.selectedAt(displayEpochMs)),
    project(displayEpochMs) {
      const value = presentation.selectedAt(displayEpochMs);
      if (!value.bar || !Number.isSafeInteger(displayEpochMs)) return value;
      chart.setCrosshairPosition(value.bar.close, displayEpochMs / 1_000, series);
      return record(value, 'projected');
    },
  });
}
