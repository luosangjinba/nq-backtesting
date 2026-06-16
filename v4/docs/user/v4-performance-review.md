# V4 执行效率 Review

> 评审范围：前端 `src/`（~3.9 万行）+ 后端 `v4_api.py` / `server/price_lookup.py` + 945MB DuckDB
> 关注重点：运行时性能热点（非微优化，聚焦系统性放大效应）
> 评审日期：2026-06-16

---

## 结论先行

最大杠杆在两处：

1. **后端**：每个 HTTP 请求都新建并销毁 DuckDB 连接，叠加堆表无索引的全表扫描。
2. **前端**：选择高亮触发全量 primitive 重建，把「点一下」放大成对两张图全部标注对象的销毁+重建。

两者都不是微优化，是系统性放大效应。落地这三项（连接复用 + 物理排序 + 选择/重建拆分）后，其余 P1/P2 多半自然缓解。

---

## 一、后端

### 🔴 P0 — 每个 HTTP 请求新建并销毁 DuckDB 连接，零复用

`open_db()`（`price_lookup.py:12-16`）被 `:57/:97/:132` 和 `v4_api.py:513` 每次 `with open_db(...)` 调用——**每个请求 `duckdb.connect(945MB, read_only)` 然后 close**。

- 固定 per-request 开销：打开 945MB 文件、读 catalog、初始化 buffer manager，与查询本身无关。
- 更伤的是：连接销毁丢弃了 DuckDB 的 **buffer pool / row-group 缓存**。复用连接时热数据（catalog、常查 row group）留在内存，第二次查询快得多；当前每次冷启动。
- `ThreadingHTTPServer` 每请求一线程，N 个并发 = N 个独立连接同时开同一文件。

**改进**：进程级单例 read_only 连接 + 每线程 `conn.cursor()`（DuckDB 单连接可多 cursor，read_only 下并发安全），或小连接池。**改动最小、收益普惠**，建议第一个做。

### 🔴 P0 — 堆表无索引/排序键，所有查询全表扫描

`futures_1m` 是纯堆表：只有 `instrument/ts/ohlc/volume`，**全仓零 `CREATE INDEX`/`PRIMARY KEY`/排序键**。三处查询 `where instrument=? and ts>=? and ts<?`（`price_lookup.py:48,124`、`v4_api.py:496`）都靠在 945MB 堆表上扫描。

- DuckDB 默认无二级索引，唯一加速手段是 **zonemap（row group min/max 跳过）**，但它只在数据物理有序时有效。
- 导入时 `sort_values(["instrument","ts"])`（`update_databento_1m.py:298,322`）只排了 DataFrame，**insert 进堆表后物理顺序不持久化为可跳过结构**，多次增量 insert 后行物理交错 → zonemap 失效 → 即便 `query_price` 的 `ts=?` 等值查询、`limit 1` 也得扫整段 row group。

**改进**：一次性 `CREATE TABLE futures_1m_sorted AS SELECT * FROM futures_1m ORDER BY instrument, ts` 重建让 zonemap 生效（范围查询通常提速一个数量级），增量导入后定期重排。**收益最大**。

### 🟡 P1 — 日线/多 tf 聚合：`first/last order by ts` + 逐行 floor-bucket

`v4_api.py:502-525`（日线）、`price_lookup.py:76-96`（其他多分钟 tf）：

- `first(open order by ts)`/`last(close order by ts)` 是**带排序的聚合**，日线限额 3650 天 → 底层数百万 1m 行先扫再排再聚合。
- `floor(extract(epoch ...))` + `date_trunc` + `extract(hour ...)` 是逐行标量浮点运算，无法用索引。
- 这建立在 #1 全表扫描之上，所以**大范围日线请求是最慢的单个查询**。

**改进**：物化常用高 tf（如日线）为单独表，避免每次从 1m 实时聚合；或依赖 #1 物理排序后 `first/last order by ts` 更便宜。

### 🟡 P2 — 大结果集逐行 Python 转换 + 全量 json.dumps

