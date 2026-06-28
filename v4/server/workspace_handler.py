import json


def handle_workspace_get_request(params, *, send_json, send_error, read_workspace_document):
    try:
        domain = params.get("domain", [None])[0]
        instrument = params.get("instrument", [None])[0]
        send_json(read_workspace_document(domain, instrument))
    except ValueError as exc:
        send_error(str(exc), 400)
    except Exception as exc:
        send_error(str(exc), 500)


def handle_workspace_put_request(handler, *, send_json, send_error, cors_origin, read_json_body, write_workspace_document):
    try:
        payload = read_json_body(handler)
        result = write_workspace_document(payload)
        send_json(result, cors_origin=cors_origin)
    except (ValueError, json.JSONDecodeError) as exc:
        send_error(str(exc), 400, cors_origin=cors_origin)
    except Exception as exc:
        send_error(str(exc), 500, cors_origin=cors_origin)
