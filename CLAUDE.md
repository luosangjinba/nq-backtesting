# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

**Context:** Individual developer + AI Agent collaboration. All code is AI-assisted, focus on maintaining overall code quality rather than "who wrote what."

---

## Part 1: Behavioral Guidelines

Principles to reduce common LLM coding mistakes, adapted for individual developer + AI Agent scenarios.

### 1. Think Before Coding

**Don't assume. Surface tradeoffs. Push back when warranted.**

Before implementing:
- **State assumptions explicitly.** If uncertain about requirements, data structure, or approach, ask before coding.
- **Present multiple options when they exist.** If there are 2-3 reasonable approaches, list them with tradeoffs. Let the user choose.
- **Suggest simpler alternatives.** If you see a simpler way to achieve the goal, propose it. Don't silently pick the complex path.
- **Stop when confused.** If requirements are ambiguous or contradictory, name what's unclear and ask for clarification.

**Example:**
```
User: "Add caching to the API"

Good response:
"I see three approaches:
1. In-memory dict (simple, lost on restart)
2. Redis (persistent, needs setup)
3. DuckDB table (persistent, already in stack)

For this single-user local tool, option 3 seems best. Proceed?"

Bad response:
[Immediately implements Redis without asking]
```

---

### 2. Simplicity First

**Minimum code that solves the problem. No speculative features.**

- Write the simplest solution that works. If it can be done in 50 lines instead of 200, do that.
- No features beyond what was requested. Don't add "nice to have" functionality.
- No abstractions for single-use code. Three similar blocks don't need a shared function yet.
- No "flexibility" or "configurability" that wasn't asked for. YAGNI (You Aren't Gonna Need It).
- No error handling for impossible scenarios. Trust internal code; validate only at system boundaries.

**Self-check:** "Would a senior engineer say this is overcomplicated?" If yes, simplify.

**Example:**
```python
# Bad: Premature abstraction
class CacheManager:
    def __init__(self, backend='memory', ttl=3600, max_size=1000):
        self.backend = self._init_backend(backend)
      # ... 50 lines of configuration

# Good: Solve the actual problem
cache = {}  # Simple dict for now, optimize if needed
```

---

### 3. Intentional Changes

**Every change should have a clear reason. Refactor with purpose, not by habit.**

When editing existing code:
- **Change only what's necessary for the task.** Don't "improve" adjacent code unless it's blocking your work.
- **Refactoring is allowed, but must be intentional.** If you refactor, state why (e.g., "Extracting this function because it's used in 3 places").
- **Match existing style** unless you're explicitly asked to change it.
- **Clean up your own mess.** Remove imports/variables/functions that YOUR changes made unused.
- **Mention pre-existing issues, don't silently fix them.** If you notice dead code or bad naming, point it out for the user to decide.

**Self-check:** "Can I explain why each changed line is necessary for this task?"

**Example:**
```
Task: "Add SSL support to BSL markers"

Good:
- Modify addBslMarker() to accept type parameter
- Add addSslMarker() function
- Update loadPdaData() to call both
Bad:
- Modify addBslMarker()
- Add addSslMarker()
- Rename variables in unrelated functions
- Reformat the entire file
- Extract helper functions "for better organization"
```

---

### 4. Don't Guess — Check Documentation

**When uncertain about an API, library method, or framework behavior, consult documentation first.**

- Don't guess method signatures, return types, or property names.
- Don't assume an API exists because it "probably should."
- Use WebSearch/WebFetch to look up official docs, or check the library's source code.
- If docs aren't available, test the API in a small isolated snippet before using it in production code.

**Self-check:** "Am I writing code based on an assumption I haven't verified?" If yes, stop and check.

---

### 5. Goal-Driven Execution

**Define success criteria before coding. Verify after implementation.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after, measure improvement"

For multi-step tasks, state a brief plan with verification:
```
Plan:
1. Add SSL marker rendering → verify: SSL appears on chart
2. Update API call to fetch SSL → verify: curl returns SSL records
3. Wire up click detection → verify: clicking SSL highlights it
```

**Why this matters:** Clear success criteria let you work independently and reduce back-and-forth.

---

## Part 2: Project-Specific Context

### Project Overview

NQ futures ICT (Inner Circle Trader) backtesting system. A single-user, local-only research tool studying the 9:30-10:30 NY Open window. Core goal: build statistical samples of pre-market conditions and post-open opportunities, not a trading journal.

**First principle: time is the primary variable** — what happens at what time matters more than what price it happens at. All fields and logic should emphasize time structure over price results.

### Architecture

Three-layer data model:

- **Layer 0**: Raw 1-minute OHLCV in `trading_data.duckdb` (`futures_1m` table)
- **Layer 1**: Mechanical PDA (Price Delivery Area) scanning — auto-detected from price data. Types: `bsl, ssl, fvg, nwog, ndog, daily_high, daily_low, ict_midnight_day_high, ict_midnight_day_low, eqh, eql`
- **Layer 1.5**: Reference groups — identity groups linking the same price/time across PDA types
- **Layer 2**: Human-curated structure paths, manual PDA entry. YAML files are the truth source; DuckDB is the query/statistics layer.

