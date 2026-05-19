#!/bin/bash
# V4 系统启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="/home/leo/miniconda3/bin/python3"
PORT=8766
PID_FILE=".api_pid"

echo "=== V4 NQ K-Line Viewer 启动 ==="
echo ""

check_api() {
  if curl -s "http://127.0.0.1:${PORT}/v4/health" > /dev/null 2>&1; then
    echo "✓ API 服务器运行中 (http://127.0.0.1:${PORT})"
    return 0
  else
    echo "✗ API 服务器未运行"
    return 1
  fi
}

start_api() {
  echo "启动 API 服务器..."
  nohup "$PYTHON" v4_api.py > .api.log 2>&1 &
  echo $! > "$PID_FILE"
  sleep 2

  if check_api; then
    echo "✓ API 服务器启动成功 (PID=$(cat "$PID_FILE"))"
  else
    echo "✗ API 服务器启动失败，查看日志："
    tail -20 .api.log
    exit 1
  fi
}

stop_api() {
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  # 兜底：按端口杀
  PID_BY_PORT=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PID_BY_PORT" ]; then
    kill $PID_BY_PORT 2>/dev/null || true
    sleep 1
  fi
}

start_web() {
  echo ""
  echo "启动 Web 服务器..."
  echo "访问地址: http://127.0.0.1:8001/v4/index.html"
  echo ""
  echo "按 Ctrl+C 停止所有服务器"
  echo ""

  python3 -m http.server 8001
}

main() {
  case "${1:-start}" in
    start)
      stop_api
      start_api
      start_web
      ;;
    stop)
      stop_api
      echo "已停止"
      ;;
    restart)
      stop_api
      start_api
      echo "已重启"
      ;;
    status)
      if check_api; then
        echo "运行中"
      else
        echo "未运行"
      fi
      ;;
    log)
      tail -f .api.log
      ;;
    *)
      echo "用法: $0 {start|stop|restart|status|log}"
      exit 1
      ;;
  esac
}

main "$@"