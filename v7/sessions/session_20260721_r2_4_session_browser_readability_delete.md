# Session — R2.4 Session Browser Readability And Delete

Date: 2026-07-21
Status: implemented; awaiting human interaction and visual review

## Trigger

The user requested a deeper Sessions-screen background, brighter and larger
text, and one Delete button for every saved Session.

## Delivered

- scoped neutral-black background and brighter semantic text tokens to the
  Session-list route so the immersive Replay workspace retains its accepted
  chart palette;
- enlarged page supporting copy, section labels, card titles, timestamps,
  date ranges, instrument tags, actions, and Create Session form typography;
- added visible Open and Delete actions to every Session card;
- made the first Delete click open an inline confirmation, move keyboard focus
  to the permanent Delete action, and expose a non-mutating Cancel path;
- added `SessionStore.deleteSession(sessionId)` over a revision-checked
  Repository remove that deletes both the indexed identity and record key;
- retained A/B isolation and returned naturally to the existing empty state
  when no Sessions remain.

## Automated Evidence

- Session persistence Harness proves stale-remove rejection, index/key removal,
  A preservation, and reconstruction after deletion;
- Session Store Harness proves explicit deletion, deleted-id rejection, unknown
  deletion rejection, and durable reconstruction;
- Session Browser Chrome Harness proves every card exposes Delete, confirmation
  receives focus, Cancel preserves both Sessions, confirmed deletion removes
  only Beta, and localStorage retains only Alpha;
- six updated `1440×900` fixtures cover the deeper/brighter/larger empty,
  Create dialog, date picker, ready-list, inline delete confirmation, and
  selected-Session surfaces.
- all 39 non-browser Harnesses pass;
- all 6 Chrome Harnesses pass; one exact-PNG multi-Pane check required an
  isolated rerun after a transient Canvas frame mismatch, then passed unchanged;
- the retained Replay performance run reports `0ms` maximum long-task evidence.

## Review Boundary

R2.4 changes visible presentation and adds a destructive interaction, so it
stops for explicit human interaction and visual acceptance. It adds no bars,
Replay, chart, Pane, calendar-business-data, order, news, or Journal behavior.