`price_lookup.py:60-71` 每根 bar 4-8 次 `float()` + `strftime` + `replace(tzinfo).timestamp()`；`v4_api.py` 对整 list 一次 `json.dumps().encode()`，峰值内存 = 整串 JSON、无流式。`tf=1` 限额 45 天 ≈ 6.5 万 bar，纯 Python 循环串行累加可达数十~上百 ms。次级开销。

**改进**：`.fetchnumpy()`/Arrow 批量取数绕过逐行 Python；`strftime`/`epoch` 在 SQL 里算；`orjson`。优先级低于 #1/#2。

### ✅ 已确认不是问题（避免误改）

- **`_validate_bars_request_range` 上限保护存在且正确**（`v4_api.py:58`，`tf=1`→45 天，超限 413）。一次拉几年 1m 会被拒，**无需放大限额**。
- **economic_events 有进程级缓存**（`_ECONOMIC_EVENTS_CACHE`），不是每次重读 CSV。残留小问题：`query_economic_events` 每请求对全量线性 filter 且重复 `_parse_date`（`v4_api.py:470-481`），24K 行单次几 ms，低优先级。

---

## 二、前端

### 🔴 P0 — 选择高亮触发全量 primitive 重建（单击卡顿主因）

每个渲染器收到**任意**事件都 `clearPrimitives(全部)` + 逐个 `new XxxPrimitive` 重新 attach。问题是这些事件里混着高频的**「选择变化」**——选择只改了一个对象的高亮色，却重建了全部：

- `segment-renderer.js:55` `renderSegments()` 全量 detach+new，绑在 `segment:selected`/`segment-group:selected` 等 **6 个事件**上。
- `pda-renderer.js:459` 全量重建，绑 **11 个事件**（含 `segment:selected`/`segment:changed`）。
- `order-review-renderer.js:388`、`time-overlay-renderer.js` 同模式。

**放大效应**：在 inspector 里点一下某个 segment（`segment-selection.js:37`）→ 唤醒 6 个监听器，其中 **4 个全量重建**（主图/副图 segment + 主图/副图 PDA）。每次 detach/attach 让 LightweightCharts 重排重绘。复杂度 O(N_segment + N_pda) 次对象构造，标注上百时单击明显卡顿。

**改进**（收益最大、范围最集中）：

1. 把「选择变化」与「数据变化」分开：选择只改高亮，应**就地 `primitive.applyOptions`**，而非 teardown+rebuild。
2. 按 id diff（增/删/改），只对增量 attach/detach。
3. 同一交互多 renderer 重复响应同一事件，可在事件总线层做一次 RAF coalesce。

### 🟡 P1 — ChartNote 文字布局在每帧 `draw()` 内重算

`chart-note-primitive.js:83` 的 `draw()`（LightweightCharts 每帧路径：平移/缩放/crosshair/resize 都触发）内直接 `buildChartNoteLayouts(...)`，每条 note 多次 `ctx.measureText` + 车道防重叠最坏 O(n²)。对比 hit-test 路径**有缓存**（`chart-note-hit-test.js:66`），draw 路径**没有**。

**改进**：把 hit-test 已有的布局缓存复用到 draw（按 可见范围+notesVersion+canvas 尺寸+字体 做 key），`update()` 算一次，`draw()` 只读。

### 🟡 P2 — replay crosshair 回调里 O(n) 线性查找 + 未节流

`replay-controls.js:600` `findBarIndex(time)` 用 `findIndex` O(n) 线性扫描，在 `handleCrosshairMove` 里调用且**无 RAF 节流**（对比 manual-smt、cross-chart hover 都做了节流）。picking 模式下每次鼠标移动触发，chartData 可达上千根。`findBarIndexAtOrBeforeTimestamp`（`:149`）对有序数组也用线性 for，应二分。

**改进**：改 Map O(1) 查找（项目已有 `display-bar-lookup.js` 同款缓存）或二分，并给回调套 `createRafThrottle`。

### 🟡 P3 — 渲染循环内线性 find（标注多/日线时累积）

