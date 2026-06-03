# V4 P0 级重构方案（旧 AI Review 草案）

> Legacy note: 本文件是外部 AI review 产生的旧草案，仅作为参考材料保留。当前执行计划以 `v4/TODO.md` 的 `Phase 15: P0 Order Setup Refactor 执行计划` 为准。

**目标**：在不破坏现有功能的前提下，解决阻碍后续开发的架构债务。

**原则**：
- 小步快跑：每个任务独立验证，可随时回退
- 保持兼容：外部 API 不变，内部逐步重构
- 测试先行：为关键模块补充基础测试
- 增量迁移：新旧代码并存，逐步切换

---

## 问题 1: `order-review-actions.js` 超大模块（1133 行）

### 当前状态
- **规模**：1133 行，20 个导入依赖
- **职责混乱**：Order Setup 创建、编辑、链接、定位、显隐、自动计算全部混在一起
- **依赖广泛**：横跨 PDA/Segment/Chart/Viewport/Store 8 个模块
- **唯一消费者**：只被 `inspector-sidebar.js` 导入

### 拆分方案

#### 方案边界
```
order-review-actions.js (1133 行)
  ↓ 拆分为
order/
  ├── actions/
  │   ├── setup-create.js      (创建 Order Setup 入口，200-250 行)
  │   ├── setup-edit.js         (编辑 Execution/Reasons/Entry Context，250-300 行)
  │   ├── setup-linking.js      (链接 PDA/Segment/SMT refs，150-200 行)
  │   ├── setup-lifecycle.js    (Active/Close/Delete/Hide/Show，150-200 行)
  │   └── setup-derivation.js   (自动计算 Exit Time/Points/R，200-250 行)
  └── order-review-actions.js   (兼容 re-export，保留 100 行)
```

#### 执行步骤

**Step 1: 建立测试基线（防止回归）**
```bash
# 创建验收脚本
v4/tests/order-setup-smoke.js
  - 创建 bullish/bearish setup
  - 设置 entry/stop/target
  - 添加 PDA/Segment link
  - 验证 result 派生
  - localStorage 恢复
  - Undo/redo
```

**Step 2: 抽取纯函数 helper（无依赖，易测试）**
```javascript
// v4/src/order/helpers/order-utils.js
export function parseDateTimeInput(value) { ... }
export function getSegmentTimestamp(segment) { ... }
export function getAnnotationTimestampRange(annotation) { ... }
export function isAutoExitResult(result) { ... }
```

**Step 3: 创建 `setup-create.js`**
- 迁移 `createOrderReviewActionController` 中的创建分支
- 迁移 `buildPdaOrderReviewRef` / `buildSegmentOrderReviewRef`
- 保持 `order-review-actions.js` re-export，避免破坏 `inspector-sidebar.js`

**Step 4: 创建 `setup-edit.js`**
- 迁移 Execution element 编辑逻辑
- 迁移 Reasons 编辑逻辑
- 迁移 Entry Context / Result 编辑逻辑

**Step 5: 创建 `setup-linking.js`**
- 迁移 `linkActiveSetupToSelectedObject`
- 迁移 PDA/Segment/Composite/SMT ref 构建逻辑

**Step 6: 创建 `setup-lifecycle.js`**
- 迁移 Set Active / Close Active
- 迁移 Delete / Hide / Show
- 迁移 Locate / Flash

**Step 7: 创建 `setup-derivation.js`**
- 迁移 `calculateAutoExitTime` 调用逻辑
- 迁移 Result summary 派生
- 迁移 Risk/Reward box 计算

**Step 8: 简化 `order-review-actions.js`**
```javascript
// 只保留 re-export + controller factory
export { createOrderReviewActionController } from './actions/setup-create.js';
export { buildPdaOrderReviewRef, buildSegmentOrderReviewRef } from './actions/setup-create.js';
```

**Step 9: 验证与合并**
- 运行 `node --check v4/src/**/*.js`
- 运行 `v4/tests/order-setup-smoke.js`
- 本地页面手工验证核心路径
- 提交 `refactor(order): split order-review-actions into focused modules`

### 估计工作量
- Step 1-2: 2-3 小时（测试基线 + 抽取 utils）
- Step 3-7: 5-8 小时（拆分 5 个模块，每个 1-1.5 小时）
- Step 8-9: 1-2 小时（re-export + 验证）
- **总计**: 8-13 小时

### 风险控制
- ✅ 低风险：只被一个文件导入，接口稳定
- ✅ 可回退：每个 step 独立提交
- ⚠️ 注意点：保持 `createOrderReviewActionController` 外部签名不变

---

## 问题 2: Order Setup 适配器层重叠

