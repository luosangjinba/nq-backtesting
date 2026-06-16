# V4 架构总览 Review

> 状态：历史归档 / 已处理
> 处理结论：本报告中的高优先级事项已纳入并完成 Step 292（见 `v4/sessions/session_20260616_architecture_review_fix_plan.md` 与 `v4/TODO.md`）。本文保留为 2026-06-16 当时的架构评审快照，不再作为当前待办清单使用。
> 后续查看方式：若要看仍然 deferred 的架构重构项，请看 Step 292 session 的 `Deferred Architecture Work`，不要直接按本文的原始优先级执行。
>
> 评审范围：V4 整体架构总览
> 关注重点：正确性 Bug、代码质量、性能
> 评审日期：2026-06-16
> 代码规模：196 个 JS 文件（~3.9 万行）+ 26 个 Python 文件（~5.8 千行）

---

## 一、整体架构判断

V4 是一套 **纯前端（vanilla ES module，无框架无打包器）+ 轻量 Python 后端** 的 NQ 期货 ICT 手动复盘/标注系统。整体架构是**健康的**，核心设计值得肯定：

- **事件总线解耦**：`event-bus.js`（24 行）是脊柱，几乎所有跨模块通信走 pub/sub，**无循环依赖**（交叉验证确认）。
- **分层清晰**：`store → persistence → renderer → selection` 单向依赖。store 只依赖 event-bus/config，persistence 依赖 store 而非反向。
- **关键数据切分正确**：`bar-store` 把 `getBars()`（含 padding 全量，供指标计算）和 `getDisplayBars()`（仅请求范围，供渲染）分开，设计意图明确（`bar-store.js:54-58`）。
- **后端边界干净**：`server/price_lookup.py` 是唯一 DB 访问层，所有用户输入走 `?` 绑定参数，连接全部 `with` 托管，localhost-only 绑定，无硬编码密钥，无 `shell=True`/`os.system`。

`app.js`（162 行）是唯一编排入口，导入各域的 `init*` 函数并接线唯一的跨域绑定（`bars:loaded → chart.setData`），结构清爽。

**数据流**：`api.fetchBars` → `bar-store.setBars` → emit `bars:loaded` → `app.js` 映射 display bars → `chart.setData`；并行地，各域的 render/persistence 监听 `bars:loaded`/`primary-instrument:changed` 来重绘或重载。

---

## 二、正确性 Bug（按严重度）

### 🔴 P0 — `/v4/price` 完全无视 instrument 参数，硬编码 NQ

`_handle_price`（`v4_api.py:624`）调用 `query_price(int(timestamp), DB_PATH, TABLE_NAME)`，从不传 instrument；而 `query_price` 签名 `instrument: str = "NQ"`（`price_lookup.py:117`）默认就是 NQ。

**后果**：只要切到 ES 或其它合约，鼠标悬停取价拿到的全是 NQ 的价格，且**静默错误无任何提示**。`/v4/bars` 是正确传 instrument 的（`v4_api.py:587,596`），所以这是 price 端点的孤立疏漏。

**修复**：`_handle_price` 读取 `instrument` 参数并透传。建议同时确认前端 `api.fetchPrice` 是否带上了当前合约。改动极小，但静默错价对复盘判断有实质影响。

### 🟠 P1 — 维护时段排除口径在两处不一致

日线聚合用 `not (extract(hour from ts) = 17)`（`v4_api.py:499`），而 `generate_daily_regime_csv.py:61` 用 `< '17:00' or >= '18:00'` 形式。两者**意图都是剔除 17:00–18:00 CME 维护缺口**，但表达不同。

若 regime CSV 与日线 bar 按同一交易日 join，边界差异可能导致某些日子的 regime 标注对不齐。需要验证两者在所有日期上结果一致（尤其夏令时切换日）。

---

## 三、代码质量

### 模块模式有偏离，order 域最乱

- **`order/` 域命名分裂**：store/persistence/renderer/active 用 `order-review-*`，而 hit-test/projection/selection 用 `order-setup-*`，外加 `setup-set.js`。一个域两套前缀，是最难导航的部分。
- **`smt/` 偏离最大**：只有 store/renderer/manual-smt，**无 persistence、无 selection**，且不在 localStorage key 列表里——SMT 数据看起来不持久化（刷新即丢）。如果这是有意的"草稿态"要在文档里写明，否则是隐患。
- **`active` 层只存在于 order 和 live-record 两个域**，所以"active/persistence/renderer/selection 四层"并非通用模式，不要当成全局约定。

