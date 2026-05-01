---
name: ict-multi-timeframe-research
description: ICT futures trading research methodology for NQ futures - two-layer system (PDA Registry + Structure Path), god's eye view for rapid pattern accumulation
triggers:
  - nq backtesting v2
  - ict research system design
  - pda registry layer
  - structure path layer
  - ict trading research
---

# ICT Multi-Timeframe Research Methodology — V2

## Project Context

- **Path**: `/home/leo/myworkspace/trading/backtesting/v2/`
- **Data**: NQ 1-minute OHLCV, 2005–present (~5000 trading days)
- **Mode**: God Eye View (omniscient historical) for research, NOT pseudo-live training
- **Goal**: Pattern statistics with HTF structure as condition filter

## Core Premise

ICT core belief: Price moves in structure cycles — breakout → retracement → breakout → retracement → break of protected level → reclaim → repeat

All research is built on this foundation.

Research focuses on fixed time nodes (9:30 Judas Swing, 9:50–10:10, 10:30) which have sufficient samples across 20 years of data.

---

## Two-Layer Architecture

### Layer 1: PDA Registry — Pure Mechanical, No Judgment

**Principle: Layer 1 captures EVERYTHING. No filtering, no judgment.**

**What gets stored:**

| Type | Description | Method |
|------|-------------|--------|
| `swing_high` / `swing_low` | All candidate swing points | Left/right bar rules (D:1/2, 4H:2/2, 1H:3/3) |
| `fvg` | Fair Value Gap | Standard 3-candle definition |
| `vi` | Volume Imbalance | Adjacent candle gap |
| `nwog` | New Week Opening Gap | Fri 16:59 → Mon 18:00 |
| `ndog` | New Day Opening Gap | 16:59 → 18:00 next day |
| `bsl_candidate` / `ssl_candidate` | Potential liquidity sweep points | Mechanical rules only |
| `ce_candidate` | Potential OB completing end | Mechanical, may or may not be real OB |

**Critical: Layer 1 does NOT judge. BSL/SSL stored as candidates. Whether swept determined in Layer 2. Whether CE is real OB determined in Layer 2.**

**Output:** DuckDB tables indexed by instrument + timeframe + date.

### Layer 2: Structure Path — Human Judgment + Program辅助

**Principle: Layer 2 has the full candidate list from Layer 1. Makes ALL judgments.**

**What gets determined:**

1. **Structure paths (structural swings):**
   - Which swings form real HH/HL/LH/LL structure (vs noise)
   - Why did reversal happen — HTF PDA context (FVG / BSL / SSL / OB)
   - Relationship between reversal swing and previous swing
   - Destination (internal / external)
   - Outcome (reached / partially reached / failed)

2. **Non-structure paths (imbalance rejections):**
   - Which small retraces caused by HTF imbalance fills (FVG / VI / NWOG / NDOG)
   - These often create high-probability LTF trading opportunities
   - LTF = Lower Timeframe confirmation signals

3. **Path types:**
   - `internal_to_external`: internal low → external high
   - `external_to_internal`: external high → internal low
   - `internal_to_internal`: internal retrace only
   - `external_to_external`: break and continue beyond range
   - `imbalance_rejection`: small reversal due to imbalance fill

---

## How the Two Layers Solve Key Problems

### Problem: BSL/SSL Noise

"Obvious high/low" is subjective. In Layer 1, ALL candidates are stored. In Layer 2, human judges which were actually swept + rejected.

### Problem: OB Identification

OB's CE can only be identified after seeing the swing that creates it — but identifying that swing requires knowing where the OB is.

Solution: Layer 1 stores CE candidates mechanically. Layer 2 decides which are real OB with full swing context. Two layers are decoupled.

### Problem: Standard Drift

**Root cause: judgment criteria not externalized.**

Solution: Force-record "WHY this point matters" for every reversal:
- What HTF structure existed
- Why THIS point (not adjacent ones)
- HTF PDA confluence (multi-timeframe overlap IS an externalized reason)

---

## Research Workflow (God Eye View)

### Step 1: Establish HTF Context (Prior Knowledge)
- Active HTF PDAs (W/D/4H/1H) from Layer 1 database
- Current structure state
- Price location relative to HTF PDAs
- Mark zones where price may react

### Step 2: Observe What Actually Happens
- Did price reach marked zones?
- Upon touch, did it reverse or continue?

### Step 3: Record Immediately (Verify)
- Touched → reversed → effective reaction zone
- Touched → no reversal → ineffective zone
- Did not touch → structure not activated

### Step 4: Attribute (Layer 2 Structure Path)
- Classify by path type
- Record HTF PDA context
- Record reversal relationship to previous swing
- Record outcome

---

## PDA Recording: Separate by Timeframe, Correlate at Layer 2

### Do NOT merge/dedup PDAs across timeframes at Layer 1

Example:
```
pda_20241203_D_fvg_001     # D FVG, range [21100, 20950]
pda_20241204_4H_fvg_001    # 4H FVG, range [21020, 20970]  
pda_20241204_4H_fvg_002    # 4H FVG, range [20980, 20930]
pda_20241205_1H_hh_001    # 1H HH point
```

### At Layer 2, annotate confluence explicitly:

```yaml
reversal_zone:
  price_range: [20950, 21000]
  confluence:
    - pda_ref: "pda_20241203_D_fvg_001"
      timeframe: D
      note: "D FVG lower boundary"
    - pda_ref: "pda_20241204_4H_fvg_002"
      timeframe: 4H
      note: "4H FVG lower boundary"
    - pda_ref: "pda_20241205_1H_hh_001"
      timeframe: 1H
      note: "1H HH at same price"
```

---

## Execution Phases

### Phase 1: Layer 1 Database (Program,一次性做完)

```
1. Design DuckDB schema (pda_registry + pda_events)
2. Write swing_high/low scanner (by timeframe aggregation)
3. Write FVG/VI scanner
4. Write NWOG/NDOG scanner
5. Write BSL/SSL candidate scanner (mechanical rules only)
6. Batch scan 2005–present, load into DuckDB
```

### Phase 2: Layer 2 Structure Path (Human + Program辅助)

```
1. Define Structure Path YAML schema
2. Manually walk through 5-10 historical sessions to validate format
3. Iterate schema if needed
4. Begin formal recording
```

### Phase 3: Pattern Scanner (Based on Phase 2)

```
- Scan fixed time nodes: 9:30 Judas Swing, 9:50–10:10, 10:30
- Categorize by HTF context × price behavior × outcome
- Build pattern library with statistics
```

---

## Key Design Decisions

1. **Layer 1 = pure mechanical, Layer 2 = all judgment**
2. **OB judgment stays in Layer 2, not Layer 1**
3. **BSL/SSL filtered in Layer 2, not Layer 1**
4. **Dealing range selected manually, everything else calculated**
5. **Pattern scanner comes AFTER Structure Path is stable**
6. **No UI in Phase 1 — just DuckDB + scripts**
7. **God Eye View for research, pseudo-live only for isolated training**

## Related Files

- Schema: `v2/schema/pda_registry.sql`, `v2/schema/pda_events.sql`
- Specs: `v2/docs/SPEC.md`, `v2/docs/STRUCTURE_PATH_SPEC.md`
- Legacy: `architect/MEMO.md` (V1 context, do not expand)