### 当前状态
```
orderReviews (localStorage)
  → order-review-store.js (normalize/CRUD, 841 行)
    → setup-set.js (runtime adapter, 386 行)
    → order-review-active.js (active bridge, 140 行)
        → 各模块消费
```

**问题**：
- `setup-set.js` 和 `order-review-store.js` 都有 result/risk/reward 派生逻辑（Step 149-152 记录）
- `order-review-active.js` 暴露双重 API：`getActiveReviewSet()` / `getActiveOrderReview()`
- 6 个文件导入 `order-review-active.js`，依赖路径混乱

### 收敛方案

#### 方案边界
```
明确层次：
  Storage Layer    → order-review-store.js (只负责 CRUD + normalize)
  Presentation Layer → setup-set.js (唯一的 view-model 派生层)
  Active State     → order-review-active.js (只管理 active id)
```

#### 执行步骤

**Step 1: 清理 `order-review-store.js` 派生逻辑**
```javascript
// 删除 store 中的 result points/R 计算
// 删除 store 中的 risk/reward 派生
// 只保留 normalize 明确输入字段
normalizeOrderReview(order) {
  return {
    id, createdAt, updatedAt,
    setupThesis: normalizeSetupThesis(order.setupThesis),
    entryPlan: normalizeEntryPlan(order.entryPlan),
    resultReview: normalizeResultReview(order.resultReview),
    display: normalizeDisplay(order.display),
  };
}
```

**Step 2: 明确 `setup-set.js` 为唯一 view-model 层**
```javascript
// 所有显示派生逻辑移到这里
export function createSetupSetFromOrderReview(order) {
  const reversal = createReversalElement(order);
  const entry = createEntryElement(order);
  const stop = createStopLossElement(order);
  const targets = createTargetElements(order);
  const result = deriveResultSummary(order, entry, stop, targets); // 👈 唯一派生点
  const riskReward = deriveRiskRewardBox(entry, stop, targets, result);
  return { reversal, entry, stop, targets, result, riskReward, ... };
}
```

**Step 3: 简化 `order-review-active.js`**
```javascript
// 删除重复的 orderReview alias API
// 只保留 reviewSet API
export function getActiveReviewSet() {
  return activeReviewSetId ? getSetupSetById(activeReviewSetId) : null;
}

// 删除这些重复 API：
// - getActiveOrderReview()
// - setActiveOrderReview()
// - createChartOrderSetup()
// - updateActiveOrderReview()
```

**Step 4: 更新消费者**
```javascript
// inspector-sidebar.js, order-review-panel.js, calendar-panel.js 等
// 改为统一消费 Setup Set
import { getActiveReviewSet } from '../../order/order-review-active.js';
const setupSet = getActiveReviewSet();
const { reversal, entry, stop, targets, result } = setupSet;
```

**Step 5: 验证与合并**
- 确认 renderer/hit-test/Inspector/Calendar 都消费 Setup Set
- 确认旧 `orderReviews` localStorage 仍可恢复
- 确认 Review JSON import/export 不破坏

### 估计工作量
- Step 1: 2-3 小时（清理 store 派生逻辑）
- Step 2: 1-2 小时（明确 setup-set 职责）
- Step 3: 1-2 小时（简化 active bridge）
- Step 4: 3-4 小时（更新 6 个消费者文件）
- Step 5: 1-2 小时（验证）
- **总计**: 8-13 小时

### 风险控制
- ⚠️ 中风险：影响多个模块
- ✅ 可回退：每层独立提交
- ✅ 兼容性：localStorage schema 不变

---

## 问题 3: 持久化策略分散（18 处 localStorage 使用）

### 当前状态
- **16 个独立 persistence 文件**：各自实现 save/restore/clear
- **重复逻辑**：localStorage key 构造、JSON parse/stringify、error handling
- **版本管理缺失**：只有 PDA/Order Review 有 version 字段
- **无统一 migration 策略**

### 统一方案

#### 方案边界
```
v4/src/persistence/
  ├── persistence-manager.js  (统一 localStorage 抽象)
  ├── pda-persistence.js       (适配 PDA store)
  ├── segment-persistence.js   (适配 Segment store)
  ├── order-persistence.js     (适配 Order Review store)
  └── ...
```

#### 执行步骤

