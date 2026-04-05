# YAML Panel + Price Lookup

## 当前数据结构

`Part of NQ History Price.csv` 的结构是标准分钟线：

```csv
datetime,open,high,low,close,volume
1/2/2008 6:01,2112,2113,2112,2113,83
1/2/2008 6:02,2113.25,2114.25,2113.25,2113.75,25
```

字段含义：

- `datetime`: 分钟起始时间
- `open`, `high`, `low`, `close`: 这一分钟的 OHLC
- `volume`: 成交量

当前仓库里的 `NQ_full_1min.csv` 有大约 `5,906,275` 行，不适合让浏览器直接读取。

## 已加到 `yaml_panel.html` 的功能

页面顶部现在有一个“价格查询助手”：

- 导入一个较小的 CSV 片段
- 选择 `Today / Query Day + 时间 + 周期(1m/5m/15m/30m/1h/4h/1D) + OHLC`
- 直接查询对应价格
- 一键回填到这些时间驱动的字段：
  - 隔夜关键点价格
  - 执行关键点价格
  - 入场价
  - 退出价

“基本信息”中的 `Today` 默认是 `2012-01-05`，`Query Day` 默认与 `Today` 一致；如果要查询非当日价格，直接改 `Query Day` 即可。两个日期都会显示星期几。

“导出 YAML”页现在也支持导入以前生成的 YAML：

- 支持粘贴 YAML 内容
- 支持选择本地 `.yaml/.yml` 文件
- 导入前会二次确认
- 会先校验 YAML 结构，校验通过后才回填到页面继续修改

建议工作流：

1. 先从大 CSV 裁剪出单日或片段数据。
2. 在页面里导入这个小 CSV。
3. 选择例如 `1m / open` 或 `5m / high`。
4. 点击各字段下方的“填价”按钮。

## 从大 CSV 裁剪片段

现有脚本：

```bash
cd '/home/leo/myworkspace/ICT Trading System/Backtesting'
python3 extract_time_segment.py \
  -i 'Part of NQ History Price.csv' \
  -o 'segment.csv' \
  --start '1/2/2008 6:05' \
  --end '1/2/2008 6:20'
```

如果后面要从 `NQ_full_1min.csv` 里裁日内数据，命令也是同样形式，只要改输入路径和时间区间。

## PostgreSQL 可行性

可行，而且很适合这个场景。

相比直接查 CSV，PostgreSQL 的优势：

- 可以对 `datetime` 建索引，按时间点查询会快很多
- 可以按日、按时间段、按分钟窗口聚合
- 后续可以做 API，让 `yaml_panel.html` 不再依赖手动导入 CSV
- 可以继续扩展到 ES、YM、新闻标签、复盘结果等结构化数据

### 推荐表结构

```sql
create table nq_1m (
  ts timestamp not null primary key,
  open numeric(10, 2) not null,
  high numeric(10, 2) not null,
  low numeric(10, 2) not null,
  close numeric(10, 2) not null,
  volume bigint
);

create index idx_nq_1m_ts on nq_1m (ts);
```

如果后面会存多个品种，更推荐：

```sql
create table futures_1m (
  instrument text not null,
  ts timestamp not null,
  open numeric(10, 2) not null,
  high numeric(10, 2) not null,
  low numeric(10, 2) not null,
  close numeric(10, 2) not null,
  volume bigint,
  primary key (instrument, ts)
);

create index idx_futures_1m_instrument_ts on futures_1m (instrument, ts);
```

## 导入 PostgreSQL 的建议流程

仓库里现在已经有两个文件可直接用：

- [postgres_import_nq_1m.py](/home/leo/myworkspace/ICT Trading System/Backtesting/postgres_import_nq_1m.py)
- [postgres_schema.sql](/home/leo/myworkspace/ICT Trading System/Backtesting/postgres_schema.sql)

### 1. 先建表

```sql
create table futures_1m (
  instrument text not null,
  ts timestamp not null,
  open numeric(10, 2) not null,
  high numeric(10, 2) not null,
  low numeric(10, 2) not null,
  close numeric(10, 2) not null,
  volume bigint,
  primary key (instrument, ts)
);
```

### 2. 先导入到 staging 表

因为原始时间格式是 `1/2/2008 6:01`，最稳的方式是先把原始字符串导入 staging：

```sql
create table futures_1m_staging (
  raw_datetime text,
  open text,
  high text,
  low text,
  close text,
  volume text
);
```

### 3. 用 `\copy` 导入 CSV

```bash
\copy futures_1m_staging from '/path/to/NQ_full_1min.csv' with (format csv, header true)
```

### 4. 转成正式表

