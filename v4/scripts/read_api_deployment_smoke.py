#!/usr/bin/env python3
"""Behavior smoke for the deployed read-only V4 HTTP boundary."""

import http.client
import json
import os
import sys
import threading


V4_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if V4_ROOT not in sys.path:
    sys.path.insert(0, V4_ROOT)

from read_api import V4ReadOnlyHandler, create_server  # noqa: E402


class DisconnectingWriter:
    def write(self, _payload):
        raise BrokenPipeError("fixture client disconnected")


disconnected = object.__new__(V4ReadOnlyHandler)
disconnected.send_response = lambda _status: None
disconnected.send_header = lambda _name, _value: None
disconnected.end_headers = lambda: None
disconnected.wfile = DisconnectingWriter()
disconnected.close_connection = False
disconnected._send_json({"status": "discarded"})
assert disconnected.close_connection is True


server = create_server("127.0.0.1", 0)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=5)


def request(method, path, body=None):
    connection.request(method, path, body=body)
    response = connection.getresponse()
    payload = response.read()
    return response, payload


try:
    for method, path in (
        ("POST", "/v4/data_maintenance/run"),
        ("PUT", "/v4/workspace"),
        ("PATCH", "/v4/bars"),
        ("DELETE", "/v4/bars"),
    ):
        response, payload = request(method, path, "{}")
        assert response.status == 405, (method, response.status, payload)
        assert response.getheader("Allow") == "GET, OPTIONS"
        assert "read-only" in json.loads(payload)["error"]

    response, payload = request("GET", "/v4/workspace")
    assert response.status == 404, (response.status, payload)

    response, payload = request("OPTIONS", "/v4/data_maintenance/run")
    assert response.status == 204, (response.status, payload)
    assert response.getheader("Access-Control-Allow-Methods") == "GET, OPTIONS"
    assert response.getheader("Allow") == "GET, OPTIONS"

    print("V4 deployed read-only API smoke: PASS")
finally:
    connection.close()
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
