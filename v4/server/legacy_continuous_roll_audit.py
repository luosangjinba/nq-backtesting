"""Read-only risk prescreen for legacy continuous futures roll windows.

The source series contains one already-stitched continuous contract and cannot
prove old/new contract volume dominance.  This module only ranks windows for a
later raw-contract audit; it never proposes a production roll or writes market
data.
"""

from __future__ import annotations

import calendar
import statistics
from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path

import duckdb


QUARTER_MONTHS = (3, 6, 9, 12)


@dataclass(frozen=True)
class AuditThresholds:
    red_bar_ratio: float = 0.97
    red_volume_ratio: float = 0.40
    amber_bar_ratio: float = 0.985
    amber_volume_ratio: float = 0.55


@dataclass(frozen=True)
class QuarterWindow:
    year: int
    quarter: int
    expiry_date: date
    baseline_start: date
    baseline_end: date
    audit_start: date
    audit_end: date


@dataclass(frozen=True)
class SessionEvidence:
    trade_date: date
    bar_count: int
    volume: int


@dataclass(frozen=True)
class SeamCandidate:
    ts: datetime
    previous_ts: datetime
    price_gap: float
    typical_gap: float
    kind: str


@dataclass(frozen=True)
class SeamEvidence:
    ts: datetime
    price_gap: float
    normalized_gap: float
    kind: str
    confidence: str


@dataclass(frozen=True)
class QuarterAudit:
    year: int
    quarter: int
    expiry_date: date
    baseline_session_count: int
    baseline_median_bars: float | None
    baseline_median_volume: float | None
    seam_trade_date: date | None
    evaluated_session_count: int
    weakest_trade_date: date | None
    weakest_bar_count: int | None
    weakest_volume: int | None
    bar_ratio: float | None
    volume_ratio: float | None
    risk: str
    requires_raw_contract_review: bool
    reasons: tuple[str, ...]
    inferred_seam_at: datetime | None
    seam_kind: str | None
    seam_confidence: str
    seam_price_gap: float | None
    seam_normalized_gap: float | None


def third_friday(year: int, month: int) -> date:
    fridays = [
        date(year, month, day)
        for day in range(1, calendar.monthrange(year, month)[1] + 1)
        if date(year, month, day).weekday() == 4
    ]
    return fridays[2]


def trade_date_for_timestamp(value: datetime) -> date:
    return value.date() + timedelta(days=1) if value.time() >= time(18, 0) else value.date()


def build_windows(start_year: int, end_year: int) -> tuple[QuarterWindow, ...]:
    if start_year > end_year:
        raise ValueError("start year must not be after end year")
    windows = []
    for year in range(start_year, end_year + 1):
        for quarter, month in enumerate(QUARTER_MONTHS, start=1):
            expiry = third_friday(year, month)
            windows.append(QuarterWindow(
                year=year,
                quarter=quarter,
                expiry_date=expiry,
                baseline_start=expiry - timedelta(days=35),
                baseline_end=expiry - timedelta(days=10),
                audit_start=expiry - timedelta(days=8),
                audit_end=expiry,
            ))
    return tuple(windows)


def classify_risk(
    bar_ratio: float,
    volume_ratio: float,
    thresholds: AuditThresholds = AuditThresholds(),
) -> tuple[str, tuple[str, ...]]:
    reasons = []
    if bar_ratio < thresholds.red_bar_ratio:
        reasons.append("bar_count_deficit")
    elif bar_ratio < thresholds.amber_bar_ratio:
        reasons.append("moderate_bar_count_deficit")
    if volume_ratio < thresholds.red_volume_ratio:
        reasons.append("severe_volume_drop")
    elif volume_ratio < thresholds.amber_volume_ratio:
        reasons.append("volume_drop")
    if bar_ratio < thresholds.red_bar_ratio and volume_ratio < thresholds.red_volume_ratio:
        return "red", tuple(reasons)
    if bar_ratio < thresholds.amber_bar_ratio or volume_ratio < thresholds.amber_volume_ratio:
        return "amber", tuple(reasons)
    return "green", tuple(reasons)


def infer_seam(candidates: list[SeamCandidate]) -> SeamEvidence | None:
    if not candidates:
        return None

    def candidate_score(candidate: SeamCandidate) -> float:
        normalized = candidate.price_gap / max(candidate.typical_gap, 0.25)
        return normalized if candidate.kind == "midnight_contiguous" else normalized * 0.25

    selected = max(candidates, key=candidate_score)
    normalized = selected.price_gap / max(selected.typical_gap, 0.25)
    ticks = selected.price_gap / 0.25
    if selected.kind == "midnight_contiguous" and ticks >= 16 and normalized >= 8:
        confidence = "high"
    elif selected.kind == "midnight_contiguous" and ticks >= 8 and normalized >= 4:
        confidence = "medium"
    elif selected.price_gap > 0:
        confidence = "low"
    else:
        confidence = "none"
    return SeamEvidence(
        ts=selected.ts,
        price_gap=selected.price_gap,
        normalized_gap=normalized,
        kind=selected.kind,
        confidence=confidence,
    )


