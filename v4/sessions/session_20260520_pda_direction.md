# Session 2026-05-20: V4 PDA Direction Update

## 目标
调整 V4 PDA 主线：不再以全量自动扫描和提前入库为核心，改为手动选择 PDA 后实时计算上下文，并在图表中临时标注。

## 新方向
- V4 PDA 不做全量自动扫描优先。
- 用户手动选择一个点、区间或点位集合，系统实时计算该 PDA 的上下文信息。
- 当前会话内显示、隐藏、编辑标注；暂不写 DB，不提前入库。
- 后续如需要持久化，再设计导出 / localStorage / YAML / DB 镜像。

## 典型流程
```text
用户手动选择 PDA 候选
  ↓
系统实时计算 HTF / session / objective context
  ↓
生成 annotation object
  ↓
pda-store 保存当前会话状态
  ↓
pda-renderer 画到 chart 上
```

## SSL / BSL 示例
用户手动选择一个 SSL 低点后，系统实时判断它是否同时属于：
- `15M low`
- `30M low`
- `1H low`
- `4H low`
- `Daily low`
- `Midnight low`
- `LDN low`
- `NYAM low`

如果命中多个上下文，打包为一个标注：
```js
{
  id: 'manual_ssl_...',
  type: 'ssl',
  source: 'manual',
  anchorTime: 1326106800,
  price: 2338.5,
  contexts: ['1H low', 'LDN low', 'NYAM low'],
  note: ''
}
```

## PDA 类型处理
- `BSL / SSL`: 手动点选 high / low，实时计算 HTF 与 session context。
- `FVG / OB`: 手动选择价格区间或 K 线组合，实时计算所属时段、大小、touch / fill 状态。
- `NDOW / NWOG`: 客观 PDA，通过命令或开关显示 / 隐藏，现用现算，不提前入库。
- `EQH / EQL`: 点位集合，不是单点 PDA；用户多选 high / low 后打包为一组结构。
- `Fib`: 暂不混入 PDA scanner，可作为后续手动画图 / 结构工具。

## 建议模块
```text
v4/src/pda/
  pda-types.js           // 类型定义与显示配置
  pda-store.js           // 当前会话 PDA / annotation 状态
  pda-context.js         // 实时计算 HTF/session/midnight/LDN/NYAM context
  pda-renderer.js        // 数据到 chart primitives 的渲染层
  pda-commands.js        // NDOW/NWOG 等客观 PDA 显示/隐藏命令
  manual-annotation.js   // 手动点选 / 区间选择 / 点位集合创建入口
```

## 新 TODO 顺序
1. PDA 类型注册表 + 当前会话 store
2. 手动 PDA 标注入口，优先 SSL/BSL 点选
3. PDA context 实时计算器
4. PDA 渲染器
5. 客观 PDA 显示/隐藏命令
6. EQH/EQL 点位集合打包

## 当前决策
- 手动标注优先。
- 实时计算优先。
- 图表临时显示优先。
- 不提前入库。
- 不做全量 scanner 作为当前主线。
