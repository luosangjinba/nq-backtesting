# V4 修复复审 Review

> 状态：历史归档 / 已处理
> 处理结论：本报告中的维护端点 Origin/CORS follow-up 已纳入并完成 Step 294（见 `v4/sessions/session_20260616_fix_review_followup_plan.md` 与 `v4/TODO.md`）。本文保留为 2026-06-16 当时的修复复审快照，不再作为当前待办清单使用。
> 后续查看方式：以 Step 294 session 的实现记录和验证命令为准；性能优化优先级继续以 Step 293 baseline 为准。
>
> 评审范围：架构 review + 效率 review 提出问题后的修复状态
> 复审基准：commit `93e8414 Fix architecture review issues`、`9011598 Add performance baseline benchmarks`、`61b1aca Archive performance review report`
> 工作区状态：干净，改动已提交
> 评审日期：2026-06-16

---

## 结论先行

三类问题的修复进度不一：

- **`/v4/price` instrument bug（原 P0 正确性）** —— 已正确、干净地修复，前后端一致。
- **维护端点 CSRF 防护（原最高安全项）** —— 方向对但**不彻底**：自定义 header 校验挡住了无 JS 的表单 CSRF，但通配 CORS 把基于 fetch 的 CSRF 防御让掉了。需补 Origin 校验。
- **性能两个 P0（连接复用 + 物理排序）** —— **零落地**，目前仅完成 benchmark 基线（合理的工程节奏：先量化再优化）。

---

## 一、✅ 已正确修复

### `/v4/price` 不再硬编码 NQ

**后端**（`v4_api.py`）：新增 `_parse_price_request(params)` 统一提取 `timestamp` + `instrument`，`_handle_price` 改为：

```python
timestamp, instrument = _parse_price_request(params)
result = query_price(timestamp, DB_PATH, TABLE_NAME, instrument)
```

不再调用默认 `instrument="NQ"` 的签名，instrument 全程透传。

**前端**（`api.js:15`）：`fetchPrice(timestamp, instrument = 'NQ')` 用 `URLSearchParams` 带上当前合约。

**附带改进**：price 端点现在区分 `ValueError → 400`（参数缺失/解析失败）与 `Exception → 500`，比原来全部 500 更准确。

**评价**：修得干净，前后端一致。唯一遗留：`fetchPrice` 仍**全前端无调用点**（与前两次 review 一致），所以此修复属于"为未来接线做对"，当前不生效——这不是问题，只是提醒该端点尚未真正被使用。

---

## 二、⚠️ 修得不彻底 —— CSRF 防护可被绕过（本次最重要发现）

维护端点 `/v4/data_maintenance/run` 加了自定义 header 校验（`v4_api.py`）：

```
X-V4-Maintenance-Request: data-maintenance   // 缺失或不符 → 403
```

`data-maintenance.html` 两处 POST 也已带上该 header。思路正确——自定义 header 让无 JS 的表单 POST 无法伪造。**但与现有通配 CORS 组合后，挡不住基于 fetch/XHR 的 CSRF**：

`do_OPTIONS`（`v4_api.py:656-661`）对**任意 origin** 返回：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-V4-Maintenance-Request
```

攻击链：

1. 恶意页面 `evil.com` 用 `fetch()` 向 `http://127.0.0.1:8766/v4/data_maintenance/run` 发 POST，带上自定义 header。
2. 浏览器因自定义 header 触发 preflight（OPTIONS）。
3. 服务器**明确把该 header 放行给所有 origin** → preflight 通过。
4. 实际 POST 照发，header 合法 → 维护动作执行。

绑 `127.0.0.1` 不构成屏障：浏览器能从任意 origin 向 localhost 发请求。

**净效果**：

| CSRF 类型 | 是否被挡 | 原因 |
|---|---|---|
| 无 JS 的表单 POST | ✅ 挡住 | 表单设不了自定义 header（真实增益） |
| fetch / XHR | ❌ 未挡住 | preflight 完全放行了该 header 给 `*` |

**修复建议**：在 POST 处理里**校验 `Origin` 头**，只接受已知静态页 origin（`WEB_PORT` 那个），或把 `Allow-Origin` 从 `*` 收窄到该 origin。静态页在 `WEB_PORT`、API 在 8766 本就跨域，不能简单同源化，但可白名单化。**header 校验 + Origin 校验两者组合才稳**。

---

## 三、❌ 性能 P0 尚未落地（仅完成基线）

`9011598` 只新增了测量工具，未改优化代码：

- `scripts/benchmark_v4_performance.py`（270 行）—— 后端查询计时 + 物理布局诊断。
- `tests/performance-selection-benchmark.js`（263 行）—— 前端选择重建基线。

逐项核对优化是否落地：

| 效率 review 的 P0 | 当前状态 | 证据 |
|---|---|---|
| 连接复用 | ❌ 未做 | `price_lookup.py:16` 仍是每请求 `duckdb.connect(...)` |
| 堆表物理排序 / 索引 | ❌ 未做 | 无 `futures_1m_sorted`、无 `CREATE INDEX`；benchmark 反而加了 `--physical-order-scan` 来**度量**乱序程度（`instrument_inversions` / `ts_inversions`） |
| 前端选择全量重建拆分 | ❌ 未做 | benchmark 先建基线 |

**评价**：这是合理的工程节奏——先 baseline、再决策、后优化，`--physical-order-scan` 先量化物理乱序正是正确做法。但要明确：**效率 review 的两个后端 P0 + 一个前端 P0 目前零落地**，结论尚未兑现。下一步应基于 benchmark 实测数据决定排序重建的收益再动手。

---

## 四、遗留未动小项

- **错误响应仍回 `str(e)`**（`v4_api.py` price 的 500 分支、POST 的 500 分支、economic_events 的 500 分支 `:653`），泄露文件系统路径的风险照旧。
- **维护时段两处口径**（`v4_api.py:499` 的 `extract(hour)=17` vs `generate_daily_regime_csv.py:61` 的 `<'17:00' or >='18:00'`）本次未动，仍需验证在所有日期（尤其夏令时切换日）一致。

---

## 五、优先处理建议

| 优先级 | 项目 | 说明 |
|---|---|---|
| P0 | 给维护端点补 **Origin 白名单校验** | 当前 header 校验被通配 CORS 架空，fetch CSRF 仍可触发写 DB |
| P1 | 基于 benchmark 实测决定**连接复用 + 物理排序**落地 | 效率 review 的最高杠杆项，基线已就绪 |
| P2 | 核对维护时段两处口径一致性 | 涉及 regime 与日线 bar 对齐 |
| P3 | 收敛 500 分支的 `str(e)` 输出 | 避免路径泄露 |

---

## 附：本次确认正确的修复

- `/v4/price` instrument 透传：前后端一致，错误码分级（400/500）合理。
- 维护 header 对**表单类 CSRF** 是真实增益（只是不足以覆盖 fetch 类）。
- 性能改动采用 baseline-first 节奏，`--physical-order-scan` 先量化再决策，方向正确。
