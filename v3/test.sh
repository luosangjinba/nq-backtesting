#!/bin/bash
# V3 快速测试脚本

set -e

echo "=== V3 系统测试 ==="
echo ""

# 检查 API 服务器
echo "1. 检查 API 服务器..."
if curl -s "http://127.0.0.1:8765/v2/bars?start=2012-01-09%2009:30&end=2012-01-09%2009:31&tf=1" | grep -q '"ok": true'; then
    echo "   ✓ API 服务器正常"
else
    echo "   ✗ API 服务器异常"
    echo "   请运行: bash restart_api.sh"
    exit 1
fi

# 检查数据库
echo ""
echo "2. 检查数据库..."
if [ -f "trading_data.duckdb" ]; then
    echo "   ✓ trading_data.duckdb 存在"
else
    echo "   ✗ trading_data.duckdb 不存在"
    exit 1
fi

# 检查 HTML 文件
echo ""
echo "3. 检查前端文件..."
if [ -f "v3/docs/kline_viewer.html" ]; then
    echo "   ✓ kline_viewer.html 存在"
else
    echo "   ✗ kline_viewer.html 不存在"
    exit 1
fi

# 测试数据查询
echo ""
echo "4. 测试数据查询..."
RESULT=$(curl -s "http://127.0.0.1:8765/v2/bars?start=2012-01-09%2009:30&end=2012-01-09%2010:30&tf=60")
COUNT=$(echo "$RESULT" | grep -o '"timestamp"' | wc -l)
echo "   ✓ 查询到 $COUNT 根 K线"

# 启动 Web 服务器
echo ""
echo "5. 启动 Web 服务器..."
echo ""
echo "   访问地址: http://127.0.0.1:8000/v3/docs/kline_viewer.html"
echo ""
echo "   测试数据:"
echo "   - 开始时间: 2012-01-09 09:30"
echo "   - 结束时间: 2012-01-09 16:00"
echo "   - 周期: 1H"
echo ""
echo "   按 Ctrl+C 停止服务器"
echo ""

python3 -m http.server 8000