def build_quarter_audit(
    window: QuarterWindow,
    sessions: dict[date, SessionEvidence],
    seam: SeamEvidence | None,
    thresholds: AuditThresholds = AuditThresholds(),
) -> QuarterAudit:
    baseline = [
        evidence
        for trade_date, evidence in sessions.items()
        if window.baseline_start <= trade_date < window.baseline_end and trade_date.weekday() < 5
    ]
    audited = [
        evidence
        for trade_date, evidence in sessions.items()
        if window.audit_start <= trade_date <= window.audit_end and trade_date.weekday() < 5
    ]
    seam_trade_date = trade_date_for_timestamp(seam.ts) if seam else None
    if seam_trade_date is not None:
        post_seam = sorted(
            (evidence for evidence in audited if evidence.trade_date >= seam_trade_date),
            key=lambda evidence: evidence.trade_date,
        )
        if post_seam:
            audited = post_seam[:2]
    if len(baseline) < 5 or not audited:
        return QuarterAudit(
            year=window.year,
            quarter=window.quarter,
            expiry_date=window.expiry_date,
            baseline_session_count=len(baseline),
            baseline_median_bars=None,
            baseline_median_volume=None,
            seam_trade_date=seam_trade_date,
            evaluated_session_count=len(audited),
            weakest_trade_date=None,
            weakest_bar_count=None,
            weakest_volume=None,
            bar_ratio=None,
            volume_ratio=None,
            risk="unscored",
            requires_raw_contract_review=True,
            reasons=("insufficient_continuous_evidence",),
            inferred_seam_at=seam.ts if seam else None,
            seam_kind=seam.kind if seam else None,
            seam_confidence=seam.confidence if seam else "none",
            seam_price_gap=seam.price_gap if seam else None,
            seam_normalized_gap=seam.normalized_gap if seam else None,
        )

    median_bars = float(statistics.median(item.bar_count for item in baseline))
    median_volume = float(statistics.median(item.volume for item in baseline))
    if median_bars <= 0 or median_volume <= 0:
        raise ValueError(f"{window.year} Q{window.quarter} has a non-positive baseline")

    ranked = []
    for evidence in audited:
        bar_ratio = evidence.bar_count / median_bars
        volume_ratio = evidence.volume / median_volume
        ranked.append((min(bar_ratio, volume_ratio), evidence.trade_date, evidence, bar_ratio, volume_ratio))
    _, _, weakest, bar_ratio, volume_ratio = min(ranked, key=lambda row: (row[0], row[1]))
    risk, reasons = classify_risk(bar_ratio, volume_ratio, thresholds)
    return QuarterAudit(
        year=window.year,
        quarter=window.quarter,
        expiry_date=window.expiry_date,
        baseline_session_count=len(baseline),
        baseline_median_bars=median_bars,
        baseline_median_volume=median_volume,
        seam_trade_date=seam_trade_date,
        evaluated_session_count=len(audited),
        weakest_trade_date=weakest.trade_date,
        weakest_bar_count=weakest.bar_count,
        weakest_volume=weakest.volume,
        bar_ratio=bar_ratio,
        volume_ratio=volume_ratio,
        risk=risk,
        requires_raw_contract_review=risk != "green",
        reasons=reasons,
        inferred_seam_at=seam.ts if seam else None,
        seam_kind=seam.kind if seam else None,
        seam_confidence=seam.confidence if seam else "none",
        seam_price_gap=seam.price_gap if seam else None,
        seam_normalized_gap=seam.normalized_gap if seam else None,
    )


def _sql_path(path: Path) -> str:
    return str(path).replace("'", "''")


def _source_view_sql(source_path: Path) -> str:
    return f"""
select cast(datetime as timestamp) as ts,
       cast(open as double) as o,
       cast(high as double) as h,
       cast(low as double) as l,
       cast(close as double) as c,
       cast(volume as bigint) as v
from read_csv('{_sql_path(source_path)}', header=true, auto_detect=true)
""".strip()


