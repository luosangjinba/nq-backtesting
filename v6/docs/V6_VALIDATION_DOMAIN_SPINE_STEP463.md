# V6 Validation Domain Spine — Step 463

Status: implementation boundary (2026-07-15)

## Scope

Step 463 establishes the first validation-domain owner and durable repository
boundary. It has no production UI, runtime command wiring, Replay coordination,
Semantic Drawing, observation, trade-plan, execution, outcome, or Analytics
behavior.

## Persistence Decision

The current synchronous Web Storage repository remains appropriate for small
Settings and snapshot records, but it does not provide transactional writes,
query indexes, or versioned schema migrations. Validation artifacts therefore
must not be added as three more generic Web Storage collections.

Validation uses a dedicated asynchronous repository interface:

- browser production adapter: native IndexedDB;
- deterministic test adapter: in-memory transaction store implementing the
  same repository-facing contract;
- one database schema version and explicit ordered migrations;
- separate object stores for playbook versions, campaigns, and trials;
- repository-owned referential and immutability checks;
- domain modules remain storage/DOM/runtime independent.

This is a product-artifact database boundary. It must not share market-data
tables or become a private store per operating mode.

## Minimal Artifacts

### `playbookVersion`

- stable artifact id and parent playbook id;
- positive integer version;
- user-facing name;
- immutable ordered rules (`id`, `statement`);
- canonical creation timestamp and schema version.

Once persisted, a playbook version cannot be overwritten or reinterpreted.

### `validationCampaign`

- stable id, name, and falsifiable hypothesis;
- reference to exactly one persisted playbook version;
- lifecycle: `draft -> active -> completed -> archived`;
- canonical creation/update timestamps and schema version.

### `trial`

- stable id and reference to exactly one persisted campaign;
- optional Replay session reference until the blind coordinator attaches one;
- lifecycle: `pending -> active -> completed` or
  `pending/active -> invalidated`;
- invalidated trials require a reason;
- canonical creation/update timestamps and schema version.

## Owner Rules

- Constructors and transitions are pure domain functions.
- The repository owns durable uniqueness, references, transactions, indexes,
  and migrations.
- App/Shell/Replay/chart/adapter modules must not import the storage adapter.
- A later workflow coordinator may consume the repository through commands and
  events; it may not bypass these invariants.
- Repository records are cloned/frozen at the public boundary so callers cannot
  mutate stored truth by retaining an object reference.

## Step 463 Gates

- constructors reject malformed ids, timestamps, hypotheses, versions, and
  rules;
- only declared lifecycle transitions succeed;
- playbook versions are immutable after creation;
- campaign/trial references are enforced transactionally;
- create/get/list results survive repository recreation over the same adapter;
- IndexedDB schema migration creates required stores and indexes;
- domain/repository code imports no App, Shell, Replay, chart engine, Bar Data,
  DOM, or Lightweight Charts implementation.