**Step 1: 创建统一 persistence manager**
```javascript
// v4/src/persistence/persistence-manager.js
export class PersistenceManager {
  constructor({ key, version, store, bus }) {
    this.key = key;
    this.version = version;
    this.store = store;
    this.bus = bus;
    this.restoring = false;
  }

  save(data) {
    if (this.restoring) return;
    try {
      const payload = {
        version: this.version,
        savedAt: Date.now(),
        data,
      };
      window.localStorage.setItem(this.key, JSON.stringify(payload));
    } catch (err) {
      this.bus?.emit('status:update', {
        text: `保存失败 (${this.key}): ${err.message}`,
        isError: true,
      });
    }
  }

  restore() {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (payload.version !== this.version) {
     console.warn(`Version mismatch for ${this.key}: ${payload.version} vs ${this.version}`);
      }
      return payload.data;
    } catch (err) {
      this.bus?.emit('status:update', {
        text: `恢复失败 (${this.key}): ${err.message}`,
      isError: true,
      });
      return null;
    }
  }

  clear() {
    try {
      window.localStorage.removeItem(this.key);
    } catch (err) {
      this.bus?.emit('status:update', {
        text: `清除失败 (${this.key}): ${err.message}`,
      isError: true,
      });
    }
  }

  autoSave(eventName, dataGetter) {
    this.bus?.on(eventName, () => {
      const data = dataGetter();
      this.save(data);
    });
  }
}
```

**Step 2: 迁移 PDA persistence**
```javascript
// v4/src/persistence/pda-persistence.js
import * as bus from '../event-bus.js';
import { getAnnotations, loadAnnotations } from '../pda/pda-store.js';
import { PersistenceManager } from './persistence-manager.js';

const manager = new PersistenceManager({
  key: 'v4:pda-annotations:NQ',
  version: 1,
  bus,
});

export function initPdaPersistence() {
  const data = manager.restore();
  if (data && Array.isArray(data)) {
    loadAnnotations(data.filter(a => a.source !== 'draft'));
    if (data.length > 0) {
      bus.emit('status:update', {
        text: `已恢复 ${data.length} 条 PDA 标注`,
        isError: false,
      });
    }
  }

  manager.autoSave('pda:changed', () => {
    return getAnnotations().filter(a => a.source !== 'draft' && !a.draft);
  });
}

export const saveAnnotations = () => manager.save(getAnnotations());
export const clearSavedAnnotations = () => manager.clear();
```

**Step 3: 迁移 Order Review persistence**
```javascript
// v4/src/persistence/order-persistence.js
import { PersistenceManager } from './persistence-manager.js';
import { getOrderReviews, loadOrderReviews } from '../order/order-review-store.js';
import * as bus from '../event-bus.js';

const manager = new PersistenceManager({
  key: 'v4:order-reviews:NQ',
  version: 1,
  bus,
});

export function initOrderReviewPersistence() {
  const data = manager.restore();
  if (data && Array.isArray(data)) {
    loadOrderReviews(data);
    if (data.length > 0) {
      bus.emit('status:update', {
        text: `已恢复 ${data.length} 条 Order Setup`,
        isError: false,
      });
    }
  }

  manager.autoSave('order-review:changed', getOrderReviews);
}
```

**Step 4: 迁移其余 persistence 模块**
- Segment persistence
- Time Overlay persistence
- Replay History persistence
- Daily Time Review persistence

**Step 5: 删除旧 persistence 文件**
```bash
# 保留兼容 re-export
rm v4/src/pda/pda-persistence.js
rm v4/src/order/order-review-persistence.js
rm v4/src/segment/segment-persistence.js
...

# 在各自 store 目录保留兼容入口（如需）
# v4/src/pda/pda-persistence.js
export * from '../persistence/pda-persistence.js';
```

**Step 6: 添加版本 migration 支持（可选）**
```javascript
// persistence-manager.js
constructor({ key, version, migrations = {}, ... }) {
  this.migrations = migrations; // { 0: migrateV0toV1, 1: migrateV1toV2 }
}

restore() {
  const raw = window.localStorage.getItem(this.key);
  if (!raw) return null;
  let payload = JSON.parse(raw);
  
  // Apply migrations
  while (payload.version < this.version) {
    const migrate = this.migrations[payload.version];
    if (!migrate) break;
    payload.data = migrate(payload.data);
    payload.version++;
  }
  
  return payload.data;
}
```

### 估计工作量
- Step 1: 2-3 小时（persistence-manager 基础设施）
- Step 2-3: 2-3 小时（迁移 PDA + Order Review）
- Step 4: 3-4 小时（迁移剩余 4 个模块）
- Step 5: 1-2 小时（清理旧文件）
- Step 6: 2-3 小时（可选 migration 支持）
- **总计**: 10-15 小时（不含 migration）

### 风险控制
- ✅ 低风险：只改实现，不改接口
- ✅ 可回退：每个模块独立迁移
- ⚠️ 注意点：localStorage key 不能变，避免用户数据丢失

---

## 总体执行计划

### 阶段划分

