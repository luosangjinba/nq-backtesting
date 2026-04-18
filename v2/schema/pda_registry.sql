-- NQ Backtesting V2
-- 第一层：PDA 静态登记簿（最小版本）
-- 目标：只记录“价格向前走时留下了什么 PDA / candidate”，不记录后续 tap / fill / invalidation 事件。
-- 原则：纯机械、不过滤、不过度判断；真正的结构筛选和共振解释进入第二层。

create table if not exists pda_registry (
  -- 基本身份
  pda_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,        -- W / D / 4H / 1H
  pda_type varchar not null,         -- 当前主线白名单：bsl / ssl / fvg / nwog / ndog
  direction varchar,                 -- bullish / bearish / neutral；对 bsl / ssl 可留空

  -- 当前阶段推荐字段
  trade_date date,
  anchor_time timestamp,
  confirm_time timestamp,
  status varchar not null default 'active',     -- active / archived / deleted_by_review
  manual_added boolean not null default false,
  manual_edited boolean not null default false,
  review_state varchar not null default 'pending', -- legacy compatibility only
  review_role varchar not null default 'unclassified',  -- unclassified / daily_high / daily_low / d_short_high / d_short_low / h4_short_high / h4_short_low / h1_short_high / h1_short_low
  review_tag varchar,                           -- legacy / reserved
  prev_close_time timestamp,
  prev_close_price double,
  next_open_time timestamp,
  next_open_price double,

  -- 兼容旧脚本 / 旧数据的历史字段
  created_date date not null,
  created_ts timestamp,
  verified_ts timestamp,              -- 某些 PDA 要等后续 K 线才能确认
  anchor_ts timestamp,                -- PDA 所锚定的原始 K 线时间（可选）
  origin_start_date date,             -- 供 OB 这类区间型 PDA 使用
  origin_end_date date,

  -- 价格边界 / 关键价格
  price double,                       -- 供 bsl / ssl 这类单点 PDA 使用
  price_high double,
  price_low double,
  price_ce double,

  -- 静态登记簿只保留轻量快照状态
  registry_status varchar not null default 'active',  -- legacy compatibility

  -- 轻量补充
  source varchar,                    -- auto_scan / manual_add / manual_eqh_eql / imported
  note varchar,

  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create index if not exists idx_pda_registry_instrument_tf_status
  on pda_registry (instrument, timeframe, registry_status);

create index if not exists idx_pda_registry_created_date
  on pda_registry (created_date);

create index if not exists idx_pda_registry_trade_date
  on pda_registry (trade_date);

create index if not exists idx_pda_registry_type_direction
  on pda_registry (pda_type, direction);

-- 推荐枚举（文档约束，数据库层先不强加 check，方便第一阶段迭代）
-- timeframe: W / D / 4H / 1H
-- pda_type:
--   bsl / ssl
--   fvg
--   nwog / ndog
-- direction: bullish / bearish / neutral（bsl / ssl 可留空）
-- review_state: legacy compatibility only
-- review_role:
--   unclassified
--   daily_high / daily_low
--   d_short_high / d_short_low
--   h4_short_high / h4_short_low
--   h1_short_high / h1_short_low
-- status: active / archived / deleted_by_review (legacy compatibility)
