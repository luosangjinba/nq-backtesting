#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from urllib.parse import urlencode
from urllib.request import urlopen


TARGET_MATRIX = ("30m", "1h", "2h", "4h", "8h", "12h", "1D", "1W", "1M")


def get_json(url):
    with urlopen(url, timeout=30) as response:
        return json.load(response)


parser = argparse.ArgumentParser(description="Verify real target-bars HTTP capability across all display timeframes.")
parser.add_argument("--api-url", default="http://127.0.0.1:8766")
parser.add_argument("--instrument", default="NQ")
parser.add_argument("--start", default="2026-01-01 00:00")
parser.add_argument("--end", default="2026-05-07 00:00")
args = parser.parse_args()

api_url = args.api_url.rstrip("/")
health = get_json(f"{api_url}/v4/health")
advertised = set(health.get("capabilities", {}).get("targetTimeframes", []))
missing = [timeframe for timeframe in TARGET_MATRIX if timeframe not in advertised]
assert not missing, f"health capability missing target timeframes: {missing}"

summary = {}
for timeframe in TARGET_MATRIX:
    query = urlencode({
        "instrument": args.instrument,
        "start": args.start,
        "end": args.end,
        "tf": timeframe,
    })
    payload = get_json(f"{api_url}/v4/target_bars?{query}")
    bars = payload.get("bars")
    assert payload.get("targetTimeframe") == timeframe
    assert isinstance(bars, list) and bars, f"{timeframe} returned no bars"
    summary[timeframe] = len(bars)

print(json.dumps({"status": "passed", "bars": summary}, sort_keys=True))
