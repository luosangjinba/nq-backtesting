export function ellipsizeText(ctx, text, maxWidth) {
  const value = String(text || '').trim();
  if (!value || ctx.measureText(value).width <= maxWidth) return value;
  const ellipsis = '...';
  let output = value;
  while (output.length > 1 && ctx.measureText(output + ellipsis).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}${ellipsis}`;
}

export function wrapText(ctx, text, maxWidth, maxLines) {
  const value = String(text || '').trim();
  if (!value) return [];
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  const pushLongWord = (word) => {
    let chunk = '';
    Array.from(word).forEach((char) => {
      if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
        return;
      }
      chunk += char;
    });
    return chunk;
  };

  words.forEach((word) => {
    if (lines.length >= maxLines) return;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = ctx.measureText(word).width > maxWidth ? pushLongWord(word) : word;
  });
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && ctx.measureText(lines[lines.length - 1]).width > maxWidth) {
    lines[lines.length - 1] = ellipsizeText(ctx, lines[lines.length - 1], maxWidth);
  }
  return lines;
}

function rangesOverlap(a, b, gap = 0) {
  return a.left < b.right + gap && a.right + gap > b.left;
}

export function buildChartNoteLayouts(points, options, measure) {
  const notes = Array.isArray(points)
    ? points.filter((point) => point && point.x !== null && point.y !== null)
    : [];
  if (!notes.length || !measure?.ctx) return [];

  const {
    ctx,
    hRatio = 1,
    vRatio = 1,
    canvasWidth = 0,
    expandedNoteId = '',
  } = measure;
  const paddingX = options.paddingX * hRatio;
  const paddingY = options.paddingY * vRatio;
  const maxTextWidth = options.maxWidth * hRatio;
  const expandedMaxTextWidth = options.expandedMaxWidth * hRatio;
  const lineHeight = options.lineHeight * vRatio;
  const rowGap = options.rowGap * vRatio;
  const horizontalGap = Math.max(4 * hRatio, rowGap);
  const canvasRight = Math.max(4 * hRatio, canvasWidth - 4 * hRatio);
  const lanes = [];
  const entries = [];

  notes.forEach((point) => {
    const isExpanded = expandedNoteId === point.id;
    const lines = isExpanded
      ? wrapText(ctx, point.text, expandedMaxTextWidth, options.expandedMaxLines)
      : [ellipsizeText(ctx, point.text, maxTextWidth)];
    if (!lines.length || !lines[0]) return;

    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const textHeight = Math.max(lineHeight, lines.length * lineHeight);
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;
    const anchorX = point.x * hRatio;
    const anchorY = point.y * vRatio;
    const maxX = Math.max(4 * hRatio, canvasRight - boxWidth);
    const boxX = Math.round(Math.min(Math.max(4 * hRatio, anchorX - boxWidth / 2), maxX));
    const range = { left: boxX, right: boxX + boxWidth };
    let laneIndex = lanes.findIndex((lane) => !lane.ranges.some((item) => rangesOverlap(range, item, horizontalGap)));

    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({
        height: boxHeight,
        ranges: [],
      });
    }

    const lane = lanes[laneIndex];
    lane.ranges.push(range);
    lane.height = Math.max(lane.height, boxHeight);

    entries.push({
      ...point,
      laneIndex,
      lines,
      boxX,
      boxWidth,
      boxHeight,
      anchorX,
      anchorY,
    });
  });

  const laneYs = [];
  lanes.forEach((lane, index) => {
    const previousIndex = index - 1;
    laneYs[index] = previousIndex >= 0
      ? laneYs[previousIndex] + lanes[previousIndex].height + rowGap
      : options.topOffset * vRatio;
  });

  return entries.map((entry) => ({
    ...entry,
    boxY: Math.round(laneYs[entry.laneIndex] || options.topOffset * vRatio),
  }));
}
