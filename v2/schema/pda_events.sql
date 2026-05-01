-- NQ Backtesting V2
-- 第一层：PDA 事件流（动态）
-- 目标：记录 PDA 后续发生了什么，而不是把动态信息塞回静态登记簿。

create table if not exists pda_events (
  event_id varchar primary key,
  pda_id varchar not null,
  instrument varchar not null,
  timeframe varchar not null,

  event_type varchar not null,        -- tapped / partially_filled / filled / invalidated / respected / ignored
  event_ts timestamp,
  event_date date,
  event_price double,

  reaction varchar,                   -- reversal / continuation / no_reaction / unknown
  fill_ratio double,                  -- 0 / 0.25 / 0.5 / 0.75 / 1.0
  invalidation_reason varchar,        -- body_close_through / structure_break / time_decay / manual

  note varchar,
  created_at timestamp not null default current_timestamp
);

create index if not exists idx_pda_events_pda_ts
  on pda_events (pda_id, event_ts);

create index if not exists idx_pda_events_event_type
  on pda_events (event_type);

-- 推荐枚举
-- event_type: tapped / partially_filled / filled / invalidated / respected / ignored
-- reaction: reversal / continuation / no_reaction / unknown
-- invalidation_reason: body_close_through / structure_break / time_decay / manual
