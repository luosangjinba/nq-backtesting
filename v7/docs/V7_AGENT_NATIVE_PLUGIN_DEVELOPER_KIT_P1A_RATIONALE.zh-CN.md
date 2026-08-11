# V7 P1a Agent-Native Plugin Developer Kit — 设计思路与通俗说明

状态：2026-08-11 随 P1a 规格验收接受；非规范性说明；实现未授权

规范性合同：`V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`

验收记录：
`../sessions/session_20260811_p1a_agent_native_developer_kit_specification_acceptance.md`

## 文档目的

这份文档保存 P1a 的设计动机、通俗解释和阶段取舍，避免未来只看到
接口和验收条款，却忘记当初为什么这样拆分。

它不是第二份规格。若本说明与规范性合同冲突，以
`V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` 为准；任何合同变更仍需修改
规范、Harness 和路线图，不能只改本说明。

## 产品所有者已接受的四项核心决策

2026-08-11，产品所有者在完整通俗说明后明确接受：

1. **P1a 只负责开发和证据，安装留给 P1b。**
2. **P1a 初期只支持真实 FVG 和 `trusted-built-in-core-v1` Profile。**
3. **开发测试进程与未来生产 Worker 完全分离。**
4. **`.v7dk.tar` 永远不能被解释为安装或运行授权。**

这四项共同保护一条关键边界：P1a 可以让人类和 AI Agent 完成可靠、
可重复、可审查的作者工作流，但不会因此获得安装、信任或生产执行权。

## 一句话定位

P1a 是 V7 的“插件开发工厂”。它把插件源码变成经过验证、可复现、可
审计的开发成果，但不把插件装进 V7，也不让它进入生产运行环境。

```text
开发者 / AI Agent
        |
        v
发现合同 -> 创建工程 -> 校验 -> 编译 -> 隔离测试 -> 预览 -> 打包 -> 检查
        |
        v
TypeScript 源码 + 测试证据 + 诊断 + 可复现收据
        |
        v
.v7dk.tar 开发者证据包
        X
不能安装、不能启用、不能进入生产运行
```

## 为什么需要 P1a

没有 Developer Kit 时，插件作者或 AI Agent 必须阅读散落的 V7 源码，
猜测 manifest、TypeScript 配置、依赖关系、参数面板结构和测试方法。
即使代码“看起来能运行”，也无法可靠证明：

- 没有读取 Replay cutoff 之后的 Bar；
- 没有绕过 Chart、Replay、Bar Data、Workspace 或 Annotation owner；
- full 与 incremental 计算一致；
- settings 和 contribution 真正符合宿主合同；
- 构建结果来自哪一版 SDK、Schema 和编译器；
- 人、CI 和 AI Agent 得到的是同一个结论。

P1a 把这些隐含知识变成可发现的机器合同：SDK 类型、JSON Schema、
capability/dependency/permission catalog、UI 控件目录、fixtures、稳定错误
码、兼容性报告和内容寻址收据。Agent 因而可以执行确定的修正循环，
而不必解析某个界面的临时文案。

## 一个引擎，多种入口

P1a 只有一个权威 Operation Engine：

```text
CLI ---------+
CI ----------+
AI Agent ----+--> Developer Kit Operation Engine
Library -----+
未来 MCP ----+
```

CLI、Library、CI、AI Agent 和未来 MCP 对同一输入必须得到相同的：

- 校验结论和诊断顺序；
- source/artifact/toolchain hash；
- compatibility report；
- canonical receipt。

未来 MCP 只是这套操作的 workspace-bounded 适配器。它不能另写验证器、
包格式或构建系统，也不能得到任意 shell、文件系统、网络、凭据或生产
owner 权限。

## 八个标准操作

| 操作 | 通俗含义 | 是否执行候选代码 |
| --- | --- | --- |
| `discover` | 返回当前 SDK、Schema、能力、模板、限制和操作版本 | 否 |
| `scaffold` | 在空目标中创建确定性的标准工程 | 否 |
| `validate` | 检查 manifest、依赖、权限、路径、参数和 fixtures | 否 |
| `build` | 用固定 TypeScript 工具链编译并静态检查 ESM | 仅编译器 |
| `test` | 在隔离合成宿主中执行适用的 fixture/Harness | 受 Profile 限制 |
| `preview` | 生成宿主参数面板和图表投影描述，不打开生产 V7 | 受 Profile 限制 |
| `pack` | 生成不可安装的 `.v7dk.tar` 开发者证据包 | 否 |
| `inspect` | 不加载模块地检查工程、证据包、hash 和收据 | 否 |

