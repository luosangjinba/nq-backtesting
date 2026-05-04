# NQ Futures Backtesting System — Technical Reference

**Version:** V2
**Last Updated:** 2026-05-01
**Status:** Active Development

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Reference](#4-api-reference)
5. [Scripts Reference](#5-scripts-reference)
6. [Frontend Components](#6-frontend-components)
7. [Data Dictionary](#7-data-dictionary)
8. [Development Guidelines](#8-development-guidelines)

---

## 1. System Overview

### 1.1 Purpose

A structured historical review system for NQ mini futures intraday trading using ICT (Inner Circle Trader) methodology. The system focuses on the **9:29 snapshot → 9:30-10:30 ET** research window.

### 1.2 Core Principles

| Principle | Description |
|-----------|-------------|
| **Time First** | Time is a first-class variable, higher priority than price |
| **Record Facts First** | Record what happened before making predictions |
| **Semi-Automation** | Programs compute, humans judge |
| **YAML as Truth** | Layer 2 uses YAML as source of truth, DuckDB for comparison |

### 1.3 Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | DuckDB | Embedded analytical DB, single-file |
| Backend | Python 3.11+ | Built-in `http.server`, no framework |
| Frontend | HTML + React + Tailwind | Single-file SPAs, offline-capable |
| Data Format | YAML | Human-readable, git-friendly |

### 1.4 File Inventory

```
backtesting/
├── trading_data.duckdb          # V1: 1-minute OHLCV data (~5.9M rows, 460MB)
├── price_lookup_api.py          # Backend API server (2358 lines)
├── duckdb_schema.sql            # V1 schema
├── duckdb_import_nq_1m.py       # Data import script
├── v2/
│   ├── data/
│   │   ├── v2_research.duckdb   # V2: PDA registry (~147K rows, 130MB)
│   │   ├── restore_points/      # Database snapshots
│   │   ├── pda/                 # YAML samples
│   │   └── structure/           # Structure path samples
│   ├── schema/
│   │   ├── pda_registry.sql     # PDA static registry
│   │   ├── pda_events.sql       # PDA event stream
│   │   ├── pda_members.sql      # EQH/EQL member links
│   │   ├── reference_groups.sql # Grouped price levels
│   │   └── pd_extremes.sql      # Session extremes
│   ├── scripts/
│   │   ├── scan_layer1_pda.py   # PDA scanner (30KB)
│   │   ├── check_pda_scan.py    # Validation checks
│   │   ├── build_pd_extremes.py # Session extremes builder
│   │   ├── build_reference_groups.py # Reference group builder
│   │   ├── auto_tag_short_pivots.py  # Short pivot tagger
│   │   ├── build_ict_midnight_daily_points.py # ICT midnight points
│   │   └── backfill_occurrence_time.py # Occurrence time backfill
│   └── docs/
│       ├── layer2_recorder_v2.html  # Main UI (2748 lines)
│       ├── pda_review.html          # PDA review UI (1742 lines)
│       ├── SPEC.md                  # V2 specification
│       └── STRUCTURE_PATH_SPEC.md   # Layer 2 spec
└── architect/                   # Design documents (legacy)
```

---

## 2. Architecture

### 2.1 Three-Layer Data Model

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: PDA Registry (Long-lived, cross-day)               │
│ - Static registry: pda_registry (147K rows)                 │
│ - Event stream: pda_events (0 rows, ready for use)          │
│ - Member links: pda_members (for EQH/EQL)                   │
│ - Session extremes: pd_extremes (32K rows)                  │
│ - Reference groups: reference_groups (40K groups)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Structure Path Recorder                            │
│ - 1H backbone + 30M NY Open lens (09:30-11:00)             │
│ - Records: paths, groups, manual PDAs                      │
│ - Storage: YAML files (truth source)                       │
│ - DuckDB: read-only for comparison/matching                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Daily Journal (Per-day YAML)                       │
│ - References Layer 1/2, does not duplicate                 │
│ - Session observations, 9:30 expectations, results         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1-minute OHLCV (trading_data.duckdb)
         │
         ▼ scan_layer1_pda.py
┌─────────────────────┐
│ pda_registry        │ ←── Manual review (pda_review.html)
│ pda_events          │
│ pd_extremes         │
│ reference_groups    │
└─────────────────────┘
         │
         ▼ API endpoints
┌─────────────────────┐
│ layer2_recorder     │ ←── Manual path recording
│ (YAML + matching)   │
└─────────────────────┘
         │
         ▼ Export
┌─────────────────────┐
│ Daily Journal YAML  │
└─────────────────────┘
```

---

## 3. Database Schema

### 3.1 V1 Database: `trading_data.duckdb`

#### Table: `futures_1m` (5,906,274 rows)

| Column | Type | Description |
|--------|------|-------------|
| instrument | VARCHAR | Instrument symbol (e.g., "NQ") |
| ts | TIMESTAMP | Bar start time (UTC) |
| open | DOUBLE | Opening price |
| high | DOUBLE | Highest price |
| low | DOUBLE | Lowest price |
| close | DOUBLE | Closing price |
| volume | BIGINT | Volume |

**Index:** `(instrument, ts)`

### 3.2 V2 Database: `v2/data/v2_research.duckdb`

#### Table: `pda_registry` (147,155 rows)

Primary table for Price Delivery Area records.

| Column | Type | Description |
|--------|------|-------------|
| pda_id | VARCHAR PK | Unique identifier (e.g., `pda_20080102_D_daily_high_001`) |
| instrument | VARCHAR | Instrument symbol |
| timeframe | VARCHAR | D / 4H / 1H / 30M / 15M |
| pda_type | VARCHAR | bsl / ssl / fvg / daily_high / daily_low / ndog / nwog / eqh / eql / ict_midnight_day_high / ict_midnight_day_low |
| direction | VARCHAR | bullish / bearish / neutral / NULL |
| trade_date | DATE | Trading session date (18:00-based) |
| anchor_time | TIMESTAMP | Bar bucket start time |
| occurrence_time | TIMESTAMP | First 1m touch of extreme price |
| confirm_time | TIMESTAMP | Confirmation bar time (for bsl/ssl) |
| status | VARCHAR | active / archived / deleted_by_review |
| manual_added | BOOLEAN | True if manually added |
| manual_edited | BOOLEAN | True if manually edited |
| price | DOUBLE | Point price (for bsl/ssl) |
| price_high | DOUBLE | Upper boundary |
| price_low | DOUBLE | Lower boundary |
| price_ce | DOUBLE | Consequent encroachment (midpoint) |
| registry_status | VARCHAR | active / archived |
| source | VARCHAR | auto_scan / manual_add / auto_ict_midnight_scan |
| review_role | VARCHAR | Classification (see below) |
| note | VARCHAR | Free-form notes |

**Review Roles:**
- `unclassified` - Not yet reviewed
- `daily_high` / `daily_low` - Daily session extremes
- `ict_midnight_day_high` / `ict_midnight_day_low` - Calendar day extremes
- `d_short_high` / `d_short_low` - Daily short-term pivot
- `h4_short_high` / `h4_short_low` - 4H short-term pivot
- `h1_short_high` / `h1_short_low` - 1H short-term pivot

**Indexes:**
- `(instrument, timeframe, registry_status)`
- `(created_date)`
- `(trade_date)`
- `(pda_type, direction)`

#### Table: `pda_events` (0 rows)

Event stream for PDA lifecycle tracking.

| Column | Type | Description |
|--------|------|-------------|
| event_id | VARCHAR PK | Unique event ID |
| pda_id | VARCHAR FK | Reference to pda_registry |
| instrument | VARCHAR | Instrument symbol |
| timeframe | VARCHAR | Timeframe |
| event_type | VARCHAR | tapped / partially_filled / filled / invalidated / respected / ignored |
| event_ts | TIMESTAMP | Event timestamp |
| event_date | DATE | Event date |
| event_price | DOUBLE | Price at event |
| reaction | VARCHAR | reversal / continuation / no_reaction / unknown |
| fill_ratio | DOUBLE | 0.0 - 1.0 |
| invalidation_reason | VARCHAR | body_close_through / structure_break / time_decay / manual |
| note | VARCHAR | Free-form notes |

#### Table: `pda_members` (not yet created in DB)

Links EQH/EQL to their component points.

| Column | Type | Description |
|--------|------|-------------|
| pda_id | VARCHAR | Parent PDA ID |
| member_type | VARCHAR | pda / pd_extreme / manual_ref |
| member_ref | VARCHAR | Reference to member |
| role | VARCHAR | Optional role |
| note | VARCHAR | Free-form notes |

**Primary Key:** `(pda_id, member_type, member_ref)`

#### Table: `pd_extremes` (32,042 rows)

Session-level high/low extremes.

| Column | Type | Description |
|--------|------|-------------|
| instrument | VARCHAR | Instrument symbol |
| trade_date | DATE | Trading session date |
| session_name | VARCHAR | asia / ldn / transition / premarket / ny_am / ny_lunch / ny_pm |
| window_start | TIMESTAMP | Session start time |
| window_end | TIMESTAMP | Session end time |
| high_price | DOUBLE | Session high |
| high_time | TIMESTAMP | Time of high |
| low_price | DOUBLE | Session low |
| low_time | TIMESTAMP | Time of low |
| source | VARCHAR | auto_scan |
| note | VARCHAR | Free-form notes |

**Primary Key:** `(instrument, trade_date, session_name)`

**Session Windows (minutes from 18:00 session start):**

| Session | Start | End | Wall Clock (ET approx) |
|---------|-------|-----|------------------------|
| asia | 0 | 480 | 18:00 - 02:00 |
| ldn | 480 | 660 | 02:00 - 05:00 |
| transition | 660 | 780 | 05:00 - 07:00 |
| premarket | 780 | 930 | 07:00 - 09:30 |
| ny_am | 930 | 1080 | 09:30 - 12:30 |
| ny_lunch | 1080 | 1170 | 12:30 - 14:00 |
| ny_pm | 1170 | 1380 | 14:00 - 17:00 |

#### Table: `reference_groups` (39,945 rows)

Groups multiple PDA/pd_extreme records at the same (time, price, side).

| Column | Type | Description |
|--------|------|-------------|
| group_id | VARCHAR PK | e.g., `rg_NQ_20160328_0918_high_4414p5` |
| instrument | VARCHAR | Instrument symbol |
| trade_date | DATE | Trading session date |
| event_time | TIMESTAMP | Event timestamp |
| price | DOUBLE | Price level |
| side | VARCHAR | high / low |
| member_count | INTEGER | Total members |
| pda_count | INTEGER | PDA members |
| pd_extreme_count | INTEGER | pd_extreme members |
| timeframes | VARCHAR | Comma-separated timeframes |
| roles | VARCHAR | Comma-separated roles |
| source | VARCHAR | auto_group |
| note | VARCHAR | Free-form notes |

#### Table: `reference_group_members` (123,561 rows)

Individual members within reference groups.

| Column | Type | Description |
|--------|------|-------------|
| group_id | VARCHAR FK | Reference to reference_groups |
| member_type | VARCHAR | pda / pd_extreme |
| member_ref | VARCHAR | e.g., `pda_xxx` or `pdext:NQ:2024-01-01:asia:high` |
| instrument | VARCHAR | Instrument symbol |
| trade_date | DATE | Trading session date |
| event_time | TIMESTAMP | Event timestamp |
| price | DOUBLE | Price level |
| side | VARCHAR | high / low |
| timeframe | VARCHAR | Timeframe |
| pda_type | VARCHAR | PDA type |
| review_role | VARCHAR | Review role |
| session_name | VARCHAR | Session name (for pd_extreme) |
| label | VARCHAR | Display label |
| source | VARCHAR | auto_group |

**Primary Key:** `(group_id, member_type, member_ref)`

---

## 4. API Reference

**Base URL:** `http://127.0.0.1:8765`
**Response Format:** `{ "ok": true, "result": {...} }` or `{ "ok": false, "error": "..." }`

### 4.1 V1 Price Endpoints

#### GET `/health`

Health check with database connectivity.

**Response:**
```json
{
  "ok": true,
  "result": {
    "status": "ok",
    "v2Ready": true
  }
}
```

#### GET `/price`

Query OHLC price for a specific time window.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| date | required | YYYY-MM-DD |
| time | required | HH:MM |
| tf | 1 | Timeframe in minutes |
| field | close | open / high / low / close |
| fallback | none | none / prev |
| max_lookback | 0 | Max lookback minutes |

**Response:**
```json
{
  "ok": true,
  "result": {
    "value": 2345.25,
    "ohlc": { "open": 2344.0, "high": 2346.0, "low": 2343.5, "close": 2345.25 }
  }
}
```

#### GET `/htf_bar`

Get a single higher-timeframe bar (daily/weekly/monthly).

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| date | required | YYYY-MM-DD |
| tf | daily | daily / weekly / monthly |

#### GET `/htf_bars`

Get a range of higher-timeframe bars.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| date_from | required | Start date |
| date_to | required | End date |
| tf | daily | daily / weekly / monthly |

### 4.2 V2 PDA Endpoints

#### GET `/v2/pda_records`

List PDA records with filtering.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| timeframe | all | D / 4H / 1H / 30M / 15M |
| type | all | Repeatable, pda_type filter |
| review_role | all | Review role filter |
| date_from | none | Start date |
| date_to | none | End date |
| limit | 200 | Max 1000 |

**Response:**
```json
{
  "ok": true,
  "result": {
    "records": [
      {
        "pdaId": "pda_20080102_D_daily_high_001",
        "instrument": "NQ",
        "timeframe": "D",
        "pdaType": "daily_high",
        "direction": null,
        "tradeDate": "2008-01-02",
        "anchorTime": "2008-01-01 18:00:00",
        "occurrenceTime": "2008-01-02 06:06:00",
        "price": 2117.0,
        "priceHigh": 2117.0,
        "priceLow": 2117.0,
        "reviewRole": "daily_high",
        "source": "auto_scan"
      }
    ]
  }
}
```

#### GET `/v2/pda_neighbors`

Get neighboring bars around a PDA's anchor time.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| pda_id | required | PDA identifier |
| before | 3 | Bars before (max 20) |
| after | 3 | Bars after (max 20) |

#### GET `/v2/pda_match`

Find PDAs matching a given time+price within tolerance.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| timeframe | required | D / 4H / 1H / 30M / 15M |
| pda_type | all | PDA type filter |
| event_time | required | YYYY-MM-DD HH:MM |
| price | required | Price to match |
| time_tolerance_bars | 1 | Time tolerance in bars |
| price_tolerance_ticks | 2 | Price tolerance in ticks (0.25) |
| limit | 20 | Max 200 |

**Response includes match scoring:**
```json
{
  "ok": true,
  "result": {
    "candidates": [
      {
        "pdaId": "...",
        "matchKind": "exact",  // exact / near / weak
        "matchScore": 1.0,
        "deltaMinutes": 0,
        "deltaPrice": 0.0
      }
    ]
  }
}
```

#### GET `/v2/pd_extremes`

Query session extremes.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| date_from | none | Start date |
| date_to | none | End date |
| session_name | all | Session name filter |

#### GET `/v2/reference_groups`

List reference groups with members.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| instrument | NQ | Instrument symbol |
| date_from | none | Start date |
| date_to | none | End date |
| side | all | high / low |
| limit | 500 | Max 2000 |

#### GET `/v2/reference_groups_for_members`

Look up which groups contain given member references.

**Parameters:**
| Name | Default | Description |
|------|---------|-------------|
| member_ref | required | Repeatable/comma-separated |

### 4.3 V2 Write Endpoints

#### POST `/v2/pda_review`

Update PDA review role and/or note.

**Body:**
```json
{
  "pdaId": "pda_xxx",
  "reviewRole": "d_short_high",  // optional
  "note": "Updated after review"  // optional
}
```

#### POST `/v2/pda_manual_add`

Manually create a new PDA record.

**Body:**
```json
{
  "instrument": "NQ",
  "timeframe": "1H",
  "pdaType": "bsl",
  "direction": "",
  "anchorTime": "2012-01-10 09:30",
  "confirmTime": "2012-01-10 10:00",  // optional, for bsl/ssl
  "price": 2363.50,
  "priceHigh": null,
  "priceLow": null,
  "note": "",
  "memberRefs": []  // for eqh/eql
}
```

#### POST `/v2/pda_delete`

Delete a PDA record and its members.

**Body:**
```json
{
  "pdaId": "pda_xxx"
}
```

### 4.4 Restore Point Endpoints

#### GET `/v2/restore_points`

List all restore points.

#### POST `/v2/restore_points`

Create a new restore point.

**Body:**
```json
{
  "note": "Before batch review"
}
```

#### POST `/v2/restore_points/restore`

Restore from a restore point (auto-creates pre-restore snapshot).

**Body:**
```json
{
  "restorePointId": "rp_20260420_193130_7a5c44"
}
```

### 4.5 Image Endpoints

#### POST `/upload-image`

Upload an image for a given date.

**Body:** multipart/form-data
- `file`: Image file
- `date`: YYYY-MM-DD
- `section`: Optional section name
- `title`: Optional title

**Response:**
```json
{
  "ok": true,
  "result": {
    "url": "/backtesting-images/2012/2012-01-05/entry-xxx.png",
    "path": "backtesting-images/2012/2012-01-05/entry-xxx.png"
  }
}
```

#### GET `/backtesting-images/<path>`

Serve uploaded images (with path traversal protection).

### 4.6 OCR Endpoint

#### POST `/v2/date_time_ocr`

OCR extract datetime from an image.

**Body:** multipart/form-data with `file`

**Response:**
```json
{
  "ok": true,
  "result": {
    "text": "Mon 15 Jan '24 09:30",
    "output": "2024-01-15 09:30"
  }
}
```

---

## 5. Scripts Reference

### 5.1 scan_layer1_pda.py

**Purpose:** Full Layer-1 mechanical scan of PDAs from 1-minute data.

**PDA Types Scanned:**

| Type | Timeframes | Detection Logic |
|------|------------|-----------------|
| daily_high / daily_low | D only | One per daily bar |
| bsl / ssl | D, 4H, 1H, 15M | Swing detection with left/right bars |
| fvg | D, 4H, 1H | Three-bar gap pattern |
| ndog / nwog | D only | Session gap (16:59 close → 18:00 open) |

**Swing Rules:**
| Timeframe | Left | Right |
|-----------|------|-------|
| D | 1 | 1 |
| 4H | 2 | 2 |
| 1H | 3 | 3 |
| 15M | 4 | 4 |

**Usage:**
```bash
python3 v2/scripts/scan_layer1_pda.py \
  --source-db trading_data.duckdb \
  --target-db v2/data/v2_research.duckdb \
  --instrument NQ \
  --timeframes D,4H,1H \
  --date-from 2008-01-01 \
  --date-to 2024-12-31 \
  --replace
```

### 5.2 check_pda_scan.py

**Purpose:** Validation checks for PDA registry.

**Checks:**
- Counts by PDA type and timeframe
- FVG should not have confirm_time
- BSL/SSL should have confirm_time
- NDOG/NWOG anchor should be at 18:00

### 5.3 build_pd_extremes.py

**Purpose:** Build session-level high/low extremes.

**Usage:**
```bash
python3 v2/scripts/build_pd_extremes.py \
  --source-db trading_data.duckdb \
  --target-db v2/data/v2_research.duckdb \
  --instrument NQ \
  --replace
```

### 5.4 build_reference_groups.py

**Purpose:** Group multiple PDA/pd_extreme records at same (time, price, side).

**Usage:**
```bash
python3 v2/scripts/build_reference_groups.py \
  --db v2/data/v2_research.duckdb \
  --instrument NQ \
  --min-members 2 \
  --replace
```

### 5.5 auto_tag_short_pivots.py

**Purpose:** Generate short-pivot suggestions from bsl/ssl candidates.

**Logic:**
1. Group consecutive same-type candidates into runs
2. Select winner: highest price for BSL, lowest for SSL
3. Assign review_role based on timeframe

**Output:** Separate DuckDB (non-destructive)

### 5.6 build_ict_midnight_daily_points.py

**Purpose:** Build ICT midnight-day high/low (calendar day 00:00-23:59).

### 5.7 backfill_occurrence_time.py

**Purpose:** Backfill occurrence_time for existing PDA records.

---

## 6. Frontend Components

### 6.1 pda_review.html

**Purpose:** Layer 1 PDA review and classification.

**Layout:** 2-column (filter list + detail)

**Features:**
- Filter by timeframe, PDA type, review role, date range
- View record details and neighbor bars
- Compact candlestick chart for verification
- Submit review role and notes
- Manual PDA add (BSL/SSL/FVG)
- EQH/EQL builder from selected records
- Session extremes lookup
- Restore point management

**API Calls:**
- GET `/v2/pda_records`
- GET `/v2/pda_neighbors`
- GET `/v2/pd_extremes`
- GET/POST `/v2/restore_points`
- POST `/v2/pda_review`
- POST `/v2/pda_manual_add`
- POST `/v2/pda_delete`

### 6.2 layer2_recorder_v2.html

**Purpose:** Layer 2 structure path recording.

**Layout:** 3-column (Manual PDA + YAML Preview + Compare)

**Features:**
- Path recording with metadata
- Manual PDA entry (BSL/SSL/FVG/OB/EQH/EQL)
- Auto-fetch prices from API
- Match manual PDAs against auto records
- Group multiple paths
- YAML import/export
- localStorage persistence

**State Management:**
- Single global state object
- localStorage key: `layer2_recorder_v2_draft_v1`
- Full re-render on changes

**YAML Structure:**
```yaml
date: "2012-01-10"
instrument: "NQ"

structure_paths:
  - id: "path_20120110_001"
    start_time: "2012-01-10 09:30"
    end_time: "2012-01-10 10:30"
    primary_timeframe: "1H"
    direction: "bullish"
    role: "primary"
    main_actions: [...]
    manual_pdas: [...]

structure_groups:
  - group_id: "group_20120110_001"
    member_paths: ["path_20120110_001"]
```

---

## 7. Data Dictionary

### 7.1 PDA Types

| Type | Full Name | Description |
|------|-----------|-------------|
| bsl | Buy Side Liquidity | Swing high, liquidity above |
| ssl | Sell Side Liquidity | Swing low, liquidity below |
| fvg | Fair Value Gap | Three-bar price gap |
| daily_high | Daily High | Futures session high (18:00-16:59) |
| daily_low | Daily Low | Futures session low |
| ict_midnight_day_high | ICT Midnight Day High | Calendar day high (00:00-23:59) |
| ict_midnight_day_low | ICT Midnight Day Low | Calendar day low |
| ndog | New Day Opening Gap | 16:59 close → 18:00 open |
| nwog | New Week Opening Gap | Friday close → Monday open |
| eqh | Equal Highs | Multiple highs at same level |
| eql | Equal Lows | Multiple lows at same level |

### 7.2 Session Names

| Session | Time (ET) | Description |
|---------|-----------|-------------|
| asia | 18:00-02:00 | Asian session |
| ldn | 02:00-05:00 | London session |
| transition | 05:00-07:00 | Transition period |
| premarket | 07:00-09:30 | US premarket |
| ny_am | 09:30-12:30 | NY morning |
| ny_lunch | 12:30-14:00 | NY lunch |
| ny_pm | 14:00-17:00 | NY afternoon |

### 7.3 Review Roles

| Role | Timeframe | PDA Type | Description |
|------|-----------|----------|-------------|
| unclassified | any | any | Not yet reviewed |
| daily_high | D | daily_high | Auto-assigned |
| daily_low | D | daily_low | Auto-assigned |
| ict_midnight_day_high | D | ict_midnight_day_high | Auto-assigned |
| ict_midnight_day_low | D | ict_midnight_day_low | Auto-assigned |
| d_short_high | D | bsl | Daily short-term high |
| d_short_low | D | ssl | Daily short-term low |
| h4_short_high | 4H | bsl | 4H short-term high |
| h4_short_low | 4H | ssl | 4H short-term low |
| h1_short_high | 1H | bsl | 1H short-term high |
| h1_short_low | 1H | ssl | 1H short-term low |

---

## 8. Development Guidelines

### 8.1 Adding New PDA Types

1. Add type to `pda_registry.sql` comments
2. Update `scan_layer1_pda.py` if auto-detectable
3. Update `price_lookup_api.py` constants:
   - `MANUAL_PDA_TYPES` if manually addable
   - `allowed_review_roles_for_record()` if classifiable
4. Update frontend forms

### 8.2 Adding New API Endpoints

1. Add validation function if needed
2. Add query function
3. Add route handler in `do_GET` / `do_POST`
4. Update this documentation

### 8.3 Database Migrations

The API auto-migrates `pda_registry` columns via `ensure_v2_registry_columns()`. For new tables:

1. Create schema file in `v2/schema/`
2. Add `ensure_table()` call in relevant script
3. Run script with `--replace` flag

### 8.4 Session Alignment

All timestamps use a **6-hour shift** for session alignment:
- 18:00 ET open maps to the next calendar date
- Use `session_date_from_timestamp()` for conversion
- SQL: `date_trunc('day', ts + interval '6 hour') - interval '6 hour'`

### 8.5 Testing

Before full-history scans:
1. Run `check_pda_scan.py` to validate
2. Create restore point via API or UI
3. Test on small date range first

---

## Appendix A: Quick Start

### Start API (Linux)
```bash
cd /home/leo/myworkspace/trading/backtesting
python3 price_lookup_api.py \
  --host 127.0.0.1 \
  --port 8765 \
  --db-file trading_data.duckdb \
  --table futures_1m \
  --v2-db-file v2/data/v2_research.duckdb
```

**All CLI Options:**
| Flag | Default | Description |
|------|---------|-------------|
| --host | 127.0.0.1 | Bind address |
| --port | 8765 | Bind port |
| --db-file | trading_data.duckdb | V1 1-minute data DB |
| --table | futures_1m | Table name in V1 DB |
| --v2-db-file | v2/data/v2_research.duckdb | V2 PDA registry DB |
| --v2-restore-dir | "" | Restore point directory (default: v2/data/restore_points) |
| --image-root | backtesting-images | Image upload directory |

### Start UI
```bash
# In another terminal
python3 -m http.server 8000
```

### Open Pages
- PDA Review: `http://127.0.0.1:8000/v2/docs/pda_review.html`
- Layer2 Recorder: `http://127.0.0.1:8000/v2/docs/layer2_recorder_v2.html`

### Health Check
```bash
curl http://127.0.0.1:8765/health
```

---

## Appendix B: Current Data Statistics

| Table | Rows | Date Range |
|-------|------|------------|
| futures_1m | 5,906,274 | 2005+ |
| pda_registry | 147,155 | 2008-01-02 ~ 2025-11-05 |
| pd_extremes | 32,042 | 2008+ |
| reference_groups | 39,945 | 2008-01-02 ~ 2025-11-05 |
| reference_group_members | 123,561 | - |

**PDA Registry by Type:**
| Type | Count |
|------|-------|
| bsl | 47,904 |
| ssl | 47,794 |
| fvg | 29,463 |
| daily_high | 4,611 |
| daily_low | 4,611 |
| ict_midnight_day_high | 4,278 |
| ict_midnight_day_low | 4,278 |
| ndog | 3,353 |
| nwog | 863 |

**PDA Registry by Timeframe:**
| Timeframe | Count |
|-----------|-------|
| 15M | 64,850 (bsl/ssl only) |
| 1H | 43,474 |
| 4H | 13,714 |
| D | 25,117 |
