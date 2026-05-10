# AgentMemory 使用方式说明

## 核心答案：隐式使用（自动）

AgentMemory 在 Claude Code 中是**隐式使用**的，通过 MCP (Model Context Protocol) 自动集成。

## 工作原理

### 1. MCP 自动集成

```
Claude Code
    ↓ (通过 MCP 协议)
AgentMemory MCP Server (localhost:3111)
    ↓ (通过 iii-engine WebSocket)
iii-engine (port 49134)
    ↓
SQLite 数据库 (./data/state_store.db)
```

### 2. 工具自动暴露

AgentMemory 通过 MCP 暴露 **51 个工具**，这些工具会自动注册到 Claude Code，就像内置工具（Read、Write、Bash）一样。

**我（Claude）可以直接调用这些工具，无需你手动操作。**

### 3. 三种使用方式

#### 方式 A：完全隐式（推荐）

你只需正常对话，我会在需要时自动使用 AgentMemory：

```
你: "上次我们讨论的 FVG 策略是什么？"
我: [自动从 AgentMemory 检索] "根据记录，FVG 策略是..."
```

#### 方式 B：显式请求

你可以明确要求我使用 AgentMemory：

```
你: "把这个 PDA 模式记录到 AgentMemory"
我: [调用 memory_create 工具] "已记录到 AgentMemory"

你: "从 AgentMemory 搜索所有关于 BSL 的内容"
我: [调用 memory_search 工具] "找到 3 条相关记忆..."
```

#### 方式 C：直接 API 调用（高级）

你也可以通过 HTTP API 直接操作（不通过我）：

```bash
# 创建记忆
curl -X POST http://localhost:3111/agentmemory/create \
  -H "Content-Type: application/json" \
  -d '{"content": "...", "tags": ["trading"]}'

# 搜索记忆
curl -X POST http://localhost:3111/agentmemory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "FVG strategy", "limit": 5}'
```

## 可用的 MCP 工具（部分列表）

根据 AgentMemory 的架构，主要工具包括：

### 记忆管理
- `memory_create` - 创建新记忆
- `memory_get` - 获取特定记忆
- `memory_update` - 更新记忆
- `memory_delete` - 删除记忆
- `memory_list` - 列出所有记忆

### 搜索和检索
- `memory_search` - 语义搜索（向量检索）
- `memory_search_by_tag` - 按标签搜索
- `memory_search_by_date` - 按日期范围搜索
- `memory_related` - 查找相关记忆

### 知识图谱
- `memory_link` - 创建记忆之间的关联
- `memory_graph` - 查看知识图谱
- `memory_neighbors` - 查找相邻节点

### 元数据管理
- `memory_add_tags` - 添加标签
- `memory_remove_tags` - 移除标签
- `memory_set_confidence` - 设置置信度
- `memory_set_lifecycle` - 设置生命周期状态

### 统计和分析
- `memory_stats` - 获取统计信息
- `memory_audit` - 查看审计日志
- `memory_export` - 导出数据
- `memory_import` - 导入数据

## 当前状态

### ✅ 已完成
1. AgentMemory 服务运行在 `localhost:3111`
2. MCP 配置正确（`~/.claude/.mcp.json`）
3. 核心项目知识已录入（7 个模块）

### ⏳ 待验证
1. MCP 工具是否在 Claude Code 中可见
2. 我是否能成功调用这些工具
3. 记忆检索的准确性和响应时间

## 验证方法

### 方法 1：让我尝试调用（推荐）

你可以说：
```
"从 AgentMemory 中搜索关于 NQ backtesting 的内容"
```

我会尝试调用 MCP 工具，如果成功，说明集成正常。

### 方法 2：检查 MCP 连接状态

```bash
# 查看 AgentMemory 进程
ps aux | grep agentmemory

# 查看 iii-engine 进程
ps aux | grep iii-engine

# 检查端口监听
netstat -tlnp | grep -E "(3111|49134)"
```

### 方法 3：查看 Claude Code 日志

Claude Code 启动时会显示已加载的 MCP 服务器。

## 与 Claude Code 自动记忆的对比

| 特性 | Claude Code 自动记忆 | AgentMemory MCP |
|----------------|-----------------|
| **使用方式** | 完全自动 | 隐式自动（通过 MCP） |
| **存储位置** | `~/.claude/projects/.../memory/` | `~/agentmemory-deploy/agentmemory/data/` |
| **数据格式** | Markdown 文件 | SQLite + 向量索引 |
| **检索方式** | 文件读取 + 描述匹配 | 语义搜索（向量相似度） |
| **检索准确率** | 基于描述字段 | 95.2% R@5 |
| **跨项目** | 项目隔离 | 可跨项目共享 |
| **工具数量** | 内置（Read/Write） | 51 个专用工具 |
| **知识图谱** | 无 | 支持关联和图谱 |
| **生命周期** | 手动管理 | 自动过期和归档 |
| **置信度评分** | 无 | 支持 |

## 推荐使用策略

### Claude Code 自动记忆适合：
- 项目特定的开发偏好
- 代码规范和约定
- 用户个人偏好
- 当前项目的背景和目标

### AgentMemory 适合：
- 交易策略知识库（可复用）
- ICT 概念和术语（跨项目）
- 回测结果和发现（需要搜索）
- 错误和解决方案库（需要关联）
- 跨会话的长期记忆

## 下一步

1. **验证 MCP 集成** - 让我尝试调用 AgentMemory 工具
2. **测试检索效果** - 搜索已录入的 7 个知识模块
3. **持续补充** - 在实际使用中积累交易策略知识

---

**更新时间**: 2026-05-09  
**状态**: 已配置，待验证 MCP 工具调用
