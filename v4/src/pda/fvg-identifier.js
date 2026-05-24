// FVG identification for manual range annotation.

function checkFvgPattern(k1, k2, k3) {
  if (k1.low > k3.high) {
    return {
      anchorBar: k2,
      startBar: k1,
      endBar: k3,
      topPrice: k1.low,
      bottomPrice: k3.high,
      direction: 'bearish',
    };
  }

  if (k1.high < k3.low) {
    return {
      anchorBar: k2,
      startBar: k1,
      endBar: k3,
      topPrice: k3.low,
      bottomPrice: k1.high,
      direction: 'bullish',
    };
  }

  return null;
}

export function identifyFvg(displayBars, selectedBar) {
  if (!displayBars?.length || !selectedBar || displayBars.length < 3) return null;

  const index = displayBars.findIndex((bar) => bar.timestamp === selectedBar.timestamp);
  if (index < 0) return null;

  if (index >= 1 && index < displayBars.length - 1) {
    const result = checkFvgPattern(displayBars[index - 1], displayBars[index], displayBars[index + 1]);
    if (result) return result;
  }

  if (index < displayBars.length - 2) {
    const result = checkFvgPattern(displayBars[index], displayBars[index + 1], displayBars[index + 2]);
    if (result) return result;
  }

  if (index >= 2) {
    return checkFvgPattern(displayBars[index - 2], displayBars[index - 1], displayBars[index]);
  }

  return null;
}
