#!/usr/bin/env python3
"""Freeze a Databento volume-continuous mapping and local boundary diff.

The Databento symbology requests are free.  Local price seams are diagnostic
window locators only; a later raw bilateral audit must prove every legacy
source transition before a repair manifest can be committed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from v4.server import legacy_continuous_roll_audit as legacy_audit
from v4.server import roll_calendar_service

try:
    import databento as db
except ImportError:  # pragma: no cover - operational dependency
    db = None


ET = ZoneInfo("America/New_York")
DATASET = "GLBX.MDP3"
DEFAULT_DB = Path("/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb")
DEFAULT_CALENDAR = REPO_ROOT / "v4" / "data_config" / "futures_roll_calendar.yml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Freeze a free Databento v.0 mapping and compare local source seams."
    )
    parser.add_argument("--instrument", choices=("ES", "NQ"), required=True)
    parser.add_argument("--start-date", default="2010-06-06")
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--calendar", default=str(DEFAULT_CALENDAR))
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def _date(value: str) -> date:
    return date.fromisoformat(value)


def _overlaps(left: dict[str, str], right: dict[str, str]) -> bool:
    return max(_date(left["d0"]), _date(right["d0"])) < min(
        _date(left["d1"]), _date(right["d1"])
    )


def _resolve_continuous(client: object, instrument: str, start: str, end: str) -> tuple[dict, list[dict]]:
    symbol = f"{instrument}.v.0"
    response = client.symbology.resolve(
        dataset=DATASET,
        symbols=[symbol],
        stype_in="continuous",
        stype_out="instrument_id",
        start_date=start,
        end_date=end,
    )
    rows = [dict(item) for item in response["result"][symbol]]
    if response.get("status") != 0 or response.get("partial") or response.get("not_found"):
        raise ValueError(f"Databento returned an incomplete {symbol} mapping")
    if len(rows) < 2:
        raise ValueError(f"Databento returned too few {symbol} mapping rows")
    return response, rows


def _resolve_raw_symbols(
    client: object,
    rows: list[dict],
    start: str,
    end: str,
) -> dict[str, str]:
    instrument_ids = list(dict.fromkeys(str(item["s"]) for item in rows))
    response = client.symbology.resolve(
        dataset=DATASET,
        symbols=instrument_ids,
        stype_in="instrument_id",
        stype_out="raw_symbol",
        start_date=start,
        end_date=end,
    )
    # Every quarterly contract is naturally valid for only part of the full
    # 2010-present request, so Databento lists the ids under ``partial``.  The
    # overlap check below is the strict completeness condition for this use.
    if response.get("status") not in {0, 1} or response.get("not_found"):
        raise ValueError(
            "Databento returned incomplete raw-symbol identity evidence: "
            f"status={response.get('status')} not_found={response.get('not_found')} "
            f"partial={response.get('partial')}"
        )
    resolved = {}
    for mapping in rows:
        instrument_id = str(mapping["s"])
        candidates = [dict(item) for item in response["result"].get(instrument_id, [])]
        symbols = {str(item["s"]) for item in candidates if _overlaps(mapping, item)}
        if len(symbols) != 1:
            raise ValueError(
                f"instrument id {instrument_id} did not resolve to one raw symbol: {sorted(symbols)}"
            )
        resolved[instrument_id] = symbols.pop()
    return resolved


def _transition_window(old: dict[str, str], new: dict[str, str]) -> tuple[int, int]:
    year = _date(new["d0"]).year
    _, quarter_code, _, _ = roll_calendar_service.parse_contract(old["rawSymbol"])
    return year, roll_calendar_service.CONTRACT_MONTH[quarter_code] // 3


def _window_rows(
    first_window: tuple[int, int],
    last_window: tuple[int, int],
) -> tuple[legacy_audit.QuarterWindow, ...]:
    return tuple(
        window
        for window in legacy_audit.build_windows(first_window[0], last_window[0])
        if first_window <= (window.year, window.quarter) <= last_window
    )


def _database_seams(
    connection: duckdb.DuckDBPyConnection,
    instrument: str,
    windows: tuple[legacy_audit.QuarterWindow, ...],
) -> dict[tuple[int, int], legacy_audit.SeamEvidence]:
    values = ",".join(
        "(" + ",".join([
            str(window.year),
            str(window.quarter),
            f"date '{window.audit_start.isoformat()}'",
            f"date '{window.audit_end.isoformat()}'",
        ]) + ")"
        for window in windows
    )
    rows = connection.execute(
        f"""
