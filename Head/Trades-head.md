

Trade ID -> YYYY-MM-DD-Ticker-01

---
Date -> YYYY-MM-DD

---
Ticker -> 标的
- NQ
- ES
- MNQ
- MES
---
Direction -> 交易方向
- `Long`
- `Short`
---
Inversion Time -> 这一笔交易入场前反转的时间

---
Entry Time -> 入场时间

---
Close Time -> 平仓时间

---
Session
- `Asia`
- `London`
- `NY AM`
- `NY Lunch`
- `NY PM`
- `Power Hour`
---
Killzone
- `London Open`
- `London Close`
- `NY AM`
- `Lunch`
- `NY PM`
- `Power Hour`
- `Off Killzone`
---
Minute Context Snapshot -> [^1]自由文本

---
Daily Bias -> 日线偏见（与Daily表一致）
- `Bullish`
- `Bearish`
- `Neutral`
- `Two-Way`
- `Wait`
---
Bias Alignment -> 这笔交易与日线方向是否一致
- `Aligned`
- `Counter`
- `Neutral`
---
Daily Context Ref -> 指向Daily表的同一日期

---
Trade Narrative -> [^2]自由文本

---
HTF Tap -> 高周期触发了什么导致这笔交易(主要触发)
- `None`
- `Weekly High`
- `Weekly Low`
- `Daily High`
- `Daily Low`
- `PDH`
- `PDL`
- `4H FVG`
- `1H FVG`
- `4H OB`
- `1H OB`
- `EQ`
- `Other`
---
Sub-Tap -> 次要触发
- `None`
- `15m FVG`
- `5m FVG`
- `3m FVG`
- `1m FVG`
- `15m OB`
- `5m OB`
- `3m OB`
- `1m OB`
- `IFVG`
- `VWAP`
- `Other`
---
Dealing Range Position(LTF) -> 本笔交易发生时价格处在 LTF Dealing Range的什么位置
- `Premium`
- `Discount`
- `Equilibrium`
- `Above Range`
- `Below Range`
- `Unclear`
---
Context (Setup) -> 本笔交易
- 930 Judas Swing
- 945 inversion
- 950 macro
- `NY Reversal`
- `Liquidity Sweep Reversal`
- `Breakout Pullback`
- `Range Reversal`
- `News Repricing`
- `Other`
---
Liquidity Event -> 入场前的反转扫了哪个流动性或触碰了哪个不平衡
- `None`
- `PDH Sweep`
- `PDL Sweep`
- `PM High Sweep`
- `PM Low Sweep`
- LDN High Sweep
- LDN Low Sweep
- `Asia High Sweep`
- `Asia Low Sweep`
- `BSL Taken`
- `SSL Taken`
- `Dual Sweep`
- `Internal Liquidity Taken`
- `Other`
---
Trigger -> 入场的形态一眼看起来是什么
- `MSS`
- `CHOCH`
- `CISD`
- `Displacement + FVG`
- `Reclaim`
- `Breakout Pullback`
- `OB Reaction`
- `FVG Reaction`
- `No Clear Trigger`
---
Displacement -> 入场前的反转是否伴随displacement，以及强度

- `Strong`
- `Moderate`
- `Weak`
- `None`
---
Entry Model -> 小周期的入场模型
- `FVG Entry`
- `OB Entry`
- `IFVG Entry`
- `Market Entry on MSS`
- `Limit at Discount`
- `Limit at Premium`
- `Breakout Pullback`
- `Reclaim Entry`
- `Other`
---
Entry Reason -> [^3]自由文本，一句话入场原因

---
Entry -> 入场点位

---
Stop Loss -> 预设止损

---
Target1/Fruit -> 预设目标1/唾手可得的目标

---
Target1 reason -> 预设目标1的原因

---
Optimal Target -> 最优预期目标

---
Optimal Target reason -> 最优预期目标的原因

---
MAE -> 最大不利偏移

---
MFE -> 最大有利偏移

---
Max Swing Amplitude -> 离场前最大回撤

---
Setup Quality -> 本次入场质量，分4个等级，量化暂定





[^1]: 这个字段非常适合你的回测法。
	每次准备入场时，用一句话记录当下K线推进到那一刻，你眼里盘面是什么状态。
	例子：
	930后下扫LDN Low并快速收回，1m FVG形成
	950前上扫EQH但无延续，回到range内
	多头结构未完成，小周期2022出现但逆大结构
	这个字段会极大提升你复盘质量，因为它逼你记录：
	当时为什么觉得可以做，而不是事后补逻辑
	1m MSS after low sweep into 5m discount
	3m displacement from PM low reclaim
	No clean displacement, entry was anticipatory

[^2]: Bullish continuation after pre-open sellside raid and reclaim
	Countertrend short into premium after failed buy-side expansion

[^3]: Entered on 1m FVG after MSS and strong displacement
	Entered on reclaim of PM low with target to PDH