每个操作都接受版本化 JSON 请求并返回统一 JSON 结果。Agent 依赖稳定
错误码、logical path、JSON Pointer 和 source span，而不是匹配自然语言。

## 为什么统一为 strict TypeScript

插件唯一的可执行作者语言是 strict TypeScript，输出固定为 ES2022 ESM。
这是为了让类型、构建、静态分析、fixtures、Agent 生成和未来 Worker 只
维护一套公共模型。

Developer Kit 生成不可弱化的构建配置，至少包括精确锁定的编译器版本、
`strict`、`noEmitOnError`、`exactOptionalPropertyTypes`、
`noUncheckedIndexedAccess`、`isolatedModules` 和 ES2022 ESM。候选包不能
替换 compiler plugin、transformer、loader、生命周期脚本或关闭严格检查。

Python 和 Pine Script 不是 V7 插件运行语言；WASM 也不属于初期 SDK。
未来 Pine 助手只把支持的 Pine 源码迁移成普通 TypeScript 工程，再经过
相同 Developer Kit，而不是在 V7 中执行 Pine。

## 标准开发工作区

标准工程以 `v7-plugin-kit.json` 为根：

```text
v7-plugin-kit.json
plugin.manifest.json
src/index.ts
fixtures/
expected/
README.md
```

`plugin.manifest.json` 保存包、版本、contribution、dependency 和参数元数据；
`src/index.ts` 是 TypeScript 作者入口；`fixtures/` 和 `expected/` 保存固定
输入与预期输出；workspace 文件锁定 SDK/Profile 和逻辑路径。

所有路径必须位于显式选择的 workspace 内。绝对路径、`..`、重复路径、
symlink 逃逸、特殊设备文件和在非空目标上覆盖 scaffold 都失败关闭。

## 合成宿主是什么

插件测试不能直接连接真实 V7。P1a 提供不可变的合成宿主，输入可以包含：

- 固定 Bars、symbol、timeframe 和 dataset revision；
- Session Hours、timezone、calendar 与 gap/alignment policy；
- Replay observation cutoff 和 confirmed/open Bar 状态；
- Pane 和多周期映射；
- 已验证 settings、Evidence Bundle 和 Artifact snapshot。

输出只能是可移植结果，例如 series samples、Rectangle/Segment 投影描述、
Semantic Artifact draft、宿主参数 view model、diagnostics 和 lifecycle trace。

合成宿主不会返回 Lightweight Charts 的 Chart/Series、Canvas、DOM、Bar
requester/cache、Replay writer、Workspace writer、Annotation repository、
数据库、ModuleHost 或其他生产 owner port。

## 开发测试进程为什么不是 P3a Worker

`discover`、`validate` 和 `inspect` 永不执行候选代码；`build` 只运行固定
编译器和静态分析器。只有 Profile 定义了 fixture ABI 时，`test` 和
`preview` 才能在一次性开发测试进程中执行候选逻辑。

该进程必须：

- 只收到请求中的不可变 fixture 和 SDK runtime；
- 没有凭据、网络、任意文件系统、shell、child process 或数据库；
- 没有真实 V7 application、owner 或服务；
- 有固定 clock/seed 和 CPU、内存、时间、任务、输出限制；
- 在成功、失败、超时和取消后都彻底销毁。

若当前平台无法执行这些限制，结果必须是 `blocked`，不能退回 CLI 主进程
直接运行。

它不等于 P3a Worker：P1a test host 只有合成 fixtures，用于开发验证；
P3a 才会定义已安装插件如何接触受限生产数据、生命周期和资源预算。

## 为什么 P1a 初期只有真实 FVG

当前真正通过 P0a/P0b 的插件 manifest 是 FVG，所以第一版 Profile 是：

```text
trusted-built-in-core-v1
  distribution: core / built-in / first-party
  permissions: []
  real reference: Fair Value Gap
```

P0a manifest 中出现 `indicator`、`drawing`、`semantic-type` 等 kind，不代表
对应的公开执行 ABI 已经存在。P1a 用独立 contribution-contract catalog 将
每种能力标记为 `static`、`fixture`、`trusted-build` 或 `unavailable`。

FVG 用来证明三 Bar 构造、Replay no-future、Rectangle/Segment 投影、Evidence
和宿主参数 Schema。合成参考只测试控件和 dependency/derived graph，不进入
Plugin Center，也不冒充产品插件。