Backend: `price_lookup_api.py` — a ThreadingHTTPServer on port 8765 connecting to both DuckDB databases. All config comes from `v2/v2_config.yaml`.

Frontend: Self-contained HTML files (React-based, local vendor JS) communicating with the Python API:
- `kline_viewer.html` — K-line chart with PDA overlay and right-side PDA workbench (active development focus)
- `layer2_recorder_v2.html` — Path/Group structure recording
- `pda_review.html` — PDA review and classification
- `pda_manager.html` — PDA CRUD management

### Commands

```bash
# API server
bash restart_api.sh      # restart (also: stop, start, status, log)
# Manual start:
python3 price_lookup_api.py --host 127.0.0.1 --port 8765 --db-file trading_data.duckdb --table futures_1m --v2-db-file v2/data/v2_research.duckdb

# Frontend (static file server)
python3 -m http.server 8000  # then open http://127.0.0.1:8000/v2/docs/kline_viewer.html

# Data pipeline (run in order after fresh import)
python3 v2/scripts/scan_layer1_pda.py --replace
python3 v2/scripts/build_ict_midnight_daily_points.py --replace
python3 v2/scripts/build_pd_extremes.py --replace
python3 v2/scripts/build_reference_groups.py --replace
python3 v2/scripts/backfill_occurrence_time.py
python3 v2/scripts/auto_tag_short_pivots.py

# Import raw CSV (one-time or refresh)
python3 duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate

# DuckDB ad-hoc query
python3 -c "import duckdb; conn = duckdb.connect('v2/data/v2_research.duckdb'); print(conn.execute('SELECT ...').df())"
```

### Key Files

- `price_lookup_api.py` — All API endpoints (~2900 lines, the single backend file)
- `v2/v2_config.yaml` — Central config: fluency weights, PDA type definitions, DB paths, API endpoints. Both code and frontend read from this.
- `v2/scripts/scan_layer1_pda.py` — Layer 1 mechanical PDA scanner (the main scanner)
- `v2/schema/*.sql` — Database schema definitions for `pda_registry`, `pda_events`, `pda_members`, `pd_extremes`, `reference_groups`
- `v2/docs/kline_viewer.html` — Active frontend development target

### Databases

- `trading_data.duckdb` — 1m OHLCV data (`futures_1m` table, ~460MB)
- `v2/data/v2_research.duckdb` — PDA research data (`pda_registry`, `pda_events`, `pda_members`, `pd_extremes`, `reference_groups`, `reference_group_members`, ~130MB)
- Restore points in `v2/data/restore_points/`

### Constraints

- YAML files are the truth source for Layer 2 data; DuckDB is a query/statistics mirror, not the primary store
- No test suite exists yet — `check_pda_scan.py` is a diagnostic sanity checker, not a test framework
- Dependencies: `duckdb`, `yaml` (PyYAML). No requirements.txt or packaging config.
- PDA timeframes: `W, D, 4H, 1H, 30M, 15M`
- PDA categories: point (bsl/ssl), range (fvg/ob), composite (eqh/eql)
- `.duckdb` files are gitignored — never delete them; use trash if cleanup needed
- Point-in-time discipline: backtesting must only use data visible at the observation time (9:29截面), no look-ahead bias
- Do not auto-execute any order-placement code
- All timestamps stored in UTC, displayed in Asia/Shanghai or US/Eastern depending on context

### Code Style

- Indent: 2 spaces for JS/HTML/CSS/YAML, 4 spaces for Python (enforced by `.editorconfig` + `.prettierrc.json`)
- After editing `v3/docs/*.html`, `v3/styles/*.css`, or `v3/modules/*.js`, run:
  `npx --yes prettier@3.3.3 --write <file>` to normalize formatting
- Never hand-write indentation for inserted blocks — copy the exact whitespace from a `Read` of the target file, or format after editing
- Ignored paths: see `.prettierignore`

### Design Principles

Before adding any feature, ask:
1. Does it help study 9:30-10:30 move probabilities?
2. Does it help study 9:30-10:30 opportunity probabilities?
3. Can it be reasonably defined at the 9:29 observation point?
4. Does it emphasize time structure, not just price results?

Automation handles objective fields (time mapping, price lookup, range positioning, premium/discount, direction). Stay conservative on subjective fields (bias, narrative, nearest draw, skip reason).

---

## Part 3: Collaboration Guidelines

Specific guidelines for individual developer + AI Agent collaboration in this project.

### 1. Read Project Context First

