#!/home/leo/miniconda3/bin/python3
"""V4 精简 API 服务器 — 仅含 K 线查询所需端点

从 price_lookup_api.py 导入查询函数，不复制代码。
端口 8766，与 v3 的 8765 并行运行。

日线聚合使用 CME 交易日分界 (18:00 ET)，
数据时间戳为美东时间，不做 UTC 转换。
API 返回 { bars, requestedRange } 格式，requestedRange 供前端过滤 padding。
"""

import json
import sys
import os
import yaml
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 导入父目录的查询函数（price_lookup_api.py 在 backtesting/ 根目录）
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from price_lookup_api import query_v2_bars, query_price, open_db, _parse_datetime

# 加载配置
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v4_config.yaml")
with open(CONFIG_PATH, "r") as f:
    V4_CONFIG = yaml.safe_load(f)

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), V4_CONFIG["database"]["trading_data"]["path"])
)
TABLE_NAME = V4_CONFIG["database"]["trading_data"]["table"]

# CME 交易日分界：18:00 ET（数据时间戳就是美东时间）
# 日线 = 前一天18:00 ~ 当天16:59
DAILY_ANCHOR_OFFSET = 18 * 3600  # 64800 seconds


def query_v4_bars(db_path, table, instrument, start, end, tf, padding=19):
    """Wrapper around query_v2_bars with CME session-aware daily aggregation.

    For tf=1440 (daily), uses 18:00 ET as the trading day boundary
    (previous day 18:00 ~ current day 16:59). Data timestamps are ET, no UTC conversion.
    All other timeframes use query_v2_bars.
    """
    if tf != 1440:
        return query_v2_bars(db_path, table, instrument, start, end, tf, padding)

    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    pad_minutes = padding * tf
    query_start = start_dt - timedelta(minutes=pad_minutes)
    query_end = end_dt + timedelta(minutes=pad_minutes)

    # Anchor: 2000-01-01 18:00 ET so daily buckets split at 18:00 ET
    anchor_epoch = 946684800 + DAILY_ANCHOR_OFFSET

    sql = f"""
with bars as (
  select
    date_trunc('minute', ts) as ts,
    open, high, low, close, volume
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
    and not (extract(hour from ts) = 17)
)
select
  floor((extract(epoch from ts) - {anchor_epoch}) / (60 * ?)) as bucket,
  first(open order by ts) as open,
  max(high) as high,
  min(low) as low,
  last(close order by ts) as close,
  sum(coalesce(volume, 0)) as volume
from bars
group by bucket
order by bucket
""".strip()

    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, query_start, query_end, tf]).fetchall()

    # 数据时间戳为美东时间，用 UTC fromtimestamp 避免系统时区偏移
    # epoch 值本身就是美东时间语义，UTC解读直接得到正确字符串
    return [
        {
            "time": datetime.fromtimestamp(
                anchor_epoch + int(row[0]) * tf * 60, tz=timezone.utc
            ).strftime("%Y-%m-%d %H:%M"),
            "timestamp": anchor_epoch + int(row[0]) * tf * 60,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
        }
        for row in rows
    ]


class V4Handler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message, status=400):
        self._send_json({"error": message}, status)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/v4/health":
            self._send_json({"status": "ok", "version": "4.0"})
        elif path == "/v4/bars":
            self._handle_bars(params)
        elif path == "/v4/price":
            self._handle_price(params)
        else:
            self._send_error(f"Unknown endpoint: {path}", 404)

    def _handle_bars(self, params):
        start = params.get("start", [None])[0]
        end = params.get("end", [None])[0]
        tf = int(params.get("tf", ["1"])[0])
        instrument = params.get("instrument", ["NQ"])[0]

        if not start or not end:
            self._send_error("Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)")
            return

        try:
            bars = query_v4_bars(DB_PATH, TABLE_NAME, instrument, start, end, tf)
            start_dt = _parse_datetime(start)
            end_dt = _parse_datetime(end)
            # 数据时间戳为美东时间语义，用 UTC epoch 避免系统时区偏移
            requested_start_ts = int(start_dt.replace(tzinfo=timezone.utc).timestamp())
            requested_end_ts = int(end_dt.replace(tzinfo=timezone.utc).timestamp())
            self._send_json({
                "bars": bars,
                "requestedRange": {
                    "startTs": requested_start_ts,
                    "endTs": requested_end_ts,
                },
            })
        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_price(self, params):
        timestamp = params.get("timestamp", [None])[0]

        if not timestamp:
            self._send_error("Missing 'timestamp' parameter")
            return

        try:
            result = query_price(int(timestamp), DB_PATH, TABLE_NAME)
            self._send_json(result)
        except Exception as e:
            self._send_error(str(e), 500)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    host = V4_CONFIG["api"]["host"]
    port = V4_CONFIG["api"]["port"]
    server = HTTPServer((host, port), V4Handler)
    print(f"[V4 API] Running on http://{host}:{port}")
    print(f"[V4 API] DB: {DB_PATH}")
    print(f"[V4 API] Endpoints: /v4/health, /v4/bars, /v4/price")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[V4 API] Stopped")
        server.server_close()


if __name__ == "__main__":
    main()