-- NQ Backtesting V2
-- Layer 1.5: Reference groups
-- 目标：标记同一个价格点上的多重身份，不删除、不合并原始记录。
-- 例如一个点同时是 D high / 4H BSL / 1H BSL / NY AM high。

create table if not exists reference_groups (
  group_id varchar primary key,
  instrument varchar not null,
  trade_date date not null,
  event_time timestamp not null,
  price double not null,
  side varchar not null,                  -- high / low
  member_count integer not null,
  pda_count integer not null,
  pd_extreme_count integer not null,
  timeframes varchar,
  roles varchar,
  source varchar not null default 'auto_group',
  note varchar,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create table if not exists reference_group_members (
  group_id varchar not null,
  member_type varchar not null,            -- pda / pd_extreme
  member_ref varchar not null,             -- pda_id or pdext:NQ:YYYY-MM-DD:session:side
  instrument varchar not null,
  trade_date date not null,
  event_time timestamp not null,
  price double not null,
  side varchar not null,                   -- high / low
  timeframe varchar,
  pda_type varchar,
  review_role varchar,
  session_name varchar,
  label varchar,
  source varchar not null default 'auto_group',
  created_at timestamp not null default current_timestamp,
  primary key (group_id, member_type, member_ref)
);

create index if not exists idx_reference_groups_date_side
  on reference_groups (instrument, trade_date, side);

create index if not exists idx_reference_groups_event
  on reference_groups (instrument, event_time, price, side);

create index if not exists idx_reference_group_members_ref
  on reference_group_members (member_type, member_ref);

create index if not exists idx_reference_group_members_group
  on reference_group_members (group_id);