### 持久化层是手工复制的克隆，有漂移

pda/segment/order/live-record 的 persistence 文件骨架几乎一字不差（`handleStorageError`/`restoring`/`STORAGE_VERSION`）。漂移信号：`live-record-persistence.js` 的错误标签是英文（"read/clear/save"），其它三个是中文（"读取/清除/保存"）。一个 `createDomainPersistence` 工厂能收掉约 5 个文件。

### 存储 key 两套命名共存

新约定 `v4:` + 按合约命名空间（via `getInstrumentStorageKey`），但 `v4.dateRangeHistory`（`calendar-navigator.js:34`）和 `v4.replayHistory`（`replay-history-store.js:1`）是旧的点号约定、**不按合约隔离**。这两个是异类，切换合约时会串数据。

### 死事件 + 超大文件

- `primary-instrument:ready`（`primary-instrument-store.js:50`）emit 了但**零监听**，要么是漏接线要么是残留。
- 超 800 行的重构候选：
  - `ui/inspector-sidebar.js`（1185）
  - `review/review-archive.js`（1070）
  - `pda/manual-annotation.js`（965）
  - `time-reaction/daily-time-review-store.js`（919，一个 store 这么大说明职责混了）
  - `ui/inspector/calendar-panel.js`（914）
  - `ui/replay-controls.js`（902）
  - `ui/inspector/time-reaction-actions.js`（823）
  - `order/order-setup-chart-actions.js`（811）

---

## 四、性能

后端是历史查询读路径，无明显热点。前端值得留意两点：

- **指标计算用 `getBars()` 全量（含两侧 padding）**：`objective-gaps.js:134,197` 等。padding 是两侧对称加的（`price_lookup.py:44-46`，`query_start/query_end` 都减/加 `pad_minutes`），意味着 `getBars()` 里包含请求范围右侧的"未来" bar。对手动复盘工具本身不是 bug，但若任何指标逻辑遍历全量 bar 而没有以 displayBar 边界为界，可能把未来 bar 算进当前评估——这点要逐个指标确认（本次未深入到每个指标实现）。
- `status:update` 事件有 **329 处 emit、仅 1 个监听**（全局状态栏）。量大但单监听，影响可控；只是提示这条通道很热。

---

## 五、合规/安全提醒

- **`Decimal` 规则未遵守**：后端 OHLC 全程 `float`（price_lookup.py 16 处 + v4_api.py:529-533 + regime 脚本）。缓解事实：这是序列化成 JSON 的读路径（JSON 无 Decimal 类型），用于展示而非记账，实际风险低。但按 CLAUDE.md 字面规则未达标，建议在文档注明"展示读路径豁免"或保留说明。
- **无鉴权的 POST 维护端点 + 通配 CORS**：`/v4/data_maintenance/run` 无鉴权、会 spawn 子进程写 DuckDB，配合 `Access-Control-Allow-Origin: *`，理论上**可被任意本地网页 CSRF 触发**（CORS 挡读不挡发）。虽绑 localhost 风险有限，但这是最高安全项。已有的输入白名单/确认串/互斥锁是好的缓解，建议再加一个 CSRF token 或自定义 header 校验。
- **错误响应直接回 `str(e)`**（`v4_api.py:580-582,626`），会泄露文件系统路径，建议生产环境收敛。

---

## 六、优先处理建议

| 优先级 | 项目 | 说明 |
|--------|------|------|
| P0 | 修 `/v4/price` instrument bug | 改动极小，但静默错价对复盘判断有实质影响 |
| P1 | 核对维护时段两处口径一致性 | 涉及 regime 与日线 bar 对齐 |
| P2 | 确认 SMT 不持久化是否有意 | 补文档或补 persistence |
| P2 | 给维护端点加 CSRF 防护 | 最高安全项 |
| P3 | 收敛超大文件 / 抽 persistence 工厂 | 长期可维护性 |

---

## 附：架构正面发现

- 无循环依赖（事件总线刻意规避）
- 连接全部 `with` 托管，用户输入全部参数化绑定
- localhost-only 绑定，无硬编码密钥
- 无 `shell=True`/`os.system`
- regime 指标因果计算（无前视）
- 写入路径用事务 + rollback
