# KLineChart v9 Complete API Reference

Extracted from https://v9.klinecharts.com/en-US/guide/ documentation on 2026-05-05.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [init() Options](#2-init-options)
3. [Complete Style Configuration](#3-complete-style-configuration)
4. [Data Source](#4-data-source)
5. [Chart API (Static Methods)](#5-chart-api-static-methods)
6. [Instance API (Chart Instance Methods)](#6-instance-api-chart-instance-methods)
7. [Figures](#7-figures)
8. [Indicators](#8-indicators)
9. [Overlays](#9-overlays)
10. [Custom Axis](#10-custom-axis)
11. [i18n](#11-i18n)
12. [Hot Keys](#12-hot-keys)
13. [V8 to V9 Migration](#13-v8-to-v9-migration)
14. [Utils](#14-utils)

---

## 1. Quick Start

### Installation
```bash
npm install klinecharts
# or yarn add klinecharts / pnpm install klinecharts / bun add klinecharts
```

### CDN
```html
<script src="https://cdn.jsdelivr.net/npm/klinecharts/dist/umd/klinecharts.min.js"></script>
<!-- Global variable: klinecharts -->
```

### Usage
```javascript
import { init, dispose } from 'klinecharts'

const chart = init('chart')
chart.applyNewData([...])
// On unmount: dispose('chart')
```

### Data Format
```typescript
{
  timestamp: number    // Required - Millisecond timestamp
  open: number        // Required
  close: number       // Required
  high: number        // Required
  low: number         // Required
  volume?: number     // Optional
  turnover?: number   // Optional - Required for EMV and AVP indicators
}
```

---

## 2. init() Options

```typescript
init(
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
    timezone?: string
    styles?: string | object
    customApi?: {
      formatDate?: (
        dateTimeFormat: Intl.DateTimeFormat,
        timestamp: number,
        format: string,
        type: number
      ) => string
      formatBigNumber?: (value: string | number) => string
    }
    thousandsSeparator?: string
    decimalFoldThreshold?: number  // ^9.8.0
  }
) => Chart
```

| Option | Description |
|--------|-------------|
| `ds` | Container - DOM element or element id |
| `options.layout` | Custom layout. `content` and `options` refer to `createIndicator` params. ^9.6.0 |
| `options.locale` | Language. Built-in: `'zh-CN'` and `'en-US'` |
| `options.timezone` | Timezone name, e.g. `'Asia/Shanghai'`. Auto-detects local if not set |
| `options.styles` | Style name (registered via `registerStyles`) or style object. Supports incremental merging |
| `options.customApi.formatDate` | Custom date formatter |
| `options.customApi.formatBigNumber` | Format big numbers (1000 -> 1k, 1000000 -> 1M) |
| `options.thousandsSeparator` | Thousands separator character |
| `options.decimalFoldThreshold` | Decimal fold threshold ^9.8.0 |

---

## 3. Complete Style Configuration

Can be set via `init(ds, { styles })` or `chart.setStyles(styles)`.

### Grid
```javascript
grid: {
  show: true,
  horizontal: {
    show: true,
    size: 1,
    color: '#EDEDED',
    style: 'dashed',       // 'solid' | 'dashed'
    dashedValue: [2, 2]
  },
  vertical: {
    show: true,
    size: 1,
    color: '#EDEDED',
    style: 'dashed',
    dashedValue: [2, 2]
  }
}
```

### Candle

Type options: `'candle_solid'` | `'candle_stroke'` | `'candle_up_stroke'` | `'candle_down_stroke'` | `'ohlc'` | `'area'`
Default type: `'candle_solid'`

#### candle.bar
```javascript
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
}
```

#### candle.area
```javascript
area: {
  lineSize: 2,
  lineColor: '#2196F3',
  smooth: false,
  value: 'close',
  backgroundColor: [{
    offset: 0,
    color: 'rgba(33, 150, 243, 0.01)'
  }, {
    offset: 1,
    color: 'rgba(33, 150, 243, 0.2)'
  }],
  point: {
    show: true,
    color: blue,
    radius: 4,
    rippleColor: getAlphaBlue(0.3),
    rippleRadius: 8,
    animation: true,
    animationDuration: 1000
  }
}
```

#### candle.priceMark
```javascript
priceMark: {
  show: true,
  high: {
    show: true,
    color: '#D9D9D9',
    textMargin: 5,
    textSize: 10,
    textFamily: 'Helvetica Neue',
    textWeight: 'normal'
  },
  low: {
    show: true,
    color: '#D9D9D9',
    textMargin: 5,
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
      style: 'dashed',           // 'solid' | 'dashed'
      dashedValue: [4, 4],
      size: 1
    },
    text: {
      show: true,
      style: 'fill',             // 'fill' | 'stroke' | 'stroke_fill'
      size: 12,
      paddingLeft: 4,
      paddingTop: 4,
      paddingRight: 4,
      paddingBottom: 4,
      borderStyle: 'solid',      // 'solid' | 'dashed'
      borderSize: 0,
      borderColor: 'transparent',
      borderDashedValue: [2, 2],
      color: '#FFFFFF',
      family: 'Helvetica Neue',
      weight: 'normal',
      borderRadius: 2
    }
  }
}
```

#### candle.tooltip
```javascript
tooltip: {
  offsetLeft: 4,
  offsetTop: 6,
  offsetRight: 4,
  offsetBottom: 6,
  showRule: 'always',            // 'always' | 'follow_cross' | 'none'
  showType: 'standard',          // 'standard' | 'rect'
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
    position: 'fixed',           // 'fixed' | 'pointer'
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
  icons: []  // See icons structure below
}
```

**`custom` property**: Can be a callback method or an array. When a method, must return an array. Child item type is `{ title, value }` where title and value can be strings or objects `{ text, color }`. Title or title.text can be an internationalized key. Value or value.text supports string templates.

**`icons` array item structure**:
```javascript
{
  id: 'icon_id',
  position: 'left',             // 'left' | 'middle' | 'right'
  marginLeft: 8,
  marginTop: 6,
  marginRight: 0,
  marginBottom: 0,
  paddingLeft: 1,
  paddingTop: 1,
  paddingRight: 1,
  paddingBottom: 1,
  icon: '',
  fontFamily: 'iconfont',
  size: 12,
  color: '#76808F',
  backgroundColor: 'rgba(33, 150, 243, 0.2)',
  activeBackgroundColor: 'rgba(33, 150, 243, 0.4)'
}
```

### Indicator Styles

#### indicator.ohlc
```javascript
ohlc: {
  upColor: 'rgba(45, 192, 142, .7)',
  downColor: 'rgba(249, 40, 85, .7)',
  noChangeColor: '#888888'
}
```

#### indicator.bars (array)
```javascript
bars: [{
  style: 'fill',                 // 'fill' | 'stroke' | 'stroke_fill'
  borderStyle: 'solid',          // 'solid' | 'dashed'
  borderSize: 1,
  borderDashedValue: [2, 2],
  upColor: 'rgba(45, 192, 142, .7)',
  downColor: 'rgba(249, 40, 85, .7)',
  noChangeColor: '#888888'
}]
```

#### indicator.lines (array, 5 default entries)
```javascript
lines: [
  { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#FF9600' },
  { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#935EBD' },
  { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#2196F3' },
  { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#E11D74' },
  { style: 'solid', smooth: false, size: 1, dashedValue: [2, 2], color: '#01C5C4' }
]
```

#### indicator.circles (array)
```javascript
circles: [{
  style: 'fill',                 // 'fill' | 'stroke' | 'stroke_fill'
  borderStyle: 'solid',          // 'solid' | 'dashed'
  borderSize: 1,
  borderDashedValue: [2, 2],
  upColor: 'rgba(45, 192, 142, .7)',
  downColor: 'rgba(249, 40, 85, .7)',
  noChangeColor: '#888888'
}]
```

#### indicator.lastValueMark
```javascript
lastValueMark: {
  show: false,
  text: {
    show: false,
    style: 'fill',               // 'fill' | 'stroke' | 'stroke_fill'
    color: '#FFFFFF',
    size: 12,
    family: 'Helvetica Neue',
    weight: 'normal',
    borderStyle: 'solid',        // 'solid' | 'dashed'
    borderSize: 1,
    borderDashedValue: [2, 2],
    paddingLeft: 4,
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    borderRadius: 2
  }
}
```

#### indicator.tooltip
```javascript
tooltip: {
  offsetLeft: 4,
  offsetTop: 6,
  offsetRight: 4,
  offsetBottom: 6,
  showRule: 'always',            // 'always' | 'follow_cross' | 'none'
  showType: 'standard',          // 'standard' | 'rect'
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
  icons: []  // Same structure as candle.tooltip.icons
}
```

### XAxis
```javascript
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
}
```

### YAxis
```javascript
yAxis: {
  show: true,
  size: 'auto',
  position: 'right',             // 'left' | 'right'
  type: 'normal',                // 'normal' | 'percentage' | 'log'
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
}
```

### Separator
```javascript
separator: {
  size: 1,
  color: '#888888',
  fill: true,
  activeBackgroundColor: 'rgba(230, 230, 230, .15)'
}
```

### Crosshair
```javascript
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
      style: 'dashed',
      dashedValue: [4, 2],
      size: 1,
      color: '#888888'
    },
    text: {
      show: true,
      style: 'fill',
      color: '#FFFFFF',
      size: 12,
      family: 'Helvetica Neue',
      weight: 'normal',
      borderStyle: 'solid',
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
}
```

### Overlay Styles
```javascript
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
```

### Enum/Type Reference

| Property Path | Type Options |
|---|---|
| candle.type | `'candle_solid'` \| `'candle_stroke'` \| `'candle_up_stroke'` \| `'candle_down_stroke'` \| `'ohlc'` \| `'area'` |
| line.style | `'solid'` \| `'dashed'` |
| shape style (rect/circle/polygon/text/rectText/bars/circles) | `'fill'` \| `'stroke'` \| `'stroke_fill'` |
| candle.tooltip.showRule / indicator.tooltip.showRule | `'always'` \| `'follow_cross'` \| `'none'` |
| candle.tooltip.showType / indicator.tooltip.showType | `'standard'` \| `'rect'` |
| candle.tooltip.rect.position | `'fixed'` \| `'pointer'` |
| yAxis.position | `'left'` \| `'right'` |
| yAxis.type | `'normal'` \| `'percentage'` \| `'log'` |
| icons.position | `'left'` \| `'middle'` \| `'right'` |

---

## 4. Data Source

### Data Format
```typescript
{
  timestamp: number    // Required - Millisecond timestamp
  open: number         // Required
  close: number        // Required
  high: number         // Required
  low: number          // Required
  volume?: number      // Optional
  turnover?: number    // Optional - Required for EMV and AVP indicators
}
```

### Data Interaction Methods
- `chart.applyNewData(dataList, more?)` - Apply new/initial data (clears existing)
- `chart.applyMoreData(dataList, more?)` - Append more historical data
- `chart.updateData(data)` - Update single data point (matches by timestamp on last point)

---

## 5. Chart API (Static Methods)

### init(ds, options)
See [Section 2](#2-init-options) above.

### dispose(dcs)
```typescript
(dcs: HTMLElement | Chart | string) => void
```
Destroys a chart. `dcs` can be a DOM element, element id, or chart instance.

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
    turnover: string
    change: string
  }
) => void
```
Add a localization language. Built-in: `zh-CN` and `en-US`.

### getOverlayClass()
```typescript
(name: string) => Nullable<OverlayConstructor>
```
Get overlay class by name.

### getSupportedLocales()
```typescript
() => string[]
```

### registerStyles(name, styles)
```typescript
(name: string, styles: object) => void
```
Add a style configuration. Supports incremental merging.

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
    figures?: Array<{
      key: string
      title?: string
      type?: string
      baseValue?: number
      attrs?: ({ data, coordinate, bounding, barSpace, xAxis, yAxis }) => object
      styles?: (data, indicator, defaultStyles) => object
    }>
    minValue?: number
    maxValue?: number
    styles?: object
    calc: (dataList: KLineData[], indicator: object) => Promise<object[]> | object[]
    regenerateFigures?: (calcParms: any[]) => Array<Figure>
    createTooltipDataSource?: (params) => {
      name?: string
      calcParamsText?: string
      values?: Array<{
        title: string | { text: string, color: string }
        value: string | { text: string, color: string }
      }>
    }
    draw?: (params) => boolean
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
    createPointFigures?: (params) => Figure | Figure[]
    createXAxisFigures?: (params) => Figure | Figure[]
    createYAxisFigures?: (params) => Figure | Figure[]
    performEventPressedMove?: (params) => void
    performEventMoveForDrawing?: (params) => void
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
) => void
```

### getSupportedOverlays()
```typescript
() => string[]
```

### registerXAxis(axis) ^9.8.0
```typescript
(
  axis: {
    name: string
    createTicks: (params) => Array<{ coord: number, value: number | string, text: string }>
  }
) => void
```

### registerYAxis(axis) ^9.8.0
```typescript
(
  axis: {
    name: string
    createTicks: (params) => Array<{ coord: number, value: number | string, text: string }>
  }
) => void
```

### version()
```typescript
() => string
```

---

## 6. Instance API (Chart Instance Methods)

### DOM & Size

#### getDom(paneId?, position?)
```typescript
(paneId?: string, position?: 'root' | 'main' | 'yAxis') => HTMLElement
```
Retrieves the DOM container. Default: root of entire chart.

#### getSize(paneId?, position?)
```typescript
(paneId?: string, position?: 'root' | 'main' | 'yAxis') => { width, height, left, top, right, bottom }
```

### Styles

#### setStyles(styles)
```typescript
(styles: string | object) => HTMLElement
```
Sets style configuration. Supports registered name or object. Merges.

#### getStyles()
```typescript
() => object
```

### Precision

#### setPriceVolumePrecision(pricePrecision, volumePrecision)
```typescript
(pricePrecision: number, volumePrecision: number) => void
```
Affects indicators of series 'price' or 'volume' too.

### Timezone

#### setTimezone(timezone)
```typescript
(timezone: string) => void
```

#### getTimezone()
```typescript
() => string
```

### Zoom & Scroll

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
Sets the gap that can be left to the right of the chart.

#### getOffsetRightDistance() ^9.2.0
```typescript
() => number
```

#### setMaxOffsetLeftDistance(distance) ^9.7.0
```typescript
(distance: number) => void
```

#### setMaxOffsetRightDistance(distance) ^9.7.0
```typescript
(distance: number) => void
```

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
Sets the width of a single candlestick.

#### getBarSpace()
```typescript
() => number
```

#### getVisibleRange()
```typescript
() => { from: number, to: number, realFrom: number, realTo: number }
```

### Data

#### applyNewData(dataList, more?, callback?)
```typescript
(
  dataList: Array<KLineData>,
  more?: boolean,
  callback?: () => void
) => void
```
Adds new data. Clears chart data first. `more` defaults to true. `callback` deprecated since 9.8.0 -- use `subscribeAction('onDataReady', () => {})` instead.

#### applyMoreData(dataList, more?, callback?)
```typescript
(
  dataList: Array<KLineData>,
  more?: boolean,
  callback?: () => void
) => void
```
Adds more historical data. **Deprecated since 9.8.0** -- use `setLoadDataCallback` instead.

#### updateData(data, callback?)
```typescript
(
  data: KLineData,
  callback?: () => void
) => void
```
Updates data. Matches last data point's timestamp -- same = overwrite, different = append. `callback` deprecated since 9.8.0.

#### getDataList()
```typescript
() => Array<KLineData>
```

#### clearData()
```typescript
() => void
```
Clears data but does NOT redraw.

#### loadMore(cb) -- DEPRECATED
```typescript
(cb: (timestamp: number | null) => void) => void
```
Deprecated since 9.8.0 -- use `setLoadDataCallback` instead.

#### setLoadDataCallback(cb) ^9.8.0
```typescript
(
  cb: (params: {
    type: 'forward' | 'backward',
    data: Nullable<KLineData>,
    callback: (dataList: KLineData[], more?: boolean) => void
  }) => void
) => void
```

### Indicators

#### createIndicator(value, isStack?, paneOptions?, callback?)
```typescript
(
  value: string | IndicatorObject,
  isStack?: boolean,
  paneOptions?: {
    id?: string
    height?: number
    minHeight?: number
    dragEnabled?: boolean
    position?: 'top' | 'bottom'    // Only for new pane ^9.6.0
    gap?: { top?: number, bottom?: number }
    axisOptions?: {
      name?: string                 // ^9.8.0
      scrollZoomEnabled?: boolean   // ^9.3.0
    }
  } | null,
  callback?: () => void
) => string | null
```
Returns pane ID string. Special ID: `'candle_pane'` is the main chart pane.

```javascript
chart.createIndicator('MA', false, {
  id: 'pane_1',
  height: 100,
  minHeight: 30,
  dragEnabled: true,
  gap: { top: 0.2, bottom: 0.1 },
  axisOptions: { scrollZoomEnabled: true }
}, () => {})
```

#### overrideIndicator(override, paneId?, callback?)
```typescript
(
  override: IndicatorObject,
  paneId?: string | null,
  callback?: () => void
) => void
```
Overlays indicator info. `paneId` defaults to all panes.

#### getIndicatorByPaneId(paneId?, name?)
```typescript
(paneId?: string, name?: string) => object
```

#### removeIndicator(paneId, name?)
```typescript
(paneId: string, name?: string) => object
```
If `name` omitted, removes all indicators in pane.

### Overlays

#### createOverlay(value, paneId?)
```typescript
(
  value: string | OverlayObject | Array<string | OverlayObject>,
  paneId?: string
) => string | null
```
Returns overlay ID string.

```javascript
chart.createOverlay({
  name: 'segment',
  id: 'segment_1',
  groupId: 'segment',
  points: [
    { timestamp: 1614171282000, value: 18987 },
    { timestamp: 1614171202000, value: 16098 },
  ],
  styles: { line: { style: 'solid', dashedValue: [2, 2], color: '#f00', size: 2 } },
  lock: false,
  visible: true,
  zLevel: 0,
  mode: 'weak_magnet',
  modeSensitivity: 8,
  extendData: 'xxxxxxxx',
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  onDrawStart: function (event) { console.log(event) },
  onDrawing: function (event) { console.log(event) },
  onDrawEnd: function (event) { console.log(event) },
  onClick: function (event) { console.log(event) },
  onDoubleClick: function (event) { console.log(event) },
  onRightClick: function (event) { console.log(event); return false },
  onMouseEnter: function (event) { console.log(event) },
  onMouseLeave: function (event) { console.log(event) },
  onPressedMoveStart: function (event) { console.log(event) },
  onPressedMoving: function (event) { console.log(event) },
  onPressedMoveEnd: function (event) { console.log(event) },
  onRemoved: function (event) { console.log(event) },
  onSelected: function (event) { console.log(event) },
  onDeselected: function (event) { console.log(event) }
})
```

#### getOverlayById(id)
```typescript
(id: string) => object
```

#### overrideOverlay(override)
```typescript
(override: OverlayObject) => string | null
```

#### removeOverlay(remove)
```typescript
(
  remove: string | { id?: string, groupId?: string, name?: string }
) => void
```

### Scrolling

#### scrollByDistance(distance, animationDuration?)
```typescript
(distance: number, animationDuration?: number) => void
```

#### scrollToRealTime(animationDuration?)
```typescript
(animationDuration?: number) => void
```

#### scrollToDataIndex(dataIndex, animationDuration?)
```typescript
(dataIndex: number, animationDuration?: number) => void
```

#### scrollToTimestamp(timestamp, animationDuration?)
```typescript
(timestamp: number, animationDuration?: number) => void
```

### Zooming

#### zoomAtCoordinate(scale, coordinate?, animationDuration?)
```typescript
(
  scale: number,
  coordinate?: { x: number, y: number },
  animationDuration?: number
) => void
```
Defaults to middle of chart if no coordinate.

#### zoomAtDataIndex(scale, dataIndex, animationDuration?)
```typescript
(scale: number, dataIndex: number, animationDuration?: number) => void
```

#### zoomAtTimestamp(scale, timestamp, animationDuration?)
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
      name?: string               // ^9.8.0
      scrollZoomEnabled?: boolean // ^9.3.0
    }
  }
) => void
```
Special ID: `'candle_pane'` is the main chart pane.

```javascript
chart.setPaneOptions({
  id: 'pane_1',
  height: 100,
  minHeight: 3,
  dragEnabled: true,
  gap: { top: 0.2, bottom: 0.1 },
  axisOptions: { name: 'default', scrollZoomEnabled: true }
})
```

### Actions

#### executeAction(type, data) ^9.2.0
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

#### unsubscribeAction(type, callback?)
```typescript
(
  type: Same as subscribeAction types,
  callback?: (data?: any) => void  // Omit to cancel all of current type
) => void
```

### Coordinate Conversion

#### convertToPixel(value, finder)
```typescript
(
  value: {
    dataIndex?: number
    timestamp?: number
    value?: number
  } | Array<{ dataIndex?, timestamp?, value? }>,
  finder: {
    paneId?: string,
    absolute?: boolean
  }
) => { x?: number, y?: number } | Array<{ x?: number, y?: number }>
```
If both `dataIndex` and `timestamp` exist, conversion is based on index. `absolute` only affects y-axis.

#### convertFromPixel(coordinate, finder)
```typescript
(
  coordinate: { x?: number, y?: number } | Array<{ x?: number, y?: number }>,
  finder: { paneId?: string, absolute?: boolean }
) => { dataIndex?, timestamp?, value? } | Array<{ dataIndex?, timestamp?, value? }>
```

### Image Export

#### getConvertPictureUrl(includeOverlay?, type?, backgroundColor?)
```typescript
(includeOverlay?: boolean, type?: string, backgroundColor?: string) => string
```
`type`: 'png', 'jpeg' (default), or 'bmp'. `backgroundColor` defaults to '#FFFFFF'.

### Resize

#### resize()
```typescript
() => void
```
Recalculates size to fill container. Use cautiously -- frequent calls affect performance.

---

## 7. Figures

Built-in figures: `arc`, `circle`, `line`, `polygon`, `rect`, `text`, `rectText` (deprecated, use `text`)

### Usage
```javascript
const Figure = klinecharts.getFigureClass(name)
new Figure(attrs, styles).draw(ctx)
```

### arc
**Attrs**: `{ x, y, r, startAngle, endAngle }`
**Styles**: `{ style?: 'solid'|'dashed', size?: number, color?: string, dashedValue?: number[] }`

### circle
**Attrs**: `{ x, y, r }`
**Styles**: `{ style?: 'fill'|'stroke'|'stroke_fill', color?, borderStyle?, borderColor?, borderSize?, borderDashedValue? }`

### line
**Attrs**: `{ coordinates: Array<{x, y}> }`
**Styles**: `{ style?: 'solid'|'dashed', size?, color?, dashedValue? }`

### polygon
**Attrs**: `{ coordinates: Array<{x, y}> }`
**Styles**: `{ style?: 'fill'|'stroke'|'stroke_fill', color?, borderStyle?, borderColor?, borderSize?, borderDashedValue? }`

### rect
**Attrs**: `{ x, y, width, height }`
**Styles**: `{ style?: 'fill'|'stroke'|'stroke_fill', color?, borderColor?, borderSize?, borderStyle?, borderDashedValue?, borderRadius? }`

### text
**Attrs**: `{ x, y, width?, height?, text, align?: CanvasTextAlign, baseline?: CanvasTextBaseline }`
**Styles**: `{ style?: 'fill'|'stroke'|'stroke_fill', color?, size?, family?, weight?, paddingLeft?, paddingRight?, paddingTop?, paddingBottom?, borderStyle?, borderColor?, borderSize?, borderDashedValue?, borderRadius?, backgroundColor? }`

### Custom Figure
```javascript
klinecharts.registerFigure({
  name: string,
  checkEventOn: (coordinate, attrs, styles) => boolean,
  draw: (ctx, attrs, styles) => void
})
```

---

## 8. Indicators

### Built-in Indicators

| Name | Default Calc Params |
|------|---------------------|
| MA | [5, 10, 30, 60] |
| EMA | [6, 12, 20] |
| SMA | [12, 2] |
| BBI | [3, 6, 12, 24] |
| VOL | [5, 10, 20] |
| MACD | [12, 26, 9] |
| BOLL | [20, 2] |
| KDJ | [9, 3, 3] |
| RSI | [6, 12, 24] |
| BIAS | [6, 12, 24] |
| BRAR | [26] |
| CCI | [13] |
| DMI | [14, 6] |
| CR | [26, 10, 20, 40, 60] |
| PSY | [12, 6] |
| DMA | [10, 50, 10] |
| TRIX | [12, 20] |
| OBV | [30] |
| VR | [24, 30] |
| WR | [6, 10, 14] |
| MTM | [6, 10] |
| EMV | [14, 9] |
| SAR | [2, 2, 20] |
| AO | [5, 34] |
| ROC | [12, 6] |
| PVT | None |
| AVP | None |

### Custom Indicator Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique identifier |
| `shortName` | `string?` | Display name |
| `precision` | `number?` | Precision, default 4 |
| `calcParams` | `any[]?` | Calculation parameters |
| `shouldOhlc` | `boolean?` | Show OHLC bars |
| `shouldFormatBigNumber` | `boolean?` | Format 100000 as 100K |
| `visible` | `boolean?` | Visibility |
| `zLevel` | `number?` | Z level |
| `extendData` | `any?` | Extended data |
| `series` | `'normal' \| 'price' \| 'volume'?` | Series type |
| `figures` | `Figure[]?` | Graphics config |
| `minValue` | `number?` | Minimum value constraint |
| `maxValue` | `number?` | Maximum value constraint |
| `styles` | `IndicatorStyle?` | Style config |
| `calc` | `(dataList, indicator) => object[]` | Calculation method (can return Promise) |
| `regenerateFigures` | `(calcParams) => Figure[]?` | Regenerate after param change |
| `createTooltipDataSource` | `(params) => object?` | Custom tooltip data |
| `draw` | `(params) => boolean?` | Custom draw (return true to skip figures) |

---

## 9. Overlays

### Built-in Overlay Types
- `horizontalRayLine`
- `horizontalSegment`
- `horizontalStraightLine`
- `verticalRayLine`
- `verticalSegment`
- `verticalStraightLine`
- `rayLine`
- `segment`
- `straightLine`
- `priceLine`
- `priceChannelLine`
- `parallelLine`
- `fibonacciLine`
- `simpleAnnotation`
- `simpleTag`

### Overlay Object Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique identifier (required) |
| `id` | `string?` | Instance ID |
| `groupId` | `string?` | Group ID |
| `totalStep` | `number?` | Steps to complete drawing |
| `lock` | `boolean?` | Lock to prevent dragging |
| `visible` | `boolean?` | Visibility |
| `zLevel` | `number?` | Draw level |
| `needDefaultPointFigure` | `boolean?` | Show default point figures |
| `needDefaultXAxisFigure` | `boolean?` | Show default x-axis figures |
| `needDefaultYAxisFigure` | `boolean?` | Show default y-axis figures |
| `mode` | `'normal' \| 'weak_magnet' \| 'strong_magnet'?` | Snap mode |
| `modeSensitivity` | `number?` | Sensitivity for weak_magnet mode |
| `points` | `Array<{timestamp?, dataIndex?, value?}>?` | Point info |
| `extendData` | `any?` | Extended data |
| `styles` | `OverlayStyle?` | Style config |

### Overlay Callback Creation Methods

| Method | Description |
|--------|-------------|
| `createPointFigures(params)` | Create figures at point positions |
| `createXAxisFigures(params)` | Create figures on x-axis |
| `createYAxisFigures(params)` | Create figures on y-axis |

`params` object contains: `overlay`, `coordinates`, `bounding`, `barSpace`, `precision`, `thousandsSeparator`, `decimalFoldThreshold`, `dateTimeFormat`, `defaultStyles`, `xAxis`, `yAxis`

### Overlay Event Callbacks (all return boolean)

| Event | Description |
|-------|-------------|
| `onDrawStart` | Drawing started |
| `onDrawing` | During drawing |
| `onDrawEnd` | Drawing ended |
| `onClick` | Click |
| `onDoubleClick` | Double click ^9.5.0 |
| `onRightClick` | Right click (return true to prevent default delete) |
| `onPressedMoveStart` | Press-drag start |
| `onPressedMoving` | Press-drag moving |
| `onPressedMoveEnd` | Press-drag end |
| `onMouseEnter` | Mouse enter |
| `onMouseLeave` | Mouse leave |
| `onRemoved` | Removed |
| `onSelected` | Selected |
| `onDeselected` | Deselected |

### Special Movement Handlers

| Handler | Description |
|---------|-------------|
| `performEventPressedMove(params)` | Handle press-move during drawing |
| `performEventMoveForDrawing(params)` | Handle movement during drawing process |

`params`: `{ currentStep, mode, points, performPointIndex, performPoint }`

---

## 10. Custom Axis ^9.8.0

### registerXAxis / registerYAxis
```typescript
{
  name: string
  createTicks: (params) => Array<{ coord: number, value: number | string, text: string }>
}
```

### createTicks params
```typescript
{
  range: { from, to, range, realFrom, realTo, realRange }
  bounding: { width, height, left, right, top, bottom }
  defaultTicks: Array<{ coord, value, text }>
}
```

### Specifying custom axis
1. `init(ds, { layout: [{ options: { axisOptions: { name } } }] })`
2. `chart.createIndicator('MA', false, { axisOptions: { name } })`
3. `chart.setPaneOptions({ id: 'candle_pane', axisOptions: { name } })`

---

## 11. i18n

### Built-in Locales
- `'en-US'` (default)
- `'zh-CN'`

### Registering Custom Locale
```javascript
klinecharts.registerLocale('zh-HK', {
  time: '時間：',
  open: '開：',
  high: '高：',
  low: '低：',
  close: '收：',
  volume: '成交量：',
  turnover: '成交額：',
  change: '漲幅：'
})
```

### Setting Locale
- Via `init(ds, { locale: 'zh-HK' })`
- Via `chart.setLocale('zh-HK')` (instance method)

---

## 12. Hot Keys

| Shortcut | Action |
|----------|--------|
| `Shift` + `Right Arrow` | Move right |
| `Shift` + `Left Arrow` | Move left |
| `Shift` + `+` | Zoom in |
| `Shift` + `-` | Zoom out |

---

## 13. V8 to V9 Migration

### Import
- Removed `klinecharts/index.blank` and `klinecharts/index.simple`. Use `import from 'klinecharts'`.

### Design
- `shape`, `annotation`, `tag` consolidated into `overlay`.

### Style Changes
- `dashed` + `dashValue` -> `dashed` + `dashedValue`
- `candle.tooltip.labels` + `candle.tooltip.values` -> `candle.tooltip.custom`
- `xAxis.height` -> `xAxis.size`
- `xAxis.tickText.paddingTop` -> `xAxis.tickText.marginStart`
- `xAxis.tickText.paddingBottom` -> `xAxis.tickText.marginEnd`
- Same pattern for yAxis
- `technicalIndicator.bar` -> `indicator.bars`
- `technicalIndicator.line` -> `indicator.lines`
- `technicalIndicator.circle` -> `indicator.circles`
- Deleted: `shape`, `annotation`, `tag` styles -> use `overlay`

### API Renames
| Old | New |
|-----|-----|
| `setStyleOptions` | `setStyles` |
| `getStyleOptions` | `getStyles` |
| `setOffsetRightSpace` | `setOffsetRightDistance` |
| `createTechnicalIndicator` | `createIndicator` |
| `overrideTechnicalIndicator` | `overrideIndicator` |
| `getTechnicalIndicatorByPaneId` | `getIndicatorByPaneId` |
| `removeTechnicalIndicator` | `removeIndicator` |
| `extension.addTechnicalIndicatorTemplate` | `registerIndicator` |
| `createShape` / `createAnnotation` / `createTag` | `createOverlay` |
| `removeShape` / `removeAnnotation` / `removeTag` | `removeOverlay` |
| `setShapeOptions` | `overrideOverlay` |
| `createHtml` / `removeHtml` | Use `getDom(paneId, position)` |
| `getWidth()` + `getHeight()` | `getSize(paneId, position)` |

### Custom Indicator Changes
- `plots` -> `figures`
- `regeneratePlots` -> `regenerateFigures`
- `calcTechnicalIndicator` -> `calc`
- `createTooltipDataSource` return: array -> `{ name, calcParamsText, values }`
- `render` -> `draw` (signature changed)
- Deleted: `shouldCheckParamCount`

---

## 14. Utils

Accessed via `klinecharts.utils.*`

### Type Checking
| Method | Signature | Description |
|--------|-----------|-------------|
| `clone` | `(target: any) => any` | Deep copy |
| `merge` | `(target: object, source: object) => void` | Merge object |
| `isString` | `(value: any) => boolean` | Check string |
| `isNumber` | `(value: any) => boolean` | Check number |
| `isValid` | `(value: any) => boolean` | Check valid |
| `isObject` | `(value: any) => boolean` | Check object |
| `isFunction` | `(value: any) => boolean` | Check function |
| `isBoolean` | `(value: any) => boolean` | Check boolean |

### Formatting
| Method | Signature | Description |
|--------|-----------|-------------|
| `formatValue` | `(data, key: string, defaultValue?) => any` | Get nested value, e.g. `formatValue(o, 'a.b.c')` |
| `formatPrecision` | `(value, precision?: number) => string` | Format precision |
| `formatBigNumber` | `(value) => string` | 1000->1k, 1000000->1M |
| `formatDate` | `(dateTimeFormat, timestamp, format) => string` | Format date, e.g. 'YYYY-MM-DD HH:mm:ss' |
| `formatThousands` | `(value, sign) => string` | Thousands separator |
| `formatFoldDecimal` | `(value, threshold) => string` ^9.8.0 | Fold decimal |
| `calcTextWidth` | `(text, size?, weight?, family?) => number` ^9.3.0 | Calculate text width |

### Math Helpers
| Method | Signature | Description |
|--------|-----------|-------------|
| `getLinearSlopeIntercept` | `(coord1, coord2) => number[]` | Returns [k, b] from y=kx+b |
| `getLinearYFromCoordinates` | `(coord1, coord2, target) => number` | Y from two coords |
| `getLinearYFromSlopeIntercept` | `(kb, target) => number` | Y from slope+intercept |

### Hit Testing
| Method | Signature | Description |
|--------|-----------|-------------|
| `checkCoordinateOnArc` | `(coordinate, arc) => boolean` | Point on arc? |
| `checkCoordinateOnCircle` | `(coordinate, circle) => boolean` | Point on circle? |
| `checkCoordinateOnLine` | `(coordinate, line) => boolean` | Point on line? |
| `checkCoordinateOnPolygon` | `(coordinate, polygon) => boolean` | Point on polygon? |
| `checkCoordinateOnRect` | `(coordinate, rect) => boolean` | Point on rect? |
| `checkCoordinateOnText` | `(coordinate, text, styles) => boolean` | Point on text? |

### Drawing Helpers
| Method | Signature | Description |
|--------|-----------|-------------|
| `drawArc` | `(ctx, arc, styles) => void` | Draw arc |
| `drawCircle` | `(ctx, circle, styles) => void` | Draw circle |
| `drawLine` | `(ctx, line, styles) => void` | Draw line |
| `drawPolygon` | `(ctx, polygon, styles) => void` | Draw polygon |
| `drawRect` | `(ctx, rect, styles) => void` | Draw rect |
| `drawRectText` | `(ctx, rectText, styles) => void` | Draw text with rect background |
| `drawText` | Same as drawRectText | **DEPRECATED** - use drawRectText |