**Phase 1: 准备阶段（2-3 小时）**
- [ ] 创建 `v4/tests/` 目录
- [ ] 编写 Order Setup smoke test
- [ ] 编写 PDA/Segment smoke test
- [ ] 建立回归基线

**Phase 2: 拆分 order-review-actions（8-13 小时）**
- [ ] 问题 1 - Step 1-9
**Phase 3: 收敛 Order Setup 适配器（8-13 小时）**
- [ ] 问题 2 - Step 1-5

**Phase 4: 统一持久化层（10-15 小时）**
- [ ] 问题 3 - Step 1-5

**Phase 5: 验收与文档（3-4 小时）**
- [ ] 全量回归测试
- [ ] 更新 `v4/docs/ARCHITECTURE.md`
- [ ] 更新 TODO.md Phase 13 记录

### 总工作量估计
- **最小**: 31 小时（8+8+10+3+2）
- **最大**: 48 小时（13+13+15+4+3）
- **建议**: 按 40 小时规划，分 5 天执行（每天 8 小时）

### 成功标准
1. ✅ 所有文件 < 500 行
2. ✅ `order-review-actions.js` 拆分为 5+ 个专注模块
3. ✅ Order Setup 只有 2 层抽象（store + view-model）
4. ✅ localStorage 操作集中在 `persistence/` 目录
5. ✅ 所有现有功能不回归
6. ✅ smoke tests 覆盖核心路径

---

## 后续优化方向（不在 P0 范围）

### P1 - 提取公共 helper
- `chart-projection-utils.js`（时间/价格映射）
- `result-derivation.js`（Points/R 计算）

### P2 - 建立分层边界
- UI 层 → Service 层 → Store 层
- Service 层协调跨模块操作

### P3 - 完整测试覆盖
- 单元测试：store/normalize/utils
- 集成测试：完整 Order Setup 创建流程
- E2E 测试：Headless Chrome 回归

---

## 附录：文件组织建议

### 重构后的 `v4/src/order/` 目录结构
```
v4/src/order/
├── order-review-store.js        (CRUD + normalize, 400-500 行)
├── setup-set.js                  (view-model adapter, 300-400 行)
├── order-review-active.js        (active id 管理, 80-100 行)
├── actions/
│   ├── setup-create.js           (200-250 行)
│   ├── setup-edit.js         (250-300 行)
│   ├── setup-linking.js        (150-200 行)
│   ├── setup-lifecycle.js        (150-200 行)
│   └── setup-derivation.js       (200-250 行)
├── helpers/
│   ├── order-utils.js       (纯函数 helpers)
│   └── order-ref-metadata.js     (已存在)
├── order-setup-chart-actions.js  (已存在，658 行)
├── order-setup-hit-test.js       (已存在)
├── order-setup-selection.js      (已存在)
├── order-setup-projection.js     (已存在)
└── order-review-renderer.js      (已存在)
```

### 重构后的 `v4/src/persistence/` 目录结构
```
v4/src/persistence/
├── persistence-manager.js        (统一抽象)
├── pda-persistence.js            (PDA 适配)
├── order-persistence.js        (Order Review 适配)
├── segment-persistence.js    (Segment 适配)
├── time-overlay-persistence.js   (Time Overlay 适配)
├── replay-history-persistence.js (Replay History 适配)
└── time-review-persistence.js    (Daily Time Review 适配)
```

---

## 提交策略

每个 Phase 独立分支 + PR：
```bash
git checkout -b refactor/p0-order-actions
git checkout -b refactor/p0-order-adapters
git checkout -b refactor/p0-persistence
```

每个 Step 独立 commit：
```bash
git commit -m "refactor(order): extract order-utils helpers"
git commit -m "refactor(order): create setup-create module"
git commit -m "refactor(order): create setup-edit module"
...
```

合并前验证：
```bash
node --check v4/src/**/*.js
node v4/tests/order-setup-smoke.js
python3 -m http.server 8001 &
# 手工验证核心路径
```

---

## 风险评估

| 风险项 | 等级 | 缓解措施 |
|--------|------|----------|
| 破坏现有功能 | 🟡 中 | smoke tests + 手工验证 |
| localStorage 数据丢失 | 🔴 高 | key 不变 + 版本校验 |
| 模块导入路径变化 | 🟢 低 | 保留 re-export 兼容层 |
| 新 bug 引入 | 🟡 中 | 每个 step 独立提交，可回退 |
| 工作量超期 | 🟡 中 | 分阶段执行，可暂停 |

---

**最终决策**：建议优先执行 Phase 2（拆分 order-review-actions），这是影响最大、风险最低的改进。Phase 3-4 可根据实际需要推后。
