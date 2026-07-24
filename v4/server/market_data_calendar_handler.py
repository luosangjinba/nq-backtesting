"""HTTP adapter for read-only market-date availability."""


def _requested_instruments(params):
    values = []
    for raw in params.get("instrument", []):
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    return values


def handle_available_dates_request(
    params,
    *,
    send_json,
    send_error,
    db_path,
    table_name,
    query_available_dates,
):
    instruments = _requested_instruments(params)
    if not instruments:
        send_error("Missing 'instrument' parameter")
        return
    try:
        records = query_available_dates(db_path, table_name, instruments)
        send_json({
            "schemaVersion": 1,
            "timeZone": "America/New_York",
            "instruments": records,
        })
    except ValueError as exc:
        send_error(str(exc), 400)
    except Exception as exc:
        send_error(str(exc), 500)