with windows(year_number, quarter_number, audit_start, audit_end) as (
  values {values}
), ordered as (
  select ts,
         open as o,
         lag(close) over (order by ts) as previous_close,
         lag(ts) over (order by ts) as previous_ts
  from futures_1m
  where instrument = ?
), joined as (
  select w.year_number,
         w.quarter_number,
         o.ts,
         o.previous_ts,
         abs(o.o - o.previous_close) as price_gap,
         date_diff('minute', o.previous_ts, o.ts) as elapsed_minutes
  from ordered o
  join windows w
    on cast(o.ts as date) >= w.audit_start
   and cast(o.ts as date) <= w.audit_end
  where o.previous_ts is not null
), typical as (
  select year_number,
         quarter_number,
         quantile_cont(price_gap, 0.75) filter (where elapsed_minutes between 0 and 2) as typical_gap
  from joined
  group by 1, 2
)
select j.year_number,
       j.quarter_number,
       j.ts,
       j.previous_ts,
       j.price_gap,
       coalesce(t.typical_gap, 0.25) as typical_gap,
       case
         when extract(hour from j.ts) = 0
          and extract(minute from j.ts) <= 5
          and j.elapsed_minutes between 0 and 5
           then 'midnight_contiguous'
         else 'session_open'
       end as seam_kind
from joined j
join typical t using (year_number, quarter_number)
where (
    extract(hour from j.ts) = 0
    and extract(minute from j.ts) <= 5
    and j.elapsed_minutes between 0 and 5
  ) or (
    extract(hour from j.ts) = 18
    and extract(minute from j.ts) <= 5
    and j.elapsed_minutes > 30
  )
order by 1, 2, 3
""".strip(),
        [instrument],
    ).fetchall()
    grouped: dict[tuple[int, int], list[legacy_audit.SeamCandidate]] = {}
    for row in rows:
        key = (int(row[0]), int(row[1]))
        grouped.setdefault(key, []).append(legacy_audit.SeamCandidate(
            ts=row[2],
            previous_ts=row[3],
            price_gap=float(row[4]),
            typical_gap=float(row[5]),
            kind=str(row[6]),
        ))
    return {
        key: seam
        for key, candidates in grouped.items()
        if (seam := legacy_audit.infer_seam(candidates)) is not None
    }


def _event_key(event: roll_calendar_service.RollEvent) -> tuple[str, str, int]:
    return (
        event.old_contract,
        event.new_contract,
        roll_calendar_service.transition_identity(event)[3],
    )


def _target_boundary(d0: str) -> datetime:
    return datetime.combine(_date(d0) - timedelta(days=1), time(18, 0))


def main() -> int:
    args = parse_args()
    if db is None:
        raise RuntimeError("Missing dependency: databento")
    instrument = args.instrument.upper()
    database = Path(args.db).expanduser().resolve()
    calendar_path = Path(args.calendar).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    if not database.is_file() or not calendar_path.is_file():
        raise ValueError("mapping diff requires the authoritative DuckDB and Roll Calendar")

    client = db.Historical()
    response, continuous = _resolve_continuous(
        client, instrument, args.start_date, args.end_date
    )
    raw_symbols = _resolve_raw_symbols(
        client, continuous, args.start_date, args.end_date
    )
    normalized = [
        {
            "d0": str(row["d0"]),
            "d1": str(row["d1"]),
            "instrumentId": str(row["s"]),
            "rawSymbol": raw_symbols[str(row["s"])],
        }
        for row in continuous
    ]
    for previous, current in zip(normalized, normalized[1:]):
        if previous["d1"] != current["d0"]:
            raise ValueError("Databento continuous mapping is not date-contiguous")
        if roll_calendar_service.next_contract(previous["rawSymbol"]) != current["rawSymbol"]:
            raise ValueError(
                f"Databento mapping breaks quarterly chain: {previous['rawSymbol']}->{current['rawSymbol']}"
            )
        if not previous["rawSymbol"].startswith(instrument):
            raise ValueError("Databento raw symbol prefix does not match requested instrument")

    mapping_bytes = json.dumps(
        normalized, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    mapping_fingerprint = hashlib.sha256(mapping_bytes).hexdigest()
    _, calendar_events = roll_calendar_service.load_calendar(calendar_path)
    governed = {
        _event_key(event): event
        for event in calendar_events
        if event.instrument == instrument
    }

    transition_windows = [
        _transition_window(old, new)
        for old, new in zip(normalized, normalized[1:])
    ]
    windows = _window_rows(transition_windows[0], transition_windows[-1])
    with duckdb.connect(str(database), read_only=True) as connection:
        seams = _database_seams(connection, instrument, windows)
        instrument_rows, first_ts, last_ts, duplicates = connection.execute(
            """
