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

页面现在内置一个“价格查询助手”浮窗：

- 可收起、展开、吸边收纳
- 选择 `Today / Query Day + 时间 + 周期(1m/5m/15m/30m/1h/4h/1D) + OHLC`
- 直接查询对应价格
- 一键回填到这些时间驱动的字段：
  - 隔夜关键点价格
  - 执行关键点价格
  - 入场价、止损、Target Internal / Swing / External、MAE、MFE
  - 退出价
- 退出类型选择 `Target Internal / Swing / External / Stop / Breakeven` 时，如果对应价格字段已存在，会自动回填到 `退出价格`
- `NWOG / NDOG` 自动计算时，如果 `16:59` 这一分钟在数据库中缺失，会自动回退到收盘前最近一根可用的 `1m close`

“基本信息”中的 `Today` 默认是 `2012-01-05`，`Query Day` 默认与 `Today` 一致；如果要查询非当日价格，直接改 `Query Day` 即可。两个日期都会显示星期几。

“导出 YAML”页现在也支持导入以前生成的 YAML：

- 支持粘贴 YAML 内容
- 支持选择本地 `.yaml/.yml` 文件
- 导入前会二次确认
- 会先校验 YAML 结构，校验通过后才回填到页面继续修改

页面现在也支持“图片记录”：

- 基本信息支持整体图片记录
- 隔夜关键点、行情段、ORR、执行观察点、Reversals、入场记录都支持多张图片
- 每张图片支持 `url`、`title`、`note`
- 支持上移、下移、删除、缩略图预览
- YAML 导入导出会保留这些图片字段
- 支持通过本地 API 直接上传图片，自动回填 URL
- 支持直接粘贴剪贴板截图，再上传到本地目录
- 如果当前图片项已有 URL，再上传新图时会自动追加成新的图片记录，不会覆盖上一张

“隔夜结构”里现在也支持自动计算 `关键 NWOG / NDOG`：

- `NDOG`: 周一到周四，同日 `16:59 close -> 18:00 open`
- `NWOG`: 周一 `T日` 自动连接到上一个周五 `16:59 close -> 周一 18:00 open`
- 自动计算 `direction / gap high / gap low`
- 如果数据库缺少 `16:59`，会自动回退到收盘前最近一根可用的 `1m close`
- `Reversals -> Reasons` 会动态汇总隔夜关键点、盘前关键 FVG、关键 NWOG/NDOG、执行关键点和盘中 FVG

建议工作流：

1. 先把大 CSV 导入 DuckDB。
2. 启动本地查价 API。
3. 打开 `yaml_panel.html`，用右下角查价浮窗查价并回填。
4. 如需二次修改，导入以前导出的 YAML 再继续编辑。

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

## DuckDB 方案

DuckDB 很适合这套“本地单机 + 可移植到 Windows”的场景。

相对单独部署数据库服务，它的优势是：

- 不需要单独部署数据库服务
- 一个 `.duckdb` 文件就能带着走，迁移更轻
- 仍然支持按时间点、按时间段、按分钟窗口聚合
- 很适合本地分析型查询和中小规模行情数据

### 推荐表结构

仓库里已经提供 DuckDB 版 schema：

- [duckdb_schema.sql](/home/leo/myworkspace/trading/backtesting/duckdb_schema.sql)

核心表结构如下：

```sql
create table if not exists futures_1m (
  instrument varchar not null,
  ts timestamp not null,
  open double not null,
  high double not null,
  low double not null,
  close double not null,
  volume bigint
);

create index if not exists idx_futures_1m_instrument_ts
  on futures_1m (instrument, ts);
```

## 导入 DuckDB 的建议流程

仓库里现在已经有两个直接可用的 DuckDB 文件：

- [duckdb_import_nq_1m.py](/home/leo/myworkspace/trading/backtesting/duckdb_import_nq_1m.py)
- [duckdb_schema.sql](/home/leo/myworkspace/trading/backtesting/duckdb_schema.sql)

### 1. 直接把原始 CSV 导入 DuckDB

```bash
cd '/home/leo/myworkspace/trading/backtesting'
python3 duckdb_import_nq_1m.py \
  --input 'NQ_full_1min.csv' \
  --db-file 'trading_data.duckdb' \
  --create-table \
  --truncate
```

这会创建或更新：

```text
trading_data.duckdb
```

### 2. 如果需要，也可以先生成标准化 CSV

