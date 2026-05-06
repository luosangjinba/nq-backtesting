# KLineChart v9 API Reference

Compiled from https://github.com/liihuu/KLineChart v9.8.12 Chinese documentation.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Static Chart API](#2-static-chart-api)
3. [Instance API](#3-instance-api)
4. [Style Configuration](#4-style-configuration)
5. [Overlay System](#5-overlay-system)
6. [Figure Types](#6-figure-types)
7. [Indicator System](#7-indicator-system)
8. [Data Source](#8-data-source)
9. [Custom Axis](#9-custom-axis)
10. [Internationalization](#10-internationalization)
11. [Hot Keys](#11-hot-keys)
12. [V8 to V9 Migration](#12-v8-to-v9-migration)

---

## 1. Quick Start

### Installation

```bash
npm install klinecharts
# or yarn, pnpm, bun
```

UMD builds available from CDN:
- https://unpkg.com/browse/klinecharts/dist/umd/klinecharts.min.js
- https://www.jsdelivr.com/package/npm/klinecharts

Global variable: `klinecharts`

### Basic Usage

```javascript
import { init } from 'klinecharts'

const chart = init('container_id')
chart.applyNewData([
  { timestamp: 1614171282000, open: 18987, high: 19042, low: 18967, close: 19012, volume: 200 },
  // ... more data
])
```

---

## 2. Static Chart API

### init(ds, options)

```typescript
(
  ds: string | HTMLElement,
  options?: {
    layout?: Array<{
      type: 'candle' | 'indicator' | 'xAxis'
      content: Array<Indicator | string>
      options: {
        id?: string
        height?: number
        minHeight?: number
        dragEnabled?: boolean
        position?: 'top' | 'bottom'
        gap?: {
          top?: number
          bottom?: number
        }
        axisOptions?: {
          name?: string
          scrollZoomEnabled?: boolean
        }
      }
    }>
    locale?: string
    styles?: string | object
    timezone?: string
    customApi?: {
      formatDate?: (dateTimeFormat: Intl.DateTimeFormat, timestamp: number, format: string, type: number) => string
      formatBigNumber?: (value: string | number) => string
    }
    thousandsSeparator?: string
    decimalFoldThreshold?: number    // ^9.8.0
  }
) => Chart
```

- `ds` - DOM element or element id
- `options.layout` - Custom layout; `content` items and `options` follow `createIndicator` params (^9.6.0)
- `options.locale` - Built-in: `'zh-CN'`, `'en-US'`
- `options.timezone` - e.g. `'Asia/Shanghai'`; auto-detects if omitted
- `options.styles` - Registered style name (via `registerStyles`) or style object (supports incremental merge)
- `options.customApi.formatDate` - Custom date formatting
- `options.customApi.formatBigNumber` - e.g. 1000 -> 1k, 1000000 -> 1M
- `options.thousandsSeparator` - Thousands separator character
- `options.decimalFoldThreshold` - Decimal fold threshold (^9.8.0)

### dispose(dcs)

```typescript
(dcs: HTMLElement | Chart | string) => void
```

Destroy a chart. Once destroyed, the chart instance is no longer usable.

### registerLocale(locale, locales)

```typescript
(
  locale: string,
  locales: {
    time: string
    open: string
    high: string
    low: string
    close: string
    volume: string
  }
) => void
```

### getOverlayClass(name)

```typescript
(name: string) => Nullable<OverlayConstructor>
```

Get overlay constructor by name.

### getSupportedLocales()

```typescript
() => string[]
```

### registerStyles(name, styles)

```typescript
(name: string, styles: object) => void
```

Register a named style configuration. Supports incremental merge.

### registerFigure(figure)

```typescript
(
  figure: {
    name: string
    draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: object) => void
    checkEventOn: (coordinate: Coordinate, attrs: any, styles: object) => boolean
  }
) => void
```

### getSupportedFigures()

```typescript
() => string[]
```

Returns: `['arc', 'circle', 'line', 'polygon', 'rect', 'text']`

### getFigureClass(name)

```typescript
(name: string) => Figure
```

### registerIndicator(indicator)

```typescript
(
  indicator: {
    name: string
    shortName?: string
    precision?: number
    calcParams?: any[]
    shouldOhlc?: boolean
    shouldFormatBigNumber?: boolean
    visible?: boolean
    extendData?: any
    series?: 'normal' | 'price' | 'volume'
    figures?: Array<{ key: string, title?: string, type?: string, baseValue?: number, attrs?: (...) => object, styles?: (...) => object }>
    minValue?: number
    maxValue?: number
    styles?: object
    calc: (dataList: KLineData[], indicator: object) => Promise<object[]> | object[]
    regenerateFigures?: (calcParms: any[]) => Array<...>
    createTooltipDataSource?: (params: object) => { name?, calcParamsText?, values? }
    draw?: (params: object) => boolean
  }
) => void
```

### getSupportedIndicators()

```typescript
() => string[]
```

### registerOverlay(overlay)

```typescript
(
  overlay: {
    name: string
    totalStep?: number
    lock?: boolean
    visible?: boolean
    zLevel?: number
    needDefaultPointFigure?: boolean
    needDefaultXAxisFigure?: boolean
    needDefaultYAxisFigure?: boolean
    mode?: 'normal' | 'weak_magnet' | 'strong_magnet'
    modeSensitivity?: number
    points?: Array<{ timestamp: number, dataIndex?: number, value?: number }>
    extendData?: any
    styles?: object
    createPointFigures?: (params) => OverlayFigure | OverlayFigure[]
    createXAxisFigures?: (params) => OverlayFigure | OverlayFigure[]
    createYAxisFigures?: (params) => OverlayFigure | OverlayFigure[]
    performEventPressedMove?: (params) => void
    performEventMoveForDrawing?: (params) => void
    onDrawStart?: (event) => boolean
    onDrawing?: (event) => boolean
    onDrawEnd?: (event) => boolean
    onClick?: (event) => boolean
    onDoubleClick?: (event) => boolean          // ^9.5.0
    onRightClick?: (event) => boolean
    onPressedMoveStart?: (event) => boolean
    onPressedMoving?: (event) => boolean
    onPressedMoveEnd?: (event) => boolean
    onMouseEnter?: (event) => boolean
    onMouseLeave?: (event) => boolean
    onRemoved?: (event) => boolean
    onSelected?: (event) => boolean
    onDeselected?: (event) => boolean
  }
) => void
```

### getSupportedOverlays()

```typescript
() => string[]
```

### registerXAxis(axis) -- ^9.8.0

```typescript
(
  axis: {
    name: string
    createTicks: (params: object) => Array<{ coord: number, value: number | string, text: string }>
  }
) => void
```

### registerYAxis(axis) -- ^9.8.0

```typescript
(
  axis: {
    name: string
    createTicks: (params: object) => Array<{ coord: number, value: number | string, text: string }>
  }
) => void
```

### version()

```typescript
() => string
```

### utils (Utility Methods)

| Method | Signature | Description |
|--------|-----------|-------------|
| `clone` | `(target: any) => any` | Deep clone |
| `merge` | `(target: object, source: object) => void` | Merge source into target |
| `isString` | `(value: any) => boolean` | |
| `isNumber` | `(value: any) => boolean` | |
| `isValid` | `(value: any) => boolean` | |
| `isObject` | `(value: any) => boolean` | |
| `isFunction` | `(value: any) => boolean` | |
| `isBoolean` | `(value: any) => boolean` | |
| `formatValue` | `(data: any, key: string, defaultValue?: any) => any` | Nested key access, e.g. `formatValue(o, 'a.b.c')` |
| `formatPrecision` | `(value: string \| number, precision?: number) => string` | |
| `formatBigNumber` | `(value: string \| number) => string` | 1000 -> 1k, 1000000 -> 1M |
| `formatDate` | `(dateTimeFormat: Intl.DateTimeFormat, timestamp: number, format: string) => string` | Format: `'YYYY-MM-DD HH:mm:ss'` |
| `formatThousands` | `(value: string \| number, sign: string) => string` | |
| `formatFoldDecimal` | `(value: string \| number, threshold: number) => string` | ^9.8.0 |
| `calcTextWidth` | `(text: string, size?: number, weight?: string \| number, family?: string) => number` | ^9.3.0 |
| `getLinearSlopeIntercept` | `(coord1: {x,y}, coord2: {x,y}) => [k, b]` | Line from two points: y = kx + b |
| `getLinearYFromCoordinates` | `(coord1, coord2, target) => number` | Y on line through two points |
| `getLinearYFromSlopeIntercept` | `(kb: [number,number], target: {x,y}) => number` | Y on line from slope/intercept |
| `checkCoordinateOnArc` | `(coordinate, arc: {x,y,r,startAngle,endAngle}) => boolean` | |
| `checkCoordinateOnCircle` | `(coordinate, circle: {x,y,r}) => boolean` | |
| `checkCoordinateOnLine` | `(coordinate, line: {coordinates}) => boolean` | |
| `checkCoordinateOnPolygon` | `(coordinate, polygon: {coordinates}) => boolean` | |
| `checkCoordinateOnRect` | `(coordinate, rect: {x,y,width,height}) => boolean` | |
| `checkCoordinateOnText` | `(coordinate, text: {x,y,text,align?,baseline?}, styles: {color?,size?,family?,weight?}) => boolean` | |
| `drawArc` | `(ctx, arc, styles) => void` | |
| `drawCircle` | `(ctx, circle, styles) => void` | |
| `drawLine` | `(ctx, line, styles) => void` | |
| `drawPolygon` | `(ctx, polygon, styles) => void` | |
| `drawRect` | `(ctx, rect, styles) => void` | |
| `drawText` | `(ctx, text, styles) => void` | Draws text with background/border |
| `drawRectText` | Same as `drawText` | **Deprecated** - use `drawText` instead |

---

## 3. Instance API

### DOM & Size

#### getDom(paneId, position)

```typescript
(paneId?: string, position?: 'root' | 'main' | 'yAxis') => HTMLElement
```

#### getSize(paneId, position)

```typescript
(paneId?: string, position?: 'root' | 'main' | 'yAxis') => {
  width: number
  height: number
  left: number
  top: number
  right: number
  bottom: number
}
```

### Styles

#### setStyles(styles)

```typescript
(styles: string | object) => HTMLElement
```

Supports incremental merge when passing object.

#### getStyles()

```typescript
() => object
```

### Precision & Timezone

#### setPriceVolumePrecision(pricePrecision, volumePrecision)

```typescript
(pricePrecision: number, volumePrecision: number) => void
```

Also affects indicators with series `'price'` or `'volume'`.

#### setTimezone(timezone)

```typescript
(timezone: string) => void
```

#### getTimezone()

```typescript
() => string
```

### Zoom & Scroll Control

#### setZoomEnabled(enabled)

```typescript
(enabled: boolean) => void
```

#### isZoomEnabled()

```typescript
() => boolean
```

#### setScrollEnabled(enabled)

```typescript
(enabled: boolean) => void
```

#### isScrollEnabled()

```typescript
() => boolean
```

### Offset & Spacing

#### setOffsetRightDistance(distance)

```typescript
(distance: number) => void
```

Set right-side blank space (in pixels).

#### getOffsetRightDistance() -- ^9.2.0

```typescript
() => number
```

#### setMaxOffsetLeftDistance(distance) -- ^9.7.0

```typescript
(distance: number) => void
```

Set maximum left-side blank space.

#### setMaxOffsetRightDistance(distance) -- ^9.7.0

```typescript
(distance: number) => void
```

Set maximum right-side blank space.

#### setLeftMinVisibleBarCount(barCount)

```typescript
(barCount: number) => void
```

#### setRightMinVisibleBarCount(barCount)

```typescript
(barCount: number) => void
```

#### setBarSpace(space)

```typescript
(space: number) => void
```

Set the width of a single candle bar (in pixels).

#### getBarSpace()

```typescript
() => number
```

#### getVisibleRange()

```typescript
() => {
  from: number
  to: number
  realFrom: number
  realTo: number
}
```

### Data Management

#### applyNewData(dataList, more, callback)

```typescript
(
  dataList: Array<{
    timestamp: number
    open: number
    close: number
    high: number
    low: number
    volume?: number
    turnover?: number
  }>,
  more?: boolean,       // default: true
  callback?: () => void // ^9.2.0, deprecated since 9.8.0 - use subscribeAction('onDataReady') instead
) => void
```

Clears all existing data and loads new data.

#### applyMoreData(dataList, more, callback)

```typescript
(
  dataList: Array<KLineData>,
  more?: boolean,       // default: true
  callback?: () => void
) => void
```

**Deprecated since 9.8.0** - use `setLoadDataCallback` instead.

#### updateData(data, callback)

```typescript
(
  data: KLineData,
  callback?: () => void  // deprecated since 9.8.0
) => void
```

Updates last bar if timestamp matches, otherwise appends.

#### getDataList()

```typescript
() => Array<KLineData>
```

#### clearData()

```typescript
() => void
```

Clears data without redrawing (to avoid duplicate redraws).

#### loadMore(cb) -- DEPRECATED

```typescript
(cb: (timestamp: number | null) => void) => void
```

Use `setLoadDataCallback` instead.

#### setLoadDataCallback(cb) -- ^9.8.0

```typescript
(
  cb: (params: {
    type: 'forward' | 'backward'
    data: Nullable<KLineData>
    callback: (dataList: KLineData[], more?: boolean) => void
  }) => void
) => void
```

- `type` - `'forward'` = load older data, `'backward'` = load newer data
- `data` - The boundary data point
- `callback` - Pass data back to chart

### Indicator Management

#### createIndicator(value, isStack, paneOptions, callback)

```typescript
(
  value: string | IndicatorObject,
  isStack?: boolean,
  paneOptions?: {
    id?: string
    height?: number
    minHeight?: number
    dragEnabled?: boolean
    position?: 'top' | 'bottom'   // ^9.6.0, only for new panes
    gap?: { top?: number, bottom?: number }
    axisOptions?: {
      name?: string                    // ^9.8.0
      scrollZoomEnabled?: boolean      // ^9.3.0
    }
  } | null,
  callback?: () => void
) => string | null
```

Returns pane id string. **Special id: `'candle_pane'`** is the main candle pane.

#### overrideIndicator(override, paneId, callback)

```typescript
(
  override: {
    name: string
    shortName?: string
    precision?: number
    calcParams?: any[]
    shouldOhlc?: boolean
    shouldFormatBigNumber?: boolean
    visible?: boolean
    zLevel?: number           // ^9.7.0
    extendData?: any
    series?: 'normal' | 'price' | 'volume'
    figures?: Array<...>
    minValue?: number
    maxValue?: number
    styles?: object
    calc?: (dataList, indicator) => Promise<object[]> | object[]
    regenerateFigures?: (calcParms) => Array<...>
    createTooltipDataSource?: (params) => { name?, calcParamsText?, values? }
    draw?: (params) => boolean
  },
  paneId?: string | null,   // omit to apply to all panes
  callback?: () => void
) => void
```

#### getIndicatorByPaneId(paneId, name)

```typescript
(paneId?: string, name?: string) => object
```

#### removeIndicator(paneId, name)

```typescript
(paneId: string, name?: string) => object
```

If `name` omitted, removes all indicators from the pane.

### Overlay Management

#### createOverlay(value, paneId)

```typescript
(
  value: string | OverlayObject | Array<string | OverlayObject>,
  paneId?: string
) => string | null
```

Returns overlay id string. **Special pane id: `'candle_pane'`**.

OverlayObject:
```typescript
{
  name: string
  id?: string
  groupId?: string
  lock?: boolean
  visible?: boolean
  zLevel?: number
  needDefaultPointFigure?: boolean
  needDefaultXAxisFigure?: boolean
  needDefaultYAxisFigure?: boolean
  mode?: 'normal' | 'weak_magnet' | 'strong_magnet'
  modeSensitivity?: number
  points?: Array<{ timestamp?: number, dataIndex?: number, value?: number }>
  extendData?: any
  styles?: object
  onDrawStart?: (event) => boolean
  onDrawing?: (event) => boolean
  onDrawEnd?: (event) => boolean
  onClick?: (event) => boolean
  onDoubleClick?: (event) => boolean
  onRightClick?: (event) => boolean
  onPressedMoveStart?: (event) => boolean
  onPressedMoving?: (event) => boolean
  onPressedMoveEnd?: (event) => boolean
  onMouseEnter?: (event) => boolean
  onMouseLeave?: (event) => boolean
  onRemoved?: (event) => boolean
  onSelected?: (event) => boolean
  onDeselected?: (event) => boolean
}
```

#### getOverlayById(id)

```typescript
(id: string) => object
```

#### overrideOverlay(override)

```typescript
(
  override: {
    name: string
    id?: string
    groupId?: string
    lock?: boolean
    visible?: boolean
    zLevel?: number
    needDefaultPointFigure?: boolean
    needDefaultXAxisFigure?: boolean
    needDefaultYAxisFigure?: boolean
    mode?: 'normal' | 'weak_magnet' | 'strong_magnet'
    modeSensitivity?: number
    points?: Array<{ timestamp?: number, dataIndex?: number, value?: number }>
    extendData?: any
    styles?: object
    // ... all event handlers same as createOverlay
  }
) => string | null
```

If `id` is provided, it overrides by id; otherwise by `name`.

#### removeOverlay(remove)

```typescript
(
  remove: string | {
    id?: string
    groupId?: string
    name?: string
  }
) => void
```

### Scroll & Zoom

#### scrollByDistance(distance, animationDuration)

```typescript
(distance: number, animationDuration?: number) => void
```

#### scrollToRealTime(animationDuration)

```typescript
(animationDuration?: number) => void
```

Scroll to the initial (rightmost) position.

#### scrollToDataIndex(dataIndex, animationDuration)

```typescript
(dataIndex: number, animationDuration?: number) => void
```

#### scrollToTimestamp(timestamp, animationDuration)

```typescript
(timestamp: number, animationDuration?: number) => void
```

#### zoomAtCoordinate(scale, coordinate, animationDuration)

```typescript
(
  scale: number,
  coordinate?: { x: number, y: number },  // defaults to chart center
  animationDuration?: number
) => void
```

#### zoomAtDataIndex(scale, dataIndex, animationDuration)

```typescript
(scale: number, dataIndex: number, animationDuration?: number) => void
```

#### zoomAtTimestamp(scale, timestamp, animationDuration)

```typescript
(scale: number, timestamp: number, animationDuration?: number) => void
```

### Pane Options

#### setPaneOptions(options)

```typescript
(
  options: {
    id: string
    height?: number
    minHeight?: number
    dragEnabled?: boolean
    gap?: { top?: number, bottom?: number }
    axisOptions?: {
      name?: string                    // ^9.8.0
      scrollZoomEnabled?: boolean      // ^9.3.0
    }
  }
) => void
```

**Special id: `'candle_pane'`** is the main candle pane.

### Actions

#### executeAction(type, data) -- ^9.2.0

```typescript
(type: 'onCrosshairChange', data: any) => void
```

#### subscribeAction(type, callback)

```typescript
(
  type: 'onDataReady' | 'onZoom' | 'onScroll' | 'onVisibleRangeChange' |
        'onCrosshairChange' | 'onCandleBarClick' | 'onTooltipIconClick' | 'onPaneDrag',
  callback: (data?: any) => void
) => void
```

#### unsubscribeAction(type, callback)

```typescript
(
  type: 'onDataReady' | 'onZoom' | 'onScroll' | 'onVisibleRangeChange' |
        'onCrosshairChange' | 'onCandleBarClick' | 'onTooltipIconClick' | 'onPaneDrag',
  callback?: (data?: any) => void   // omit to unsubscribe all for this type
) => void
```

### Coordinate Conversion

#### convertToPixel(value, finder)

```typescript
(
  value: { dataIndex?: number, timestamp?: number, value?: number }
    | Array<{ dataIndex?: number, timestamp?: number, value?: number }>,
  finder: { paneId?: string, absolute?: boolean }
) => { x?: number, y?: number } | Array<{ x?: number, y?: number }>
```

If both `dataIndex` and `timestamp` are provided, `dataIndex` takes precedence.

#### convertFromPixel(coordinate, finder)

```typescript
(
  coordinate: { x?: number, y?: number } | Array<{ x?: number, y?: number }>,
  finder: { paneId?: string, absolute?: boolean }
) => { dataIndex?: number, timestamp?: number, value?: number }
    | Array<{ dataIndex?: number, timestamp?: number, value?: number }>
```

### Miscellaneous

#### getConvertPictureUrl(includeOverlay, type, backgroundColor)

```typescript
(includeOverlay?: boolean, type?: 'png' | 'jpeg' | 'bmp', backgroundColor?: string) => string
```

Defaults: `type='jpeg'`, `backgroundColor='#FFFFFF'`

#### resize()

```typescript
() => void
```

Recalculates chart dimensions to fill container. **Use sparingly** -- frequent calls may impact performance.

---

## 4. Style Configuration

Passed via `init(ds, { styles })` or `chart.setStyles(styles)`. Supports incremental merge.

### Complete Default Configuration

```javascript
{
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#EDEDED',
      style: 'dashed',           // 'solid' | 'dashed'
      dashedValue: [2, 2]
    },
    vertical: {
      show: true,
      size: 1,
      color: '#EDEDED',
      style: 'dashed',           // 'solid' | 'dashed'
      dashedValue: [2, 2]
    }
  },

  candle: {
    // Candle type
    type: 'candle_solid',
    // Options: 'candle_solid' | 'candle_stroke' | 'candle_up_stroke' |
    //          'candle_down_stroke' | 'ohlc' | 'area'

    bar: {
      upColor: '#2DC08E',
      downColor: '#F92855',
      noChangeColor: '#888888',
      upBorderColor: '#2DC08E',
      downBorderColor: '#F92855',
      noChangeBorderColor: '#888888',
      upWickColor: '#2DC08E',
      downWickColor: '#F92855',
      noChangeWickColor: '#888888'
    },

    area: {
      lineSize: 2,
      lineColor: '#2196F3',
      value: 'close',
      smooth: false,
      backgroundColor: [{
        offset: 0,
        color: 'rgba(33, 150, 243, 0.01)'
      }, {
        offset: 1,
        color: 'rgba(33, 150, 243, 0.2)'
      }],
      point: {
        show: true,
        color: '#2196F3',
        radius: 4,
        rippleColor: 'rgba(33, 150, 243, 0.3)',
        rippleRadius: 8,
        animation: true,
        animationDuration: 1000
      }
    },

    priceMark: {
      show: true,
      high: {
        show: true,
        color: '#D9D9D9',
        textOffset: 5,
        textSize: 10,
        textFamily: 'Helvetica Neue',
        textWeight: 'normal'
      },
      low: {
        show: true,
        color: '#D9D9D9',
        textOffset: 5,
        textSize: 10,
        textFamily: 'Helvetica Neue',
        textWeight: 'normal'
      },
      last: {
        show: true,
        upColor: '#2DC08E',
        downColor: '#F92855',
        noChangeColor: '#888888',
        line: {
          show: true,
          style: 'dashed',       // 'solid' | 'dashed'
          dashedValue: [4, 4],
          size: 1
        },
        text: {
          show: true,
          style: 'fill',         // 'fill' | 'stroke' | 'stroke_fill'
          size: 12,
          paddingLeft: 4,
          paddingTop: 4,
          paddingRight: 4,
          paddingBottom: 4,
          borderStyle: 'solid',  // 'solid' | 'dashed'
          borderSize: 0,
          borderColor: 'transparent',
          borderDashedValue: [2, 2],
          color: '#FFFFFF',
          family: 'Helvetica Neue',
          weight: 'normal',
          borderRadius: 2
        }
      }
    },

    tooltip: {
      offsetLeft: 4,
      offsetTop: 6,
      offsetRight: 4,
      offsetBottom: 6,
      showRule: 'always',         // 'always' | 'follow_cross' | 'none'
      showType: 'standard',       // 'standard' | 'rect'
      custom: [
        { title: 'time', value: '{time}' },
        { title: 'open', value: '{open}' },
        { title: 'high', value: '{high}' },
        { title: 'low', value: '{low}' },
        { title: 'close', value: '{close}' },
        { title: 'volume', value: '{volume}' }
      ],
      defaultValue: 'n/a',
      rect: {
        position: 'fixed',        // 'fixed' | 'pointer'
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        offsetLeft: 4,
        offsetTop: 4,
        offsetRight: 4,
        offsetBottom: 4,
        borderRadius: 4,
        borderSize: 1,
        borderColor: '#f2f3f5',
        color: '#FEFEFE'
      },
      text: {
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        color: '#D9D9D9',
        marginLeft: 8,
        marginTop: 4,
        marginRight: 8,
        marginBottom: 4
      },
      icons: []   // Array of icon configs with id, position, margins, padding, icon, fontFamily, size, color, backgroundColor, activeBackgroundColor
    }
  },

  indicator: {
    ohlc: {
      upColor: 'rgba(45, 192, 142, .7)',
      downColor: 'rgba(249, 40, 85, .7)',
      noChangeColor: '#888888'
    },
    bars: [{
      style: 'fill',              // 'fill' | 'stroke' | 'stroke_fill'
      borderStyle: 'solid',       // 'solid' | 'dashed'
      borderSize: 1,
      borderDashedValue: [2, 2],
      upColor: 'rgba(45, 192, 142, .7)',
      downColor: 'rgba(249, 40, 85, .7)',
      noChangeColor: '#888888'
    }],
    lines: [
      { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#FF9600' },
      { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#935EBD' },
      { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#2196F3' },
      { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#E11D74' },
      { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#01C5C4' }
    ],
    circles: [{
      style: 'fill',              // 'fill' | 'stroke' | 'stroke_fill'
      borderStyle: 'solid',       // 'solid' | 'dashed'
      borderSize: 1,
      borderDashedValue: [2, 2],
      upColor: 'rgba(45, 192, 142, .7)',
      downColor: 'rgba(249, 40, 85, .7)',
      noChangeColor: '#888888'
    }],
    lastValueMark: {
      show: false,
      text: {
        show: false,
        style: 'fill',            // 'fill' | 'stroke' | 'stroke_fill'
        color: '#FFFFFF',
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        borderStyle: 'solid',     // 'solid' | 'dashed'
        borderSize: 1,
        borderDashedValue: [2, 2],
        paddingLeft: 4,
        paddingTop: 4,
        paddingRight: 4,
        paddingBottom: 4,
        borderRadius: 2
      }
    },
    tooltip: {
      offsetLeft: 4,
      offsetTop: 6,
      offsetRight: 4,
      offsetBottom: 6,
      showRule: 'always',         // 'always' | 'follow_cross' | 'none'
      showType: 'standard',       // 'standard' | 'rect'
      showName: true,
      showParams: true,
      defaultValue: 'n/a',
      text: {
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        color: '#D9D9D9',
        marginTop: 4,
        marginRight: 8,
        marginBottom: 4,
        marginLeft: 8
      },
      icons: []
    }
  },

  xAxis: {
    show: true,
    size: 'auto',
    axisLine: {
      show: true,
      color: '#888888',
      size: 1
    },
    tickText: {
      show: true,
      color: '#D9D9D9',
      family: 'Helvetica Neue',
      weight: 'normal',
      size: 12,
      marginStart: 4,
      marginEnd: 4
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#888888'
    }
  },

  yAxis: {
    show: true,
    size: 'auto',
    position: 'right',            // 'left' | 'right'
    type: 'normal',               // 'normal' | 'percentage' | 'log'
    inside: false,
    reverse: false,
    axisLine: {
      show: true,
      color: '#888888',
      size: 1
    },
    tickText: {
      show: true,
      color: '#D9D9D9',
      family: 'Helvetica Neue',
      weight: 'normal',
      size: 12,
      marginStart: 4,
      marginEnd: 4
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#888888'
    }
  },

  separator: {
    size: 1,
    color: '#888888',
    fill: true,
    activeBackgroundColor: 'rgba(230, 230, 230, .15)'
  },

  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: 'dashed',           // 'solid' | 'dashed'
        dashedValue: [4, 2],
        size: 1,
        color: '#888888'
      },
      text: {
        show: true,
        style: 'fill',             // 'fill' | 'stroke' | 'stroke_fill'
        color: '#FFFFFF',
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        borderStyle: 'solid',      // 'solid' | 'dashed'
        borderDashedValue: [2, 2],
        borderSize: 1,
        borderColor: '#686D76',
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: '#686D76'
      }
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: 'dashed',           // 'solid' | 'dashed'
        dashedValue: [4, 2],
        size: 1,
        color: '#888888'
      },
      text: {
        show: true,
        style: 'fill',             // 'fill' | 'stroke' | 'stroke_fill'
        color: '#FFFFFF',
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        borderStyle: 'solid',      // 'solid' | 'dashed'
        borderDashedValue: [2, 2],
        borderSize: 1,
        borderColor: '#686D76',
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: '#686D76'
      }
    }
  },

  overlay: {
    point: {
      color: '#1677FF',
      borderColor: 'rgba(22, 119, 255, 0.35)',
      borderSize: 1,
      radius: 5,
      activeColor: '#1677FF',
      activeBorderColor: 'rgba(22, 119, 255, 0.35)',
      activeBorderSize: 3,
      activeRadius: 5
    },
    line: {
      style: 'solid',              // 'solid' | 'dashed'
      smooth: false,
      color: '#1677FF',
      size: 1,
      dashedValue: [2, 2]
    },
    rect: {
      style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
      color: 'rgba(22, 119, 255, 0.25)',
      borderColor: '#1677FF',
      borderSize: 1,
      borderRadius: 0,
      borderStyle: 'solid',        // 'solid' | 'dashed'
      borderDashedValue: [2, 2]
    },
    polygon: {
      style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
      color: '#1677FF',
      borderColor: '#1677FF',
      borderSize: 1,
      borderStyle: 'solid',        // 'solid' | 'dashed'
      borderDashedValue: [2, 2]
    },
    circle: {
      style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
      color: 'rgba(22, 119, 255, 0.25)',
      borderColor: '#1677FF',
      borderSize: 1,
      borderStyle: 'solid',        // 'solid' | 'dashed'
      borderDashedValue: [2, 2]
    },
    arc: {
      style: 'solid',              // 'solid' | 'dashed'
      color: '#1677FF',
      size: 1,
      dashedValue: [2, 2]
    },
    text: {
      style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
      color: '#FFFFFF',
      size: 12,
      family: 'Helvetica Neue',
      weight: 'normal',
      borderStyle: 'solid',        // 'solid' | 'dashed'
      borderDashedValue: [2, 2],
      borderSize: 0,
      borderRadius: 2,
      borderColor: '#1677FF',
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      backgroundColor: 'transparent'
    },
    rectText: {
      style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
      color: '#FFFFFF',
      size: 12,
      family: 'Helvetica Neue',
      weight: 'normal',
      borderStyle: 'solid',        // 'solid' | 'dashed'
      borderDashedValue: [2, 2],
      borderSize: 1,
      borderRadius: 2,
      borderColor: '#1677FF',
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 4,
      paddingBottom: 4,
      backgroundColor: '#1677FF'
    }
  }
}
```

---

## 5. Overlay System

### Built-in Overlay Types

`horizontalRayLine`, `horizontalSegment`, `horizontalStraightLine`, `verticalRayLine`, `verticalSegment`, `verticalStraightLine`, `rayLine`, `segment`, `straightLine`, `priceLine`, `priceChannelLine`, `parallelStraightLine`, `fibonacciLine`, `simpleAnnotation`, `simpleTag`

### Custom Overlay Specification

Register via `klinecharts.registerOverlay(overlay)`.

```typescript
{
  // Required
  name: string

  // Number of steps to complete drawing
  totalStep?: number

  // If true, overlay cannot be dragged
  lock?: boolean

  // Visibility
  visible?: boolean

  // Draw level (higher = rendered on top)
  zLevel?: number

  // Show default point figures
  needDefaultPointFigure?: boolean

  // Show default figures on X axis
  needDefaultXAxisFigure?: boolean

  // Show default figures on Y axis
  needDefaultYAxisFigure?: boolean

  // Snap mode
  mode?: 'normal' | 'weak_magnet' | 'strong_magnet'

  // Snap sensitivity (only for weak_magnet mode)
  modeSensitivity?: number

  // Control points
  points?: Array<{
    timestamp: number
    dataIndex?: number
    value?: number
  }>

  // Custom data payload
  extendData?: any

  // Override styles (see overlay section in styles)
  styles?: OverlayStyle

  // --- Figure creation callbacks ---

  createPointFigures: ({
    overlay: Overlay,
    coordinates: Array<{ x: number, y: number }>,
    bounding: {
      width: number, height: number,
      left: number, right: number, top: number, bottom: number
    },
    barSpace: {
      bar: number, halfBar: number,
      gapBar: number, halfGapBar: number
    },
    precision: { price: number, volume: number },
    thousandsSeparator: string,
    decimalFoldThreshold: number,
    dateTimeFormat: Intl.DateTimeFormat,
    defaultStyles: OverlayStyle,
    xAxis: XAxis,
    yAxis: YAxis
  }) => OverlayFigure | OverlayFigure[]

  createXAxisFigures?: (same params as createPointFigures) => OverlayFigure | OverlayFigure[]
  createYAxisFigures?: (same params as createPointFigures) => OverlayFigure | OverlayFigure[]

  // --- Drawing process events ---

  performEventMoveForDrawing?: ({
    currentStep: number,
    mode: 'normal' | 'weak_magnet' | 'strong_magnet',
    points: Array<{ timestamp, dataIndex?, value? }>,
    performPointIndex: number,
    performPoint: { timestamp, dataIndex?, value? }
  }) => void

  performEventPressedMove?: (same params as performEventMoveForDrawing) => void

  // --- Mouse events ---
  // All return boolean; for onRightClick, return true to prevent default delete

  onDrawStart?: (event: OverlayEvent) => boolean
  onDrawing?: (event: OverlayEvent) => boolean
  onDrawEnd?: (event: OverlayEvent) => boolean
  onClick?: (event: OverlayEvent) => boolean
  onDoubleClick?: (event: OverlayEvent) => boolean
  onRightClick?: (event: OverlayEvent) => boolean
  onPressedMoveStart?: (event: OverlayEvent) => boolean
  onPressedMoving?: (event: OverlayEvent) => boolean
  onPressedMoveEnd?: (event: OverlayEvent) => boolean
  onMouseEnter?: (event: OverlayEvent) => boolean
  onMouseLeave?: (event: OverlayEvent) => boolean
  onRemoved?: (event: OverlayEvent) => boolean
  onSelected?: (event: OverlayEvent) => boolean
  onDeselected?: (event: OverlayEvent) => boolean
}
```

### OverlayFigure Type

```typescript
{
  key?: string                   // Optional identifier
  type: string                   // Figure type name (from getSupportedFigures)
  attrs: any | any[]             // Figure-type-specific attributes
  styles?: any                   // Figure-type-specific styles
  ignoreEvent?: boolean | OverlayFigureIgnoreEventType[]
}
```

### Custom Overlay Example (Filled Circle)

```javascript
klinecharts.registerOverlay({
  name: 'sampleCircle',
  totalStep: 3,
  createPointFigures: ({ coordinates }) => {
    if (coordinates.length === 2) {
      const xDis = Math.abs(coordinates[0].x - coordinates[1].x)
      const yDis = Math.abs(coordinates[0].y - coordinates[1].y)
      const radius = Math.sqrt(xDis * xDis + yDis * yDis)
      return {
        key: 'sampleCircle',
        type: 'circle',
        attrs: { ...coordinates[0], r: radius },
        styles: { style: 'stroke_fill' }
      }
    }
    return []
  }
})
```

---

## 6. Figure Types

All figures accessible via `klinecharts.getFigureClass(name)`. Usage:

```javascript
const Figure = klinecharts.getFigureClass('rect')
new Figure({ attrs, styles }).draw(ctx)
```

Built-in figures: `arc`, `circle`, `line`, `polygon`, `rect`, `text`
(`rectText` is deprecated -- use `text` instead)

### arc

```typescript
attrs: {
  x: number          // center x
  y: number          // center y
  r: number          // radius
  startAngle: number
  endAngle: number
}
styles: {
  style?: 'solid' | 'dashed'
  size?: number
  color?: string
  dashedValue?: number[]
}
```

### circle

```typescript
attrs: {
  x: number          // center x
  y: number          // center y
  r: number          // radius
}
styles: {
  style?: 'fill' | 'stroke' | 'stroke_fill'
  color?: string
  borderStyle?: 'solid' | 'dashed'
  borderColor?: string
  borderSize?: number
  borderDashedValue?: number[]
}
```

### line

```typescript
attrs: {
  coordinates: Array<{ x: number, y: number }>
}
styles: {
  style?: 'solid' | 'dashed'
  size?: number
  color?: string
  dashedValue?: number[]
}
```

### polygon

```typescript
attrs: {
  coordinates: Array<{ x: number, y: number }>
}
styles: {
  style?: 'fill' | 'stroke' | 'stroke_fill'
  color?: string
  borderStyle?: 'solid' | 'dashed'
  borderColor?: string
  borderSize?: number
  borderDashedValue?: number[]
}
```

### rect

```typescript
attrs: {
  x: number          // top-left x
  y: number          // top-left y
  width: number
  height: number
}
styles: {
  style?: 'fill' | 'stroke' | 'stroke_fill'
  color?: string
  borderStyle?: 'solid' | 'dashed'
  borderColor?: string
  borderSize?: number
  borderDashedValue?: number[]
  borderRadius?: number
}
```

### text

```typescript
attrs: {
  x: number
  y: number
  text: any
  width?: number
  height?: number
  align?: CanvasTextAlign       // 'center' | 'end' | 'left' | 'right' | 'start'
  baseline?: CanvasTextBaseline // 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'
}
styles: {
  style?: 'fill' | 'stroke' | 'stroke_fill'
  color?: string
  size?: number
  family?: string
  weight?: string | number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  borderStyle?: 'solid' | 'dashed'
  borderColor?: string
  borderSize?: number
  borderDashedValue?: number[]
  borderRadius?: number
  backgroundColor?: string | CanvasGradient
}
```

### Custom Figure

Register via `klinecharts.registerFigure(figure)`:

```typescript
{
  name: string
  checkEventOn: (coordinate: {x, y}, attrs: any, styles: any) => boolean
  draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => void
}
```

---

## 7. Indicator System

### Built-in Indicators

| Name | Default Params | Name | Default Params | Name | Default Params |
|------|---------------|------|---------------|------|---------------|
| MA | [5, 10, 30, 60] | BIAS | [6, 12, 24] | VR | [24, 30] |
| EMA | [6, 12, 20] | BRAR | [26] | WR | [6, 10, 14] |
| SMA | [12, 2] | CCI | [13] | MTM | [6, 10] |
| BBI | [3, 6, 12, 24] | DMI | [14, 6] | EMV | [14, 9] |
| VOL | [5, 10, 20] | CR | [26, 10, 20, 40, 60] | SAR | [2, 2, 20] |
| MACD | [12, 26, 9] | PSY | [12, 6] | AO | [5, 34] |
| BOLL | [20] | DMA | [10, 50, 10] | ROC | [12, 6] |
| KDJ | [9, 3, 3] | TRIX | [12, 20] | PVT | none |
| RSI | [6, 12, 24] | OBV | [30] | AVP | none |

### Custom Indicator Specification

Register via `klinecharts.registerIndicator(indicator)`:

```typescript
{
  name: string
  shortName?: string
  precision?: number             // default: 4
  calcParams?: any[]
  shouldOhlc?: boolean
  shouldFormatBigNumber?: boolean
  visible?: boolean
  zLevel?: number
  extendData?: any
  series?: 'normal' | 'price' | 'volume'   // default: 'normal'

  figures?: Array<{
    key: string                  // matches calc result key
    title?: string               // tooltip label
    type?: string                // figure type
    baseValue?: number           // baseline (for 'rect' type)
    attrs?: ({
      data: IndicatorFigureAttrsCallbackData,
      coordinate: IndicatorFigureAttrsCallbackCoordinate,
      bounding: Bounding,
      barSpace: BarSpace,
      xAxis: XAxis,
      yAxis: YAxis
    }) => IndicatorFigureAttrs
    styles?: (
      data: {
        prev: { kLineData?: KLineData, indicatorData?: any },
        current: { kLineData?: KLineData, indicatorData?: any },
        next: { kLineData?: KLineData, indicatorData?: any }
      },
      indicator: Indicator,
      defaultStyles: IndicatorStyle
    ) => IndicatorFigureStyle
  }>

  minValue?: number             // default: null
  maxValue?: number             // default: null
  styles?: IndicatorStyle       // incremental, see styles.md indicator section

  calc: (
    dataList: KLineData[],
    indicator: Indicator
  ) => Promise<Array<any>> | Array<any>

  regenerateFigures?: (calcParms: any[]) => Array<IndicatorFigure>

  createTooltipDataSource?: (params: {
    kLineDataList: KLineData[]
    indicator: Indicator
    visibleRange: { from, to, realFrom, realTo }
    bounding: { width, height, left, right, top, bottom }
    crosshair: { paneId?, realX?, kLineData?, dataIndex?, realDataIndex? }
    defaultStyles: IndicatorStyle
    xAxis: XAxis
    yAxis: YAxis
  }) => {
    name?: string
    calcParamsText?: string
    values?: Array<{
      title: string | { text: string, color: string }
      value: string | { text: string, color: string }
    }>
  }

  draw?: (params: {
    ctx: CanvasRenderingContext2D
    kLineDataList: KLineData[]
    indicator: Indicator
    visibleRange: { from, to, realFrom, realTo }
    bounding: { width, height, left, right, top, bottom }
    barSpace: { bar, halfBar, gapBar, halfGapBar }
    defaultStyles: IndicatorStyle
    xAxis: XAxis
    yAxis: YAxis
  }) => boolean   // return true to skip default figure rendering
}
```

---

## 8. Data Source

K-line data format (required by `applyNewData`, `applyMoreData`, `updateData`):

```typescript
{
  timestamp: number    // REQUIRED - milliseconds
  open: number         // REQUIRED
  close: number        // REQUIRED
  high: number         // REQUIRED
  low: number          // REQUIRED
  volume?: number      // optional
  turnover?: number    // optional (needed for EMV and AVP indicators)
}
```

Data must be sorted by timestamp ascending.

---

## 9. Custom Axis -- ^9.8.0

### Register Custom Axis

```typescript
klinecharts.registerXAxis({
  name: string
  createTicks: (params: {
    range: {
      from: number, to: number, range: number,
      realFrom: number, realTo: number, realRange: number
    }
    bounding: { width, height, left, right, top, bottom }
    defaultTicks: Array<{ coord: number, value: number | string, text: string }>
  }) => Array<{ coord: number, value: number | string, text: string }>
})

klinecharts.registerYAxis({
  name: string
  createTicks: (params: { range, bounding, defaultTicks }) => Array<{ coord, value, text }>
})
```

### Using Custom Axis

Via `init`:
```javascript
init('container', {
  layout: [{
    type: 'candle',
    options: { axisOptions: { name: 'myCustomYAxis' } }
  }, {
    type: 'xAxis',
    options: { axisOptions: { name: 'myCustomXAxis' } }
  }]
})
```

Via `createIndicator`:
```javascript
chart.createIndicator('MA', false, {
  axisOptions: { name: 'myCustomYAxis' }
})
```

Via `setPaneOptions`:
```javascript
chart.setPaneOptions({
  id: 'candle_pane',
  axisOptions: { name: 'myCustomYAxis' }
})
```

---

## 10. Internationalization

Built-in locales: `'en-US'` (default), `'zh-CN'`

### Register Custom Locale

```javascript
klinecharts.registerLocale('zh-HK', {
  time: 'time',
  open: 'open',
  high: 'high',
  low: 'low',
  close: 'close',
  volume: 'volume',
  turnover: 'turnover',
  change: 'change'
})
```

### Use Locale

Via `init` options: `init('container', { locale: 'zh-CN' })`

---

## 11. Hot Keys

| Key Combo | Action |
|-----------|--------|
| `Shift + Right` | Scroll right |
| `Shift + Left` | Scroll left |
| `Shift + +` | Zoom in |
| `Shift + -` | Zoom out |

---

## 12. V8 to V9 Migration

### Import Changes

No more `klinecharts/index.blank` vs `klinecharts/index.simple`. Use:
```javascript
import { ... } from 'klinecharts'
```

### Design Changes

- `shape`, `annotation`, `tag` are all merged into **`overlay`**

### Style Configuration Changes

| V8 | V9 |
|----|-----|
| Line style `dash` | `dashed` |
| `dashValue` | `dashedValue` |
| `candle.tooltip.labels` + `candle.tooltip.values` | `candle.tooltip.custom` |
| `xAxis.height` | `xAxis.size` |
| `xAxis.tickText.paddingTop` | `xAxis.tickText.marginStart` |
| `xAxis.tickText.paddingBottom` | `xAxis.tickText.marginEnd` |
| `yAxis.height` | `yAxis.size` |
| `yAxis.tickText.paddingTop` | `yAxis.tickText.marginStart` |
| `yAxis.tickText.paddingBottom` | `yAxis.tickText.marginEnd` |
| `technicalIndicator.bar` | `indicator.bars` |
| `technicalIndicator.line` | `indicator.lines` |
| `technicalIndicator.circle` | `indicator.circles` |
| `shape`, `annotation`, `tag` styles | `overlay` styles |

### API Changes (Static)

| V8 | V9 |
|----|-----|
| `extension.addTechnicalIndicatorTemplate(template)` | `registerIndicator(template)` |
| `extension.addShapeTemplate(template)` | `registerOverlay(template)` |

### API Changes (Instance)

| V8 | V9 |
|----|-----|
| `getDom({ paneId, position })` | `getDom(paneId, position)` -- position options: `'root'`, `'main'`, `'yAxis'` |
| `getWidth()` + `getHeight()` | `getSize(paneId, position)` |
| `setStyleOptions(styles)` | `setStyles(styles)` |
| `getStyleOptions()` | `getStyles()` |
| `setOffsetRightSpace(space)` | `setOffsetRightDistance(distance)` |
| `createTechnicalIndicator(...)` | `createIndicator(...)` |
| `overrideTechnicalIndicator(...)` | `overrideIndicator(...)` |
| `getTechnicalIndicatorByPaneId(...)` | `getIndicatorByPaneId(...)` |
| `removeTechnicalIndicator(...)` | `removeIndicator(...)` |
| `createShape(value, paneId)` | `createOverlay(value, paneId)` |
| `createAnnotation(annotation, paneId)` | `createOverlay(value, paneId)` |
| `createTag(tag, paneId)` | `createOverlay(value, paneId)` |
| `removeShape(id)` | `removeOverlay(id)` |
| `removeAnnotation(paneId, points)` | `removeOverlay(...)` |
| `removeTag(paneId, tagId)` | `removeOverlay(...)` |
| `setShapeOptions(options)` | `overrideOverlay(override)` |
| `createHtml(html, paneId)` | Use `getDom(paneId, position)` |
| `removeHtml(paneId, htmlId)` | Use `getDom(paneId, position)` |
| `subscribeAction` type options | `'onZoom'`, `'onScroll'`, `'onCrosshairChange'`, `'onVisibleRangeChange'`, `'onPaneDrag'` |
| `convertToPixel` finder.absoluteYAxis | `finder.absolute` |
| `convertFromPixel` finder.absoluteYAxis | `finder.absolute` |

### Utility API Changes

All utility APIs moved to `klinecharts.utils.*`.

### Custom Indicator Changes

| V8 | V9 |
|----|-----|
| `plots` | `figures` |
| Plot `color`, `isStroke`, `isDashed` | Merged into `figures[].styles` |
| `regeneratePlots(params)` | `regenerateFigures(params)` |
| `calcTechnicalIndicator(kLineDataList, options)` | `calc(kLineDataList, indicator)` |
| `createTooltipDataSource({ dataSource, viewport, crosshair, technicalIndicator, xAxis, yAxis, defaultStyles })` | `createTooltipDataSource({ kLineDataList, indicator, visibleRange, bounding, crosshair, defaultStyles, xAxis, yAxis })` |
| Tooltip return: array format | `{ name?, calcParamsText?, values? }` |
| `render({ ctx, dataSource, viewport, styles, xAxis, yAxis })` | `draw({ ctx, kLineDataList, indicator, visibleRange, bounding, barSpace, defaultStyles, xAxis, yAxis })` |
| `shouldCheckParamCount` | **Removed** |
