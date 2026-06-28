import json
import subprocess


def handle_data_maintenance_post_request(
    handler,
    *,
    send_json,
    send_error,
    cors_origin,
    read_json_body,
    run_action_guarded,
):
    try:
        payload = read_json_body(handler)
        result = run_action_guarded(payload)
        send_json(result, 200 if result.get("ok") else 409, cors_origin=cors_origin)
    except subprocess.TimeoutExpired:
        send_error("Command timed out", 504, cors_origin=cors_origin)
    except (ValueError, json.JSONDecodeError) as exc:
        send_error(str(exc), 400, cors_origin=cors_origin)
    except Exception as exc:
        send_error(str(exc), 500, cors_origin=cors_origin)