```bash
cd '/home/leo/myworkspace/trading/backtesting'
python3 duckdb_import_nq_1m.py \
  --input 'NQ_full_1min.csv' \
  --instrument NQ \
  --output 'NQ_full_1min.normalized.csv'
```

输出结构会是：

```csv
instrument,ts,open,high,low,close,volume
NQ,2008-01-02 06:01:00,2112.0,2113.0,2112.0,2113.0,83
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
  first(open order by ts asc) as open,
  max(high) as high,
  min(low) as low,
  first(close order by ts desc) as close
from bars;
```

## 推荐落地路线

当前推荐：

- 把 `NQ_full_1min.csv` 导入 DuckDB
- 启动本地查询 API
- 让 `yaml_panel.html` 通过本地 API 查价
- 用页面内的图片记录功能保存结构图、setup 图和复盘截图

后续可继续扩展：

- 增加多品种支持
- 增加预聚合表，例如 `futures_5m`, `futures_15m`
- 把复盘 YAML、新闻事件、交易结果也入库，形成完整复盘系统

## 结论

如果目标是尽快减少手工查价时间，最实用的路径是：

1. 先把全量 `NQ_full_1min.csv` 迁到 DuckDB。
2. 启动本地 API。
3. 在页面里用浮动查价助手直接查并回填。
4. 用 YAML 导入功能继续修改旧复盘。

## 本地 API + 页面

仓库里现在已经提供：

- [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py)
- [yaml_panel.html](/home/leo/myworkspace/trading/backtesting/yaml_panel.html)

先把 CSV 导入 DuckDB：

```bash
cd '/home/leo/myworkspace/trading/backtesting'
python3 duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate
```

启动本地查价 API：

```bash
cd '/home/leo/myworkspace/trading/backtesting'
python3 price_lookup_api.py --db-file trading_data.duckdb
```

Linux 下也可以直接用脚本：

```bash
cd '/home/leo/myworkspace/trading/backtesting'
bash restart_api.sh
```

停止 API：

```bash
cd '/home/leo/myworkspace/trading/backtesting'
bash stop_api.sh
```

健康检查：

```bash
curl -s 'http://127.0.0.1:8765/health'
```

查价示例：

```bash
curl -s 'http://127.0.0.1:8765/price?instrument=NQ&date=2008-01-02&time=09:30&tf=5&field=high'
```

页面中的“价格查询助手”现在已经改成通过本地 API 查 DuckDB，不再依赖单独的数据库服务。

## 本地图片上传

页面中的图片记录支持直接上传到本地 API。

- 上传接口由 [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py) 提供
- 新上传图片默认保存为相对路径，例如 `/backtesting-images/2012/2012-01-05/entry-xxx.png`
- 前端预览和打开原图时会根据当前 `API 地址` 自动拼接完整 URL
- 旧 YAML 里已经保存的绝对 URL 仍然兼容显示
- 图片会保存到：

## 最近新增

页面最近又补了几块结构化复盘能力：

- 隔夜关键点支持更细的标签体系：
  - `Asia / LDN / Transition / PM` 的 `High / Low / Swing High / Swing Low`
  - `Prev Day High / Low / Swing High / Swing Low`
  - `Globex High / Low`
- 关键点的 `in session / out of session` 会按具体标签族判断，不再只按泛化的 `high / low` 判定
- 行情段支持自动按起止关键点价格推算方向，跨交易日区间也可正常工作
- 行情段支持“这段主要做了什么”的结构化记录：
  - `Sweep 某个关键点`
  - `与关键点形成 EQH`
  - `与关键点形成 EQL`
  - `Sweep 某个 EQH/EQL`
  - `Tap 某个 FVG`
  - `Fill 某个 FVG`
  - `Tap 某个 NDOG/NWOG`
  - `Tap 某个 NDOG/NWOG C.E.`
  - `Fill 某个 NDOG/NWOG`
- 隔夜结构新增 `EQH / EQL` 录入：
  - 可从“隔夜关键点”中选择 `2 个或以上` 的关键点组成 `EQH/EQL`
  - 支持图片上传
  - 会进入左侧实时统计
  - 可被行情段动作和 `Reversals -> Reasons` 直接引用
- 如果同一个 `label` 在同一 `T日` 下出现多次，页面显示时会自动附加 `#1 / #2 / ...`
  - 例如：`PM Swing Low #1`、`PM Swing Low #2`
  - 这只是显示层去重，不会改写 YAML 原始 `label`
  - 后续做数据库分析时，建议用 `label + day_offset + time` 区分，而不是只按 `label` 聚合
