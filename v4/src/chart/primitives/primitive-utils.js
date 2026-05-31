export function extendXByBars(chart, x, extendBars) {
  if (x === null || x === undefined || !Number.isFinite(Number(extendBars)) || Number(extendBars) <= 0) {
    return x;
  }
  const barSpacing = Number(chart?.timeScale?.().options?.().barSpacing);
  const spacing = Number.isFinite(barSpacing) && barSpacing > 0 ? barSpacing : 6;
  return x + Number(extendBars) * spacing;
}
