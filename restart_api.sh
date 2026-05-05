#!/usr/bin/env bash
# 一键重启 price_lookup_api 服务
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE=".api_pid"
PORT=8765
PYTHON="/home/leo/miniconda3/bin/python3"
SCRIPT="price_lookup_api.py"
DB="--db-file trading_data.duckdb --table futures_1m --v2-db-file v2/data/v2_research.duckdb"

# --- 停止旧进程 ---
stop() {
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "停止旧进程 PID=$OLD_PID ..."
      kill "$OLD_PID" 2>/dev/null || true
      sleep 1
      # 如果还没死，强杀
      if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "强制终止 PID=$OLD_PID"
        kill -9 "$OLD_PID" 2>/dev/null || true
        sleep 1
      fi
    fi
    rm -f "$PID_FILE"
  fi

  # 兜底：按端口杀
  PID_BY_PORT=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PID_BY_PORT" ]; then
    echo "端口 $PORT 被占用，终止 PID=$PID_BY_PORT ..."
    kill $PID_BY_PORT 2>/dev/null || true
    sleep 1
  fi
}

# --- 启动新进程 ---
start() {
  echo "启动 $SCRIPT (port=$PORT) ..."
  nohup "$PYTHON" "$SCRIPT" --host 127.0.0.1 --port $PORT $DB > .api.log 2>&1 &
  echo $! > "$PID_FILE"
  sleep 2

  # 验证
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "已启动 PID=$(cat "$PID_FILE")  端口=$PORT"
    echo "日志: tail -f $SCRIPT_DIR/.api.log"
  else
    echo "启动失败！查看日志："
    tail -20 .api.log
    exit 1
  fi
}

# --- 主逻辑 ---
case "${1:-restart}" in
  restart)
    stop
    start
    ;;
  stop)
    stop
    echo "已停止"
    ;;
  start)
    start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "运行中 PID=$(cat "$PID_FILE")  端口=$PORT"
    else
      echo "未运行"
    fi
    ;;
  log)
    tail -f .api.log
    ;;
  *)
    echo "用法: $0 {restart|stop|start|status|log}"
    exit 1
    ;;
esac