- 左侧新增实时统计面板，实时显示：
  - `Red Folder News`
  - 基本信息图片数
  - 隔夜关键点数 / 图片数
  - 隔夜 `EQH/EQL` 数 / 图片数
  - 盘前关键 FVG 数
  - 行情段数 / 图片数
  - `Open Reference Range` 是否填写 / 图片数
  - 执行关键点数 / 图片数
  - `Reversals` 数量 / 图片数
  - 入场记录数 / 图片数
  - 所有这些区块都会按 `绿/黄/红` badge 区分已完成、部分待处理、空白占位

## FVG 结构

现在页面支持两组 FVG：

- `隔夜结构 -> 盘前关键 FVG`
- `执行观察 -> 盘中 FVG`

两者字段和计算逻辑相同，都支持：

- `T日`
- 周期：拆成两个下拉框
  - 左侧 `1-30`
  - 右侧 `m / h / d`
- `中间K线时间`
- `direction`
- `FVG high`
- `FVG low`
- `自动计算 FVG`

### FVG 自动计算逻辑

自动计算会根据：

- `T日`
- 周期
- 中间K线时间

定位三根同周期 K 线：

- 前一根
- 中间根
- 后一根

然后按下面规则计算：

- `bullish FVG`
  - 条件：`后一根.low > 前一根.high`
  - `FVG high = 后一根.low`
  - `FVG low = 前一根.high`
- `bearish FVG`
  - 条件：`前一根.low > 后一根.high`
  - `FVG high = 前一根.low`
  - `FVG low = 后一根.high`

如果这三根 K 线不满足上述条件，页面会提示“未形成有效 FVG”，不会写入错误结果。

### FVG 与 YAML

导出时会新增：

- `overnight_structure.premarket_key_fvgs`
- `execution_observation.intraday_fvgs`

行情段里的 `tap 某个 FVG` 会引用 `盘前关键 FVG`，并在 YAML 中带上：

- `fvg_day_offset`
- `fvg_timeframe`
- `fvg_middle_candle_time`

## EQH / EQL 结构

现在页面支持在 `隔夜结构` 中直接录入 `EQH / EQL`：

- 字段：
  - `type`: `eqh / eql`
  - `key_points`: 由两个或以上隔夜关键点组成
  - `images`
- 导出 YAML 时会写到：
  - `overnight_structure.eq_levels`

示例结构：

```yaml
overnight_structure:
  eq_levels:
    - type: eqh
      key_points:
        - "T-1 18:32"
        - "T-1 23:10"
      images:
        - url: "http://127.0.0.1:8765/images/..."
          title: "EQH 标注"
```

行情段动作新增：

- `sweep_eq_level`

导出 YAML 时会带上：

- `eq_level_type`
- `eq_key_points`

同时，`Reversals -> Reasons` 会动态汇总：

- 隔夜关键点
- 隔夜 `EQH/EQL`
- 盘前关键 FVG
- 关键 `NWOG/NDOG`
- 执行关键点
- 盘中 FVG

## API 变更

为了支持 `1-30 + m/h/d` 的 FVG 周期自动计算，本地查价 API 的 `tf` 校验已放宽为“任意正整数分钟数”，不再只限制在固定枚举值。

如果本地已经启动过旧版 [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py)，更新代码后需要重启 API，新的 FVG 自动计算才会生效。

```text
backtesting-images/<year>/<yyyy-mm-dd>/
```

- 页面会自动把返回的相对路径写入当前图片项
- 也支持先聚焦粘贴区，再用 `Ctrl+V` 粘贴剪贴板截图

如果只是页面交互或样式更新，通常替换 [yaml_panel.html](/home/leo/myworkspace/trading/backtesting/yaml_panel.html) 即可；如果涉及图片上传功能，则需要同时更新 [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py)。

## Windows 使用

Windows 端最稳的方式是使用 `windows_bundle`：

- 导入数据：

```powershell
python duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate
```

- 启动 API：

```powershell
python price_lookup_api.py --db-file trading_data.duckdb
```

或者直接：

```powershell
restart_api.bat
```

- 打开页面：

```text
http://127.0.0.1:8000/yaml_panel.html
```

如果这次只是页面样式或交互更新，而 Python 文件没变，通常只需要把最新的 [yaml_panel.html](/home/leo/myworkspace/trading/backtesting/yaml_panel.html) 覆盖到 Windows 目录即可。

如果这次改动涉及以下能力，则 Windows 端需要同时更新 [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py)：

- 本地图片上传
- `backtesting-images/<year>/<date>/` 新路径规则
- 图片静态访问
