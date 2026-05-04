# NQ Backtesting V2 — Structure Path Recorder 规格

更新时间：2026-04-13

## 1. 设计动机

V2 的目标不是先做一个“看涨 / 看跌判断器”，而是先建立一个：

- `HTF PDA -> 关键反转点 -> 结构路径 -> LTF 确认 -> likely destination`

的识别系统。

核心原则：

1. **先记录事实，不先做预期**
2. **先记录反转与延续，再让预期从统计中长出来**
3. **高周期 PDA 提供反应区，低周期结构提供确认**
4. **重点研究价格“从哪里出发，走到了哪里，为什么能走到那里”**

这意味着第二层的重点，不是先定义抽象 `bias`，而是先定义：

- 关键反转点
- 结构路径
- 延续与未延续
- 低周期确认

---

## 2. 核心问题

每一段结构记录，最终都要回答这 4 个问题：

1. 价格在哪个高周期 PDA 附近发生了反应？
2. 这个反应形成了哪个关键反转点？
3. 从这个反转点开始，价格走出了哪一段结构？
4. 这段结构是否被更低周期确认，并最终走向哪里？

这 4 个问题，比“今天先看涨还是先看跌”更接近可研究、可统计的事实层。

---

## 3. 三层分工

### 3.1 第一层：HTF PDA Registry

回答：

- 价格向前走时，留下了哪些 `1W / 1D / 4H / 1H` PDA
- 这些 PDA 的边界是什么
- 它们后续发生了哪些动态事件

这一层已经拆成：

- `pda_registry`
- `pda_events`

### 3.2 第二层：Structure Path Recorder

回答：

- 某个高周期 PDA 附近，价格是否发生关键反转
- 反转点连起来后，形成了怎样的结构路径
- 这段路径是在：
  - `internal -> external`
  - `external -> internal`
  - `internal -> internal`
  - `external -> external`
  中的哪一种
- 价格延续了多少
- 没延续时卡在哪、为什么失败

### 3.3 第三层：Daily Journal

回答：

- 在 `9:29 -> 11:00` 这个具体交易日里
- 当前活跃的高周期 PDA 和结构路径是什么
- 哪些 LTF 信号确认了高周期反应
- 最终机会是否形成、是否可交易、结果如何

---

## 4. 关键定义

### 4.1 Key Reversal Point

关键反转点不是任意高低点，而是：

- 发生在高周期 PDA 附近
- 后续确实引发了可观察结构变化
- 可以作为一段结构路径的起点

它的意义不是“这里有个点”，而是：

- “从这里开始，价格进入了另一段有结构意义的路径”

### 4.2 Structure Path

`Structure Path` = 从一个关键反转点出发，到下一个关键目标或关键失效点之间的价格路径。

它不是单根 K 线，也不是单个 bias 标签，而是一段“从起点到终点”的结构运动。

每段 path 要能描述：

- 起点在哪里
- 起点为什么重要
- 它朝哪个目标运行
- 最终是否抵达
- 如果没抵达，是在哪种结构条件下失效

### 4.3 Internal / External

- `Internal`：
  - FVG
  - OB
  - 其他需要回补、回测、回踩的内部结构

- `External`：
  - 旧高 / 旧低
  - BSL / SSL
  - 更外部的 liquidity pool

路径研究要特别关注：

- `internal -> external`
- `external -> internal`

因为这两类最能体现 ICT 价格传递逻辑。

---

## 5. 第二层的研究对象

第二层暂时不直接研究“bias 是否正确”，而研究：

### 5.1 反转发生了没有

- 在高周期 PDA 附近是否发生反转？
- 是强反转、弱反转，还是仅仅停顿？

### 5.2 延续发生了没有

- 反转后价格有没有真正走出去？
- 延续了多少？
- 延续到哪个层级的目标？

### 5.3 没延续的原因

如果没走出去，原因是什么？

技术层面先只看价格结构，不考虑新闻事件：

- 没有 LTF displacement
- 没有结构确认
- 被更高周期对手 PDA 压住
- 提前进入相反 liquidity
- 只是内部回补，没有形成真正 shift

### 5.4 低周期确认

重点不是精确抄到高周期转折最低点 / 最高点，而是：

- 高周期 PDA 先提供反应区
- 再用 `1H / 15m / 5m / 1m` 的信号确认是否真的转向

低周期确认可包括：

