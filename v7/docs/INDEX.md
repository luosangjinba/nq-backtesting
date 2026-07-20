# V7 Documentation Index

V7 is a clean runtime rebuild of the replay/chart foundation. V6 remains a
read-only product, interaction, data-contract, and failure-evidence reference.

Read in this order before V7 implementation work:

1. `V7_RESTART_HANDOFF.md` after any machine/server/agent restart
2. `V7_PRODUCT_AND_SCOPE.md`
3. `V7_ARCHITECTURE.md`
4. `V7_V6_MIGRATION_DENYLIST.md`
5. `V7_V6_DISPOSITION_MATRIX.md`
6. `V7_UI_REFERENCE_AND_QUALITY.md`
7. `V7_HARNESS_STANDARD.md`
8. `V7_TASK_NUMBERING.md`
9. `V7_FOUNDATION_INTERACTION_CONTRACT.md`
10. `V7_CACHE_AND_LATENCY_CONTRACT.md`
11. `V7_SESSION_BROWSER_SURFACE.md`
12. `V7_CALENDAR_SURFACE.md`
13. `V7_BAR_DATA_CONTRACT.md`
14. `V7_BAR_DATA_RUNTIME.md`
15. `V7_PROVIDER_POLICY_CONTRACT.md`
16. `V7_COVERAGE_PLANNING_CONTRACT.md`
17. `V7_PROVIDER_EXECUTION_RUNTIME.md`
18. `V7_REPLAY_CONTRACT.md`
19. `V7_REPLAY_RUNTIME.md`
20. `V7_REPLAY_PREFETCH_CONTRACT.md`
21. `V7_EXECUTION_ROADMAP.md`
22. `../TODO.md`

Executable architecture metadata lives in
`v7-architecture-manifest.json`. Its harness must pass before every V7 commit.
Critical rule lifecycle and activation metadata lives in
`v7-harness-rules.json`.
Foundation/unplanned-candidate interaction ownership and visible-completion metadata lives
in `v7-foundation-interactions.json`.
Cache identity, prefetch, latency tiers, refresh behavior, and chunked history
budgets live in `v7-cache-latency-contract.json`.
