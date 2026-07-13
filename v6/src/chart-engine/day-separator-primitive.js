class DaySeparatorRenderer {
  constructor(lines = []) {
    this.lines = lines;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const ratio = scope.horizontalPixelRatio || 1;
      const context = scope.context;
      this.lines.forEach((line) => {
        if (!Number.isFinite(line.x)) return;
        const x = Math.round(line.x * ratio);
        context.save();
        context.strokeStyle = line.color;
        context.lineWidth = Math.max(1, ratio);
        context.setLineDash(line.dash.map((value) => value * ratio));
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, scope.bitmapSize.height);
        context.stroke();
        context.restore();
      });
    });
  }
}

class DaySeparatorPaneView {
  constructor(source) {
    this.source = source;
    this.lines = [];
  }

  update() {
    const timeScale = this.source.chart?.timeScale?.();
    this.lines = this.source.lines.map((line) => ({
      ...line,
      x: timeScale?.logicalToCoordinate?.(line.logical) ?? null,
    }));
  }

  renderer() {
    return new DaySeparatorRenderer(this.lines);
  }
}

export function createDaySeparatorPrimitive() {
  const primitive = {
    chart: null,
    lines: [],
    paneView: null,
    requestUpdate: null,
    attached({ chart, requestUpdate } = {}) {
      primitive.chart = chart || null;
      primitive.requestUpdate = requestUpdate || null;
    },
    detached() {
      primitive.chart = null;
      primitive.requestUpdate = null;
    },
    paneViews() {
      return [primitive.paneView];
    },
    setLines(lines = []) {
      primitive.lines = lines.map((line) => ({ ...line, dash: [...(line.dash || [])] }));
      primitive.requestUpdate?.();
    },
    updateAllViews() {
      primitive.paneView.update();
    },
  };
  primitive.paneView = new DaySeparatorPaneView(primitive);
  return primitive;
}
