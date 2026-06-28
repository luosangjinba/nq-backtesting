def handle_economic_events_request(params, *, send_json, send_error, query_economic_events):
    try:
        events = query_economic_events(params)
        send_json({
            "events": events,
            "count": len(events),
        })
    except ValueError as exc:
        send_error(str(exc), 400)
    except Exception as exc:
        send_error(str(exc), 500)
