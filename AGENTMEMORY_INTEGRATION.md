# AgentMemory 集成说明

## 概述

AgentMemory 已成功部署并集成到本项目的 Claude Code 环境中。它提供持久化的记忆系统，可以跨会话保存和检索项目知识。

## 配置信息

- **服务地址**: `http://localhost:3111`
- **MCP 配置**: `~/.claude/.mcp.json` (已配置)
- **部署目录**: `~/agentmemory-deploy/agentmemory`
- **服务状态**: ✅ 运行中 (端口 3111 监听)

## 已记录的项目知识

已将以下 7 个核心知识模块记入 AgentMemory 系统：

### 1. 项目概览 (Project Overview)
- 项目定位：NQ 期货 ICT 回测系统
- 研究窗口：9:30-10:30 NY Open
- 观察点：9:29 (point-in-time 原则)
- 核心原则：时间优先于价格
- 三层架构：原始数据 → 自动 PDA → 手工结构路径

### 2. 技术架构 (Technical Architecture)
- Layer 0: 原始 1 分钟 OHLCV 数据 (trading_data.duckdb)
- Layer 1: 自动检测的 PDA (scan_layer1_pda.py)
- Layer 1.5: 引用组 (reference groups)
- Layer 2: 人工标注的结构路径 (YAML 为真相源)
- 后端: price_lookup_api.py (端口 8765)
- 前端: React 自包含 HTML 文件

### 3. 设计原则 (Design Principles)
- 时间优先原则
- 9:29 观察点原则
- 9:30-10:30 研究窗口
- 回测系统而非交易日志
- 自动化范围界定
- YAML 为真相源

### 4. PDA 类型和分类 (PDA Types)
- 时间周期：W, D, 4H, 1H, 30M, 15M
- 点类型：bsl, ssl
- 区间类型：fvg, ob, nwog, ndog
- 复合类型：eqh, eql
- 日极值：daily_high, daily_low, ict_midnight_day_high/low
- Layer 1 自动检测 vs Layer 2 手工录入

### 5. 关键命令和操作 (Operations)
- API 服务器：bash restart_api.sh
- 前端服务器：python3 -m http.server 8000
- 数据管道执行顺序
- 原始数据导入
- DuckDB 查询
- 活跃前端：kline_viewer.html

### 6. 数据库结构 (Database Schema)
- trading_data.duckdb: 原始 OHLCV (~460MB)
- v2_research.duckdb: PDA 研究数据 (~130MB)
- 核心表：pda_registry, pda_events, pda_members, pd_extremes, reference_groups
- Schema 文件：v2/schema/*.sql
- 其他数据库：PostgreSQL, SQLite (A 股数据)

### 7. 数据标准和约束 (Standards & Constraints)
- 日期格式、货币、百分比、缺失值处理
- 时区规范 (UTC 存储)
- 交易日计算 (252 天/年)
- 收益率计算 (对数收益率)
- 禁止事项：float 计算金额、外部 API 发送数据、自动下单、修改生产数据、删除 .duckdb 文件
- 合规要求：客户 ID 脱敏、内部数据标记、AI 代码人工复核

## 使用方式

### 在 Claude Code 对话中使用

AgentMemory 通过 MCP 协议自动暴露工具给 Claude Code。在对话中，我可以：

1. **自动检索相关记忆**：当讨论项目相关话题时，AgentMemory 会自动提供相关上下文
2. **存储新知识**：发现新的重要信息时，可以记录到 AgentMemory
3. **跨会话持久化**：记忆在会话之间保持，无需重复说明

### 与 Claude Code 自动记忆的区别

| 特性 | Claude Code 自动记忆 | AgentMemory |
|------|------------|----------|
| 存储位置 | `~/.claude/projects/.../memory/` | AgentMemory 服务器 |
| 数据格式 | Markdown 文件 | 结构化数据库 + 向量索引 |
| 检索方式 | 文件读取 | 语义搜索 (95.2% R@5) |
| 跨项目 | 项目隔离 | 可跨项目共享 |
| 适用场景 | 项目特定上下文、开发偏好 | 通用知识库、策略库、跨会话记忆 |

### 推荐使用场景

**AgentMemory 适合：**
- 交易策略知识库（PDA 模式、入场模型）
- 回测结果和参数组合
- 错误和解决方案库
- ICT 概念和术语解释
- 跨项目的通用量化知识

**Claude Code 自动记忆适合：**
- 项目特定的开发偏好
- 代码规范和约定
- 当前项目的背景和目标
- 用户个人偏好

## 验证和测试

### 检查服务状态
```bash
# 检查端口监听
netstat -tlnp | grep 3111

# 查看进程
ps aux | grep agentmemory
```

### 查看已存储的记忆
AgentMemory 的记忆通过 MCP 工具访问，在 Claude Code 对话中自动可用。

## 技术细节

- **MCP 工具数量**: 51 个工具
- **检索准确率**: 95.2% (R@5)
- **Token 节省**: 92%
- **自动钩子**: 12 个
- **外部依赖**: 0 (无需外部数据库)
- **测试覆盖**: 827 个测试通过

## 下一步

1. ✅ 服务部署和配置
2. ✅ 核心项目知识录入
3. ⏳ 在实际对话中验证记忆检索
4. ⏳ 持续补充交易策略和 PDA 模式知识
5. ⏳ 记录回测结果和发现

## 参考资料

- AgentMemory 项目: `~/agentmemory-deploy/agentmemory`
- MCP 配置: `~/.claude/.mcp.json`
- 设计文档: [Viral GitHub Gist](https://gist.github.com/rohitg00/2067ab416f7bbe447c1977edaaa681e2)
- 基于 Karpathy 的 LLM Wiki 模式扩展

---

**更新时间**: 2026-05-09  
**状态**: ✅ 已集成并录入核心知识
