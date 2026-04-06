#!/usr/bin/env bash
set -euo pipefail

if pgrep -f "price_lookup_api.py" >/dev/null 2>&1; then
  echo "Stopping price lookup API..."
  pkill -f "price_lookup_api.py" || true
  sleep 1
  echo "API stopped."
else
  echo "No running price_lookup_api.py process found."
fi
