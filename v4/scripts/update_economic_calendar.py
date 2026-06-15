#!/usr/bin/env python3
"""Dry-run or update V4 USD economic calendar data.

Default mode is read-only. Writes require both `--write` and
`--confirm-write`.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ECONOMIC_CALENDAR_CSV = V4_ROOT / "data" / "economic_calendar" / "economic_calendar_usd_events.csv"


@dataclass(frozen=True)
class MonthSelector:
    year: int
    month: int
    input_value: str

    @property
    def slug(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"

    @property
    def forex_factory_selector(self) -> str:
        return f"{calendar.month_abbr[self.month].lower()}.{self.year:04d}"

    @property
    def display_name(self) -> str:
        return f"{calendar.month_name[self.month]} {self.year:04d}"


def parse_month_selector(value: str, *, today: date | None = None) -> MonthSelector:
    today = today or date.today()
    text = str(value or "").strip().lower()
    if text == "this":
        return MonthSelector(today.year, today.month, text)
    if text == "next":
        year = today.year + (1 if today.month == 12 else 0)
        month = 1 if today.month == 12 else today.month + 1
        return MonthSelector(year, month, text)

    match = re.fullmatch(r"(\d{4})-(\d{2})", text)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        if month < 1 or month > 12:
            raise ValueError(f"invalid month selector {value!r}: month must be 01-12")
        return MonthSelector(year, month, text)

    raise ValueError(f"invalid month selector {value!r}: expected YYYY-MM, this, or next")


def iter_month_selectors(start: date, end: date) -> list[MonthSelector]:
    if end < start:
        raise ValueError("end date must be on or after start date")
    selectors: list[MonthSelector] = []
    year = start.year
    month = start.month
    while (year, month) <= (end.year, end.month):
        selectors.append(MonthSelector(year, month, f"{year:04d}-{month:02d}"))
        if month == 12:
            year += 1
            month = 1
        else:
            month += 1
    return selectors


def main() -> int:
    print("economic_calendar_status: not implemented")
    print("implemented_step: month selector support")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
