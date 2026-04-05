create table if not exists futures_1m (
  instrument text not null,
  ts timestamp not null,
  open numeric(12, 4) not null,
  high numeric(12, 4) not null,
  low numeric(12, 4) not null,
  close numeric(12, 4) not null,
  volume bigint,
  primary key (instrument, ts)
);

create index if not exists idx_futures_1m_instrument_ts
  on futures_1m (instrument, ts);
