create table if not exists pd_extremes (
  instrument varchar not null,
  trade_date date not null,
  session_name varchar not null,     -- asia / ldn / transition / premarket / ny_am / ny_lunch / ny_pm
  window_start timestamp not null,
  window_end timestamp not null,
  high_price double not null,
  high_time timestamp not null,
  low_price double not null,
  low_time timestamp not null,
  source varchar not null default 'auto_scan',
  note varchar,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  primary key (instrument, trade_date, session_name)
);

create index if not exists idx_pd_extremes_trade_date
  on pd_extremes (trade_date);

create index if not exists idx_pd_extremes_session
  on pd_extremes (session_name, trade_date);
