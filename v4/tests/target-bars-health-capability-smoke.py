from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch


V4_ROOT = Path(__file__).resolve().parents[1]
if str(V4_ROOT) not in sys.path:
    sys.path.insert(0, str(V4_ROOT))

import v4_api


class HealthHandlerHarness:
    path = "/v4/health"

    def __init__(self):
        self.response = None

    def _send_json(self, payload, status=200):
        self.response = {"payload": payload, "status": status}


harness = HealthHandlerHarness()
with patch.object(v4_api.V4Handler, "do_GET", v4_api.V4Handler.do_GET):
    v4_api.V4Handler.do_GET(harness)

assert harness.response["status"] == 200
payload = harness.response["payload"]
assert payload["status"] == "ok"
assert payload["capabilities"]["targetBars"] is True
assert "4h" in payload["capabilities"]["targetTimeframes"]
assert "1D" in payload["capabilities"]["targetTimeframes"]

print(json.dumps(payload["capabilities"], sort_keys=True))
print("v4 target bars health capability smoke passed")