Community、sub-Pane indicator 和 Worker Profile 在对应阶段授权前必须明确
报告 `unavailable`。宁可功能窄，也不生成“有 manifest 但实际不能运行”的
假插件。

## 参数面板为什么由宿主渲染

插件只能声明 Inputs、Style、Visibility，以及适用的 Evidence/History；
control 使用宿主支持的 boolean、number、text、select、color 等类型。

插件不能携带任意 HTML、DOM 或 CSS。这样可以：

- 保持类似 TradingView 的一致面板体验；
- 避免插件破坏 Settings 布局和无障碍规则；
- 防止绕过设置 owner 和持久化合同；
- 避免任意网页代码进入 V7；
- 让同一 Schema 可被 CLI、Agent、测试和 UI 共同理解。

`preview` 输出宿主 view model 或投影描述，而不是自定义插件页面。

## 为什么 `.v7dk.tar` 不能安装

P1a 的 `pack` 产物包含 manifest、编译 ESM、declaration、fixtures、expected
outputs、compatibility report、receipt、source/license/provenance 和 SHA-256
内容索引，但它仍然只是开发证据。

每份 P1a receipt 都必须明确：

```text
installable: false
activated: false
productionExecutionAuthorized: false
```

这是为了分开三种权力：

```text
P1a: 证明源码是什么、是否符合作者合同
P1b: 决定文件能否安装、需要哪些用户确认
P3a: 决定安装后能否执行、获得哪些生产资源
```

hash 提供可复现性和篡改证据，不等于发布者签名、用户同意或平台信任。
P1b 未来可以把验证过的 P1a 内容作为候选输入，但必须建立独立的安装
transaction。

## Receipt 保存什么

Receipt 记录 SDK、编译器、Schema、catalog、simulator、operation 版本及
digest，并记录 source、manifest、fixture、expected output、artifact、bundle
hash、dependency graph、Harness/negative-control 身份、clock/seed、资源限制、
诊断和人工审核要求。

相同字节和工具链重复执行必须产生相同 canonical receipt；任意相关源码、
fixture、Schema、catalog 或编译器字节变化都必须改变相应下游 digest。

这使“测试通过”从一句声明变成可以重放、核查和比较的证据。

## H116 将验收什么

H116 当前只是声明态。未来实现至少需要证明：

- CLI 与 Library 的 JSON、诊断、hash 和 receipt 完全一致；
- scaffold/build/test/preview/pack 可重复且离线工作；
- strict TypeScript 配置不能被候选弱化；
- DOM、Node、网络、文件系统、shell、动态 import、`eval`、WASM 被拒绝；
- 开发测试隔离可靠，超时/失败/取消后无进程或文件泄漏；
- FVG full/incremental、missing-data 和 Replay no-future 行为正确；
- dependency graph 与不可用 Profile 诊断确定；
- bundle 无路径穿越、symlink、重复文件、特殊文件和超限展开；
- 被篡改 artifact、index 或 receipt 会失败；
- 任何 P1a 操作都不能安装、启用、发布或控制 ModuleHost；
- 生产 owner graph、writer、P0a、P0b 和产品行为保持不变。

P1a 没有产品可见 UI，因此 H116 不需要像 P0b 那样做像素验收。但未来
可见行为、争议语义、权限增加、安装/启用和 Pine 等价性仍需人工审核。

## 与后续阶段的关系

```text
P1a  开发、测试、证据
 |
 v
P1b  本地文件安装、Developer Mode、MCP
 |
 v
P2   签名免费 Community Registry
 |
 v
P3a  生产 Worker 执行
 |
 v
P3b  Pine -> TypeScript 迁移助手
```

Pine 迁移最终产生普通 P1a TypeScript workspace、fixtures、compatibility
report 和 receipt，再进入普通安装、执行和人工语义验收流程。它不建立
第二种插件语言，也不绕过 Developer Kit。

## 未来修改时必须保留的设计原则

- Agent-native 指没有隐藏的 GUI-only 作者步骤，不表示 Agent 获得更大权限。
- 一个权威 Operation Engine，MCP 只能适配，不能分叉。
- manifest 中的 kind 不自动等于可执行 ABI。
- 开发证据、安装同意和生产执行是三道独立门。
- 测试只得到显式 fixture；缺失上下文失败关闭，不能偷用当前时间或最新 Bar。
- 插件声明 UI，宿主渲染 UI；插件不拥有任意 DOM/CSS。
- 真实参考优先于占位 manifest；未授权能力明确报告 unavailable。
- 自动化合规不能取代市场语义、权限和可见行为的人工审核。