def inspect_source(source_path: Path | str) -> dict[str, object]:
    source = Path(source_path).expanduser().resolve()
    if not source.is_file():
        raise ValueError(f"continuous source CSV not found: {source}")
    with duckdb.connect() as connection:
        connection.execute(f"create temp view legacy_continuous as {_source_view_sql(source)}")
        row = connection.execute("""
select count(*) as row_count,
       count(distinct ts) as distinct_timestamps,
       min(ts) as first_ts,
       max(ts) as last_ts,
       sum(v) as total_volume,
       count(*) filter (where v is null) as null_volume_rows,
       count(*) filter (where v = 0) as zero_volume_rows,
       count(*) filter (where v < 0) as negative_volume_rows
from legacy_continuous
""".strip()).fetchone()
    evidence = {
        "source": str(source),
        "rows": int(row[0]),
        "distinctTimestamps": int(row[1]),
        "firstTs": row[2],
        "lastTs": row[3],
        "totalVolume": int(row[4]),
        "nullVolumeRows": int(row[5]),
        "zeroVolumeRows": int(row[6]),
        "negativeVolumeRows": int(row[7]),
    }
    if evidence["rows"] != evidence["distinctTimestamps"]:
        raise ValueError("continuous source contains duplicate timestamps")
    if evidence["nullVolumeRows"] or evidence["negativeVolumeRows"]:
        raise ValueError("continuous source contains invalid volume rows")
    return evidence


def _window_values(windows: tuple[QuarterWindow, ...]) -> str:
    return ",".join(
        "(" + ",".join([
            str(window.year),
            str(window.quarter),
            f"date '{window.audit_start.isoformat()}'",
            f"date '{window.audit_end.isoformat()}'",
        ]) + ")"
        for window in windows
    )


def _load_sessions(source: Path) -> dict[date, SessionEvidence]:
    with duckdb.connect() as connection:
        connection.execute(f"create temp view legacy_continuous as {_source_view_sql(source)}")
        rows = connection.execute("""
select case
         when cast(ts as time) >= time '18:00' then cast(ts as date) + 1
         else cast(ts as date)
       end as trade_date,
       count(*) as bar_count,
       sum(v) as total_volume
from legacy_continuous
group by 1
order by 1
""".strip()).fetchall()
    return {
        row[0]: SessionEvidence(row[0], int(row[1]), int(row[2]))
        for row in rows
    }


def _load_seams(
    source: Path,
    windows: tuple[QuarterWindow, ...],
) -> dict[tuple[int, int], SeamEvidence]:
    values = _window_values(windows)
    with duckdb.connect() as connection:
        connection.execute(f"create temp view legacy_continuous as {_source_view_sql(source)}")
        rows = connection.execute(f"""
with windows(year_number, quarter_number, audit_start, audit_end) as (
  values {values}
), ordered as (
  select ts,
         o,
         lag(c) over (order by ts) as previous_close,
         lag(ts) over (order by ts) as previous_ts
  from legacy_continuous
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
""".strip()).fetchall()
    grouped: dict[tuple[int, int], list[SeamCandidate]] = {}
    for row in rows:
        key = (int(row[0]), int(row[1]))
        grouped.setdefault(key, []).append(SeamCandidate(
            ts=row[2],
            previous_ts=row[3],
            price_gap=float(row[4]),
            typical_gap=float(row[5]),
            kind=str(row[6]),
        ))
    return {
        key: seam
        for key, candidates in grouped.items()
        if (seam := infer_seam(candidates)) is not None
    }


def audit_continuous_source(
    source_path: Path | str,
    *,
    start_year: int | None = None,
    end_year: int | None = None,
    thresholds: AuditThresholds = AuditThresholds(),
) -> dict[str, object]:
    source = Path(source_path).expanduser().resolve()
    source_evidence = inspect_source(source)
    first_ts = source_evidence["firstTs"]
    last_ts = source_evidence["lastTs"]
    assert isinstance(first_ts, datetime) and isinstance(last_ts, datetime)
    first_year = start_year if start_year is not None else first_ts.year
    last_year = end_year if end_year is not None else last_ts.year
    windows = build_windows(first_year, last_year)
    sessions = _load_sessions(source)
    last_trade_date = trade_date_for_timestamp(last_ts)
    complete_windows = tuple(window for window in windows if window.expiry_date <= last_trade_date)
    seams = _load_seams(source, complete_windows) if complete_windows else {}
    audits = [
        build_quarter_audit(window, sessions, seams.get((window.year, window.quarter)), thresholds)
        for window in complete_windows
    ]
    risk_counts = {
        risk: sum(1 for item in audits if item.risk == risk)
        for risk in ("red", "amber", "green", "unscored")
    }
    return {
        "ok": True,
        "mode": "read-only-risk-prescreen",
        "authority": "continuous-volume-is-diagnostic-not-roll-confirmation",
        "sourceEvidence": source_evidence,
        "thresholds": asdict(thresholds),
        "quartersScanned": len(audits),
        "riskCounts": risk_counts,
        "rawContractReviews": sum(1 for item in audits if item.requires_raw_contract_review),
        "audits": [asdict(item) for item in audits],
    }
