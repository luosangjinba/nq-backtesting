# Kronos NQ 盘前 Bias 预测研究

## 目标
用历史 NQ 5m K线数据，通过 Kronos 预测盘前 bias（bullish/bearish/neutral）

## 背景
- 2026-04-13 开始重启研究（之前 2026-04-14 有过 session）
- 之前评估过 Kronos 是最相关的方案：把 K线当"金融语言"的 foundation model

## Kronos 项目信息
- GitHub: https://github.com/shiyu-coder/Kronos
- HuggingFace: NeoQuasar/Kronos-small（24.7M 参数）, NeoQuasar/Kronos-mini（4.1M 参数）
- AAAI 2026 录用
- 核心思路：K线Tokenizer → Transformer 自回归预测

## 数据
- NQ 1m 数据：DuckDB `/home/leo/myworkspace/trading/backtesting/trading_data.duckdb`
- 时间范围：2008-01-02 ~ 2025-11-04，约 590 万行
- 时间戳格式：UTC 06:xx 开始（北京时间 +8，疑似交易所时间）

## Pipeline 设计
1. 从 DuckDB 导出 NQ 5m 数据（9:30-12:00 ET morning session）
2. 输入：~512 根最近 5m K线（9:30 前的 lookback）
3. Kronos 预测：接下来 30-40 根 5m K线
4. 从预测路径提取 bias：
   - bullish: net_move > T AND up_move > down_move × a
   - bearish: net_move < -T AND down_move > up_move × a
   - neutral: 其他
5. T ≈ 20-30 NQ 点，a ≈ 1.2-1.3（待优化）

## 数据切分
- 训练：2017-2022
- 验证：2023
- 测试：2024~

## Bias Label 参数（初版，待回测确定）
- T ≈ 20-30 NQ points
- a ≈ 1.2-1.3

## 运行计划
- 在 Leo 自己的 NVIDIA 机器上跑（不在本机 CPU）
- 需要：PyTorch + transformers + Kronos 代码
- Kronos-mini（4.1M）适合首次验证

## 相关 Session
- 2026-04-14 session: NQ regime analysis 完成，Kronos 评估完成
- 2026-04-25: 重启研究，整理记录

## 待办
- [ ] 导出 NQ 5m morning session 数据到 CSV
- [ ] 写 Kronos 推理脚本
- [ ] 在 NVIDIA 机器上运行
- [ ] 回测 bias label 历史命中率
- [ ] 评估是否需要 finetune
