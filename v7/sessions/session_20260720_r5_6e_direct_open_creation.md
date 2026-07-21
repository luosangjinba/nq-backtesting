# Session — R5.6e Direct-Open Session Creation

Date: 2026-07-20
Status: implemented; included in the combined R5.6 human interaction gate

## Outcome

After Session Store successfully inserts a new record, Session Browser reads
the returned branded identity through its public serialization contract and
navigates to that exact hash route. The route activation then follows the same
path used by an explicit Open action or hard refresh.

No active Session key was added. Session Store does not navigate, the creation
dialog does not open Replay, and Replay Workspace does not control Session
Browser. A create failure does not navigate and remains an inline list error.

## Evidence

- NQ creation opens the real chart directly;
- unsupported ES-only creation opens its selected Session summary directly;
- back navigation exposes both distinct records;
- fresh draft, A→B→A, hard-refresh B isolation, monotonic activation, and
  absence of active/current persistence keys remain green;
- Replay Workspace creates both functional and latency Sessions without an
  intermediate Session-list click;
- full V7 Harness suite and `git diff --check` before commit.

R5.6f next closes the combined corrective gate and issues the revised human
checklist. R6 remains blocked until that checklist is accepted.