```sql
insert into futures_1m (instrument, ts, open, high, low, close, volume)
select
  'NQ' as instrument,
  to_timestamp(raw_datetime, 'MM/DD/YYYY HH24:MI') as ts,
  open::numeric(10, 2),
  high::numeric(10, 2),
  low::numeric(10, 2),
  close::numeric(10, 2),
  nullif(volume, '')::bigint
from futures_1m_staging;
```

## 直接可用的迁移脚本

### 方案 A：先生成 PostgreSQL 友好的标准化 CSV

这个方案不依赖 PostgreSQL 驱动，当前环境就能运行：

```bash
cd '/home/leo/myworkspace/ICT Trading System/Backtesting'
python3 postgres_import_nq_1m.py \
  --input 'NQ_full_1min.csv' \
  --instrument NQ \
  --output 'NQ_full_1min.postgres.csv'
```

输出文件会是这种结构：

```csv
instrument,ts,open,high,low,close,volume
NQ,2008-01-02 06:01:00,2112.0,2113.0,2112.0,2113.0,83
```

然后在 PostgreSQL 里直接导：

```bash
\copy futures_1m (instrument, ts, open, high, low, close, volume) \
from '/path/to/NQ_full_1min.postgres.csv' with (format csv, header true)
```

### 方案 B：Python 直接导入 PostgreSQL

如果你的环境装好了 `psycopg`，可以直接流式导入，不需要先生成中间文件：

```bash
pip install psycopg[binary]

python3 postgres_import_nq_1m.py \
  --input 'NQ_full_1min.csv' \
  --instrument NQ \
  --dsn 'postgresql://USER:PASSWORD@HOST:5432/DBNAME' \
  --create-table
```

如果要重导 NQ 数据：

```bash
python3 postgres_import_nq_1m.py \
  --input 'NQ_full_1min.csv' \
  --instrument NQ \
  --dsn 'postgresql://USER:PASSWORD@HOST:5432/DBNAME' \
  --create-table \
  --truncate
```

也可以直接用仓库里的包装脚本：

```bash
cd '/home/leo/myworkspace/ICT Trading System/Backtesting'
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME'
bash import_into_postgres.sh
```

## 查询示例

### 查某一分钟的 close

```sql
select close
from futures_1m
where instrument = 'NQ'
  and ts = timestamp '2008-01-02 09:30:00';
```

### 查某个 5 分钟窗口的 OHLC

```sql
with bars as (
  select *
  from futures_1m
  where instrument = 'NQ'
    and ts >= timestamp '2008-01-02 09:30:00'
    and ts < timestamp '2008-01-02 09:35:00'
  order by ts
)
select
  (array_agg(open order by ts asc))[1] as open,
  max(high) as high,
  min(low) as low,
  (array_agg(close order by ts desc))[1] as close
from bars;
```

## 推荐落地路线

短期：

- 保持 `yaml_panel.html` 纯前端
- 用 `extract_time_segment.py` 先裁剪成小 CSV
- 在页面中导入并查价

中期：

- 把 `NQ_full_1min.csv` 导入 PostgreSQL
- 写一个很薄的查询 API，例如 `/price?instrument=NQ&date=2008-01-02&time=09:30&tf=5&field=high`
- 让 `yaml_panel.html` 直接请求这个 API

长期：

- 增加多品种支持
- 增加预聚合表，例如 `futures_5m`, `futures_15m`
- 把复盘 YAML、新闻事件、交易结果也入库，形成完整复盘系统

## 结论

如果目标是尽快减少手工查价时间，最实用的路径是：

1. 先用当前页面里的“价格查询助手”处理小 CSV 片段。
2. 再把全量 `NQ_full_1min.csv` 迁到 PostgreSQL。
3. 最后接一个轻量 API，让页面自动查价，不再手动导入文件。

## 本地 API + 页面

仓库里现在已经提供：

- [price_lookup_api.py](/home/leo/myworkspace/ICT Trading System/Backtesting/price_lookup_api.py)
- [yaml_panel.html](/home/leo/myworkspace/ICT Trading System/Backtesting/yaml_panel.html)

启动本地查价 API：

```bash
cd '/home/leo/myworkspace/ICT Trading System/Backtesting'
python3 price_lookup_api.py --database trading_data
```

健康检查：

```bash
curl -s 'http://127.0.0.1:8765/health'
```

查价示例：

```bash
curl -s 'http://127.0.0.1:8765/price?instrument=NQ&date=2008-01-02&time=09:30&tf=5&field=high'
```

页面中的“价格查询助手”现在已经改成通过本地 API 查 PostgreSQL，不再依赖导入 CSV。