select count(*), min(ts), max(ts), count(*) - count(distinct ts)
from futures_1m where instrument = ?
""".strip(),
            [instrument],
        ).fetchone()
        total_rows = int(connection.execute("select count(*) from futures_1m").fetchone()[0])

    transitions = []
    for (old, new), (year, quarter) in zip(
        zip(normalized, normalized[1:]), transition_windows
    ):
        d0 = str(new["d0"])
        window = f"{year}Q{quarter}"
        target = _target_boundary(d0)
        key = (old["rawSymbol"], new["rawSymbol"], year)
        calendar_event = governed.get(key)
        seam = seams.get((year, quarter))
        if calendar_event is not None:
            current = calendar_event.effective_at_et
            authority = "governed_calendar"
            confidence = "exact"
            calendar_status = calendar_event.status
        elif seam is not None:
            current = seam.ts
            authority = "legacy_continuous_inferred"
            confidence = seam.confidence
            calendar_status = None
        else:
            current = target
            authority = "legacy_continuous_inferred"
            confidence = "none"
            calendar_status = None
        delta_hours = int((target - current).total_seconds() // 3600)
        transitions.append({
            "window": window,
            "oldContract": old["rawSymbol"],
            "newContract": new["rawSymbol"],
            "databentoD0": d0,
            "databentoInstrumentId": new["instrumentId"],
            "targetBoundaryEt": target.isoformat(timespec="minutes"),
            "currentBoundaryEt": current.isoformat(timespec="minutes"),
            "currentBoundaryAuthority": authority,
            "currentBoundaryConfidence": confidence,
            "deltaHours": delta_hours,
            "disposition": "diagnostic_match" if delta_hours == 0 else (
                "databento_earlier" if delta_hours < 0 else "databento_later"
            ),
            "legacyRisk": "unscored",
            "calendarStatus": calendar_status,
        })

    if len(transitions) != 65:
        raise ValueError(f"expected 65 quarterly transitions, got {len(transitions)}")
    payload = {
        "version": 1,
        "mode": "read-only",
        "query": {
            "dataset": DATASET,
            "symbol": f"{instrument}.v.0",
            "rollRule": "volume",
            "startDate": args.start_date,
            "endDate": args.end_date,
            "mappingStatus": response.get("message"),
            "mappingPartial": response.get("partial", []),
            "mappingNotFound": response.get("not_found", []),
        },
        "mapping": {
            "rows": len(normalized),
            "transitions": len(transitions),
            "firstD0": normalized[0]["d0"],
            "lastD1": normalized[-1]["d1"],
            "fingerprint": mapping_fingerprint,
            "continuous": normalized,
        },
        "comparison": {
            "authority": "Databento v.0 d0 normalized to prior natural date 18:00 ET",
            "warning": "legacy price seams are diagnostic until raw bilateral attribution",
            "transitions": transitions,
        },
        "calendar": {
            "path": str(calendar_path),
            "revision": roll_calendar_service.calendar_revision(calendar_path),
            f"{instrument.lower()}Events": len(governed),
        },
        "database": {
            "path": str(database),
            "totalRows": total_rows,
            f"{instrument.lower()}Rows": int(instrument_rows),
            f"{instrument.lower()}FirstTs": first_ts.isoformat(timespec="minutes"),
            f"{instrument.lower()}LastTs": last_ts.isoformat(timespec="minutes"),
            f"{instrument.lower()}DuplicateTimestamps": int(duplicates),
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print("databento_full_chain_diff_status: ok")
    print(f"instrument: {instrument}")
    print(f"mapping_rows: {len(normalized)}")
    print(f"transitions: {len(transitions)}")
    print(f"mapping_fingerprint: {mapping_fingerprint}")
    print(f"output: {output}")
    print("write_status: no-database-or-calendar-mutation")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("databento_full_chain_diff_status: failed")
        print(f"error: {exc}")
        raise SystemExit(1)
