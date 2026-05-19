#!/home/leo/miniconda3/bin/python3
"""V4 精简 API 服务器 — 仅含 K 线查询所需端点

从 price_lookup_api.py 导入查询函数，不复制代码。
端口 8766，与 v3 的 8765 并行运行。
"""

import json
import sys
import os
import yaml
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 导入父目录的查询函数（price_lookup_api.py 在 backtesting/ 根目录）
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from price_lookup_api import query_v2_bars, query_price

# 加载配置
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v4_config.yaml")
with open(CONFIG_PATH, "r") as f:
    V4_CONFIG = yaml.safe_load(f)

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), V4_CONFIG["database"]["trading_data"]["path"])
)
TABLE_NAME = V4_CONFIG["database"]["trading_data"]["table"]


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
        # query_v2_bars(db_path, table, instrument, start, end, tf, padding)
        start = params.get("start", [None])[0]
        end = params.get("end", [None])[0]
        tf = int(params.get("tf", ["1"])[0])
        instrument = params.get("instrument", ["NQ"])[0]

        if not start or not end:
            self._send_error("Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)")
            return

        try:
            result = query_v2_bars(DB_PATH, TABLE_NAME, instrument, start, end, tf)
            self._send_json(result)
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