**Before starting any task:**
- Read this CLAUDE.md (you're doing it now)
- Check `v3/TODO.md` for current priorities and known issues
- Check memory system (`~/.claude/projects/.../memory/`) for past decisions and feedback
- For v3 work, check `v3/sessions/` for recent development context

**Why:** Prevents reinventing wheels, repeating mistakes, or breaking established patterns.

---

### 2. Small Steps with Clear Goals

**Break large tasks into verifiable steps:**
- Each step should be completable in < 30 minutes
- Each step should have a clear verification method
- State the plan before starting: "I'll do X, then verify by Y"

**When facing architectural decisions:**
- List 2-3 options with tradeoffs
- Recommend one with reasoning
- Wait for user confirmation before proceeding

**Example:**
```
Task: "Add PDA workbench sidebar"

Plan:
1. Add HTML structure for sidebar → verify: sidebar appears on page
2. Add CSS layout (Flexbox) → verify: chart and sidebar side-by-side
3. Add collapse/expand button → verify: clicking toggles sidebar
4. Render PDA list → verify: list shows loaded PDAs
5. Wire up click interaction → verify: clicking list item scrolls chart

Proceed with step 1?
```

---

### 3. Keep Code Simple and Deletable

**Prefer simple over clever:**
- Pure functions over stateful classes
- Explicit parameters over global variables
- Direct code over abstractions (until you need them 3+ times)

**Avoid premature optimization:**
- Don't add caching until there's a performance problem
- Don't add configuration until there's a second use case
- Don't add error handling for scenarios that can't happen

**Self-check questions:**
- "Is this the simplest solution that works?"
- "Would I be comfortable deleting this code tomorrow?"
- "Am I solving a real problem or a hypothetical one?"

---

### 4. Clean Up Intentionally

**After completing a feature:**
- Remove imports/variables/functions that YOUR changes made unused
- Rename variables YOU added if they're unclear
- Consolidate duplicated logic YOU introduced
- Run Prettier on files YOU edited (JS/HTML/CSS)

**For pre-existing issues:**
- Point them out: "I notice X is duplicated in 3 places, should we refactor?"
- Don't fix them silently unless blocking your work
- If refactoring, state the goal: "Extracting this to reduce duplication"

**Why:** Keeps the codebase clean without creating unnecessary churn.

---

### 5. Avoid Patch-Over-Patch Fixes

**When encountering a bug:**
- Don't immediately add if-else to bypass it
- Ask: "What's the root cause?"
- Propose a proper fix, even if it takes longer

**If a proper fix is too risky:**
- Clearly mark it as a temporary workaround
- Add a TODO comment with the root cause
- Suggest a follow-up task to fix it properly

**Example:**
```python
# Bad: Patch over patch
if data is None:
    data = []
if len(data) == 0:
    return default
if data[0] is None:
    data = data[1:]

# Good: Fix the root cause
# Root cause: API sometimes returns None instead of empty list
data = data or []  # Normalize at the boundary
```

---

### 6. Document Decisions, Not Code

**Write comments for:**
- **Why** something is done a certain way (non-obvious constraints, workarounds)
- **What** the module/function is responsible for (one-line summary at the top)
- **Gotchas** that aren't obvious from the code (timezone handling, data format assumptions)

**Don't write comments for:**
- **What** the code does (the code itself should be clear)
- **Who** wrote it or when (git history has that)
- **How** to use it if it's obvious from the signature

**Session documentation:**
- At the end of each session, update `v3/sessions/session_YYYYMMDD.md`
- Record: what was done, key decisions, problems encountered, lessons learned
- This helps future sessions (and future you) understand the context

---

### 7. Git Discipline

**Commit frequently:**
- Small, focused commits (one logical change per commit)
- Clear commit messages: `type(scope): what changed`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `chore`

**Before destructive operations:**
- `git reset --hard`, `git push --force`, `git clean -f` → ask first
- Amending published commits → ask first
- Deleting branches → ask first

**Hooks and formatting:**
- Never skip hooks with `--no-verify` unless explicitly asked
- Run Prettier after editing HTML/CSS/JS files
- Commit formatting changes separately from logic changes

---

### 8. Proactive Quality Alerts

**Alert the user when you notice:**
- A function exceeds 50 lines (suggest extraction)
- A file exceeds 500 lines for Python / 300 lines for JS/HTML (suggest splitting)
- Same logic duplicated 3+ times (suggest abstraction)
- A change requires modifying 4+ files (suggest architectural review)
- State management is scattered across multiple modules (suggest centralization)
- Complex nested logic (> 3 levels of indentation, suggest simplification)

**Format:**
```
⚠️ Quality Alert: [Issue]
- Current: [What you observed]
- Impact: [Why it matters]
- Suggestion: [What to do about it]
- Proceed anyway? [Yes/No]
```

**Why:** Catches problems early before they become technical debt.

---

## Effectiveness Indicators

**These guidelines are working if:**
- ✅ Fewer "why did you change this?" questions from the user
- ✅ Fewer rewrites due to overcomplication
- ✅ Clarifying questions come before implementation, not after mistakes
- ✅ Diffs are clean and focused on the actual task
- ✅ Code remains simple and maintainable over time

**These guidelines need adjustment if:**
- ❌ You're spending too much time asking for permission
- ❌ Simple tasks take too long due to excessive caution
- ❌ The user frequently says "just do it" when you ask
- ❌ Code quality is declining despite following the rules

**Feedback loop:** If something isn't working, speak up. These guidelines should help, not hinder.
