/**
 * replay.js - K线回放模块
 * 负责回放状态管理、播放控制、进度保存/恢复
 */

import { state, updateChartData } from './chart.js';

/**
 * 回放状态对象
 */
export const replayState = {
  isPlaying: false,
  speed: 1,
  currentIndex: 0,
  totalBars: 0,
  allBars: [],
  allPdas: [],
  intervalId: null,
  startTime: null,
  endTime: null,
  timeframe: null,
};

/**
 * 初始化回放模块
 */
export function initReplay() {
  console.log('✓ 回放模块初始化');

  // 绑定按钮事件
  document.getElementById('replayPlayBtn').addEventListener('click', togglePlay);
  document.getElementById('replayStopBtn').addEventListener('click', stopReplay);
  document.getElementById('replayStepBackBtn').addEventListener('click', stepBack);
  document.getElementById('replayStepForwardBtn').addEventListener('click', stepForward);

  // 绑定速度选择器
  document.getElementById('replaySpeedSelect').addEventListener('change', (e) => {
    replayState.speed = parseInt(e.target.value);
    console.log(`速度切换: ${replayState.speed}x`);

    // 如果正在播放，重启定时器以应用新速度
    if (replayState.isPlaying) {
      stopPlayInterval();
      startPlayInterval();
    }
  });

  // 绑定进度条
  document.getElementById('replayProgressBar').addEventListener('input', (e) => {
    const progress = parseInt(e.target.value);
    jumpToProgress(progress);
  });

  // 绑定空格键播放/暂停
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      togglePlay();
    }
  });

  console.log('✓ 回放模块初始化完成');
}

/**
 * 加载回放数据
 * @param {Array} bars - K线数据
 * @param {Array} pdas - PDA数据
 * @param {string} start - 开始时间
 * @param {string} end - 结束时间
 * @param {number} tf - 周期
 */
export function loadReplayData(bars, pdas, start, end, tf) {
  console.log(`加载回放数据: ${bars.length} 根K线, ${pdas.length} 个PDA`);

  replayState.allBars = bars;
  replayState.allPdas = pdas;
  replayState.totalBars = bars.length;
  replayState.startTime = start;
  replayState.endTime = end;
  replayState.timeframe = tf;

  // 尝试恢复进度
  const savedProgress = loadProgress();
  if (
    savedProgress &&
    savedProgress.start === start &&
    savedProgress.end === end &&
    savedProgress.tf === tf
  ) {
    replayState.currentIndex = savedProgress.index;
    console.log(`恢复进度: ${savedProgress.index}/${bars.length}`);
  } else {
    replayState.currentIndex = 0;
  }

  // 显示回放控制栏
  document.getElementById('replayControls').style.display = 'block';

  // 更新UI
  updateReplayUI();

  // 渲染当前进度的K线
  renderCurrentBars();

  console.log('✓ 回放数据加载完成');
}

/**
 * 播放/暂停切换
 */
export function togglePlay() {
  if (replayState.isPlaying) {
    pauseReplay();
  } else {
    playReplay();
  }
}

/**
 * 开始播放
 */
function playReplay() {
  if (replayState.currentIndex >= replayState.totalBars) {
    // 已到末尾，从头开始
    replayState.currentIndex = 0;
  }

  replayState.isPlaying = true;
  document.getElementById('replayPlayIcon').textContent = '⏸';
  console.log('开始播放');

  startPlayInterval();
}

/**
 * 暂停播放
 */
function pauseReplay() {
  replayState.isPlaying = false;
  document.getElementById('replayPlayIcon').textContent = '▶';
  console.log('暂停播放');

  stopPlayInterval();
  saveProgress();
}

/**
 * 停止播放
 */
function stopReplay() {
  replayState.isPlaying = false;
  replayState.currentIndex = 0;
  document.getElementById('replayPlayIcon').textContent = '▶';
  console.log('停止播放');

  stopPlayInterval();
  updateReplayUI();
  renderCurrentBars();
  saveProgress();
}

/**
 * 单步后退
 */
function stepBack() {
  if (replayState.currentIndex > 0) {
    replayState.currentIndex--;
    updateReplayUI();
    renderCurrentBars();
    saveProgress();
  }
}

/**
 * 单步前进
 */
function stepForward() {
  if (replayState.currentIndex < replayState.totalBars) {
    replayState.currentIndex++;
    updateReplayUI();
    renderCurrentBars();
    saveProgress();
  }
}

/**
 * 跳转到指定进度
 * @param {number} progress - 进度百分比 (0-100)
 */
function jumpToProgress(progress) {
  const index = Math.floor((progress / 100) * replayState.totalBars);
  replayState.currentIndex = Math.max(0, Math.min(index, replayState.totalBars));

  updateReplayUI();
  renderCurrentBars();
  saveProgress();
}

/**
 * 启动播放定时器
 */
function startPlayInterval() {
  const baseInterval = 1000; // 1秒一根K线
  const interval = baseInterval / replayState.speed;

  replayState.intervalId = setInterval(() => {
    if (replayState.currentIndex < replayState.totalBars) {
      replayState.currentIndex++;
      updateReplayUI();
      renderCurrentBars();
    } else {
      // 播放完毕
      pauseReplay();
    }
  }, interval);
}

/**
 * 停止播放定时器
 */
function stopPlayInterval() {
  if (replayState.intervalId) {
    clearInterval(replayState.intervalId);
    replayState.intervalId = null;
  }
}

/**
 * 渲染当前进度的K线
 */
function renderCurrentBars() {
  const visibleBars = replayState.allBars.slice(0, replayState.currentIndex);

  if (visibleBars.length === 0) {
    // 清空图表
    updateChartData([]);
    return;
  }

  // 更新图表数据
  updateChartData(visibleBars);

  // 自动缩放到合适的视图
  state.chart.timeScale().fitContent();

  // TODO: 渲染当前时间点可见的PDA
  // 需要根据PDA的occurrence_time过滤
}

/**
 * 更新回放UI
 */
function updateReplayUI() {
  // 更新进度条
  const progress =
    replayState.totalBars > 0 ? (replayState.currentIndex / replayState.totalBars) * 100 : 0;
  document.getElementById('replayProgressBar').value = progress;

  // 更新时间显示
  const currentTime =
    replayState.currentIndex > 0
      ? formatTimestamp(replayState.allBars[replayState.currentIndex - 1].time)
      : '--:--';
  const totalTime =
    replayState.totalBars > 0
      ? formatTimestamp(replayState.allBars[replayState.totalBars - 1].time)
      : '--:--';

  document.getElementById('replayCurrentTime').textContent = currentTime;
  document.getElementById('replayTotalTime').textContent = totalTime;

  // 更新按钮状态
  document.getElementById('replayStepBackBtn').disabled = replayState.currentIndex === 0;
  document.getElementById('replayStepForwardBtn').disabled =
    replayState.currentIndex >= replayState.totalBars;
}

/**
 * 格式化时间戳
 * @param {number} timestamp - Unix时间戳（秒）
 * @returns {string} 格式化的时间字符串
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 保存回放进度到localStorage
 */
function saveProgress() {
  const progressData = {
    start: replayState.startTime,
    end: replayState.endTime,
    tf: replayState.timeframe,
    index: replayState.currentIndex,
    timestamp: Date.now(),
  };

  localStorage.setItem('replayProgress', JSON.stringify(progressData));
}

/**
 * 从localStorage加载回放进度
 * @returns {Object|null} 进度数据
 */
function loadProgress() {
  const data = localStorage.getItem('replayProgress');
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('加载进度失败:', e);
    return null;
  }
}
