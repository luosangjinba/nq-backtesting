# Session 2026-07-13 - Future Global Time Format Settings Constraint

## Trigger

The user requested a unified 12/24-hour choice, then correctly placed it in the
future workstation Settings surface instead of the Go-to Custom Settings
dialog.

## Decision

- Record the requirement now without shipping a partial runtime feature.
- Global Settings is the only owner of `timeFormat: '24h' | '12h'`.
- Default to `24h` and keep `displayTimezone` independent.
- Keep timestamps and Go-to/session schedule values canonical; `HH:mm` remains
  the command and persistence representation.
- Require chart, Go-to, Session, replay, and Journal time surfaces to use one
  Settings-backed presentation adapter.
- Use a controlled time selector when consistent 12/24-hour input presentation
  is implemented; native `<input type="time">` does not guarantee it.

## Scope

No production Settings schema, UI, formatter, chart adapter, or persisted data
was changed. The requirement is scheduled under Settings parity and explicitly
does not replace the open Step 407 human/browser acceptance gate.

## Commits

- `4edf2e99 docs(v6): define global time format contract`
- roadmap, TODO, Go-to constraint, and session closeout: this commit.

## Next

Complete Step 407 acceptance first. Implement the time-format preference later
as one bounded Settings-parity slice, including migration, shared formatter,
controlled time input, timezone independence, persistence, and cross-surface
browser coverage.
