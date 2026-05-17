/**
 * chart.js - 图表管理模块
 * 负责 Lightweight Charts 的初始化、配置和状态管理
 */

/**
 * 全局状态对象
 */
export const state = {
  chart: null,
  candlestickSeries: null,
  loading: false,
  liquidityPrimitives: [], // BSL/SSL 短线 Primitives
  fvgPrimitives: [], // FVG 矩形 Primitives
  currentMenu: null, // 当前打开的右键菜单
  currentPopover: null, // 当前打开的 PDA 详情浮窗
  pdaRecords: [], // PDA 原始数据（用于点击检测）
  selectedMenuIndex: -1, // 当前选中的菜单项索引（-1 表示无选中）
  menuItems: [], // 当前菜单的可选项（不含 divider）
  barTimestamps: [], // K 线时间戳数组（用于日级 PDA 时间映射）
  candleData: [], // K 线完整数据（用于 PDA 识别）
};

/**
 * API 配置
 */
export const API_BASE = 'http://127.0.0.1:8765';

/**
 * 初始化 Lightweight Charts
 */
export function initChart() {
  const container = document.getElementById('chart');

  state.chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#131722' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: '#1e222d' },
      horzLines: { color: '#1e222d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#2a2e39',
    },
    timeScale: {
      borderColor: '#2a2e39',
      timeVisible: true,
      secondsVisible: false,
    },
  });

  state.candlestickSeries = state.chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });

  // 响应式调整
  window.addEventListener('resize', () => {
    state.chart.applyOptions({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  });

  // 监听容器大小变化（侧边栏展开/折叠时）
  const resizeObserver = new ResizeObserver(() => {
    state.chart.applyOptions({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  });
  resizeObserver.observe(container);

  console.log('✓ 图表初始化完成');
  console.log('✓ 数据库时间 = 美东时间，图表直接显示（无时区转换）');
}

/**
 * 更新图表数据
 * @param {Array} klineData - K 线数据
 */
export function updateChartData(klineData) {
  if (!state.candlestickSeries) {
    console.error('图表未初始化');
    return;
  }

  state.candlestickSeries.setData(klineData);

  // 存储 K 线时间戳（用于日级 PDA 时间映射）
  state.barTimestamps = klineData.map((bar) => bar.time);

  // 存储完整 K 线数据（用于 PDA 识别）
  state.candleData = klineData;

  console.log(`✓ 图表数据已更新：${klineData.length} 根 K 线`);
}

/**
 * 获取图表可见范围
 * @returns {Object} { from, to } 时间范围（秒）
 */
export function getVisibleRange() {
  if (!state.chart) return null;

  const timeScale = state.chart.timeScale();
  const visibleRange = timeScale.getVisibleRange();

  if (!visibleRange) return null;

  return {
    from: visibleRange.from,
    to: visibleRange.to,
  };
}

/**
 * 设置图表可见范围
 * @param {number} from - 开始时间（秒）
 * @param {number} to - 结束时间（秒）
 */
export function setVisibleRange(from, to) {
  if (!state.chart) return;

  const timeScale = state.chart.timeScale();
  timeScale.setVisibleRange({ from, to });
}