- `pda-renderer.js:195` 循环内 `.map(id => getSegmentById(id))`，而 `getSegmentById`（`segment-store.js:202`）是 `.find()` O(n) → O(responses × segments)。渲染前建一次 `Map(id→segment)`。
- `time-projection.js` `mapTimestampToChartTime` 在**日线**分支用 `bars.find()` O(n)，每 primitive 调一次 → O(annotations × bars)。日线下预建 timestamp→tradingDay Map。
- `segment-renderer.js:43` `getSortedGroupChildren` 每个 group 都 `new Map(getSegments()...)` 是 O(groups × segments)，建议提到 `renderSegments` 顶部建一次共享 Map。

### ✅ 已确认不是问题（避免误改）

- **crosshair → OHLC legend**：`chart-manager.js:25` `updateLegend` 有 `lastLegendKey` 短路，只在 OHLC 真变化时改 innerHTML。
- **chart-note mousemove hover**：`chart-note-selection.js:97` 已 `createRafThrottle`，hit-test 布局有缓存。
- **cross-chart hover 同步**：`secondary-chart-controller.js:316/348` 用 RAF 合并 pending。
- **localStorage 持久化**：标注是点击放置、无拖拽移动路径，序列化只在离散编辑（`segment:changed`）时触发，不在每帧/每次鼠标移动。
- **objective-gaps.js**：多处全量 `.filter`/`.find`，但只在用户显式点击 NDOG/NWOG 时跑一次，不在渲染/事件循环里，**不是运行时热点**。
- **`bars:loaded` 的 18 个监听器**：只在加载新区间时触发一次，各 renderer 全量重建在这里是合理的（数据真的全换了）。

---

## 三、重要纠偏：`/v4/price` 当前不是热路径

架构 review 把 `/v4/price` 硬编码 NQ 列为 P0 正确性 bug——那仍成立。但从**效率**角度要纠正：`fetchPrice` 在 `src/api.js:15` 有定义，**全前端零调用点**（已 grep 确认），crosshair legend 从已加载 bar 数据本地读（`chart-manager.js:25` 还有 `lastLegendKey` 短路）。所以悬停取价**不发后端请求**，「每次悬停新建连接」的担忧在当前前端不成立。

但**一旦接线**（或外部脚本调用），`query_price` 会暴露最坏组合：等值查询 + 无索引全表扫描（后端 #1）+ 每次新建连接（后端 #2）。接线前必须先落实后端 #1/#2，且 `api.js` 当前**无任何节流**，需加 debounce。

---

## 四、优先级汇总

| 优先级 | 问题 | 位置 | 一句话 |
|--------|------|------|--------|
| 🔴 P0 | 每请求新建/销毁 DuckDB 连接 | `price_lookup.py:12` | 进程级单连接 + per-thread cursor，改动最小 |
| 🔴 P0 | 堆表无索引，全表扫描 | `price_lookup.py:48,124`；`v4_api.py:496` | `ORDER BY instrument,ts` 物理重排让 zonemap 生效 |
| 🔴 P0 | 选择高亮触发全量 primitive 重建 | 4 个 renderer + 选择事件 | 选择只改高亮 → 就地 `applyOptions`，不 teardown |
| 🟡 P1 | 日线/多 tf 排序聚合大范围扫描 | `v4_api.py:502`；`price_lookup.py:76` | 物化高 tf 表 / 依赖排序 |
| 🟡 P1 | ChartNote 每帧重算布局 | `chart-note-primitive.js:83` | 复用 hit-test 已有布局缓存 |
| 🟡 P2 | replay `findBarIndex` O(n) + 未节流 | `replay-controls.js:600` | Map/二分 + RAF 节流 |
| 🟡 P2 | 大结果集逐行 float/strftime | `price_lookup.py:60` | Arrow/numpy 批量 + SQL 内格式化 |
| 🟡 P3 | 渲染循环内线性 find | `pda-renderer.js:195` 等 | 渲染前预建 id→对象 Map |

**最高杠杆顺序**：后端先做连接复用（最小改动）+ 物理排序（最大收益）；前端做选择/重建拆分（单击卡顿主因）。这三项落地后，P1/P2 多半自然缓解。
