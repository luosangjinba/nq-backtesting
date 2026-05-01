-- NQ Backtesting V2
-- PDA member links
-- 目标：记录关系型 PDA（例如 EQH / EQL）由哪些原始点组成。

create table if not exists pda_members (
  pda_id varchar not null,
  member_type varchar not null,       -- pda / pd_extreme / manual_ref
  member_ref varchar not null,        -- pda_id or pdext:NQ:YYYY-MM-DD:session:side
  role varchar,
  note varchar,
  created_at timestamp not null default current_timestamp,
  primary key (pda_id, member_type, member_ref)
);

create index if not exists idx_pda_members_pda_id
  on pda_members (pda_id);

create index if not exists idx_pda_members_member_ref
  on pda_members (member_type, member_ref);
