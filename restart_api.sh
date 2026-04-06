#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PRICE_DB_FILE="${PRICE_DB_FILE:-trading_data.duckdb}"
PRICE_HOST="${PRICE_HOST:-127.0.0.1}"
PRICE_PORT="${PRICE_PORT:-8765}"
PRICE_TABLE="${PRICE_TABLE:-futures_1m}"
API_LOG_FILE="${API_LOG_FILE:-api.log}"

echo "Restarting price lookup API..."
echo "  db file:  $PRICE_DB_FILE"
echo "  host:     $PRICE_HOST"
echo "  port:     $PRICE_PORT"
echo "  table:    $PRICE_TABLE"
echo "  log file: $API_LOG_FILE"

if pgrep -f "price_lookup_api.py" >/dev/null 2>&1; then
  echo "Stopping existing API process..."
  pkill -f "price_lookup_api.py" || true
  sleep 1
fi

echo "Starting new API process..."
nohup python3 price_lookup_api.py \
  --db-file "$PRICE_DB_FILE" \
  --host "$PRICE_HOST" \
  --port "$PRICE_PORT" \
  --table "$PRICE_TABLE" \
  >"$API_LOG_FILE" 2>&1 &

sleep 1

echo "Health check:"
curl -s "http://$PRICE_HOST:$PRICE_PORT/health" || {
  echo
  echo "Health check failed. See $API_LOG_FILE"
  exit 1
}
echo
echo "API restarted."
