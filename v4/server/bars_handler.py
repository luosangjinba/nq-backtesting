from datetime import timezone


def handle_bars_request(params, *, send_json, send_error, db_path, table_name, validate_range, query_bars):
    start = params.get("start", [None])[0]
    end = params.get("end", [None])[0]
    instrument = params.get("instrument", ["NQ"])[0]

    if not start or not end:
        send_error("Missing 'start' and/or 'end' parameter (format: YYYY-MM-DD HH:MM)")
        return

    try:
        tf = int(params.get("tf", ["1"])[0])
        validation = validate_range(start, end, tf)
        bars = query_bars(db_path, table_name, instrument, start, end, tf)
        start_dt = validation["start_dt"]
        end_dt = validation["end_dt"]
        requested_start_ts = int(start_dt.replace(tzinfo=timezone.utc).timestamp())
        requested_end_ts = int(end_dt.replace(tzinfo=timezone.utc).timestamp())
        send_json({
            "bars": bars,
            "requestedRange": {
                "startTs": requested_start_ts,
                "endTs": requested_end_ts,
            },
        })
    except OverflowError as exc:
        send_error(str(exc), 413)
    except ValueError as exc:
        send_error(str(exc), 400)
    except Exception as exc:
        send_error(str(exc), 500)


def handle_price_request(params, *, send_json, send_error, parse_price_request, query_price):
    try:
        timestamp, instrument = parse_price_request(params)
        send_json(query_price(timestamp, instrument))
    except ValueError as exc:
        send_error(str(exc), 400)
    except Exception as exc:
        send_error(str(exc), 500)