- MSS / shift
- displacement
- LTF FVG
- LTF OB
- liquidity sweep + reclaim

---

## 6. 方法论结论

### 6.1 不先做预期

这套系统当前不优先做：

- “今天预期先涨后跌”
- “为什么最后没有按预期走”

而优先做：

- “实际发生了什么”
- “这些事实在足够多样本里最常导向什么结果”

也就是说：

- **预期不是输入**
- **预期是统计结果**

### 6.2 4H 及以上 PDA 的角色

`4H / 1D / 1W` PDA 通常提供高质量反应区，但系统不把它们直接当成“必然反转”公理。

当前研究假设是：

- 高周期 PDA 往往提供高质量反应区
- 其中相当一部分会产生可交易反转
- 但是否真正转向，需要更低周期确认

### 6.3 交易目标

系统的目标不是：

- 精确抓住高周期反转点

而是：

- 锁定高周期可能反应区
- 用低周期确认
- 逐步建立“价格接下来大概率去哪儿”的识别框架

### 6.4 1H Backbone + NY Open 30M Lens

NQ 的波动放大常从 `09:30` NY Open 开始，而 `09:30` 正好落在常规 `1H` bar 中间。为了避免 1H 结构记录漏掉 NY Open 后的 30M 细节，同时又不把全天结构降级成 30M，第二层采用：

- `primary_timeframe: "1H"` 作为 structure path 的骨架周期
- `execution_lens.anchor: "ny_open"` 作为事件锚点
- `execution_lens.timeframe: "30M"` 用来观察 `09:30-11:00` 的细节表达

记录原则：

- 1H 负责定义 path 的起点、终点、方向、主 liquidity 迁移
- 30M 只用于 NY Open 窗口里的 sweep / reaction / displacement / failure 观察
- 30M 证据可以进入 references 或 main_actions，但不替代 1H path 的主骨架
- `start_time / end_time` 记录实际边界时间，默认使用 `1m` 精度；它们不需要强行对齐到整根 `1H` bar

---

## 7. 第二层最小记录单元（建议）

第一版不要直接做完整状态机，先记录一段段 path。

建议最小记录单元：

```yaml
structure_path:
  id: "path_20241106_4H_001"
  primary_timeframe: "1H"

  execution_lens:
    anchor: "ny_open"
    timeframe: "30M"
    window: "09:30-11:00"
    note: "NY Open 后用 30M 观察 sweep / displacement / reaction"

  htf_context:
    timeframe: "4H"
    pda_refs:
      - "pda_20241106_4H_ob_001"
      - "pda_20241105_D_fvg_001"

  reversal_start:
    time: "2024-11-06 10:00"
    price: 20398.75
    reason: "4H bullish OB + 1D discount FVG"

  path_type: "internal_to_external"
  intended_destination:
    liquidity_type: "bsl"
    target_ref: "pda_20241112_D_bsl_001"
    target_price: 21340.50

  confirmation:
    confirmed: true
    timeframe: "15m"
    signal: "bullish displacement + FVG"

  outcome:
    reached_internal: true
    reached_external: false
    max_extension_points: 420.25
    failure_reason: "ran into opposing 4H bearish FVG"

  note: ""
```

---

## 8. 与 Daily 系统的融合方式

第二层成熟之后，daily 不直接重建高周期逻辑，而是引用：

- 当前活跃 PDA
- 当前有效 structure path
- 当前已经得到 LTF 确认的方向

也就是说，daily 不再自己从零写 `HTF bias`，而是消费：

- 第一层的 `PDA`
- 第二层的 `Structure Path`

---

## 9. 当前不做的事

这一阶段先不做：

- 自动给出最终 bias 分数
- 自动给出看涨 / 看跌结论
- 自动解释每次失败的原因
- 大量事后归因文本

当前只做：

- 记录高周期 PDA
- 记录关键反转点
- 记录结构路径
- 记录低周期是否确认
- 记录走到哪、没走到哪

---

## 10. 下一步建议

执行顺序建议：

1. 先继续把第一层 `PDA Registry` 录顺
2. 再定义第二层 `Structure Path` 的最小 YAML 模板
3. 先用手工样本跑 3-5 条 path
4. 再决定是否需要数据库 schema
5. 最后再把它融合回 daily 系统

这一步的重点不是“判断市场”，而是先把：

- 高周期反应区
- 关键反转点
- 结构延续路径
- 低周期确认

这四件事记录稳定。
