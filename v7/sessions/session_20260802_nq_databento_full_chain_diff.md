# Session — 2026-08-02 — NQ Databento Full-Chain Mapping Diff

## Request

Execute the next read-only step after the legacy-red audit: obtain one complete
free `NQ.v.0` mapping and compare its session-aligned boundaries with the local
continuous source and current governed Roll Calendar.

## Result

- queried Databento `symbology.resolve` read-only for 2010-06-06 through
  2026-08-02;
- froze 66 contiguous volume mappings and 65 quarterly transitions with no
  mapping gap, overlap, unresolved instrument, or H/M/U/Z chain break;
- independently resolved every mapping instrument id to the expected raw NQ
  contract;
- recorded mapping fingerprint
  `635306c81f7b954342f8d67028a3d91bc5e2d7c86089f9eb6a69c61fab44a151`;
- compared 12 exact governed boundaries, eight exact raw-audited boundaries,
  and 45 diagnostic legacy CSV seams without elevating inference to authority;
- found zero exact matches: Databento is earlier for seven exact legacy rows
  and later for 2020 Q1 plus all 12 current calendar events;
- found every governed event would move later by 42–72 hours, so adopting the
  proposed authority also rebaselines already executed 2023–2025 repairs;
- classified the remaining 45 diagnostics as 28 high-, one medium-, and 16
  low-confidence seams;
- bounded a remaining two-day-padded bilateral audit to approximately 520
  contract-days, about USD 2.62 at the current USD 70/GB unit price;
- retained a USD 4 proposed ceiling including a later exact Preview;
- recorded that 2008 Q1 through 2010 Q1 precede Databento coverage and require
  separate legacy provenance;
- performed no paid minute download and no DuckDB or Roll Calendar mutation.

## Verification

- machine artifact JSON parsing, 66-row mapping continuity, quarterly chain,
  fingerprint, evidence counts, and prose exact-boundary assertions passed;
- credential scan passed;
- authoritative DuckDB remains at 12,651,020 total rows, 6,158,777 NQ rows,
  and zero duplicate NQ timestamps;
- Roll Calendar revision remains
  `adf9ae6191a313c50517646b32b88088bccb708bc240e3d6c346ef1581c71250`;
- V7 architecture-boundary, production-architecture,
  architecture-hardening, and source-quality Harnesses passed;
- `git diff --check` passed.

## Binding Evidence

- `v7/docs/V7_NQ_DATABENTO_FULL_CHAIN_DIFF.md`
- `v7/docs/v7-nq-databento-full-chain-diff.json`
- `v7/docs/V7_NQ_LEGACY_RED_DATABENTO_ROLL_AUDIT.md`
- `v4/docs/planning/DATABENTO_DATA_RESEARCH.md`

## Continuation

Obtain explicit approval for the normalized Databento date authority from
2010 Q2 onward and a maximum USD 4 raw-data budget. Then raw-audit the 17
low/medium-confidence windows before the 28 high-confidence windows. Database
and calendar writes remain a later, separate explicit gate.
