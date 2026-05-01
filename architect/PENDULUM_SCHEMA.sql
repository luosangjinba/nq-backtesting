create table if not exists pendulum_snapshots (
  snapshot_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  snapshot_ts timestamp not null,

  structural_bias varchar not null,
  structure_status varchar not null,
  phase varchar not null,
  confirmation_state varchar not null,

  protected_high double,
  protected_high_ts timestamp,
  protected_low double,
  protected_low_ts timestamp,

  active_range_high double,
  active_range_low double,

  last_break_side varchar,
  last_break_ts timestamp,
  last_break_price double,

  break_assessment_status varchar,
  break_assessment_note varchar,

  judgement_confidence varchar,
  judgement_reasoning varchar,

  is_current boolean not null default false,
  created_at timestamp not null default current_timestamp
);

create index if not exists idx_pendulum_snapshots_instrument_tf_ts
  on pendulum_snapshots (instrument, timeframe, snapshot_ts);

create index if not exists idx_pendulum_snapshots_current
  on pendulum_snapshots (instrument, timeframe, is_current);


create table if not exists pendulum_events (
  event_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  event_ts timestamp not null,

  snapshot_id varchar,
  event_type varchar not null,
  event_side varchar,

  price double,
  reference_ts timestamp,

  old_value varchar,
  new_value varchar,
  note varchar,

  created_at timestamp not null default current_timestamp
);

create index if not exists idx_pendulum_events_instrument_tf_ts
  on pendulum_events (instrument, timeframe, event_ts);

create index if not exists idx_pendulum_events_snapshot
  on pendulum_events (snapshot_id);


create table if not exists pendulum_structure_points (
  point_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  snapshot_id varchar,

  point_type varchar not null,
  point_ts timestamp not null,
  price double not null,

  is_protected boolean not null default false,
  is_active boolean not null default true,
  note varchar,

  created_at timestamp not null default current_timestamp
);

create index if not exists idx_pendulum_structure_points_instrument_tf_ts
  on pendulum_structure_points (instrument, timeframe, point_ts);

create index if not exists idx_pendulum_structure_points_snapshot
  on pendulum_structure_points (snapshot_id);
