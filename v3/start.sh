#!/bin/bash
# V3 系统快速启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== V3 Lightweight Charts 系统启动 ==="
echo ""

# 检查 API 服务器状态
check_api() {
    if curl -s http://127.0.0.1:8765/api/health > /dev/null 2>&1; then
        echo "✓ API 服务器运行中 (http://127.0.0.1:8765)"
        return 0
    else
        echo "✗ API 服务器未运行"
        return 1
    fi
}

# 启动 API 服务器
start_api() {
    echo "启动 API 服务器..."
    bash restart_api.sh
    sleep 2

    if check_api; then
        echo "✓ API 服务器启动成功"
    else
        echo "✗ API 服务器启动失败"
        exit 1
    fi
}

# 启动静态文件服务器
start_web() {
    echo ""
    echo "启动 Web 服务器..."
    echo "访问地址: http://127.0.0.1:8000/v3/docs/kline_viewer.html"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo ""

    python3 -m http.server 8000
}

# 主流程
main() {
    # 检查 API 服务器
    if ! check_api; then
        read -p "是否启动 API 服务器? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_api
        else
            echo "请手动启动 API 服务器: bash restart_api.sh"
            exit 1
        fi
    fi

    # 启动 Web 服务器
    start_web
}

main
