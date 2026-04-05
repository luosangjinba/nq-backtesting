


---
Date -> yyyy-mm-dd

---
Day of Week
- Mon
- Tue
- Wed
- Thu
- Fri
---
Ticker
- NQ
- ES
- MNQ
- MES
- 
---
Macro Regime -> 主观值，无量化标准，如无用可拿掉
- Risk-On
- Risk-Off
- Balanced
- Event-Driven
- Range Environment
- Trend Environment
---
Red Folder News -> 非全部，选取有重要影响的news
- 8:30NFP
- 8:30CPI
- 8:30PPI
- 8:30Retail Sales
- 8:30Durable Goods
- 8:30Claims
- 8:30Core PCE
- 9:55UoM Sentiment
- 10:00ISM PMI
- 10:00JOLTS
- 10:00CB Confidence
- 14:00FOMC
- 14:00FOMC Presser
- Fed Chair Speak
- Fed Speaker
---
HTF Narrative -> 自由文本

---
Daily Bias -> 目前为主观值，可以探讨转为客观值
- `Bullish`
- `Bearish`
- `Neutral`
- `Two-Way`
- `Wait`
---
Bias Confidence -> 主观值
- `High`
- `Medium`
- `Low`
---
Bias Reasoning -> [^2]自由文本

---
Pre-9:30 PDH -> [^7]number

---
Pre-930 PDL -> [^8]number

---
Asia High -> [^9]Number

---
Asia Low -> [^10]Number

---
LDN High -> [^11]Number

---
LDN Low -> [^12]Number

---
Transition High -> [^13]number

---
Transition Low -> [^14]number

---
Premarket High -> [^15]Number

---
Premarket Low -> [^16]Number

---
NY Open -> Number


Pre-930 External Liquidity Taken
- `None`
- `Asia High`
- `Asia Low`
- `PM High`
- `PM Low`
- `PDH`
- `PDL`
- `Asia High + Asia Low`
- `PM High + PM Low`
- `PDH + PDL`
- `Multiple`
---
Pre-930 Sweep Sequence
- `None`
- `High then Low`
- `Low then High`
- `Only High`
- `Only Low`
- `Multiple / Complex`
---
Open Location
- `Near PDH`
- `Near PDL`
- `Near PM High`
- `Near PM Low`
- `In Range High`
- `In Range Mid`
- `In Range Low`
- `At Premium`
- `At Discount`
- `At Equilibrium`
- `Outside Prior Range`
---
9:30 Expectation
- `Open-Drive Higher`
- `Open-Drive Lower`
- `Raid Low then Rally`
- `Raid High then Sell Off`
- `Expand then Reverse`
- `Range / Chop`
- `Wait for News`
- `No Clear Expectation`
---
Pre-Market Context -> [^1]自由文本

---
Primary Idea -> [^3]自由文本

---
Alternate Idea -> [^4]自由文本

---
No-Trade Condition
- `News Risk`
- `No Displacement`
- `No Clear Bias`
- `Mid-Range Open`
- `Chop`
- `Late Entry Only`
- `Emotional State`
- `None`
- `Other`
---
Pre-Market/Post-Market Image -> attachment格式

---
Path -> attachment格式

---
Post-Market Review -> [^5]自由文本

---
Key Lesson -> [^6]自由文本

---
Link to Backtesting-Trades -> 飞书双链接，指向Backtesting-Trades

---
Link to Backtesting-MMXM -> 飞书双链接，指向Link to Backtesting-MMXM


[^1]: example:
- Premarket sold into PM low and reclaimed with displacement before open Balanced premarket range with no clean external liquidity event

[^2]: example:
	
- HTF discount + premarket sellside taken + bullish reclaim
	
- At premium into red folder news, bearish only after confirmation
	
- No clean HTF draw and premarket range too balanced

[^3]: example:
- Buy low raid after MSS targeting PDH Sell premium retracement into 5m FVG targeting PDL

[^4]: example:
- If no low raid, wait for breakout pullback long If bullish reclaim fails, look for continuation short None

[^5]: 回答：
	
-  今天实际如何运行？
	
- 预期对了还是错了？
	
- 哪个时段最好做？

[^6]: example：
- When pre-930 sellside is taken and reclaimed before open, avoid fading first expansion Mid-range opens without displacement are lower quality unless news catalyzes repricing

[^7]: 9:30前的前一日高点

[^8]: 9:30前的前一日低点

[^9]: PD 18:00-TD 02:00

[^10]: PD 18:00-TD 02:00

[^11]: 02:00–05:00

[^12]: 02:00–05:00

[^13]: 05:00–07:00

[^14]: 05:00–07:00

[^15]: 07:00–09:30

[^16]: 07:00–09:30
