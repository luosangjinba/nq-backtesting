# Session 2026-06-10: V4 Docs Reorganization

Branch: `feature/time-reaction-forward-validation`

Goal:

- Make current V4 documentation easier to navigate.
- Keep V2/V3/root architecture documents as historical material.
- Avoid moving historical source/demo directories so old references remain inspectable.

Changes:

- Added `v4/docs/README.md` as the current V4 documentation entry point.
- Reorganized current V4 docs into:
  - `v4/docs/user/`
  - `v4/docs/design/`
  - `v4/docs/reference/`
  - `v4/docs/planning/`
  - `v4/docs/legacy/`
- Added `v4/docs/legacy/README.md` and sub-indexes for:
  - V2 historical docs
  - V3 historical docs
  - root-level historical docs
  - architecture / pendulum notes
- Updated root `readme.md` V4 doc links.
- Updated current `v4/TODO.md` references to moved V4 docs.

Boundary:

- V2/V3 directories were not moved.
- V4 session logs remain in `v4/sessions/`.
- Historical session text was not rewritten in bulk; old paths there are preserved as work history.
